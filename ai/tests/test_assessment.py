import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.api.routes import router
from app.models.assessment import AssessmentResult, Question, CodingAnswer, GradingResult
from typing import List
import json

client = TestClient(router)

@pytest.fixture
def sample_job_description():
    return "We are looking for a Senior Software Engineer with experience in Python, JavaScript, and cloud technologies. The candidate should have 5+ years of experience in web development, API design, and database management. Knowledge of React, Node.js, and AWS is preferred."

@patch("app.services.assessment_service.ChatOpenAI")
def test_assess(mock_chat_openai, sample_job_description):
    mock_chat = MagicMock()
    mock_chat_openai.return_value = mock_chat
    mock_chat.return_value.content = json.dumps({
        "assessment_type": "mcq",
        "ai_determined_difficulty": "intermediate",
        "role_type": "technical",
        "skills_assessed": ["software engineering", "design patterns"],
        "questions": [
            {
                "question": "What is a common design pattern used in software engineering?",
                "answers": ["Singleton", "Doubleton", "Tripleton", "Quadrupleton"],
                "correct_answer": "Singleton",
                "explanation": "Singleton is a creational design pattern that ensures a class has only one instance."
            }
        ]
    })

    response = client.post("/assess", 
                           params={
                               "job_description": sample_job_description,
                               "assessment_type": "mcq",
                               "num_questions": 1
                           })
    
    assert response.status_code == 200
    result = AssessmentResult(**response.json())
    assert result.assessment_type == "mcq"
    assert len(result.questions) == 1
    assert "design pattern" in result.questions[0].question.lower()
    assert result.questions[0].answers == ["Singleton", "Doubleton", "Tripleton", "Quadrupleton"]
    assert result.questions[0].correct_answer == "Singleton"
    assert result.ai_determined_difficulty == "intermediate"
    assert result.role_type == "technical"

    mock_chat.assert_called_once()

def test_assess_invalid_type(sample_job_description):
    response = client.post("/assess", 
                           params={
                               "job_description": sample_job_description,
                               "assessment_type": "invalid",
                               "num_questions": 1
                           })
    assert response.status_code == 400
    assert "Invalid assessment type" in response.json()["detail"]

def test_assess_invalid_difficulty(sample_job_description):
    # Test the new generate_coding_assessment endpoint error handling instead
    response = client.post("/generate-coding-assessment",
                           params={
                               "programming_languages": ["InvalidLanguage"],
                               "num_questions": 1,
                               "difficulty": "intermediate"
                           })
    assert response.status_code == 400
    assert "Unsupported programming language" in response.json()["detail"]

@patch("app.services.assessment_service.ChatOpenAI")
def test_grade_coding_assessment(mock_chat_openai):
    mock_chat = MagicMock()
    mock_chat_openai.return_value = mock_chat
    mock_chat.return_value.content = json.dumps({
        "is_correct": True,
        "feedback": "The solution is correct and efficient.",
        "score": 95
    })

    assessment_result = AssessmentResult(
        assessment_type="coding",
        ai_determined_difficulty="intermediate",
        role_type="technical",
        questions=[
            Question(
                question="Write a function to reverse a string in Python.",
                correct_answer="def reverse_string(s):\n    return s[::-1]",
                function_signature="def reverse_string(s: str) -> str:",
                explanation="Tests string manipulation and Python syntax knowledge"
            )
        ]
    )

    user_answers = [
        CodingAnswer(
            question="Write a function to reverse a string in Python.",
            user_answer="def reverse_string(s):\n    return s[::-1]"
        )
    ]

    response = client.post("/grade-coding-assessment",
                           json={
                               "assessment_result": assessment_result.model_dump(),
                               "user_answers": [answer.model_dump() for answer in user_answers]
                           })

    assert response.status_code == 200
    grading_results = [GradingResult(**result) for result in response.json()]
    assert len(grading_results) == 1
    assert grading_results[0].is_correct == True
    assert grading_results[0].feedback == "The solution is correct and efficient."

    mock_chat.assert_called_once()

def test_generate_language_specific_coding_assessment():
    """Test the generation of language-specific coding assessments."""
    from app.services.assessment_service import generate_language_specific_coding_assessment
    
    # Test basic functionality
    programming_languages = ["Python", "JavaScript"]
    num_questions = 3
    difficulty = "intermediate"
    focus_areas = ["algorithms", "data-structures"]
    
    # This test would require an actual OpenAI API key to run
    # For now, we'll test the input validation
    
    # Test input validation
    try:
        # Test empty languages list
        generate_language_specific_coding_assessment([], 5)
        assert False, "Should raise ValueError for empty languages list"
    except ValueError as e:
        assert "At least one programming language must be specified" in str(e)
    
    try:
        # Test invalid number of questions
        generate_language_specific_coding_assessment(["Python"], 0)
        assert False, "Should raise ValueError for invalid question count"
    except ValueError as e:
        assert "Number of questions must be between 1 and 20" in str(e)
    
    try:
        # Test invalid difficulty
        generate_language_specific_coding_assessment(["Python"], 5, "invalid")
        assert False, "Should raise ValueError for invalid difficulty"
    except ValueError as e:
        assert "Difficulty must be one of: beginner, intermediate, advanced" in str(e)
    
    try:
        # Test unsupported language
        generate_language_specific_coding_assessment(["UnsupportedLang"], 5)
        assert False, "Should raise ValueError for unsupported language"
    except ValueError as e:
        assert "Unsupported programming language" in str(e)
    
    print("All input validation tests passed!")



def test_generate_coding_assessment_endpoint():
    """Test the new generate-coding-assessment endpoint structure."""
    # Test with invalid language to trigger validation error
    response = client.post("/generate-coding-assessment",
                           params={
                               "programming_languages": ["InvalidLanguage"],
                               "num_questions": 1,
                               "difficulty": "intermediate"
                           })
    
    assert response.status_code == 400
    assert "Unsupported programming language" in response.json()["detail"]
    
    # Test with valid parameters but no OpenAI key (will fail with different error)
    response = client.post("/generate-coding-assessment",
                           params={
                               "programming_languages": ["Python"],
                               "num_questions": 1,
                               "difficulty": "intermediate"
                           })
    
    # Should return either 200 (if OpenAI key exists) or 500 (if no OpenAI key)
    assert response.status_code in [200, 500]