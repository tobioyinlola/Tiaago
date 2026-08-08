"""Standalone LiveKit voice agent that conducts one Tiaago AI interview.

Runs as its own long-lived worker process (NOT part of the Django backend or
the ai/ FastAPI generation service) -- see ../docker-compose.yml's
`interview-agent` service. Connects to LiveKit, joins the room the candidate
was given a token for (see backend/ai_interviews/views.py
AIInterviewStartSessionView), and conducts the interview using OpenAI's
Realtime API (a single persistent speech-to-speech session) instead of a
separate STT -> LLM -> TTS pipeline -- collapsing three network round-trips
per turn into one is the single biggest lever for voice-to-voice latency
achievable with OpenAI-only credentials (no separate STT/TTS provider key
is configured for this service -- see interview_agent/.env.example), and
it's the officially supported low-latency path for LiveKit Agents.

IMPORTANT: this pipeline swap could not be exercised against a live LiveKit
room in the environment it was written in (no way to place a real call from
that sandbox). Function-tool calling (end_interview), the transcript-capture
hooks (on_user_turn_completed / conversation_item_added), and
session.generate_reply() are all AgentSession/Agent-level APIs that LiveKit
Agents documents as backend-agnostic (identical whether `llm=` is a
pipeline LLM or a RealtimeModel), so they're expected to keep working
unchanged -- but this needs a real end-to-end smoke test (join as a
candidate, complete a full interview, confirm the transcript saved
correctly) before being trusted in production. If anything about the
realtime session's behavior is wrong, reverting this one file to the
previous stt=/llm=/tts=/vad= pipeline (see git history) restores the
previous, known-working behavior immediately.

Transcript capture is a byproduct of the conversation pipeline itself --
every candidate turn and every Alex turn is POSTed to Django's internal
segment endpoint as it happens. No separate transcription service, no extra
cost, no added latency.
"""

import asyncio
import json
import logging
import os
import time

import aiohttp
from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    RoomInputOptions,
    RunContext,
    WorkerOptions,
    function_tool,
)
from livekit.agents.llm import ChatMessage
from livekit.agents.voice.events import ConversationItemAddedEvent
from livekit.plugins import openai

load_dotenv()

logger = logging.getLogger("interview-agent")
logging.basicConfig(level=logging.INFO)

NEXTJS_INTERNAL_URL = os.getenv("NEXTJS_INTERNAL_URL", "http://localhost:8000")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")

SYSTEM_PROMPT = """You are Alex, a professional AI interviewer conducting a structured {duration}-minute interview for the role of {job_title} at {company_name}.

PERSONALITY:
Warm, professional, genuinely curious.
Natural conversational language.
Contractions are fine.
Vary your acknowledgements every time:
'That makes sense' / 'I appreciate that' / 'Interesting' / 'Got it' / 'Makes sense' / 'Tell me more about that'
Never say 'Great answer' or 'Wonderful'

OPENING -- this is the very first thing you say, before anything else, as soon
as the call connects. Do not wait for the candidate to speak first. Say this
exactly:
'Hi {candidate_name}, I am Alex. I will be conducting your interview today for the {job_title} role. This should take about {duration} minutes. I have looked through your background and have some questions I would love to explore with you. Ready to get started?'

Wait for them to confirm before continuing.

CAMERA -- say this once only if no video:
'Feel free to turn your camera on if you like -- though it is entirely up to you.'
Never repeat this.

QUESTIONS -- ask in this exact order:
{questions}

BETWEEN QUESTIONS:
Use the transition_phrase after each answer before asking the next question.
When relevant connect to earlier answers: 'You mentioned earlier that... which connects to what I want to ask next...'

QUESTION RULES:
One question at a time. Always.
Wait for candidate to fully finish.
Answer under 20 seconds: use followup_if_vague once only.
Answer over 3 minutes: 'That is really helpful. Let me move us along to make sure we cover everything.'
One follow-up maximum per question.

SILENCE -- no response in 15 seconds:
'Take your time, no rush.'
15 more seconds: 'Would you like me to repeat that?'
Third time: move to next question.

UNCLEAR AUDIO:
'Sorry, I did not catch that -- could you say that again?'
After two unclear attempts: 'Let us keep going.'

CLOSING -- when all questions complete:
'{candidate_name}, this has been a great conversation. Thank you so much for your time. Our team at {company_name} will review everything and be in touch about next steps. Is there anything you would like to add or any questions before we finish?'

Listen fully to their response.
Then say: 'Brilliant. It was great speaking with you. Best of luck and take care.'
Then immediately call the end_interview tool. Call it exactly once, only
after that line, never before.

NEVER:
Tell the candidate how they performed.
Reveal scoring criteria.
Make promises about outcomes.
Go off topic from the question list.
If asked about outcome: 'Our team will be in touch directly.'

CANDIDATE:
Name: {candidate_name}
Role: {job_title}
Resume: {resume_summary}
Assessment: {assessment_score}/100
"""


