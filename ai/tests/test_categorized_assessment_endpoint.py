"""/create-categorized-assessment takes its input in a JSON body.

The job description is long free text; sent as a query string it overran the
server's request-line limit and generation failed for roles with long
descriptions. Query parameters stay supported for older callers.
"""
from fastapi.testclient import TestClient

from app.main import app
from app.models.assessment import CategorizedAssessmentResult, CategorizedSection

client = TestClient(app)


def _fake_result():
    return CategorizedAssessmentResult(
        sections=[CategorizedSection(category="Role Knowledge", questions=[])],
        ai_determined_difficulty="intermediate",
        role_type="non-technical",
        skills_assessed=None,
        token_usage=None,
    )


def _patch_service(monkeypatch, seen):
    from app.api import routes as routes_mod

    def fake(job_description, categories, questions_per_category, role_type):
        seen.update(
            job_description=job_description, categories=categories,
            questions_per_category=questions_per_category, role_type=role_type,
        )
        return _fake_result()

    monkeypatch.setattr(routes_mod, "create_categorized_mcq_assessment", fake)


def test_json_body_carries_a_description_far_too_long_for_a_url(monkeypatch):
    seen = {}
    _patch_service(monkeypatch, seen)
    long_description = "<p>Responsibilities & requirements for the role. </p>" * 2000  # ~100KB

    response = client.post(
        "/api/v1/create-categorized-assessment",
        json={
            "job_description": long_description,
            "categories": ["Role Knowledge", "Practical Scenarios"],
            "questions_per_category": 7,
            "role_type": "non-technical",
        },
    )

    assert response.status_code == 200, response.text
    assert seen["job_description"] == long_description
    assert seen["categories"] == ["Role Knowledge", "Practical Scenarios"]
    assert seen["questions_per_category"] == 7


def test_legacy_query_parameters_still_work(monkeypatch):
    seen = {}
    _patch_service(monkeypatch, seen)

    response = client.post(
        "/api/v1/create-categorized-assessment",
        params={"job_description": "Short JD", "categories": ["A", "B"], "role_type": "technical"},
    )

    assert response.status_code == 200, response.text
    assert seen["job_description"] == "Short JD"
    assert seen["categories"] == ["A", "B"]
    assert seen["role_type"] == "technical"


def test_missing_input_is_a_clear_422():
    response = client.post("/api/v1/create-categorized-assessment")
    assert response.status_code == 422
