from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_analyze_resume_endpoint_success(monkeypatch, tmp_path):
    from app.api import routes as routes_mod
    from app.models.resume import ResumeAnalysis

    async def _fake_read_resume_file(file):
        return "John Doe Resume Text"

    def _fake_analyze_resume(resume_text: str, job_description: str):
        return ResumeAnalysis(
            role_match_status="pass",
            text_authenticity="Authentic",
            text_authenticity_explanation="Looks natural",
            experience_validation="Validated",
            experience_validation_explanation="Consistent",
            achievement_quality="Average",
            achievement_quality_explanation="Standard",
            resume_review_score=30,
            skill_matching_score=25,
            experience_relevance_score=18,
            education_certifications_score=8,
            total_score=81,
            strengths=["Python", "Django"],
            areas_for_improvement=["Kubernetes"],
            recommendation="Strongly Recommend",
            detailed_analysis="<ul><li>Good</li></ul>"
        )

    monkeypatch.setattr(routes_mod, "read_resume_file", _fake_read_resume_file)
    monkeypatch.setattr(routes_mod, "analyze_resume", _fake_analyze_resume)

    # Prepare a simple text file upload
    fn = tmp_path / "resume.txt"
    fn.write_text("Resume content")
    with fn.open("rb") as f:
        files = {"resume_file": ("resume.txt", f, "text/plain")}
        resp = client.post(
            "/api/v1/analyze-resume",
            params={"job_description": "Python developer"},
            files=files,
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["role_match_status"] == "pass"
    assert isinstance(data["strengths"], list)
    assert isinstance(data["areas_for_improvement"], list)
    assert data["total_score"] == 81


def test_analyze_resume_endpoint_returns_500_on_default_error(monkeypatch, tmp_path):
    from app.api import routes as routes_mod
    from app.models.resume import ResumeAnalysis

    async def _fake_read_resume_file(file):
        return "John Doe Resume Text"

    def _fake_analyze_resume(resume_text: str, job_description: str):
        return ResumeAnalysis(
            role_match_status="fail",
            total_score=0,
            recommendation="Analysis could not be completed",
        )

    monkeypatch.setattr(routes_mod, "read_resume_file", _fake_read_resume_file)
    monkeypatch.setattr(routes_mod, "analyze_resume", _fake_analyze_resume)

    fn = tmp_path / "resume.txt"
    fn.write_text("Resume content")
    with fn.open("rb") as f:
        files = {"resume_file": ("resume.txt", f, "text/plain")}
        resp = client.post(
            "/api/v1/analyze-resume",
            params={"job_description": "Python developer"},
            files=files,
        )

    assert resp.status_code == 500
    body = resp.json()
    assert "detail" in body


