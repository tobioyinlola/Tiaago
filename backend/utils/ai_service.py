import logging
import os
import requests
from tempfile import NamedTemporaryFile
from typing import Literal, List, Optional, TypedDict
import requests as requester
from django.db import models
from loguru import logger

DifficultyLevels = Literal["beginner", "intermediate", "senior"]

class TestCase(TypedDict):
    input: str
    expected_output: str

# class Question(TypedDict):
#     question: str
#     answers: List[str]
#     correct_answer: str
#     function_signature: Optional[str]
#     test_cases: Optional[str]
class Question(TypedDict):
    question: str
    answers: List[str]
    correct_answer: str
    function_signature: str
    test_cases: Optional[List[TestCase]]
    explanation: str

class QuestionBankQuestions(TypedDict):
    assessment_type: str
    questions: List[Question]
    difficulty_level: str
    time_limit: int


class CodingQuestion(TypedDict):
    question: str
    answers: None
    correct_answer: None
    function_signature: str
    test_cases: List[TestCase]


class CodingQuestionResponse(TypedDict):
    assessment_type: Literal["coding"]
    questions: List[CodingQuestion]
    difficulty_level: DifficultyLevels
    time_limit: int


class ResumeAnalysisResponse(TypedDict):
    role_match_status: str
    resume_review_score: int
    skill_matching_score: int
    experience_relevance_score: int
    education_certifications_score: int
    total_score: int
    strengths: List[str]
    areas_for_improvement: List[str]
    recommendation: str
    detailed_analysis: str


class AssessmentBlock(TypedDict):
    assessment_type: str
    questions: List[Question]
    ai_determined_difficulty: str
    role_type: Optional[str]
    skills_assessed: List[str]
    stage: Optional[str]
    assessment_id: str


class MultiStageAssessmentResponse(TypedDict):
    assessment_id: str
    role_type: str
    job_description: str
    ai_determined_difficulty: str
    current_stage: str
    total_stages: int
    mcq_assessment: AssessmentBlock
    coding_assessment: AssessmentBlock
    stage_completed: List[str]

class GradeCodingAssessmentResponse(TypedDict):
    question: str
    user_answer: str
    is_correct: bool
    feedback: str
    score: int = 0

class CodingAnswer(TypedDict):
    question: str
    user_answer: list[dict]

logger = logging.getLogger("ai")

BASE_URL =os.environ.get("AI_SERVICE_BASE_URL", "https://ai-production-e4a0.up.railway.app/api/v1")
#BASE_URL = "https://ai-q964.onrender.com/api/v1"


class LoggingSession(requester.Session):
    def send(self, request, **kwargs):
        logger.debug(f"Request URL: {request.url}")
        logger.debug(f"Request method: {request.method}")
        # logger.debug(f"Request body: {request.body}\n")

        response = super(LoggingSession, self).send(request, **kwargs)

        logger.debug(f"Response status code: {response.status_code}")
        logger.debug(f"Response content: {response.content}\n\n\n")

        return response


def _(path):
    return BASE_URL + path


