import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.api.routes import router
from app.models.assessment import StageResult, GradingResult
import json

client = TestClient(router)

@pytest.fixture
def sample_resume_analysis():
    return {
        "total_score": 78,
        "role_match_status": "Strong Match",
        "recommendation": "Proceed to Technical Assessment",
        "strengths": ["5+ years Python experience", "Cloud expertise", "API design skills"],
        "areas_for_improvement": ["Limited React experience", "No team leadership experience"]
    }

@pytest.fixture
def sample_culture_fit_results():
    return {
        "score": 82,
        "values_assessed": ["Innovation", "Collaboration", "Customer Focus"],
        "alignment_level": "High"
    }

@pytest.fixture
def sample_skills_assessment_results():
    return {
        "overall_score": 75,
        "technical_score": 80,
        "problem_solving_score": 70
    }

@pytest.fixture
def sample_stage_results():
    return [
        StageResult(
            stage="mcq",
            grading_results=[
                GradingResult(
                    question="What is a REST API?",
                    user_answer="Representational State Transfer API",
                    is_correct=True,
                    feedback="Correct!",
                    score=100.0
                )
            ],
            overall_score=85.0,
            feedback="MCQ stage completed with 85.0% score. Ready to proceed to coding stage."
        ),
        StageResult(
            stage="coding",
            grading_results=[
                GradingResult(
                    question="Implement a function to reverse a linked list",
                    user_answer="def reverse_list(head): ...",
                    is_correct=True,
                    feedback="Excellent implementation with optimal complexity",
                    score=90.0
                )
            ],
            overall_score=90.0,
            feedback="Technical assessment complete."
        )
    ]

@patch("app.services.assessment_service.get_openai_client")
def test_generate_overall_feedback_all_components(
    mock_get_openai_client,
    sample_resume_analysis,
    sample_culture_fit_results,
    sample_skills_assessment_results
):
    """Test generate overall feedback with all assessment components"""
    mock_chat = MagicMock()
    mock_get_openai_client.return_value = mock_chat
    
    mock_response = MagicMock()
    mock_response.content = json.dumps({
        "overall_score": 78,
        "recommendation": "Recommend - Proceed to Next Stage",
        "summary": "Strong technical candidate with excellent skills alignment. Shows high cultural fit with company values.",
        "detailed_feedback": {
            "resume_fit": "Strong alignment with required skills (78/100)",
            "cultural_fit": "High alignment with company values (82%)",
            "technical_skills": "Solid technical proficiency (75%)",
            "strengths": [
                "Strong Python and cloud expertise",
                "High cultural alignment",
                "Proven API design skills"
            ],
            "areas_for_improvement": [
                "Limited React experience",
                "No team leadership experience",
                "Room for growth in problem-solving"
            ],
            "risks": [
                "May need React training",
                "Limited leadership experience for senior role"
            ]
        },
        "next_steps": "Schedule technical interview focusing on system design and React knowledge gaps",
        "interview_focus_areas": [
            "React and frontend architecture",
            "Leadership potential and team collaboration",
            "System design and scalability"
        ]
    })
    mock_chat.return_value = mock_response
    
    response = client.post(
        "/generate-overall-feedback",
        json={
            "candidate_id": "test-candidate-123",
            "assessment_id": "test-assessment-456",
            "resume_analysis": sample_resume_analysis,
            "culture_fit_results": sample_culture_fit_results,
            "skills_assessment_results": sample_skills_assessment_results
        }
    )
    
    assert response.status_code == 200
    feedback = response.json()
    
    assert "overall_score" in feedback
    assert feedback["overall_score"] == 78
    assert "recommendation" in feedback
    assert feedback["recommendation"] == "Recommend - Proceed to Next Stage"
    assert "summary" in feedback
    assert "detailed_feedback" in feedback
    assert "next_steps" in feedback
    assert "interview_focus_areas" in feedback
    assert feedback["candidate_id"] == "test-candidate-123"
    assert feedback["assessment_id"] == "test-assessment-456"

@patch("app.services.assessment_service.get_openai_client")
def test_generate_overall_feedback_partial_data(mock_get_openai_client, sample_resume_analysis):
    """Test generate overall feedback with only resume analysis"""
    mock_chat = MagicMock()
    mock_get_openai_client.return_value = mock_chat
    
    mock_response = MagicMock()
    mock_response.content = json.dumps({
        "overall_score": 78,
        "recommendation": "Consider - Additional Screening Needed",
        "summary": "Candidate shows promise based on resume but requires additional assessment.",
        "detailed_feedback": {
            "resume_fit": "Strong alignment with required skills (78/100)",
            "cultural_fit": "Not assessed",
            "technical_skills": "Not assessed",
            "strengths": ["Strong Python and cloud expertise"],
            "areas_for_improvement": ["Limited React experience"],
            "risks": ["Incomplete assessment data"]
        },
        "next_steps": "Complete culture fit and technical assessments",
        "interview_focus_areas": ["Technical skills verification", "Cultural alignment"]
    })
    mock_chat.return_value = mock_response
    
    response = client.post(
        "/generate-overall-feedback",
        json={
            "resume_analysis": sample_resume_analysis
        }
    )
    
    assert response.status_code == 200
    feedback = response.json()
    assert "overall_score" in feedback
    assert "recommendation" in feedback

