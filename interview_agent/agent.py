"""Standalone LiveKit voice agent that conducts one Tiaago AI interview.

Runs as its own long-lived worker process (NOT part of the Django backend or
the ai/ FastAPI generation service) -- see ../docker-compose.yml's
`interview-agent` service. Connects to LiveKit, joins the room the candidate
was given a token for (see backend/ai_interviews/views.py
AIInterviewStartSessionView), and conducts the interview using OpenAI
Whisper for STT, GPT-4o for the conversation, and OpenAI TTS (voice: nova)
for Alex's voice.

Transcript capture is a byproduct of the conversation pipeline itself --
every candidate turn (once STT finalizes it) and every Alex turn (once GPT-4o
finalizes it, before TTS speaks it) is POSTed to Django's internal segment
endpoint as it happens. No separate transcription service, no extra cost,
no added latency.
"""

import asyncio
import json
import logging
import os
import time

import aiohttp
from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import Agent, AgentSession, JobContext, RoomInputOptions, WorkerOptions
from livekit.agents.voice.events import ConversationItemAddedEvent
from livekit.plugins import openai, silero

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

OPENING -- say this exactly:
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
Then: 'Brilliant. It was great speaking with you. Best of luck and take care.'

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
    def __init__(self, interview_data: dict):
        self.interview_id = interview_data["id"]
        self.start_time = time.time()

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

    agent = InterviewAgent(interview_data)

    session = AgentSession(
        stt=openai.STT(model="whisper-1"),
        llm=openai.LLM(model="gpt-4o", temperature=0.65),
        tts=openai.TTS(model="tts-1", voice="nova"),
        vad=silero.VAD.load(),
        max_endpointing_delay=0.8,
    )

    @session.on("conversation_item_added")
    def _on_conversation_item_added(event: ConversationItemAddedEvent):
        if event.item.role == "assistant":
            asyncio.create_task(agent.save_segment("ALEX", event.item.text_content))

    disconnected = asyncio.Event()

    @ctx.room.on("participant_disconnected")
    def _on_participant_disconnected(participant: rtc.RemoteParticipant):
        disconnected.set()

    await session.start(
        agent=agent,
        room=ctx.room,
        room_input_options=RoomInputOptions(),
    )

    max_seconds = (interview_data["duration_minutes"] * 60) + 60

    try:
        await asyncio.wait_for(disconnected.wait(), timeout=max_seconds)
    except asyncio.TimeoutError:
        pass

    await _mark_complete(interview_id)


if __name__ == "__main__":
    agents.cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, num_idle_processes=1))