class InterviewAgent(Agent):
    def __init__(self, interview_data: dict, call_ended: asyncio.Event):
        self.interview_id = interview_data["id"]
        self.start_time = time.time()
        self._call_ended = call_ended

        questions_text = self._format_questions(interview_data["questions"])

        prompt = SYSTEM_PROMPT.format(
            duration=interview_data["duration_minutes"],
            job_title=interview_data["job_title"],
            company_name=interview_data["company_name"],
            candidate_name=interview_data["candidate_first_name"],
            questions=questions_text,
            resume_summary=interview_data.get("resume_summary") or "Not available",
            assessment_score=interview_data.get("assessment_score") if interview_data.get("assessment_score") is not None else "Not available",
        )

        super().__init__(instructions=prompt)

    def _format_questions(self, questions: list) -> str:
        lines = []
        for q in questions:
            lines.append(
                f"Q{q['number']} ({q['type']}):\n"
                f"Ask: {q['text']}\n"
                f"If vague: {q['followup_if_vague']}\n"
                f"Transition: {q['transition_phrase']}"
            )
        return "\n\n".join(lines)

    def _elapsed_ms(self) -> int:
        return int((time.time() - self.start_time) * 1000)

    async def save_segment(self, speaker: str, text: str):
        if not text or not text.strip():
            return
        try:
            async with aiohttp.ClientSession() as s:
                await s.post(
                    f"{NEXTJS_INTERNAL_URL}/api/ai-interviews/{self.interview_id}/segment/",
                    json={"speaker": speaker, "text": text.strip(), "timestamp_ms": self._elapsed_ms()},
                    headers={"X-Internal-Key": INTERNAL_API_KEY},
                )
        except Exception:
            logger.exception("Failed to save %s segment for interview %s", speaker, self.interview_id)

    async def on_user_turn_completed(self, turn_ctx, new_message):
        await self.save_segment("CANDIDATE", new_message.text_content)

    @function_tool
    async def end_interview(self, context: RunContext) -> None:
        """Call this exactly once, immediately after delivering the final
        goodbye line and only once the candidate has confirmed they have
        nothing more to add. This ends the interview call."""
        # Let the goodbye that triggered this call finish playing before the
        # room disconnects, otherwise the candidate gets cut off mid-word.
        await context.wait_for_playout()
        self._call_ended.set()


async def _fetch_agent_data(interview_id: str) -> dict:
    async with aiohttp.ClientSession() as s:
        async with s.get(
            f"{NEXTJS_INTERNAL_URL}/api/ai-interviews/{interview_id}/agent-data/",
            headers={"X-Internal-Key": INTERNAL_API_KEY},
        ) as r:
            r.raise_for_status()
            return await r.json()


async def _patch_status(interview_id: str, status: str):
    async with aiohttp.ClientSession() as s:
        await s.patch(
            f"{NEXTJS_INTERNAL_URL}/api/ai-interviews/{interview_id}/status/",
            json={"status": status},
            headers={"X-Internal-Key": INTERNAL_API_KEY},
        )


async def _mark_complete(interview_id: str):
    async with aiohttp.ClientSession() as s:
        await s.post(
            f"{NEXTJS_INTERNAL_URL}/api/ai-interviews/{interview_id}/complete/",
            headers={"X-Internal-Key": INTERNAL_API_KEY},
        )


async def entrypoint(ctx: JobContext):
    await ctx.connect()

    metadata = json.loads(ctx.room.metadata or "{}")
    interview_id = metadata.get("interview_id")
    if not interview_id:
        logger.error("Room %s has no interview_id in metadata -- refusing to start", ctx.room.name)
        return

    interview_data = await _fetch_agent_data(interview_id)
    await _patch_status(interview_id, "IN_PROGRESS")

    call_ended = asyncio.Event()
    agent = InterviewAgent(interview_data, call_ended)

    session = AgentSession(
        # Realtime API: one persistent speech-to-speech session instead of
        # separate STT/LLM/TTS calls -- no whisper-1 transcription round-trip,
        # no separate chat-completion round-trip, no separate TTS round-trip.
        # gpt-4o-mini-realtime-preview (not the full gpt-4o-realtime-preview)
        # for the same reason the old pipeline used gpt-4o-mini: this is a
        # rigid, fully-scripted interview (exact opening/closing lines, fixed
        # question order), so the smaller/faster/cheaper realtime model
        # tracks it just as reliably. Turn detection (when the candidate has
        # actually finished talking) is handled by the Realtime API's own
        # server-side VAD -- no separate silero.VAD or turn_handling config
        # needed or accepted here, unlike the pipeline mode this replaces.
        llm=openai.realtime.RealtimeModel(
            model="gpt-4o-mini-realtime-preview",
            voice="shimmer",
            temperature=0.65,
        ),
    )

    @session.on("conversation_item_added")
    def _on_conversation_item_added(event: ConversationItemAddedEvent):
        # event.item is ChatMessage | AgentHandoff -- only ChatMessage has .role;
        # AgentHandoff is for multi-agent handoffs, which this single-agent
        # interview never uses, but the SDK still allows it on the event type.
        if isinstance(event.item, ChatMessage) and event.item.role == "assistant":
            asyncio.create_task(agent.save_segment("ALEX", event.item.text_content))

    @ctx.room.on("participant_disconnected")
    def _on_participant_disconnected(participant: rtc.RemoteParticipant):
        # Candidate hung up on their end -- same exit path as the agent
        # calling end_interview after its own goodbye.
        call_ended.set()

    await session.start(
        agent=agent,
        room=ctx.room,
        room_input_options=RoomInputOptions(),
    )

    # Alex must greet first, unprompted -- turn-detection otherwise waits for
    # the candidate to speak before generating any reply, which would leave
    # them staring at silence. generate_reply forces the opening line (the
    # instructions here just point back at the prompt's own OPENING script,
    # already-formatted per-candidate) the moment the session is live.
    session.generate_reply(
        instructions="Greet the candidate now, exactly per the OPENING section of your instructions."
    )

    max_seconds = (interview_data["duration_minutes"] * 60) + 60

    try:
        await asyncio.wait_for(call_ended.wait(), timeout=max_seconds)
    except asyncio.TimeoutError:
        pass

    await ctx.room.disconnect()
    await _mark_complete(interview_id)


if __name__ == "__main__":
    agents.cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, num_idle_processes=1))
