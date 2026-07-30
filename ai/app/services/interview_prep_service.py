"""Generates the AI interview-preparation brief a recruiter sees on
/recruiter/dashboard/interviews/[id]/prepare. Self-contained (own OpenAI
client construction, own JSON-extraction helper) following the same
per-feature-service-file convention as assessment_service.py and
resume_analyzer.py rather than sharing code across them.
"""

import json
import logging
import os
import re
from typing import Dict

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

from app.config import settings
from app.models.interview_prep import InterviewPreparationRequest, InterviewPreparationResult

logger = logging.getLogger(__name__)
logging.getLogger("openai").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

load_dotenv()

openai_api_key = os.getenv("OPENAI_API_KEY")

# This feature specifically wants GPT-4o (not the app-wide default, which is
# gpt-4o-mini for cost reasons on higher-volume features) -- a brief only
# generates once per interview, so the better model is worth it here.
INTERVIEW_PREP_MODEL = "gpt-4o"

SYSTEM_PROMPT = (
    "You are an expert recruitment consultant preparing a recruiter for a "
    "structured job interview. Produce a detailed, specific preparation "
    "brief.\nReturn ONLY valid JSON. No other text."
)

USER_PROMPT_TEMPLATE = """Job title: {job_title}
Job description: {job_description}
Job requirements: {job_requirement}
Assessment score: {assessment_score}
Assessment results by question: {assessment_results}
Candidate resume: {resume_text}
Previous interview notes for this candidate at this organisation (if any): {previous_notes}

Return this exact JSON:
{{
  "candidate_snapshot": [
    "Most important thing to know 1",
    "Most important thing to know 2",
    "Most important thing to know 3"
  ],
  "career_timeline": [
    {{ "date": "2019-2022", "role": "Title", "company": "Company",
       "duration": "3 years", "gap": false, "gap_duration": null }}
  ],
  "strengths": [
    {{ "text": "Specific strength", "source": "RESUME|ASSESSMENT|BOTH",
       "evidence": "What supports this" }}
  ],
  "watch_areas": [
    {{ "text": "Specific concern", "source": "RESUME|ASSESSMENT|BOTH",
       "suggested_probe": "How to explore this" }}
  ],
  "suggested_focus": [
    "Competency or area to prioritise"
  ],
  "assessment_highlights": {{
    "overall_score": 72,
    "strong_areas": ["area 1", "area 2"],
    "weak_areas": ["area 1", "area 2"],
    "concerns": ["specific concern"]
  }},
  "competencies": [
    {{ "id": "communication", "name": "Communication", "required": true, "weight": 1.5 }}
  ],
  "questions": [
    {{
      "id": "q1",
      "number": 1,
      "text": "Full question text",
      "type": "OPENER|BEHAVIOURAL|SITUATIONAL|TECHNICAL|CLOSER",
      "competency_id": "id of one of the competencies above, or null",
      "intent": "What this question assesses",
      "good_answer_indicators": ["Signal 1", "Signal 2"],
      "followup_prompts": ["Follow-up if answer is vague", "Follow-up to probe deeper"]
    }}
  ]
}}

There is no pre-existing competency framework for this job -- infer 4 to 7
role-appropriate competencies yourself (e.g. "Communication", "System
Design", "Ownership") and reference them by id from `questions[].competency_id`.

Generate 8-10 questions in this order:
1 OPENER (warm welcome, background summary)
2 BEHAVIOURAL ("tell me about a time...") targeting the highest-weight competencies
2 SITUATIONAL ("what would you do if...") specific to this role's context
2-3 TECHNICAL probing assessment weak areas
1 CLOSER (motivation, questions for us)

Make every question specific to this candidate and this role. Do not use
generic templates."""


def _get_chat_client() -> ChatOpenAI:
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")

    chat_kwargs = dict(
        temperature=0.3,
        model_name=INTERVIEW_PREP_MODEL,
        openai_api_key=openai_api_key,
        max_tokens=2500,
        timeout=120,
        max_retries=2,
        streaming=False,
        model_kwargs={"response_format": {"type": "json_object"}},
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
    """Lightweight sibling of assessment_service.extract_and_parse_json /
    resume_analyzer.extract_and_parse_json -- forced json_object response
    format means this is mostly just json.loads, with a fenced-code-block
    fallback for the rare model slip."""
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    raise ValueError("No valid JSON object found in the model response")


def generate_interview_preparation(request: InterviewPreparationRequest) -> InterviewPreparationResult:
    """Raises on failure -- unlike resume_analyzer.analyze_resume, which
    swallows errors into a default object, the Django caller here needs to
    know generation failed so it can set generation_status=FAILED rather
    than silently saving an empty brief."""
    chat = _get_chat_client()

    human_prompt = USER_PROMPT_TEMPLATE.format(
        job_title=request.job_title or "Untitled role",
        job_description=(request.job_description or "Not provided")[:6000],
        job_requirement=(request.job_requirement or "Not provided")[:3000],
        assessment_score=request.assessment_score if request.assessment_score is not None else "Not available",
        assessment_results=(request.assessment_results or "Not available")[:4000],
        resume_text=(request.resume_text or "Not provided")[:8000],
        previous_notes=(request.previous_notes or "None")[:2000],
    )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": human_prompt},
    ]

    logger.info(f"Generating interview prep brief with {INTERVIEW_PREP_MODEL} for job_title={request.job_title!r}")
    response = chat.invoke(messages)
    content = getattr(response, "content", response)
    if not isinstance(content, str):
        content = str(content)

    parsed = _extract_json(content)
    parsed["token_usage"] = _extract_token_usage(response)
    parsed["model_used"] = INTERVIEW_PREP_MODEL

    return InterviewPreparationResult(**parsed)
