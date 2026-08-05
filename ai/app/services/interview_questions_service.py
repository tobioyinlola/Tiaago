"""AI-interview question generation, run once per AI interview right after a
candidate passes their assessment (job.ai_interview_enabled=True). Follows
interview_summary_service.py's shape exactly (same ChatOpenAI client
helper, same JSON-extraction fallback) -- self-contained per this codebase's
per-feature-service-file convention.
"""

import json
import logging
import os
import re

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

from app.config import settings
from app.models.interview_questions import InterviewQuestionsRequest, InterviewQuestionsResult

logger = logging.getLogger(__name__)
logging.getLogger("openai").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

load_dotenv()

openai_api_key = os.getenv("OPENAI_API_KEY")
QUESTIONS_MODEL = "gpt-4o"

QUESTION_TYPES_BY_COUNT = {
    4: ["OPENER", "EXPERIENCE", "CULTURAL_FIT", "CLOSING"],
    5: ["OPENER", "EXPERIENCE", "SITUATIONAL", "CULTURAL_FIT", "CLOSING"],
    6: ["OPENER", "MOTIVATION", "EXPERIENCE", "SITUATIONAL", "CULTURAL_FIT", "CLOSING"],
}

QUESTIONS_SYSTEM_PROMPT = (
    "You are an expert recruiter designing questions for a structured AI voice "
    "interview. Questions must sound completely natural when spoken aloud. "
    "Short, conversational sentences only. No lists or bullet points in question "
    "text. Every question must be specific to this job and this candidate -- "
    "never generic or cliche ('tell me about a time you failed' is banned). "
    "Pull a real detail from the job description or resume into the question "
    "itself so it feels like a genuine, curious conversation, not a template. "
    "Return only valid JSON."
)

QUESTIONS_USER_PROMPT_TEMPLATE = """Job: {job_title} at {company_name}
Description: {description}
Requirements: {requirements}
Resume summary: {resume_summary}
Assessment score: {assessment_score}/100
Weak areas from assessment: {weak_areas}
Duration: {duration_minutes} minutes
Number of questions: {questions_count}

Question types, in this exact order: {question_types}

OPENER (60-90 sec): Warm, conversational. Ask them to introduce themselves and
what brought them to this role.

MOTIVATION (60-90 sec): Why this specific role right now. Reference the job
description specifically.

EXPERIENCE (90-120 sec): Reference something specific from their resume. Make
it feel personal.

SITUATIONAL (90-120 sec): A realistic scenario from this specific role.

CHALLENGE (60-90 sec): A professional challenge relevant to this role type and
what they learned.

CULTURAL_FIT (60-90 sec): How they like to work -- team style, feedback,
pace, or what kind of environment brings out their best. Ground it in
something real about this company/team from the job description, not a
generic "describe your ideal workplace" question.

CLOSING (30-45 sec): Invite them to share anything or ask one question.

The "questions" array below MUST contain exactly {questions_count} objects,
one per type listed above in that exact order -- not fewer, not one example.
Return this exact JSON shape (repeat the object for every one of the
{questions_count} questions, incrementing "number" each time):
{{
  "questions": [
    {{
      "number": 1,
      "type": "OPENER",
      "text": "The spoken question text",
      "expected_duration_seconds": 75,
      "followup_if_vague": "Follow-up if answer is too brief",
      "good_signals": ["signal 1"],
      "concern_signals": ["concern 1"],
      "transition_phrase": "Natural phrase to move to the next question"
    }},
    {{
      "number": 2,
      "type": "...next type in the list...",
      "...": "...same shape, and so on for all {questions_count} questions..."
    }}
  ]
}}"""


def _get_json_chat_client() -> ChatOpenAI:
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    chat_kwargs = dict(
        temperature=0.3,
        model_name=QUESTIONS_MODEL,
        openai_api_key=openai_api_key,
        max_tokens=2500,
        timeout=90,
        max_retries=2,
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


def generate_interview_questions(request: InterviewQuestionsRequest) -> InterviewQuestionsResult:
    """Raises on failure -- the caller (Django's post-assessment-pass Celery
    task) needs to know generation failed so it can retry / mark the
    interview FAILED instead of inviting a candidate to an interview with no
    questions."""
    chat = _get_json_chat_client()

    question_types = QUESTION_TYPES_BY_COUNT.get(request.questions_count, QUESTION_TYPES_BY_COUNT[6])

    human_prompt = QUESTIONS_USER_PROMPT_TEMPLATE.format(
        job_title=request.job_title or "the role",
        company_name=request.company_name or "the company",
        description=(request.description or "")[:4000],
        requirements=(request.requirements or "")[:2000],
        resume_summary=(request.resume_summary or "Not available")[:3000],
        assessment_score=request.assessment_score if request.assessment_score is not None else "Not available",
        weak_areas=", ".join(request.weak_areas) if request.weak_areas else "None noted",
        duration_minutes=request.duration_minutes,
        questions_count=request.questions_count,
        question_types=", ".join(question_types),
    )
    messages = [
        {"role": "system", "content": QUESTIONS_SYSTEM_PROMPT},
        {"role": "user", "content": human_prompt},
    ]

    logger.info(f"Generating {request.questions_count} interview questions with {QUESTIONS_MODEL} for job_title={request.job_title!r}")
    response = chat.invoke(messages)
    content = getattr(response, "content", response)
    if not isinstance(content, str):
        content = str(content)

    parsed = _extract_json(content)
    parsed["model_used"] = QUESTIONS_MODEL

    return InterviewQuestionsResult(**parsed)
