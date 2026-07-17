from fastapi import APIRouter, HTTPException, Query, File, UploadFile
from fastapi.responses import JSONResponse
from typing import List, Optional
from app.services.assessment_service import assess_candidate, grade_coding_assessment, grade_single_coding_question, generate_culture_fit_questions, create_technical_multi_stage_assessment, create_non_technical_assessment, evaluate_stage_progression, get_assessment_by_id, get_current_stage_data, complete_assessment_stage, generate_overall_feedback, create_categorized_mcq_assessment
from app.services.resume_analyzer import analyze_resume
from app.models.assessment import (
    AssessmentResult, Question, CodingAnswer, MCQAnswer, GradingResult,
    CultureFitQuestion, CultureFitAssessment, AssessmentSubmission,
    MultiStageAssessment, StageResult, CultureFitResults, SkillsAssessmentResults,
    CategorizedAssessmentResult
)
from app.models.resume import ResumeAnalysis
import io
import PyPDF2
from docx import Document
from pydantic import BaseModel
import datetime
import platform
import sys

router = APIRouter()

@router.get("/", response_model=dict, tags=["System"])
async def root():
    """
    Root endpoint providing API information and available endpoints.
    
    Returns basic information about the AI Assessment API including:
    - API name and version
    - Available endpoint categories
    - Documentation links
    - System status
    """
    return {
        "name": "AI Assessment API",
        "version": "1.0.0",
        "description": "AI-powered talent assessment and resume screening platform",
        "status": "operational",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "endpoints": {
            "assessment": {
                "description": "Create and manage technical assessments",
                "endpoints": [
                    "/api/v1/assess",
                    "/api/v1/create-technical-assessment", 
                    "/api/v1/submit-assessment",
                    "/api/v1/grade-single-question"
                ]
            },
            "resume_analysis": {
                "description": "AI-powered resume screening and analysis",
                "endpoints": [
                    "/api/v1/analyze-resume"
                ]
            },
            "culture_fit": {
                "description": "Company culture fit assessment",
                "endpoints": [
                    "/api/v1/culture-fit-assessment"
                ]
            },
            "system": {
                "description": "System health and information",
                "endpoints": [
                    "/api/v1/",
                    "/api/v1/health"
                ]
            }
        },
        "documentation": "/docs",
        "openapi_spec": "/openapi.json"
    }

@router.get("/health", response_model=dict, tags=["System"])
async def health_check():
    """
    Health check endpoint for monitoring API availability and system status.
    
    Returns:
    - Service status and uptime information
    - System resource information
    - Dependencies status
    - Timestamp of the health check
    
    This endpoint can be used by load balancers, monitoring systems,
    and other services to verify the API is running correctly.
    """
    try:
        # Test critical dependencies
        from app.config import settings

        # Check if OpenAI API key is configured.
        # NOTE: do not make a live LLM call here. Health checks run frequently
        # (load balancers, uptime monitors), so calling analyze_resume() would
        # cost an OpenAI request per probe and report "degraded" whenever the
        # key is missing/invalid. Report readiness from config only.
        openai_configured = bool(settings.OPENAI_API_KEY)
        resume_analyzer_status = "healthy" if openai_configured else "degraded"

        system_info = {
            "status": "healthy",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "uptime": "operational",
            "version": "1.0.0",
            "system": {
                "platform": platform.system(),
                "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
                "architecture": platform.machine()
            },
            "services": {
                "api": "healthy",
                "resume_analyzer": resume_analyzer_status,
                "assessment_service": "healthy",
                "openai_integration": "configured" if openai_configured else "not_configured"
            },
            "features": {
                "resume_screening": "enabled",
                "technical_assessments": "enabled", 
                "culture_fit_assessments": "enabled",
                "multi_stage_assessments": "enabled"
            }
        }
        
        return system_info
        
    except Exception as e:
        # Return degraded status if there are issues
        return {
            "status": "degraded",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "error": f"Health check failed: {str(e)}",
            "system": {
                "platform": platform.system(),
                "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
            }
        }

