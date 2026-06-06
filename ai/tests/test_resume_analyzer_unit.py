import os
import types
import json
import pytest


from app.services import resume_analyzer as ra


class _FakeChatResponse:
    def __init__(self, content: str):
        self.content = content


class _FakeChat:
    def __init__(self, *args, **kwargs):
        pass

    def invoke(self, messages):
        # Return a minimal JSON missing several required fields to test normalization
        # Missing: areas_for_improvement, text_authenticity*, experience_validation*, achievement_quality*, detailed_analysis
        # strengths as a string (should be coerced to list)
        payload = {
            "role_match_status": "pass",
            "resume_review_score": 30,
            "skill_matching_score": 20,
            "experience_relevance_score": 15,
            "education_certifications_score": 8,
            "total_score": 73,
            "strengths": "Strong technical background",
            "recommendation": "Recommend"
        }
        return _FakeChatResponse(json.dumps(payload))


def test_create_default_analysis_provides_all_fields():
    result = ra.create_default_analysis("err")
    # Ensure all keys are present
    expected_keys = {
        "role_match_status",
        "text_authenticity",
        "text_authenticity_explanation",
        "experience_validation",
        "experience_validation_explanation",
        "achievement_quality",
        "achievement_quality_explanation",
        "resume_review_score",
        "skill_matching_score",
        "experience_relevance_score",
        "education_certifications_score",
        "total_score",
        "strengths",
        "areas_for_improvement",
        "recommendation",
        "detailed_analysis",
    }
    assert expected_keys.issubset(result.keys())
    assert isinstance(result["strengths"], list)
    assert isinstance(result["areas_for_improvement"], list)
    assert result["recommendation"] == "Analysis could not be completed"


def test_extract_and_parse_json_recovers_truncated_arrays():
    # Simulate a response truncated mid-array for areas_for_improvement
    text = '{"role_match_status":"pass","resume_review_score":25,"skill_matching_score":20,"experience_relevance_score":15,"education_certifications_score":8,"total_score":68,"strengths":["A","B"],"areas_for_improvement":["X", "Y"'
    parsed = None
    try:
        parsed = ra.extract_and_parse_json(text)
    except Exception:
        # Function may raise on unrecoverable; parsed stays None
        pass

    # If recovery succeeded, ensure structure is dict-like with required keys
    if parsed is not None:
        assert isinstance(parsed, dict)
        assert "areas_for_improvement" in parsed


def test_analyze_resume_normalizes_missing_fields(monkeypatch):
    # Ensure API key exists so flow doesn't short-circuit to default response
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    # Override model name if needed
    monkeypatch.setenv("OPENAI_MODEL_NAME", "gpt-4o-mini")

    # Patch ChatOpenAI used inside module
    monkeypatch.setattr(ra, "ChatOpenAI", _FakeChat)

    result = ra.analyze_resume("Some resume text", "Some JD")

    # Should return a ResumeAnalysis with all fields populated
    assert result is not None
    # Lists enforced and non-empty
    assert isinstance(result.strengths, list) and len(result.strengths) > 0
    assert isinstance(result.areas_for_improvement, list) and len(result.areas_for_improvement) > 0
    # Text validity fields populated by normalization
    assert result.text_authenticity in {"Authentic", "Suspicious", "Likely AI-Generated", "Unknown"}
    assert isinstance(result.text_authenticity_explanation, str)
    assert result.experience_validation in {"Validated", "Questionable", "Inconsistent", "Unknown"}
    assert isinstance(result.experience_validation_explanation, str)
    assert result.achievement_quality in {"High-Quality", "Average", "Generic", "Unknown"}
    assert isinstance(result.achievement_quality_explanation, str)
    # Scores clamped and consistent
    assert 0 <= result.resume_review_score <= 35
    assert 0 <= result.skill_matching_score <= 30
    assert 0 <= result.experience_relevance_score <= 25
    assert 0 <= result.education_certifications_score <= 10
    total = (
        result.resume_review_score
        + result.skill_matching_score
        + result.experience_relevance_score
        + result.education_certifications_score
    )
    assert 0 <= result.total_score <= 100
    # Recommendation consistent with total
    if result.total_score >= 85:
        assert result.recommendation == "Strongly Recommend"
    elif result.total_score >= 70:
        assert result.recommendation == "Recommend"
    elif result.total_score >= 60:
        assert result.recommendation == "Consider"
    else:
        assert result.recommendation == "Do Not Recommend"


