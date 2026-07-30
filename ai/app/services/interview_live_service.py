"""Live-interview-time AI features: audio-chunk transcription (Whisper) and
the AI copilot suggestion engine. Both are called repeatedly (every ~10s and
every candidate transcript segment respectively) while an interview is in
progress, so both are kept fast/cheap relative to interview_prep_service.py's
once-per-interview brief generation. Self-contained per the same
per-feature-service-file convention as the other services/*.py files.
"""

import json
import logging
import os
import re
from typing import Dict

from dotenv import load_dotenv
from openai import OpenAI
from langchain_openai import ChatOpenAI

from app.config import settings
from app.models.interview_live import (
    CopilotSuggestionRequest,
    CopilotSuggestionResult,
    TranscribeAudioResult,
)

logger = logging.getLogger(__name__)
logging.getLogger("openai").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

load_dotenv()

openai_api_key = os.getenv("OPENAI_API_KEY")

WHISPER_MODEL = "whisper-1"
COPILOT_MODEL = "gpt-4o"
# Below this, a suggestion is too speculative to interrupt a live interview with.
COPILOT_CONFIDENCE_THRESHOLD = 0.65
COPILOT_MAX_SUGGESTIONS = 2

COPILOT_SYSTEM_PROMPT = (
    "You are a live AI copilot whispering suggestions to a recruiter mid-interview. "
    "You see only the last few exchanges, not the full transcript. Be terse and "
    "concrete -- every suggestion is read in a few seconds while the recruiter is "
    "actively listening to the candidate. Only surface a suggestion when it is "
    "genuinely useful right now; when nothing is worth interrupting for, return "
    "has_suggestion=false and empty arrays. Return ONLY valid JSON. No other text."
)

COPILOT_USER_PROMPT_TEMPLATE = """Role being interviewed for: {job_title}
Elapsed time: {elapsed_minutes} of {target_duration_minutes} minutes

Recent conversation (most recent last):
{recent_exchanges}

Question currently being discussed: {active_question}

Competencies not yet covered: {uncovered_competencies}

Candidate resume watch-areas to verify if the chance arises: {watch_areas}

Return this exact JSON:
{{
  "has_suggestion": true,
  "suggestions": [
    {{ "type": "FOLLOWUP_QUESTION|MISSING_COMPETENCY|RESUME_CONTRADICTION|TIME_WARNING",
       "content": "One short, concrete, speakable suggestion",
       "confidence": 0.0 }}
  ],
  "evidence": [
    {{ "competency_id": "id from the uncovered list, or a covered one this exchange speaks to",
       "competency_name": "matching name",
       "quote": "short quote from the candidate's last answer supporting this",
       "strength": "WEAK|MODERATE|STRONG" }}
  ]
}}

Only include a suggestion if confidence > {threshold}. Return at most {max_suggestions}
suggestions, ranked by usefulness right now. Only include evidence when the
candidate's most recent answer actually speaks to a competency -- do not invent
evidence for competencies that weren't touched on."""


def _get_chat_client(max_tokens: int, temperature: float, model: str) -> ChatOpenAI:
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")

    chat_kwargs = dict(
        temperature=temperature,
        model_name=model,
        openai_api_key=openai_api_key,
        max_tokens=max_tokens,
        timeout=30,
        max_retries=1,
        streaming=False,
        model_kwargs={"response_format": {"type": "json_object"}},
    )
    if settings.OPENAI_BASE_URL:
        chat_kwargs["base_url"] = settings.OPENAI_BASE_URL
    return ChatOpenAI(**chat_kwargs)


def _extract_json(text: str) -> dict:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    raise ValueError("No valid JSON object found in the model response")


def transcribe_audio_chunk(audio_bytes: bytes, filename: str) -> TranscribeAudioResult:
    """Raises on failure -- the caller (Django's WebSocket consumer) treats a
    failed chunk as a dropped chunk (log + skip), not a fatal interview error."""
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")

    client = OpenAI(api_key=openai_api_key, base_url=settings.OPENAI_BASE_URL or None)

    response = client.audio.transcriptions.create(
        model=WHISPER_MODEL,
        file=(filename, audio_bytes),
        response_format="verbose_json",
    )

    text = (getattr(response, "text", "") or "").strip()
    segments = getattr(response, "segments", None) or []
    if segments:
        no_speech_probs = [
            getattr(seg, "no_speech_prob", None) if not isinstance(seg, dict) else seg.get("no_speech_prob")
            for seg in segments
        ]
        no_speech_probs = [p for p in no_speech_probs if isinstance(p, (int, float))]
        avg_confidence = (
            sum(1 - p for p in no_speech_probs) / len(no_speech_probs) if no_speech_probs else 0.5
        )
    else:
        avg_confidence = 0.3 if text else 0.0

    return TranscribeAudioResult(
        text=text,
        confidence=round(max(0.0, min(1.0, avg_confidence)), 2),
        no_speech=not text,
    )


def generate_copilot_suggestion(request: CopilotSuggestionRequest) -> CopilotSuggestionResult:
    """Raises on failure -- the caller treats a failed call as "no suggestion
    this cycle" (log + skip), never as fatal to the live interview."""
    chat = _get_chat_client(max_tokens=500, temperature=0.4, model=COPILOT_MODEL)

    recent_exchanges = "\n".join(
        f"{ex.speaker}: {ex.text}" for ex in request.recent_exchanges
    ) or "(no conversation yet)"
    uncovered_competencies = ", ".join(
        f"{c.name} ({c.id})" for c in request.uncovered_competencies
    ) or "(all covered)"
    watch_areas = "; ".join(request.watch_areas) or "(none noted)"

    human_prompt = COPILOT_USER_PROMPT_TEMPLATE.format(
        job_title=request.job_title or "this role",
        elapsed_minutes=request.elapsed_minutes,
        target_duration_minutes=request.target_duration_minutes,
        recent_exchanges=recent_exchanges,
        active_question=request.active_question or "(none selected)",
        uncovered_competencies=uncovered_competencies,
        watch_areas=watch_areas,
        threshold=COPILOT_CONFIDENCE_THRESHOLD,
        max_suggestions=COPILOT_MAX_SUGGESTIONS,
    )

    messages = [
        {"role": "system", "content": COPILOT_SYSTEM_PROMPT},
        {"role": "user", "content": human_prompt},
    ]

    response = chat.invoke(messages)
    content = getattr(response, "content", response)
    if not isinstance(content, str):
        content = str(content)

    parsed = _extract_json(content)
    result = CopilotSuggestionResult(**parsed)

    result.suggestions = [
        s for s in result.suggestions if s.confidence > COPILOT_CONFIDENCE_THRESHOLD
    ][:COPILOT_MAX_SUGGESTIONS]
    result.has_suggestion = bool(result.suggestions)

    return result
