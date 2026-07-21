from pydantic import BaseModel
from typing import List, Optional, Dict

class TestCase(BaseModel):
    input: str
    expected_output: str

class Question(BaseModel):
    question: str
    answers: Optional[List[str]] = None  # For MCQ, this will contain options
    correct_answer: Optional[str] = None  # Required for MCQ, optional for coding
    function_signature: Optional[str] = None  # For coding questions
    test_cases: Optional[List[TestCase]] = None  # For coding questions
    explanation: Optional[str] = None  # Explanation for the correct answer

class MultiStageAssessment(BaseModel):
    assessment_id: str
    role_type: str
    job_description: str  # Full job description for AI analysis
    ai_determined_difficulty: str  # AI analyzes job description to set this
    current_stage: str  # "mcq" or "coding"
    total_stages: int
    mcq_assessment: Optional['AssessmentResult'] = None
    coding_assessment: Optional['AssessmentResult'] = None
    stage_completed: List[str] = []
    token_usage: Optional[Dict[str, int]] = None

class AssessmentResult(BaseModel):
    assessment_type: str
    questions: List[Question]
    ai_determined_difficulty: str  # AI analyzes and determines difficulty
    role_type: Optional[str] = None  # "technical" or "non-technical"
    skills_assessed: Optional[List[str]] = None  # Skills being tested
    stage: Optional[str] = None  # "mcq" or "coding" for multi-stage assessments
    assessment_id: Optional[str] = None
    token_usage: Optional[Dict[str, int]] = None

class CodingAnswer(BaseModel):
    question: str
    user_answer: str

class MCQAnswer(BaseModel):
    question: str
    selected_answer: str

class GradingResult(BaseModel):
    question: str
    user_answer: str
    is_correct: bool
    feedback: str
    score: Optional[float] = None  # Numerical score (0-100)
    score_rationale: Optional[Dict[str, str]] = None # Rationale for the score

class PlagiarismCheckResult(BaseModel):
    question: str
    user_answer: str
    plagiarism_score: float  # 0 (clearly original) - 100 (near-certain AI-generated/copied)
    verdict: str  # "original" | "suspicious" | "likely_plagiarized"
    indicators: List[str]  # short bullet reasons behind the score
    summary: str  # one/two sentence human-readable explanation
    token_usage: Optional[Dict[str, int]] = None
    token_usage: Optional[Dict[str, int]] = None

class StageResult(BaseModel):
    stage: str  # "mcq" or "coding"
    grading_results: List[GradingResult]
    overall_score: float
    feedback: str

class AssessmentSubmission(BaseModel):
    assessment_id: str
    candidate_id: Optional[str] = None
    stage: Optional[str] = None  # Which stage is being submitted
    coding_answers: Optional[List[CodingAnswer]] = None
    mcq_answers: Optional[List[MCQAnswer]] = None

class MultiStageSubmission(BaseModel):
    assessment_id: str
    candidate_id: Optional[str] = None
    mcq_submission: Optional[AssessmentSubmission] = None
    coding_submission: Optional[AssessmentSubmission] = None
    current_stage: str
    overall_results: Optional[List[StageResult]] = None

class CultureFitQuestion(BaseModel):
    question: str
    options: List[str]
    correct_option: str
    explanation: Optional[str] = None

class CultureFitAssessment(BaseModel):
    questions: List[CultureFitQuestion]
    company_values_assessed: List[str]
    token_usage: Optional[Dict[str, int]] = None


class CultureFitResults(BaseModel):
    score: int
    values_assessed: List[str]
    alignment_level: str

    class Config:
        extra = "forbid"


class SkillsAssessmentResults(BaseModel):
    overall_score: int
    technical_score: int
    problem_solving_score: int

    class Config:
        extra = "forbid"


class CategorizedSection(BaseModel):
    category: str
    questions: List[Question]


class CategorizedAssessmentResult(BaseModel):
    sections: List[CategorizedSection]
    ai_determined_difficulty: str
    role_type: Optional[str] = None
    skills_assessed: Optional[List[str]] = None
    token_usage: Optional[Dict[str, int]] = None