async def read_resume_file(file: UploadFile) -> str:
    # Check file size before reading into memory
    from app.config import settings
    
    # Get file size
    file.file.seek(0, 2)  # Seek to end of file
    file_size = file.file.tell()
    file.file.seek(0)  # Reset file pointer to beginning
    
    # Validate file size
    if file_size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, 
            detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE / (1024 * 1024):.1f}MB"
        )
    
    content = await file.read()
    if file.filename.endswith('.pdf'):
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() for page in pdf_reader.pages)
    elif file.filename.endswith('.docx'):
        doc = Document(io.BytesIO(content))
        return "\n".join(paragraph.text for paragraph in doc.paragraphs)
    elif file.filename.endswith('.txt'):
        return content.decode()
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a PDF, DOCX, or TXT file.")

@router.post("/assess", response_model=AssessmentResult, tags=["Assessment"])
async def assess(
    job_description: str = Query(..., description="Full job description for AI analysis"),
    assessment_type: str = Query(..., description="The type of assessment (coding or mcq)"),
    num_questions: int = Query(5, description="The number of questions to generate"),
    role_type: str = Query(None, description="Role type: technical or non-technical (auto-detected if not provided)")
):
    """
    Generate an assessment based on job description analysis.
    
    The AI analyzes the job description to:
    - Determine appropriate difficulty level (beginner/intermediate/advanced)
    - Extract key skills to be tested
    - Generate relevant questions with complete answers/test cases

    NOTE: For technical roles, consider using /create-technical-assessment for a two-stage approach (MCQ + Coding).

    This endpoint creates either a coding or multiple-choice question (MCQ) assessment
    tailored to the specific job requirements.

    Parameters:
    - job_description: Complete job description including requirements, responsibilities, skills needed
    - assessment_type: Either "coding" or "mcq"
    - num_questions: The number of questions to generate
    - role_type: Whether this is for a technical or non-technical role

    Returns:
    An AssessmentResult object containing:
    - assessment_type: The type of assessment generated
    - questions: A list of generated questions with answers and correct answers
    - ai_determined_difficulty: AI-analyzed difficulty level from job description
    - role_type: The detected or specified role type
    - skills_assessed: List of skills being tested
    - Complete answers and test cases for all questions
    """
    try:
        result = assess_candidate(job_description, assessment_type, num_questions, role_type)
        return result
    except ValueError as e:
        return JSONResponse(status_code=400, content={"detail": str(e)})

@router.post("/create-technical-assessment", response_model=MultiStageAssessment, tags=["Assessment"])
async def create_technical_assessment(
    job_description: str = Query(..., description="Complete technical job description"),
    mcq_questions: int = Query(30, description="Number of MCQ questions for screening"),
    coding_questions: int = Query(1, description="Number of coding questions for final stage")
):
    """
    Create a multi-stage technical assessment: MCQ screening followed by coding assessment.
    
    The AI analyzes the job description to determine difficulty and generate appropriate questions.
    
    **Assessment ID Usage:**
    - A unique ID is generated for this multi-stage assessment
    - This ID is used to track the candidate's progress through both stages
    - Use the ID with /assessment-stage/{id} to get current stage questions
    - Use the ID with /grade-stage to submit answers for each stage
    - The ID links MCQ and coding stages together for the same candidate
    
    This is the recommended approach for technical roles as it provides:
    1. Initial screening with MCQ questions on technical concepts
    2. Practical coding assessment (no threshold blocking)
    
    Parameters:
    - job_description: Complete job description with requirements and responsibilities
    - mcq_questions: Number of MCQ questions (default: 30 for technical roles)
    - coding_questions: Number of coding questions (default: 1 for technical roles)
    
    Returns:
    A MultiStageAssessment object containing:
    - Unique assessment_id for tracking
    - Both MCQ and coding assessments with complete questions/answers
    - AI-determined difficulty level
    - Skills extracted from job description
    """
    try:
        multi_stage = create_technical_multi_stage_assessment(
            job_description=job_description,
            mcq_questions=mcq_questions,
            coding_questions=coding_questions
        )
        return multi_stage
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating technical assessment: {str(e)}")

