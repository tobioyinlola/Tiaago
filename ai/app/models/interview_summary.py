from pydantic import BaseModel
from typing import Dict, List, Optional


class InterviewSummaryConcern(BaseModel):
    text: str
    severity: str = "MEDIUM"  # LOW | MEDIUM | HIGH


class InterviewSummaryRequest(BaseModel):
    job_title: str
    transcript: str = ""
    notes: str = ""
    competency_scores: str = ""  # pre-formatted summary, not raw JSON
    assessment_score: Optional[float] = None


class InterviewSummaryResult(BaseModel):
    executive_summary: str = ""
    strengths: List[str] = []
    concerns: List[InterviewSummaryConcern] = []
    recommendation: str = "MAYBE"  # STRONG_YES | YES | MAYBE | NO | STRONG_NO
    confidence: str = "MEDIUM"  # LOW | MEDIUM | HIGH
    overall_score: Optional[float] = None
    action_items: List[str] = []
    token_usage: Optional[Dict[str, int]] = None
    model_used: str = ""


class CandidateFeedbackRequest(BaseModel):
    candidate_name: str
    job_title: str
    company_name: str
    transcript: str = ""
    executive_summary: str = ""
    recommendation: str = "MAYBE"


class CandidateFeedbackResult(BaseModel):
    content: str = ""
    model_used: str = ""
