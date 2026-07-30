from pydantic import BaseModel
from typing import List, Optional


class TranscribeAudioResult(BaseModel):
    text: str = ""
    confidence: float = 0.0
    no_speech: bool = False


class CopilotExchange(BaseModel):
    speaker: str  # RECRUITER | CANDIDATE
    text: str


class CopilotCompetency(BaseModel):
    id: str
    name: str


class CopilotSuggestionRequest(BaseModel):
    job_title: str = ""
    recent_exchanges: List[CopilotExchange] = []
    active_question: Optional[str] = None
    uncovered_competencies: List[CopilotCompetency] = []
    watch_areas: List[str] = []
    elapsed_minutes: int = 0
    target_duration_minutes: int = 30


class CopilotSuggestion(BaseModel):
    type: str  # FOLLOWUP_QUESTION | MISSING_COMPETENCY | RESUME_CONTRADICTION | TIME_WARNING
    content: str
    confidence: float


class CopilotEvidence(BaseModel):
    competency_id: str
    competency_name: str
    quote: str
    strength: str = "MODERATE"  # WEAK | MODERATE | STRONG


class CopilotSuggestionResult(BaseModel):
    has_suggestion: bool = False
    suggestions: List[CopilotSuggestion] = []
    evidence: List[CopilotEvidence] = []
