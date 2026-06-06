from pydantic import BaseModel, Field
from typing import Dict, List, Optional

class ResumeAnalysis(BaseModel):
    role_match_status: str = "fail"
    text_authenticity: str = "Unknown"
    text_authenticity_explanation: str = ""
    experience_validation: str = "Unknown"
    experience_validation_explanation: str = ""
    achievement_quality: str = "Unknown"
    achievement_quality_explanation: str = ""
    resume_review_score: int = 0
    skill_matching_score: int = 0
    experience_relevance_score: int = 0
    education_certifications_score: int = 0
    total_score: int = 0
    strengths: List[str] = []
    areas_for_improvement: List[str] = []
    recommendation: str = ""
    detailed_analysis: str = ""
    token_usage: Optional[Dict[str, int]] = None

    class Config:
        validate_assignment = True



class ResumeAnalysisRequest(BaseModel):
    resume_text: str
    job_description: str