@patch("app.services.assessment_service.get_openai_client")
def test_generate_overall_feedback_empty_request(mock_get_openai_client):
    """Test generate overall feedback with no assessment data"""
    mock_chat = MagicMock()
    mock_get_openai_client.return_value = mock_chat
    
    mock_response = MagicMock()
    mock_response.content = json.dumps({
        "overall_score": 75,
        "recommendation": "Recommend - Proceed to Next Stage",
        "summary": "Based on the applicant's performance across all stages, including resume analysis, cultural fit assessment, skills evaluation, and pre-screening interview, it is recommended to proceed to the next stage.",
        "detailed_feedback": {
            "resume_fit": "The applicant demonstrates strong alignment with the required skills for the role (75/100)",
            "cultural_fit": "Shows good alignment with company's cultural values and work environment",
            "technical_skills": "Solid technical proficiency with room for growth in advanced areas",
            "strengths": [
                "Strong technical foundation",
                "Good cultural alignment",
                "Relevant experience"
            ],
            "areas_for_improvement": [
                "Advanced technical concepts",
                "Leadership experience",
                "Industry-specific knowledge"
            ],
            "risks": [
                "May require additional training in specific technologies",
                "Limited experience in similar role"
            ]
        },
        "next_steps": "The applicant demonstrates strong alignment with the required skills for the role and the company's cultural values. Scheduling a final interview is advised to confirm their suitability for the position.",
        "interview_focus_areas": [
            "Deep dive into technical problem-solving approaches",
            "Discuss specific project experiences",
            "Evaluate cultural fit and team dynamics"
        ]
    })
    mock_chat.return_value = mock_response
    
    response = client.post(
        "/generate-overall-feedback",
        json={}
    )
    
    assert response.status_code == 200
    feedback = response.json()
    
    assert feedback["overall_score"] == 75
    assert feedback["recommendation"] == "Recommend - Proceed to Next Stage"
    assert "summary" in feedback
    assert "detailed_feedback" in feedback

@patch("app.services.assessment_service.get_openai_client")
@patch("app.services.storage_service.assessment_storage")
def test_generate_overall_feedback_with_stored_results(
    mock_storage,
    mock_get_openai_client,
    sample_resume_analysis,
    sample_stage_results
):
    """Test generate overall feedback with assessment_id retrieving stored results"""
    mock_chat = MagicMock()
    mock_get_openai_client.return_value = mock_chat
    
    mock_storage.get_stage_results.return_value = sample_stage_results
    
    mock_response = MagicMock()
    mock_response.content = json.dumps({
        "overall_score": 85,
        "recommendation": "Strongly Recommend - Proceed to Final Interview",
        "summary": "Exceptional candidate with strong performance across all assessments.",
        "detailed_feedback": {
            "resume_fit": "Strong alignment with required skills (78/100)",
            "cultural_fit": "Not separately assessed",
            "technical_skills": "Excellent performance in both MCQ (85%) and coding (90%) stages",
            "strengths": [
                "Excellent coding skills",
                "Strong theoretical knowledge",
                "Consistent high performance"
            ],
            "areas_for_improvement": [
                "Minor gaps in specific frameworks",
                "Could improve on edge case handling"
            ],
            "risks": ["Minimal risks identified"]
        },
        "next_steps": "Proceed directly to final interview with hiring manager",
        "interview_focus_areas": [
            "Team fit and collaboration style",
            "Long-term career goals",
            "Specific project experiences"
        ]
    })
    mock_chat.return_value = mock_response
    
    response = client.post(
        "/generate-overall-feedback",
        json={
            "assessment_id": "test-assessment-789",
            "resume_analysis": sample_resume_analysis
        }
    )
    
    assert response.status_code == 200
    feedback = response.json()
    
    assert feedback["overall_score"] == 85
    assert feedback["recommendation"] == "Strongly Recommend - Proceed to Final Interview"
    assert feedback["assessment_id"] == "test-assessment-789"
    mock_storage.get_stage_results.assert_called_once_with("test-assessment-789")

@patch("app.services.assessment_service.get_openai_client")
def test_generate_overall_feedback_error_handling(mock_get_openai_client):
    """Test error handling in generate overall feedback"""
    mock_chat = MagicMock()
    mock_get_openai_client.return_value = mock_chat
    
    mock_chat.side_effect = Exception("OpenAI API error")
    
    response = client.post(
        "/generate-overall-feedback",
        json={
            "resume_analysis": {"total_score": 50}
        }
    )
    
    assert response.status_code == 200
    feedback = response.json()
    
    assert feedback["overall_score"] == 0
    assert feedback["recommendation"] == "Unable to generate feedback"
    assert "Error generating feedback" in feedback["summary"]
    assert feedback["detailed_feedback"]["resume_fit"] == "N/A"

def test_generate_overall_feedback_recommendation_thresholds():
    """Test that recommendation levels align with score thresholds"""
    test_cases = [
        (90, "Strongly Recommend - Proceed to Final Interview"),
        (75, "Recommend - Proceed to Next Stage"),
        (65, "Consider - Additional Screening Needed"),
        (50, "Do Not Recommend")
    ]
    
    for score, expected_recommendation in test_cases:
        with patch("app.services.assessment_service.get_openai_client") as mock_get_openai_client:
            mock_chat = MagicMock()
            mock_get_openai_client.return_value = mock_chat
            
            mock_response = MagicMock()
            mock_response.content = json.dumps({
                "overall_score": score,
                "recommendation": expected_recommendation,
                "summary": f"Candidate scored {score}%",
                "detailed_feedback": {
                    "resume_fit": f"Score: {score}/100",
                    "cultural_fit": "N/A",
                    "technical_skills": "N/A",
                    "strengths": [],
                    "areas_for_improvement": [],
                    "risks": []
                },
                "next_steps": "Based on score",
                "interview_focus_areas": []
            })
            mock_chat.return_value = mock_response
            
            response = client.post(
                "/generate-overall-feedback",
                json={"resume_analysis": {"total_score": score}}
            )
            
            assert response.status_code == 200
            feedback = response.json()
            assert feedback["overall_score"] == score
            assert feedback["recommendation"] == expected_recommendation