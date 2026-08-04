from pydantic import BaseModel
from typing import Dict, List, Optional


class ScoringQuestionInput(BaseModel):
    number: int
    text: str
    good_signals: List[str] = []
    concern_signals: List[str] = []


class InterviewScoringRequest(BaseModel):
    job_title: str
    company_name: str = ""
    requirements: str = ""
    candidate_name: str = ""
    transcript: str = ""
    questions: List[ScoringQuestionInput] = []


class PerQuestionScore(BaseModel):
    question_number: int
    candidate_response_summary: str = ""
    score: float = 0
    signal_strength: str = "MODERATE"  # STRONG | MODERATE | WEAK | NO_RESPONSE
    ai_notes: str = ""


class ScoringConcern(BaseModel):
    text: str
    severity: str = "MEDIUM"  # LOW | MEDIUM | HIGH
    evidence: str = ""


class ScoringFlag(BaseModel):
    type: str
    description: str = ""
    impact: str = ""


class InterviewScoringResult(BaseModel):
    executive_summary: str = ""
    per_question_scores: List[PerQuestionScore] = []
    overall_score: float = 0
    communication_score: float = 0
    confidence_score: float = 0
    relevance_score: float = 0
    clarity_score: float = 0
    strengths: List[str] = []
    concerns: List[ScoringConcern] = []
    recommendation: str = "NEEDS_REVIEW"  # PROCEED | DO_NOT_PROCEED | NEEDS_REVIEW
    recommendation_confidence: str = "MEDIUM"  # HIGH | MEDIUM | LOW
    recommendation_reasons: List[str] = []
    flags: List[ScoringFlag] = []
    candidate_feedback: str = ""
    recruiter_notes: str = ""
    token_usage: Optional[Dict[str, int]] = None
    model_used: str = ""
