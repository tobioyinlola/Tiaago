import pytest

from app.services import assessment_service as svc
from app.models.assessment import StageResult


def test_generate_overall_feedback_defaults_when_no_inputs():
    out = svc.generate_overall_feedback()
    assert isinstance(out, dict)
    assert out["overall_score"] == 75
    assert "recommendation" in out
    assert "detailed_feedback" in out


def test_generate_overall_feedback_weighted_scores_and_recommendation():
    resume = {"total_score": 90, "strengths": [], "areas_for_improvement": []}
    culture = {"score": 80, "values_assessed": [], "alignment_level": "High"}
    skills = {"overall_score": 70}

    out = svc.generate_overall_feedback(
        resume_analysis=resume,
        culture_fit_results=culture,
        skills_assessment_results=skills,
    )

    # Weighted: 90*0.4 + 80*0.2 + 70*0.4 = 36 + 16 + 28 = 80
    assert 79.9 <= out["overall_score"] <= 80.1
    assert out["recommendation"] == "Recommend - Proceed to Next Stage"


def test_generate_overall_feedback_ai_failure_returns_fallback(monkeypatch):
    def _fail_client():
        raise RuntimeError("no ai client")

    monkeypatch.setattr(svc, "get_openai_client", _fail_client)

    out = svc.generate_overall_feedback({"total_score": 60, "strengths": [], "areas_for_improvement": []})
    # Should return conservative fallback with 0 score and specific message
    assert out["overall_score"] == 0
    assert out["recommendation"] == "Unable to generate feedback"
    assert "detailed_feedback" in out


def test_evaluate_stage_progression_sequence():
    # No results: ready to start MCQ
    out0 = svc.evaluate_stage_progression([])
    assert out0["can_progress"] is True and out0["next_stage"] == "mcq"

    # After MCQ: can proceed to coding
    sr1 = StageResult(stage="mcq", grading_results=[], overall_score=75.0, feedback="done")
    out1 = svc.evaluate_stage_progression([sr1])
    assert out1["can_progress"] is True and out1["next_stage"] == "coding"

    # After coding: complete
    sr2 = StageResult(stage="coding", grading_results=[], overall_score=80.0, feedback="done")
    out2 = svc.evaluate_stage_progression([sr1, sr2])
    assert out2["can_progress"] is False and out2["next_stage"] is None


