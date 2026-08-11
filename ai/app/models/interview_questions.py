from pydantic import BaseModel
from typing import List, Optional


class InterviewQuestionsRequest(BaseModel):
    job_title: str
    company_name: str = ""
    description: str = ""
    requirements: str = ""
    resume_summary: str = ""
    assessment_score: Optional[float] = None
    weak_areas: List[str] = []
    duration_minutes: int = 10
    questions_count: int = 6
    # Computed Django-side from Job.role_category (+ a title-keyword
    # fallback) -- see ai_interviews.tasks._is_technical_role. Swaps in a
    # genuinely technical question slot instead of the generic SITUATIONAL
    # one -- see interview_questions_service.py's
    # TECHNICAL_QUESTION_TYPES_BY_COUNT.
    is_technical_role: bool = False


class GeneratedInterviewQuestion(BaseModel):
    number: int
    type: str  # OPENER | MOTIVATION | EXPERIENCE | SITUATIONAL | TECHNICAL | CULTURAL_FIT | CLOSING
    text: str
    expected_duration_seconds: int = 90
    followup_if_vague: str = ""
    good_signals: List[str] = []
    concern_signals: List[str] = []
    transition_phrase: str = ""


class InterviewQuestionsResult(BaseModel):
    questions: List[GeneratedInterviewQuestion] = []
    model_used: str = ""