@router.post("/create-non-technical-assessment", response_model=AssessmentResult, tags=["Assessment"])
async def create_non_technical_assessment_endpoint(
    job_description: str = Query(..., description="Complete non-technical job description"),
    mcq_questions: int = Query(50, description="Number of MCQ questions for non-technical assessment")
):
    """
    Create a comprehensive MCQ assessment for non-technical roles.
    
    The AI analyzes the job description to determine difficulty and generate job-specific,
    scenario-based questions that test real-world application of skills.
    
    This endpoint is specifically designed for non-technical roles and provides:
    - 50+ comprehensive MCQ questions by default
    - Real-world scenarios and situational judgment questions
    - Role-specific knowledge and industry practice questions
    - Balanced, plausible answer options to prevent guessing
    
    Parameters:
    - job_description: Complete job description with requirements and responsibilities
    - mcq_questions: Number of MCQ questions (default: 50 for comprehensive assessment)
    
    Returns:
    An AssessmentResult object containing:
    - Scenario-based MCQ questions tailored to the specific job role
    - AI-determined difficulty level based on job requirements
    - Skills assessment covering key competencies from job description
    - Questions focusing on practical application rather than theoretical knowledge
    """
    try:
        assessment = create_non_technical_assessment(
            job_description=job_description,
            mcq_questions=mcq_questions
        )
        return assessment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating non-technical assessment: {str(e)}")

