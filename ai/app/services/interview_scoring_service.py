"""Post-AI-interview scoring: turns a full transcript into per-question
scores, category scores, a hiring recommendation, flags, and a candidate
feedback draft. Runs once per completed AI interview. Same shape as
interview_summary_service.py (the equivalent step for human/Interview-Copilot
interviews) -- self-contained per this codebase's per-feature-service-file
convention.
"""

import json
import logging
import os
import re

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

from app.config import settings
from app.models.interview_scoring import InterviewScoringRequest, InterviewScoringResult

logger = logging.getLogger(__name__)
logging.getLogger("openai").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

load_dotenv()

openai_api_key = os.getenv("OPENAI_API_KEY")
SCORING_MODEL = "gpt-4o"

SCORING_SYSTEM_PROMPT = (
    "You are a senior hiring manager reviewing an AI interview transcript for "
    "a competitive role. Your job is to protect the hiring bar, not to be "
    "encouraging. Score every answer on its substance alone -- confidence, "
    "fluency, likability, and polished delivery are not evidence of skill and "
    "must never raise a score on their own. Your default assumption for a "
    "vague, generic, or hedging answer is that it is WEAK evidence, not "
    "moderate evidence -- the burden is on the candidate to demonstrate real, "
    "specific, verifiable substance (named tools, concrete decisions, actual "
    "numbers or outcomes, real trade-offs they weighed), not on you to give "
    "the benefit of the doubt. An answer that could have been given by "
    "someone with no real experience in the role -- generic, textbook, or "
    "copy-paste advice with nothing specific to their own work -- must score "
    "low regardless of how well-spoken it sounds. Reference actual things the "
    "candidate said as evidence for every score you give; a score with no "
    "specific evidence behind it is not defensible.\n\n"
    "PER-QUESTION SCORE ANCHORS (0-10 scale):\n"
    "9-10: Exceptional. Specific, concrete, verifiable evidence (named "
    "tools/systems/numbers/outcomes). Clear first-hand reasoning, no hedging, "
    "directly answers what was asked. Rare -- reserve for genuinely standout "
    "answers.\n"
    "7-8: Strong. Clearly relevant, mostly specific evidence with sound "
    "reasoning, at most a minor gap. This is the bar for a hire-quality "
    "answer, not the median.\n"
    "5-6: Adequate but unremarkable. Directionally correct but generic, "
    "surface-level, or missing concrete specifics -- the kind of answer "
    "someone could give without having actually done the work.\n"
    "3-4: Weak. Vague, mostly deflects the actual question, no real evidence, "
    "or only loosely related to what was asked.\n"
    "1-2: Very weak. Off-topic, contradicts a stated job requirement, or "
    "reveals a genuine gap relative to what this role needs.\n"
    "0: No meaningful response.\n\n"
    "OVERALL RECOMMENDATION BAR:\n"
    "PROCEED requires a consistent pattern of 7+ (STRONG or better) answers "
    "across most questions, with no unresolved HIGH-severity concern. This is "
    "not the default outcome for an average interview -- most candidates who "
    "interview reasonably well without standing out should land on "
    "NEEDS_REVIEW, not PROCEED. DO_NOT_PROCEED is for a clear pattern of weak "
    "(3-4 or lower) answers, a contradiction of a core requirement, or a "
    "genuine red flag -- do not soften this to NEEDS_REVIEW out of courtesy. "
    "Be honest and evidence-based, but calibrate strict: when genuinely "
    "unsure between two adjacent scores or recommendations, choose the lower "
    "one. Return only valid JSON."
)

SCORING_USER_PROMPT_TEMPLATE = """Job: {job_title} at {company_name}
Requirements: {requirements}

Transcript:
{transcript}

Questions and evaluation criteria:
{questions_json}

Return this exact JSON:
{{
  "executive_summary": "string",
  "per_question_scores": [
    {{
      "question_number": 1,
      "candidate_response_summary": "string",
      "score": 7.5,
      "signal_strength": "STRONG|MODERATE|WEAK|NO_RESPONSE",
      "ai_notes": "string"
    }}
  ],
  "overall_score": 75,
  "communication_score": 7.5,
  "confidence_score": 7.5,
  "relevance_score": 7.5,
  "clarity_score": 7.5,
  "strengths": ["string"],
  "concerns": [
    {{ "text": "string", "severity": "LOW|MEDIUM|HIGH", "evidence": "string" }}
  ],
  "recommendation": "PROCEED|DO_NOT_PROCEED|NEEDS_REVIEW",
  "recommendation_confidence": "HIGH|MEDIUM|LOW",
  "recommendation_reasons": ["string"],
  "flags": [
    {{ "type": "string", "description": "string", "impact": "string" }}
  ],
  "candidate_feedback": "string -- warm, specific, no scores or outcome hints",
  "recruiter_notes": "string"
}}

If the transcript is too short or empty to draw conclusions from, say so
plainly in executive_summary, set recommendation_confidence to "LOW", and
keep every score conservative rather than fabricating detail."""


def _get_json_chat_client() -> ChatOpenAI:
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    chat_kwargs = dict(
        temperature=0.3,
        model_name=SCORING_MODEL,
        openai_api_key=openai_api_key,
        max_tokens=3000,
        timeout=120,
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


def score_interview(request: InterviewScoringRequest) -> InterviewScoringResult:
    """Raises on failure -- the caller (Django's post-interview Celery task)
    sets summary_status=FAILED and leaves the review page's manual-entry
    path available, same pattern as interview_summary_service.generate_interview_summary."""
    chat = _get_json_chat_client()

    questions_json = json.dumps(
        [q.model_dump() for q in request.questions], indent=2
    ) if request.questions else "(none captured)"

    human_prompt = SCORING_USER_PROMPT_TEMPLATE.format(
        job_title=request.job_title or "Untitled role",
        company_name=request.company_name or "the company",
        requirements=(request.requirements or "")[:2000],
        transcript=(request.transcript or "(no transcript captured)")[:14000],
        questions_json=questions_json[:4000],
    )
    messages = [
        {"role": "system", "content": SCORING_SYSTEM_PROMPT},
        {"role": "user", "content": human_prompt},
    ]

    logger.info(f"Scoring AI interview with {SCORING_MODEL} for job_title={request.job_title!r}")
    response = chat.invoke(messages)
    content = getattr(response, "content", response)
    if not isinstance(content, str):
        content = str(content)

    parsed = _extract_json(content)
    parsed["model_used"] = SCORING_MODEL

    return InterviewScoringResult(**parsed)
