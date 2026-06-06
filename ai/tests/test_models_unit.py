import pytest

from app.models.resume import ResumeAnalysis
from app.models.assessment import (
    AssessmentResult,
    Question,
    StageResult,
    CultureFitResults,
)


def test_resume_analysis_defaults_and_types():
    ra = ResumeAnalysis()
    assert ra.role_match_status in {"fail", "pass"}
    assert isinstance(ra.strengths, list)
    assert isinstance(ra.areas_for_improvement, list)
    assert isinstance(ra.total_score, int)


def test_resume_analysis_assignment_and_bounds():
    ra = ResumeAnalysis(
        role_match_status="pass",
        resume_review_score=35,
        skill_matching_score=30,
        experience_relevance_score=25,
        education_certifications_score=10,
        total_score=100,
        strengths=["A"],
        areas_for_improvement=["B"],
        recommendation="Strongly Recommend",
        detailed_analysis="<ul><li>ok</li></ul>",
    )
    assert ra.total_score == 100
    assert ra.recommendation == "Strongly Recommend"


def test_assessment_models_basic_instantiation():
    q = Question(question="What?", correct_answer="A", options=["A","B"], explanation="")
    ar = AssessmentResult(
        assessment_type="mcq",
        questions=[q],
        ai_determined_difficulty="intermediate",
        role_type="technical",
        skills_assessed=["python"],
    )
    assert ar.assessment_type == "mcq"
    sr = StageResult(stage="mcq", grading_results=[], overall_score=95.0, feedback="ok")
    assert sr.stage == "mcq"


def test_culture_fit_results_forbid_extra_fields():
    with pytest.raises(Exception):
        CultureFitResults(score=80, values_assessed=["Integrity"], alignment_level="High", extra_field=True)