class AIServiceHandler:
    """AI Service Handler. Logs every request and reesponse to logs/ai.log"""

    def __init__(self):
        self.requests = LoggingSession()
        # self.requests.headers = headers

    def get(self, url: str):
        return self.requests.get(_(url))

    def post(self, url, payload: dict | None=None, **kwargs):
        return self.requests.post(_(url), data=payload, **kwargs)

    def clean_option(self, option):
        """Function to clean options in MCQ Questions obtained from the AI service"""

        dirt = ["A. ", "B. ", "C. ", "D. "]
        cleaned_option = option
        for item in dirt:
            cleaned_option = cleaned_option.replace(item, "")
        return cleaned_option.strip()

    def get_mcq_questions(
        self,
        job_description: str,
        num_questions: int = 30
    ):
        """Function to fetch MCQ Questions from the AI service"""

        data = {
            "job_description": job_description,
            "assessment_type": "mcq",
            "role_type": "non-technical"
        }
        if num_questions:
            data["mcq_questions"] = num_questions
        response = self.post("/create-non-technical-assessment", params=data)        
        try:
            response: AssessmentBlock = response.json()
            questions = response["questions"]
            formatted_questions = []
            for question in questions:
                main_question = question.get("question")
                options = question.get("answers", [])
                correct_answer = self.clean_option(question.get("correct_answer"))
                formatted_options = [self.clean_option(option) for option in options]
                correct_option_index = formatted_options.index(correct_answer)
                formatted_questions.append(
                    {
                        "is_ai_generated": True,
                        "question": main_question,
                        "options": [
                            {"index": index, "value": option}
                            for (index, option) in enumerate(formatted_options)
                        ],
                        "correct_option_index": correct_option_index,
                    }
                )
            return formatted_questions
        except Exception as e:
            print(str(e))
            return None

    def get_talent_coding_questions(
        self,
        programming_languages: str,
        difficulty: str,
        num_questions: int = 15
    ):
        """Function to fetch coding questions from the AI service for talent verification"""
        data = {
            "programming_languages": programming_languages,
            "difficulty": difficulty
        }

        if num_questions:
            data["num_questions"] = num_questions

        response = self.post("/generate-coding-assessment", params=data)
        try:

            response: AssessmentBlock = response.json()
            questions = response["questions"]
            formatted_questions = []
            for question in questions:
                main_question = question.get("question")
                function_signature = question.get("function_signature")
                test_cases = question.get("test_cases", [])
                formatted_questions.append(
                    {
                        "is_ai_generated": True,
                        "question": main_question,
                        "function_signature": function_signature,
                        "test_cases": test_cases,
                        "difficulty_level": response.get("ai_determined_difficulty"),
                        "skills_assessed": response.get("skills_assessed"),
                        "correct_answer": question.get("correct_answer"),
                    }
                )

            return {
                "questions": formatted_questions,
                "difficulty": response.get("ai_determined_difficulty"),
                "skills_assessed": response.get("skills_assessed"),
            }
        except Exception as e:
            logger.error(str(e))
            return None
            
    def get_multistage_technical_assessment(
        self,
        job_description: str,
        mcq_questions: int = 20,
        coding_questions: int = 1
    ):
        """Fetch multi-stage assessment (MCQ + Coding) from AI service"""
        
        data = {
            "job_description": job_description,
            "mcq_questions": mcq_questions,
            "coding_questions": coding_questions
        }

        response = self.post("/create-technical-assessment", params=data)
        
        try:
            response: MultiStageAssessmentResponse = response.json()

            # Extract essential parts
            assessment_id = response["assessment_id"]
            mcq_assessment = response["mcq_assessment"]
            coding_assessment = response["coding_assessment"]

            # Format MCQ questions
            formatted_mcq_questions = []
            for question in mcq_assessment["questions"]:
                main_question = question.get("question")
                options = question.get("answers", [])
                correct_answer = self.clean_option(question.get("correct_answer"))
                formatted_options = [self.clean_option(opt) for opt in options]
                correct_option_index = formatted_options.index(correct_answer)

                formatted_mcq_questions.append({
                    "is_ai_generated": True,
                    "question": main_question,
                    "options": [
                        {"index": i, "value": opt} for i, opt in enumerate(formatted_options)
                    ],
                    "correct_option_index": correct_option_index,
                })

            # Format Coding questions
            formatted_coding_questions = []
            for question in coding_assessment["questions"]:
                formatted_coding_questions.append({
                    "is_ai_generated": True,
                    "question": question.get("question"),
                    "function_signature": question.get("function_signature"),
                    "test_cases": question.get("test_cases", []),
                    "difficulty_level": coding_assessment.get("ai_determined_difficulty"),
                    "skills_assessed": coding_assessment.get("skills_assessed")
                })

            return {
                "assessment_id": assessment_id,
                "mcq_questions": formatted_mcq_questions,
                "coding_questions": formatted_coding_questions,
            }
        except Exception as e:
            print(f"Failed to parse AI assessment response: {str(e)}")
            return None

        
    def analyze_resume(self, resume_path: str, resume_name: str, job_description: str):
        """Function to analyze a resume via the AI service"""
        params = {"job_description": job_description}
        response = None

        # If resume_path is a URL, download it first
        resume_url = resume_path.url
        if resume_url.startswith("http://") or resume_url.startswith("https://"):
            r = requests.get(resume_url)
            r.raise_for_status() 
            tmp_file = NamedTemporaryFile(delete=False, suffix=os.path.splitext(resume_name)[1])
            tmp_file.write(r.content)
            tmp_file.close()
            local_path = tmp_file.name
        else:
            local_path = resume_path.path

        try:
            with open(local_path, "rb") as f:
                files = {
                    "resume_file": (resume_name, f)
                }
                ai_service_response = self.post(
                    "/analyze-resume", files=files, params=params
                )
                response = ai_service_response
        finally:
            # Clean up temp file if downloaded
            if resume_url.startswith("http://") or resume_url.startswith("https://"):
                os.unlink(local_path)

        if response:
            try:
                json_data: ResumeAnalysisResponse = response.json()
                return json_data if response.ok else None
            except Exception as e:
                print(str(e))
                return None

    def _coerce_score(self, val, default=0.0):
        try:
            s = float(val)
        except Exception:
            return default
        return max(0.0, min(100.0, s))


    def grade_single_coding_question(self, *, question: dict, user_answer: dict) -> dict:
        """
        Call the single-question endpoint using ONLY the fields the service expects.

        Payload:
        {
            "question": { "question": str, "correct_answer"?: str, "test_cases"?: [...] },
            "user_answer": { "user_answer": str }
        }
        Returns the JSON (guaranteed to include numeric 'score' 0..100) or raises ValueError with server details.
        """
        endpoint = "/grade-single-coding-question"

        # Build payload
        q_text = (question or {}).get("question") or ""
        q_correct = (question or {}).get("correct_answer")
        
        raw_tcs = (question or {}).get("test_cases") or (question or {}).get("tests") or []

        # Normalize test cases to [{"input": str, "expected_output": str}, ...]
        norm_tcs = []
        for tc in raw_tcs:
            if isinstance(tc, dict):
                _in = tc.get("input") or tc.get("input_data")
                _out = tc.get("expected_output") or tc.get("output")
                if _in is not None and _out is not None:
                    norm_tcs.append({"input": _in, "expected_output": _out})

        question_payload = {"question": q_text}
        if q_correct:
            question_payload["correct_answer"] = q_correct
        if norm_tcs:
            question_payload["test_cases"] = norm_tcs

        user_payload = {"question": q_text, "user_answer": (user_answer or {}).get("user_answer", "")}

        payload = {"question": question_payload, "user_answer": user_payload}
        
        

        # Execute + surface 4xx/5xx bodies
        resp = self.post(endpoint, json=payload, timeout=30)
        if not (200 <= resp.status_code < 300):
            try:
                err = resp.json()
            except Exception:
                err = resp.text
            raise ValueError(f"Grading API {resp.status_code} at {endpoint}: {err}")

        try:
            data = resp.json()
        except Exception as e:
            raise ValueError(f"Non-JSON response from grading API at {endpoint}: {e}") from e

        # The service may return Pydantic-style errors: {"detail":[...]} or {"detail":"..."}
        if isinstance(data, dict) and "detail" in data:
            det = data["detail"]
            if isinstance(det, list):
                parts = []
                for d in det:
                    if isinstance(d, dict):
                        loc = d.get("loc")
                        msg = d.get("msg")
                        parts.append(f"{loc}: {msg}" if (loc or msg) else str(d))
                    else:
                        parts.append(str(d))
                raise ValueError("Grading validation error: " + "; ".join(p for p in parts if p))
            raise ValueError(f"Grading validation error: {det}")

        if not isinstance(data, dict):
            raise ValueError(f"Unexpected grading response type: {type(data).__name__}")

        # Accept common shapes; ensure numeric 0..100
        if "score" in data:
            data["score"] = self._coerce_score(data["score"])
        elif isinstance(data.get("result"), dict) and "score" in data["result"]:
            data["score"] = self._coerce_score(data["result"]["score"])
        elif isinstance(data.get("data"), dict) and "score" in data["data"]:
            data["score"] = self._coerce_score(data["data"]["score"])
        else:
            data["score"] = 0.0

        return data


    def grade_coding_assessment(
        self,
        assessment_result,   # dict-like: {"questions":[{...}, ...]}
        user_answers,        # list of {"question_id"?: int, "user_answer": str}
    ):
        """
        Fans out to the single-question API and returns {"coding_score": <avg>}.

        - Matches by question_id; falls back to index.
        - Sends only (question, correct_answer?, test_cases?) and {user_answer}.
        - Skips blank answers. Returns None if nothing could be graded.
        """
        questions = (assessment_result or {}).get("questions") or []
        if not isinstance(questions, list):
            questions = []

        def _qid(q):
            return q.get("id") or q.get("question_id")

        q_by_id = { _qid(q): q for q in questions if _qid(q) is not None }

        scores = []

        for idx, ua in enumerate(user_answers or []):
            try:
                user_code = (ua.get("user_answer") or "").strip()
                if not user_code:
                    continue

                # Pick the matching question
                qid = ua.get("question_id")
                if qid is not None and qid in q_by_id:
                    q = q_by_id[qid]
                elif idx < len(questions):
                    q = questions[idx]
                else:
                    continue

                # Build spec-compliant question object (ONLY allowed keys)
                q_text = q.get("question") or q.get("description") or q.get("title") or ""
                question_payload = {"question": q_text}

                # include correct_answer if you have it (optional)
                if q.get("correct_answer"):
                    question_payload["correct_answer"] = q["correct_answer"]

                # normalize any test cases
                raw_tcs = q.get("test_cases") or q.get("tests") or []
                norm_tcs = []
                for tc in raw_tcs:
                    if isinstance(tc, dict):
                        _in = tc.get("input") or tc.get("input_data")
                        _out = tc.get("expected_output") or tc.get("output")
                        if _in is not None and _out is not None:
                            norm_tcs.append({"input": _in, "expected_output": _out})
                if norm_tcs:
                    question_payload["test_cases"] = norm_tcs

                # Build user payload 
                user_payload = {"user_answer": user_code}
                #print("the question payload is ",question_payload)
                res = self.grade_single_coding_question(
                    question=question_payload,
                    user_answer=user_payload,
                )
                scores.append(self._coerce_score(res.get("score")))
            except Exception as e:
                # Keep grading others; surface context in logs
                try:
                    self.logger.warning("Single-question grading failed: %s", e)
                except Exception:
                    logger.error(f"Single-question grading failed: {e}")
                continue

        if not scores:
            return None

        avg = sum(scores) / len(scores)
        return {"coding_score": round(avg, 2)}
                
# AI Service Handler
AIService = AIServiceHandler()