@router.post("/create-categorized-assessment", response_model=CategorizedAssessmentResult, tags=["Assessment"])
async def create_categorized_assessment_endpoint(
    job_description: str = Query(..., description="Complete job description for AI analysis"),
    categories: List[str] = Query(..., description="Question category labels, e.g. ['Role Knowledge', 'Practical Scenarios', 'Problem Solving']"),
    questions_per_category: int = Query(10, description="Number of MCQ questions to generate per category"),
    role_type: Optional[str] = Query(None, description="Role type: technical or non-technical")
):
    """
    Generate an MCQ assessment split into named categories (e.g. 3 categories x 10 questions).

    Each category is generated as its own batch so results stay on-topic per category
    and avoid duplicate questions across categories.

    Parameters:
    - job_description: Complete job description including requirements, responsibilities, skills needed
    - categories: List of category labels to generate questions for
    - questions_per_category: How many MCQ questions to generate per category
    - role_type: Whether this is for a technical or non-technical role

    Returns:
    A CategorizedAssessmentResult object containing:
    - sections: One entry per category, each with its generated questions
    - ai_determined_difficulty: AI-analyzed difficulty level from job description
    - role_type: The detected or specified role type
    - skills_assessed: List of skills being tested
    """
    try:
        result = create_categorized_mcq_assessment(
            job_description=job_description,
            categories=categories,
            questions_per_category=questions_per_category,
            role_type=role_type,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating categorized assessment: {str(e)}")

@router.get("/assessment-stage/{assessment_id}", response_model=dict, tags=["Assessment"])
async def get_current_assessment_stage(assessment_id: str):
    """
    Get the current stage and questions for a multi-stage technical assessment.
    
    **How Assessment ID Works:**
    1. When you create a technical assessment, you get a unique assessment_id
    2. This ID stores both MCQ and coding questions for the candidate
    3. Use this endpoint to retrieve which stage to show and the questions for that stage
    4. The system tracks which stages have been completed
    
    **What This Endpoint Does:**
    - Returns current stage (mcq or coding)
    - Provides the actual questions for that stage
    - Shows progression status
    - No time limits or blocking thresholds
    
    **Storage Implementation:**
    - Retrieves actual stored assessment data using the ID
    - Returns real questions from the stored assessment
    - Tracks actual completion status
    
    Parameters:
    - assessment_id: The ID of the multi-stage assessment
    
    Returns:
    - Current stage information
    - Questions for the current stage  
    - Assessment metadata
    - Progression tracking
    """
    try:
        # Retrieve actual stored assessment data
        stage_data = get_current_stage_data(assessment_id)
        return stage_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving assessment stage: {str(e)}")

class StageProgressionRequest(BaseModel):
    assessment_id: str
    stage_results: List[StageResult]
    
@router.post("/evaluate-stage-progression", response_model=dict, tags=["Assessment"])
async def check_stage_progression(request: StageProgressionRequest):
    """
    Track stage completion and determine next steps.
    
    **No Thresholds:** This system does not block candidates based on MCQ scores.
    All candidates who complete MCQ can proceed to coding stage.
    
    **What This Endpoint Does:**
    - Records stage completion
    - Determines next available stage
    - Provides progression guidance
    - Updates assessment status
    
    Parameters:
    - assessment_id: The multi-stage assessment ID
    - stage_results: List of completed stage results
    
    Returns:
    - Progression status (always allows advancement)
    - Next stage information  
    - Completion tracking
    """
    try:
        progression = evaluate_stage_progression(request.stage_results)
        return {
            "assessment_id": request.assessment_id,
            **progression
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error evaluating progression: {str(e)}")

@router.post("/grade-coding-assessment", response_model=List[GradingResult], tags=["Assessment"])
async def grade_assessment(assessment_result: AssessmentResult, user_answers: List[CodingAnswer]):
    """
    Grade a coding assessment based on the user's answers.

    This endpoint evaluates the user's coding answers against the expected solutions.

    Parameters:
    - assessment_result: The AssessmentResult object containing the original questions
    - user_answers: A list of CodingAnswer objects containing the user's answers

    Returns:
    A list of GradingResult objects, each containing:
    - question: The original question
    - user_answer: The user's submitted answer
    - is_correct: Whether the answer is correct or not
    - feedback: Detailed feedback on the user's answer
    - score: Numerical score (0-100)
    """
    if assessment_result.assessment_type != "coding":
        raise HTTPException(status_code=400, detail="This endpoint is only for grading coding assessments")
    
    if len(assessment_result.questions) != len(user_answers):
        raise HTTPException(status_code=400, detail="The number of user answers does not match the number of questions")

    grading_results = grade_coding_assessment(assessment_result.questions, user_answers)
    return grading_results

@router.post("/grade-single-coding-question", response_model=GradingResult, tags=["Assessment"])
async def grade_single_coding_question_endpoint(question: Question, user_answer: CodingAnswer):
    """
    Grade a single coding question independently.
    
    This endpoint allows you to grade individual coding questions without needing to submit
    all questions at once. Useful for real-time feedback or partial submissions.
    
    Parameters:
    - question: The Question object containing:
        - question: The problem statement
        - correct_answer: The expected solution
        - test_cases: Test cases for validation (optional)
    - user_answer: The CodingAnswer object containing:
        - user_answer: The candidate's code solution
        - question_id: Optional question identifier
    
    Returns:
    A GradingResult object containing:
    - question: The original question text
    - user_answer: The submitted answer
    - is_correct: Boolean indicating correctness
    - feedback: Detailed constructive feedback
    - score: Numerical score (0-100)
    - score_rationale: Breakdown of scoring by category
    
    Example Request:
    ```json
    {
        "question": {
            "question": "Write a function to reverse a string",
            "correct_answer": "def reverse_string(s): return s[::-1]",
            "test_cases": [...]
        },
        "user_answer": {
            "user_answer": "def reverse_string(s): return ''.join(reversed(s))"
        }
    }
    ```
    """
    try:
        grading_result = grade_single_coding_question(question, user_answer)
        return grading_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error grading question: {str(e)}")

@router.post("/grade-mcq-assessment", response_model=List[GradingResult], tags=["Assessment"])
async def grade_mcq_assessment(assessment_result: AssessmentResult, user_answers: List[MCQAnswer]):
    """
    Grade an MCQ assessment based on the user's answers.

    This endpoint evaluates the user's multiple choice answers against the correct answers.

    Parameters:
    - assessment_result: The AssessmentResult object containing the original questions
    - user_answers: A list of MCQAnswer objects containing the user's selected answers

    Returns:
    A list of GradingResult objects, each containing:
    - question: The original question
    - user_answer: The user's selected answer
    - is_correct: Whether the answer is correct or not
    - feedback: Detailed feedback on the answer
    - score: Numerical score (0-100)
    """
    if assessment_result.assessment_type != "mcq":
        raise HTTPException(status_code=400, detail="This endpoint is only for grading MCQ assessments")
    
    if len(assessment_result.questions) != len(user_answers):
        raise HTTPException(status_code=400, detail="The number of user answers does not match the number of questions")

    grading_results = []
    total_questions = len(assessment_result.questions)
    
    for question, user_answer in zip(assessment_result.questions, user_answers):
        is_correct = question.correct_answer.lower().strip() == user_answer.selected_answer.lower().strip()
        score = 100.0 if is_correct else 0.0
        
        feedback = "Correct!" if is_correct else f"Incorrect. The correct answer is: {question.correct_answer}"
        
        grading_results.append(GradingResult(
            question=question.question,
            user_answer=user_answer.selected_answer,
            is_correct=is_correct,
            feedback=feedback,
            score=score
        ))
    
    return grading_results

@router.post("/grade-stage", response_model=StageResult, tags=["Assessment"])
async def grade_assessment_stage(
    assessment_id: str = Query(..., description="Assessment ID"),
    stage: str = Query(..., description="Stage being graded (mcq or coding)"),
    mcq_answers: List[MCQAnswer] = None,
    coding_answers: List[CodingAnswer] = None
):
    """
    Grade a specific stage of a multi-stage assessment.
    
    **How Assessment ID is Used Here:**
    1. The assessment_id links this grading to the original multi-stage assessment
    2. System can track which candidate submitted which stage
    3. Results are stored against the assessment_id for progress tracking
    4. No blocking based on scores - just records performance
    
    **What Gets Graded:**
    - MCQ: Exact matching against correct answers
    - Coding: AI evaluation against test cases and expected solutions
    - Both: Detailed feedback and numerical scoring
    
    Parameters:
    - assessment_id: The multi-stage assessment ID
    - stage: Which stage is being graded ("mcq" or "coding")
    - mcq_answers: MCQ answers (if stage is "mcq")
    - coding_answers: Coding answers (if stage is "coding")
    
    Returns:
    StageResult with:
    - Individual question grades and feedback
    - Overall stage score
    - Performance analysis
    - No pass/fail determination (removed threshold blocking)
    """
    try:
        # Retrieve the stored assessment to get questions and correct answers
        assessment = get_assessment_by_id(assessment_id)
        
        # Get the appropriate assessment result based on stage
        if stage == "mcq":
            assessment_result = assessment.mcq_assessment
        elif stage == "coding":
            assessment_result = assessment.coding_assessment
        else:
            raise HTTPException(status_code=400, detail="Invalid stage. Must be 'mcq' or 'coding'")
        
        if not assessment_result:
            raise HTTPException(status_code=400, detail=f"No {stage} assessment found for this ID")
        
        # Grade the appropriate answer type
        if stage == "mcq" and mcq_answers:
            grading_results = await grade_mcq_assessment(assessment_result, mcq_answers)
        elif stage == "coding" and coding_answers:
            grading_results = await grade_assessment(assessment_result, coding_answers)
        else:
            raise HTTPException(status_code=400, detail="Invalid stage or missing answers")
        
        # Calculate overall score
        total_score = sum(result.score for result in grading_results)
        overall_score = total_score / len(grading_results) if grading_results else 0
        
        # Generate feedback (no pass/fail thresholds)
        feedback = f"Stage {stage} completed with {overall_score:.1f}% score. "
        if stage == "mcq":
            feedback += "Ready to proceed to coding stage."
        else:
            feedback += "Technical assessment complete."
        
        # Create stage result
        stage_result = StageResult(
            stage=stage,
            grading_results=grading_results,
            overall_score=overall_score,
            feedback=feedback
        )
        
        # Store the completion in the assessment tracking system
        complete_assessment_stage(assessment_id, stage, stage_result)
        
        return stage_result
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error grading stage: {str(e)}")

@router.post("/submit-assessment", response_model=dict, tags=["Assessment"])
async def submit_assessment(submission: AssessmentSubmission):
    """
    Submit a complete assessment (either coding or MCQ) for grading.

    This unified endpoint handles both technical (coding) and non-technical (MCQ) assessments.

    Parameters:
    - submission: AssessmentSubmission object containing all answers

    Returns:
    A summary of the grading results including overall score and individual question results.
    """
    try:
        # This would typically involve:
        # 1. Retrieving the original assessment by assessment_id
        # 2. Grading the appropriate answer type
        # 3. Calculating overall scores
        # 4. Storing results in database
        
        # For now, return a placeholder response
        return {
            "assessment_id": submission.assessment_id,
            "status": "submitted",
            "message": "Assessment submitted successfully. Results will be processed.",
            "candidate_id": submission.candidate_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error submitting assessment: {str(e)}")

@router.post("/analyze-resume", response_model=ResumeAnalysis, tags=["Resume Analysis"])
async def analyze(
    resume_file: UploadFile = File(..., description="Upload the resume file (PDF, DOCX, or TXT)"),
    job_description: str = Query(..., description="The job description to match the resume against")
):
    """
    Analyze a resume and compare it to a job description.

    This endpoint extracts text from the uploaded resume and evaluates it against the provided job description using AI.

    Parameters:
    - resume_file: The resume file to be analyzed (PDF, DOCX, or TXT)
    - job_description: The job description text

    Returns:
    A structured ResumeAnalysis object containing:
    - role_match_status
    - scores for various categories
    - strengths and areas for improvement
    - recommendation
    - detailed analysis
    """
    try:
        # Log the request for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Resume analysis request - filename: {resume_file.filename}, content_type: {resume_file.content_type}")
        
        resume_text = await read_resume_file(resume_file)
        logger.info(f"Successfully extracted {len(resume_text)} characters from resume")
        
        result = analyze_resume(resume_text, job_description)
        
        # Check if we got the default error response
        if (result.role_match_status == "fail" and 
            result.total_score == 0 and 
            result.recommendation == "Analysis could not be completed"):
            logger.error("Resume analysis returned default error response")
            raise HTTPException(
                status_code=500, 
                detail="Resume analysis service encountered an error. Please check server logs for details."
            )
        
        logger.info(f"Resume analysis completed successfully - score: {result.total_score}, recommendation: {result.recommendation}")
        return result
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        import traceback
        logger.error(f"Error in analyze endpoint: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error analyzing resume: {str(e)}")

@router.get("/test-resume-analysis-serialization", response_model=ResumeAnalysis, tags=["System"])
async def test_resume_analysis_serialization():
    """
    Test endpoint to verify ResumeAnalysis serialization works correctly.
    
    Returns a sample ResumeAnalysis object to test if all fields,
    especially areas_for_improvement, are properly serialized.
    """
    try:
        # Create a test ResumeAnalysis object with all fields populated
        test_analysis = ResumeAnalysis(
            role_match_status="pass",
            resume_review_score=30,
            skill_matching_score=25,
            experience_relevance_score=18,
            education_certifications_score=8,
            total_score=81,
            strengths=["Strong technical background", "Relevant experience"],
            areas_for_improvement=["Leadership skills", "Advanced certifications", "Industry knowledge"],
            recommendation="Strongly Recommend",
            detailed_analysis="<ul><li>This is a test analysis</li><li>All fields should be present</li></ul>"
        )
        
        # Log what we're returning
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Test serialization - areas_for_improvement: {test_analysis.areas_for_improvement}")
        
        return test_analysis
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Test serialization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Test serialization failed: {str(e)}")

@router.get("/debug-resume-analyzer", response_model=dict, tags=["System"])
async def debug_resume_analyzer():
    """
    Debug endpoint to test resume analyzer functionality.
    
    This endpoint helps diagnose issues with the resume analysis service
    by testing it with minimal inputs and returning detailed status information.
    """
    try:
        from app.services.resume_analyzer import analyze_resume
        from app.config import settings
        import os
        
        # Check environment configuration
        debug_info = {
            "openai_api_key_configured": bool(os.getenv("OPENAI_API_KEY")),
            "openai_model": settings.OPENAI_MODEL_NAME,
            "test_analysis": None,
            "error": None
        }
        
        # Test the analyzer with minimal input
        try:
            test_result = analyze_resume(
                "John Doe\nSoftware Engineer\n3 years experience in Python", 
                "Looking for a Python developer"
            )
            debug_info["test_analysis"] = {
                "role_match_status": test_result.role_match_status,
                "total_score": test_result.total_score,
                "recommendation": test_result.recommendation,
                "is_default_error": (test_result.recommendation == "Analysis could not be completed")
            }
        except Exception as e:
            debug_info["error"] = str(e)
            import traceback
            debug_info["traceback"] = traceback.format_exc()
        
        return debug_info
        
    except Exception as e:
        return {"error": f"Debug endpoint failed: {str(e)}"}

@router.post("/culture-fit-assessment", response_model=CultureFitAssessment, tags=["Assessment"])
async def generate_culture_assessment(
    company_info: str = Query(..., description="Information about the company's culture, values, and work environment"),
    num_questions: int = Query(default=5, description="The number of culture fit questions to generate")
):
    """
    Generate culture fit assessment questions based on company information.

    This endpoint creates multiple-choice questions to evaluate a candidate's cultural fit with the company.
    - company_info: Detailed information about the company's culture, values, and work environment
    Parameters:
    - company_info: Detailed information about the company's culture, values, and work environment
    - num_questions: The number of questions to generate
    A CultureFitAssessment object containing culture fit questions and assessed company values
    Returns:
    A CultureFitAssessment object containing:
    - questions: List of culture fit questions with options and correct answers
    - company_values_assessed: List of company values being assessed
    """
    try:
        result = generate_culture_fit_questions(company_info, num_questions)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-coding-assessment", response_model=AssessmentResult, tags=["Assessment"])
async def generate_coding_assessment(
    programming_languages: List[str] = Query(..., description="List of ANY programming languages, frameworks, or technologies to test (e.g., ['Python', 'Django', 'React', 'Kubernetes', 'GraphQL', 'Blockchain'] - no restrictions)"),
    num_questions: int = Query(..., description="Number of coding questions to generate"),
    difficulty: str = Query("intermediate", description="Difficulty level: junior, intermediate, or senior"),
    focus_areas: List[str] = Query(None, description="Optional: Specific areas to focus on (e.g., ['algorithms', 'data-structures', 'system-design'])")
):
    """
    Generate a coding assessment for ANY programming language, framework, or technology stack.
    
    This endpoint dynamically creates coding questions for any technology you specify:
    - Accepts ANY programming language, framework, or technology without restrictions
    - Intelligently adapts to generate relevant questions for each technology
    - Supports everything from mainstream languages to niche frameworks
    - Handles modern technologies like AI/ML, blockchain, IoT, cloud services, etc.
    
    **Dynamic Technology Support:**
    - Programming Languages: Python, JavaScript, Java, C++, Rust, Go, Haskell, Erlang, etc.
    - Web Frameworks: Django, React, Angular, Vue, Spring Boot, Rails, Laravel, etc.
    - Mobile: React Native, Flutter, SwiftUI, Kotlin, Xamarin, Ionic, etc.
    - Databases: SQL, PostgreSQL, MongoDB, Redis, Cassandra, Neo4j, etc.
    - Cloud/DevOps: AWS, Azure, GCP, Docker, Kubernetes, Terraform, Jenkins, etc.
    - Specialized: Machine Learning, Blockchain, GraphQL, WebAssembly, IoT, etc.
    - ANY other technology you need to assess
    
    **Key Features:**
    - Dynamically generates questions for any technology stack
    - Adapts to technology-specific paradigms and best practices
    - Multiple test cases including edge cases for thorough validation
    - Difficulty scaling: junior, intermediate, or senior levels
    - Optional focus areas for targeted skill assessment
    
    **Test Cases Included:**
    - Each coding question comes with 4-6 test cases minimum
    - Covers normal cases, edge cases, and boundary conditions
    - Input/output format clearly specified
    - Expected solutions included for grading reference
    
    Parameters:
    - programming_languages: Array of ANY technology names (no restrictions)
    - num_questions: Total number of coding questions to generate
    - difficulty: Complexity level (junior/intermediate/senior)
    - focus_areas: Optional specific topics to emphasize
    
    Returns:
    An AssessmentResult containing:
    - Technology-specific coding questions
    - Appropriate function signatures or code templates
    - Comprehensive test cases for validation
    - Complete expected solutions
    - Skills being assessed
    """
    try:
        from app.services.assessment_service import generate_language_specific_coding_assessment

        result = generate_language_specific_coding_assessment(
            programming_languages=programming_languages,
            num_questions=num_questions,
            difficulty=difficulty,
            focus_areas=focus_areas or []
        )
        return result
    except ValueError as e:
        # Surface validation errors as 400 to satisfy tests expecting validation failures
        return JSONResponse(status_code=400, content={"detail": str(e)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": f"Error generating coding assessment: {str(e)}"})

class OverallFeedbackRequest(BaseModel):
    candidate_id: Optional[str] = None
    assessment_id: Optional[str] = None
    resume_analysis: Optional[ResumeAnalysis] = None
    culture_fit_results: Optional[CultureFitResults] = None
    skills_assessment_results: Optional[SkillsAssessmentResults] = None

    class Config:
        extra = "forbid"

@router.post("/generate-overall-feedback", response_model=dict, tags=["Assessment"])
async def generate_candidate_feedback(request: OverallFeedbackRequest):
    """
    Generate comprehensive overall feedback combining all assessment components.
    
    This endpoint synthesizes data from multiple assessment sources to provide a holistic
    evaluation of the candidate with a final hiring recommendation.
    
    **Assessment Components:**
    1. Resume Analysis (40% weight)
       - Role match and alignment
       - Skills and experience relevance
       - Education and certifications
    
    2. Cultural Fit Assessment (20% weight)
       - Company values alignment
       - Work style compatibility
       - Team dynamics potential
    
    3. Skills/Technical Assessment (40% weight)
       - Coding proficiency (for technical roles)
       - Problem-solving abilities
       - Domain knowledge depth
    
    **Recommendation Levels:**
    - "Strongly Recommend - Proceed to Final Interview": Exceptional candidate (85%+)
    - "Recommend - Proceed to Next Stage": Strong candidate (70-84%)
    - "Consider - Additional Screening Needed": Potential with gaps (60-69%)
    - "Do Not Recommend": Significant gaps or misalignment (<60%)
    
    **Example Response:**
    The response provides a comprehensive evaluation including:
    - Overall score and recommendation
    - Executive summary
    - Detailed feedback for each assessment area
    - Identified strengths and improvement areas
    - Potential risks
    - Suggested next steps
    - Focus areas for interviews
    
    **Sample Feedback:**
    "Based on the applicant's performance across all stages, including resume analysis, 
    cultural fit assessment, skills evaluation, and pre-screening interview, it is 
    recommended to proceed to the next stage. The applicant demonstrates strong alignment 
    with the required skills for the role and the company's cultural values. Scheduling 
    a final interview is advised to confirm their suitability for the position."
    
    Parameters:
    - candidate_id: Optional candidate identifier for tracking
    - assessment_id: Optional assessment ID to retrieve stored results
    - resume_analysis: Resume analysis results dictionary
    - culture_fit_results: Culture fit assessment results
    - skills_assessment_results: Technical/skills assessment results
    
    Returns:
    Comprehensive feedback dictionary with:
    - overall_score: Weighted total score (0-100)
    - recommendation: Final hiring recommendation
    - summary: Executive summary
    - detailed_feedback: Breakdown by assessment area
    - next_steps: Recommended actions
    - interview_focus_areas: Suggested interview topics
    """
    try:
        # If assessment_id is provided, retrieve stored results
        stage_results = None
        if request.assessment_id:
            try:
                from app.services.storage_service import assessment_storage
                stage_results = assessment_storage.get_stage_results(request.assessment_id)
            except:
                pass
        
        # Generate overall feedback
        feedback = generate_overall_feedback(
            resume_analysis=request.resume_analysis.dict() if request.resume_analysis else None,
            culture_fit_results=request.culture_fit_results.dict() if request.culture_fit_results else None,
            skills_assessment_results=request.skills_assessment_results.dict() if request.skills_assessment_results else None,
            stage_results=stage_results
        )
        
        # Add candidate tracking if provided
        if request.candidate_id:
            feedback["candidate_id"] = request.candidate_id
        if request.assessment_id:
            feedback["assessment_id"] = request.assessment_id
        
        return feedback
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating overall feedback: {str(e)}")