from pydantic import BaseModel, Field
from typing import Dict, List, Optional


class InterviewPrepCareerEntry(BaseModel):
    date: str = ""
    role: str = ""
    company: str = ""
    duration: str = ""
    gap: bool = False
    gap_duration: Optional[str] = None


class InterviewPrepStrength(BaseModel):
    text: str
    source: str = "RESUME"  # RESUME | ASSESSMENT | BOTH
    evidence: str = ""


class InterviewPrepWatchArea(BaseModel):
    text: str
    source: str = "RESUME"  # RESUME | ASSESSMENT | BOTH
    suggested_probe: str = ""


class InterviewPrepAssessmentHighlights(BaseModel):
    overall_score: Optional[float] = None
    strong_areas: List[str] = []
    weak_areas: List[str] = []
    concerns: List[str] = []


class InterviewPrepCompetency(BaseModel):
    """Not part of any pre-existing "job competencies" system -- there isn't
    one in Tiaago yet. GPT infers a small, role-appropriate competency set
    from the job description/requirements so the recruiter has something
    concrete to build a scorecard against; `questions[].competency_id`
    below references these by `id`."""

    id: str
    name: str
    required: bool = True
    weight: float = 1.0


class InterviewPrepQuestion(BaseModel):
    id: str
    number: int
    text: str
    type: str  # OPENER | BEHAVIOURAL | SITUATIONAL | TECHNICAL | CLOSER
    competency_id: Optional[str] = None
    intent: str = ""
    good_answer_indicators: List[str] = []
    followup_prompts: List[str] = []
    was_asked: bool = False
    timestamp: Optional[str] = None


class InterviewPreparationResult(BaseModel):
    candidate_snapshot: List[str] = []
    career_timeline: List[InterviewPrepCareerEntry] = []
    strengths: List[InterviewPrepStrength] = []
    watch_areas: List[InterviewPrepWatchArea] = []
    suggested_focus: List[str] = []
    assessment_highlights: InterviewPrepAssessmentHighlights = InterviewPrepAssessmentHighlights()
    competencies: List[InterviewPrepCompetency] = []
    questions: List[InterviewPrepQuestion] = []
    token_usage: Optional[Dict[str, int]] = None
    model_used: str = ""

    class Config:
        validate_assignment = True


class InterviewPreparationRequest(BaseModel):
    job_title: str
    job_description: str = ""
    job_requirement: str = ""
    resume_text: str = ""
    assessment_score: Optional[float] = None
    assessment_results: str = ""  # pre-formatted summary, not raw JSON -- keeps the prompt readable
    previous_notes: str = ""
