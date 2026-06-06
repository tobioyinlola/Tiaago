import pytest
from app.services.resume_analyzer import analyze_resume
from app.models.resume import ResumeAnalysis

@pytest.fixture
def sample_resume():
    return """
    John Doe
    Software Engineer
    
    Experience:
    - Senior Developer at Tech Co (2018-present)
    - Full Stack Developer at Web Solutions Inc. (2015-2018)
    
    Skills: Python, JavaScript, React, Docker, AWS
    
    Education:
    Bachelor's in Computer Science, University of Technology (2015)
    """

@pytest.fixture
def sample_job_description():
    return """
    We are looking for a Senior Software Engineer with:
    - 5+ years of experience in web development
    - Strong proficiency in Python and JavaScript
    - Experience with React and cloud technologies (preferably AWS)
    - Bachelor's degree in Computer Science or related field
    """

def test_analyze_resume(sample_resume, sample_job_description):
    result = analyze_resume(sample_resume, sample_job_description)
    assert isinstance(result, ResumeAnalysis)
    assert 0 <= result.resume_review_score <= 40
    assert 0 <= result.skill_matching_score <= 30
    assert 0 <= result.experience_relevance_score <= 20
    assert 0 <= result.education_certifications_score <= 10
    assert 0 <= result.total_score <= 100
    assert isinstance(result.strengths, list)
    assert isinstance(result.areas_for_improvement, list)
    assert isinstance(result.recommendation, str)
    assert isinstance(result.detailed_analysis, str)