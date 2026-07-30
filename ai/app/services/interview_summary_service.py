"""Post-interview AI generation: the hiring-recommendation summary and the
draft candidate feedback email. Both run once per interview, right after it
ends, so (unlike interview_live_service.py) latency isn't a design
constraint here -- this follows interview_prep_service.py's shape instead.
Self-contained per the same per-feature-service-file convention.
"""

import json
import logging
import os
import re
from typing import Dict

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

from app.config import settings
from app.models.interview_summary import (
    CandidateFeedbackRequest,
    CandidateFeedbackResult,
    InterviewSummaryRequest,
    InterviewSummaryResult,
)

logger = logging.getLogger(__name__)
logging.getLogger("openai").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

load_dotenv()

openai_api_key = os.getenv("OPENAI_API_KEY")
SUMMARY_MODEL = "gpt-4o"

SUMMARY_SYSTEM_PROMPT = (
    "You are an expert recruitment consultant writing a post-interview summary "
    "and hiring recommendation for a recruiter who just finished the interview. "
    "Base every claim strictly on the transcript and notes provided -- do not "
    "invent details. Return ONLY valid JSON. No other text."
)

SUMMARY_USER_PROMPT_TEMPLATE = """Job title: {job_title}
Assessment score (pre-interview): {assessment_score}

Interview transcript:
{transcript}

Recruiter's live notes:
{notes}

Competency scores the recruiter recorded during the interview:
{competency_scores}

Return this exact JSON:
{{
  "executive_summary": "2-4 sentence overview of how the interview went",
  "strengths": ["Specific strength grounded in the transcript"],
  "concerns": [{{ "text": "Specific concern", "severity": "LOW|MEDIUM|HIGH" }}],
  "recommendation": "STRONG_YES|YES|MAYBE|NO|STRONG_NO",
  "confidence": "LOW|MEDIUM|HIGH",
  "overall_score": 75,
  "action_items": ["Concrete next step for the recruiter, if any"]
}}

If the transcript is too short or empty to draw conclusions from, say so
plainly in executive_summary, set confidence to "LOW", and keep other
fields conservative rather than fabricating detail."""

FEEDBACK_SYSTEM_PROMPT = (
    "You are drafting a warm, professional, specific interview-feedback email "
    "from a recruiter to a candidate. Write plain text only, no markdown, no "
    "JSON, no subject line -- just the email body. Keep it encouraging in tone "
    "regardless of outcome, specific enough to feel genuine (reference at "
    "least one real moment from the interview), and under 200 words."
)

FEEDBACK_USER_PROMPT_TEMPLATE = """Candidate name: {candidate_name}
Job title: {job_title}
Company name: {company_name}
Internal recommendation (do not state this explicitly or its label in the email): {recommendation}
Internal summary (for context, do not copy verbatim): {executive_summary}

Interview transcript excerpt:
{transcript}

Write the candidate feedback email body now."""


def _get_json_chat_client() -> ChatOpenAI:
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    chat_kwargs = dict(
        temperature=0.3,
        model_name=SUMMARY_MODEL,
        openai_api_key=openai_api_key,
        max_tokens=2000,
        timeout=90,
        max_retries=2,
        streaming=False,
        model_kwargs={"response_format": {"type": "json_object"}},
    )
    if settings.OPENAI_BASE_URL:
        chat_kwargs["base_url"] = settings.OPENAI_BASE_URL
    return ChatOpenAI(**chat_kwargs)


def _get_text_chat_client() -> ChatOpenAI:
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    chat_kwargs = dict(
        temperature=0.5,
        model_name=SUMMARY_MODEL,
        openai_api_key=openai_api_key,
        max_tokens=600,
        timeout=60,
        max_retries=2,
        streaming=False,
    )
    if settings.OPENAI_BASE_URL:
        chat_kwargs["base_url"] = settings.OPENAI_BASE_URL
    return ChatOpenAI(**chat_kwargs)


def _extract_token_usage(response) -> Dict[str, int]:
    token_usage: Dict[str, int] = {}
    if response is None:
        return token_usage
    response_metadata = getattr(response, "response_metadata", None)
    if isinstance(response_metadata, dict):
        usage = response_metadata.get("token_usage")
        if isinstance(usage, dict):
            for key, value in usage.items():
                if isinstance(value, (int, float)):
                    token_usage[key] = int(value)
    return token_usage


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


def generate_interview_summary(request: InterviewSummaryRequest) -> InterviewSummaryResult:
    """Raises on failure -- the caller (Django's post-interview Celery task)
    needs to know generation failed so it can set generation_status=FAILED
    and fall back to the review page's manual-entry path."""
    chat = _get_json_chat_client()

    human_prompt = SUMMARY_USER_PROMPT_TEMPLATE.format(
        job_title=request.job_title or "Untitled role",
        assessment_score=request.assessment_score if request.assessment_score is not None else "Not available",
        transcript=(request.transcript or "(no transcript captured)")[:12000],
        notes=(request.notes or "(no notes taken)")[:3000],
        competency_scores=(request.competency_scores or "(none scored)")[:3000],
    )
    messages = [
        {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
        {"role": "user", "content": human_prompt},
    ]

    logger.info(f"Generating interview summary with {SUMMARY_MODEL} for job_title={request.job_title!r}")
    response = chat.invoke(messages)
    content = getattr(response, "content", response)
    if not isinstance(content, str):
        content = str(content)

    parsed = _extract_json(content)
    parsed["token_usage"] = _extract_token_usage(response)
    parsed["model_used"] = SUMMARY_MODEL

    return InterviewSummaryResult(**parsed)


def generate_candidate_feedback(request: CandidateFeedbackRequest) -> CandidateFeedbackResult:
    """Raises on failure -- caller sets InterviewCandidateFeedback.delivery_status
    handling (currently: leaves the feedback row unset, recruiter can retry
    from the review page) rather than sending a broken/empty draft."""
    chat = _get_text_chat_client()

    human_prompt = FEEDBACK_USER_PROMPT_TEMPLATE.format(
        candidate_name=request.candidate_name or "there",
        job_title=request.job_title or "the role",
        company_name=request.company_name or "our company",
        recommendation=request.recommendation,
        executive_summary=(request.executive_summary or "Not available")[:1500],
        transcript=(request.transcript or "(no transcript captured)")[:8000],
    )
    messages = [
        {"role": "system", "content": FEEDBACK_SYSTEM_PROMPT},
        {"role": "user", "content": human_prompt},
    ]

    logger.info(f"Generating candidate feedback with {SUMMARY_MODEL} for candidate={request.candidate_name!r}")
    response = chat.invoke(messages)
    content = getattr(response, "content", response)
    if not isinstance(content, str):
        content = str(content)

    return CandidateFeedbackResult(content=content.strip(), model_used=SUMMARY_MODEL)
