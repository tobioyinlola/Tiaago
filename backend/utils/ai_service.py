import logging
import os
import re
import requests
from tempfile import NamedTemporaryFile
from typing import Literal, List, Optional, TypedDict
import requests as requester
from django.db import models
from loguru import logger
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

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

BASE_URL = os.environ.get("AI_SERVICE_BASE_URL", "http://localhost:9000/api/v1")
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


# Applied to every AI-service call that doesn't pass its own timeout (e.g.
# get_categorized_mcq_questions's 240s override still wins). Without this,
# requests has no default and a hung AI service can block a request/Celery
# task forever.
DEFAULT_AI_TIMEOUT = 30

# Only transport-level failures (connection refused/reset, read timeout) are
# retried -- a parsed HTTP error response from the AI service (4xx/5xx) is
# not transient and is left to the caller's existing except-Exception
# fallback instead of being retried here.
_TRANSIENT_AI_ERRORS = (requests.exceptions.Timeout, requests.exceptions.ConnectionError)


def _rewind_files_kwarg(retry_state):
    """Callers like analyze_resume() pass an open file handle via files=.
    A read-timeout happens *after* the file has already been fully sent, so
    without this a retry would upload an empty file instead of the resume."""
    files = retry_state.kwargs.get("files")
    if not files:
        return
    for value in files.values():
        f = value[1] if isinstance(value, tuple) else value
        if hasattr(f, "seek"):
            try:
                f.seek(0)
            except (OSError, ValueError):
                pass


class AIServiceHandler:
    """AI Service Handler. Logs every request and reesponse to logs/ai.log"""

    def __init__(self):
        self.requests = LoggingSession()
        # Authenticate to the AI service with a shared secret in the X-Service-Key header.
        # The AI service validates this against its own AI_SERVICE_API_KEY env var on every
        # non-health request. The header is omitted in tests by leaving the env var unset.
        api_key = os.environ.get("AI_SERVICE_API_KEY", "")
        if api_key:
            self.requests.headers["X-Service-Key"] = api_key
        # self.requests.headers = headers

    def get(self, url: str):
        return self.requests.get(_(url))

    @retry(
        retry=retry_if_exception_type(_TRANSIENT_AI_ERRORS),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        before=_rewind_files_kwarg,
        reraise=True,
    )
    def post(self, url, payload: dict | None=None, **kwargs):
        kwargs.setdefault("timeout", DEFAULT_AI_TIMEOUT)
        return self.requests.post(_(url), data=payload, **kwargs)

    def clean_option(self, option):
        """Strip a leading option-letter prefix (e.g. "A) ", "B. ", "c:") the AI
        sometimes embeds directly in the option/answer text.

        This must catch every prefix style the prompts actually produce (both
        "A. " and "A) " show up across different prompts) -- if a prefix
        survives, it stays baked into the option's stored text, and once
        GeneralSkillAssessmentMCQListSerializer shuffles display order per
        read, a leftover "C)" can end up rendered under position "A", which
        is exactly the mismatch this cleans up before options are ever
        stored.
        """
        if not option:
            return option
        cleaned_option = re.sub(r"^\s*[A-Da-d]\s*[\.\):]\s*", "", option)
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

    def get_categorized_mcq_questions(
        self,
        job_description: str,
        categories: List[str],
        questions_per_category: int = 10,
        role_type: str = "non-technical",
    ):
        """Fetch MCQ questions grouped into named categories from the AI service.

        Returns a list of {"category": str, "questions": [formatted question dicts]}
        using the same question-formatting shape as get_mcq_questions, or None on failure.
        """
        data = {
            "job_description": job_description,
            "categories": categories,
            "questions_per_category": questions_per_category,
            "role_type": role_type,
        }
        # Categories are generated sequentially server-side (~60s ceiling each --
        # up to 4 for technical roles, which add a "Coding" category), so this
        # needs headroom well beyond the other single-call AI endpoints.
        response = self.post(
            "/create-categorized-assessment", params=data, timeout=240
        )
        try:
            response = response.json()
            if "sections" not in response:
                logger.error(f"Categorized assessment error: {response}")
                return None
            formatted_sections = []
            for section in response["sections"]:
                formatted_questions = []
                for question in section.get("questions", []):
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
                formatted_sections.append(
                    {"category": section.get("category"), "questions": formatted_questions}
                )
            return formatted_sections
        except Exception as e:
            logger.error(f"Failed to parse categorized assessment response: {str(e)}")
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

        
    def analyze_resume(self, resume_path, resume_name: str, job_description: str):
        """Function to analyze a resume via the AI service"""
        params = {"job_description": job_description}
        response = None

        # resume_path can be a FieldFile (has .url) or a plain string path/URL
        if hasattr(resume_path, 'url'):
            resume_url = resume_path.url
        else:
            resume_url = str(resume_path)

        # Relative paths (e.g. "resumes/2026/...") need MEDIA_URL prepended
        if not resume_url.startswith(("http://", "https://", "/")):
            from django.conf import settings
            media_url = getattr(settings, 'MEDIA_URL', '/media/')
            if media_url.startswith("http"):
                resume_url = media_url + resume_url
            else:
                resume_url = os.path.join(str(settings.MEDIA_ROOT), resume_url)

        if resume_url.startswith("http://") or resume_url.startswith("https://"):
            r = requests.get(resume_url)
            r.raise_for_status()
            tmp_file = NamedTemporaryFile(delete=False, suffix=os.path.splitext(resume_name)[1])
            tmp_file.write(r.content)
            tmp_file.close()
            local_path = tmp_file.name
        elif hasattr(resume_path, 'path'):
            local_path = resume_path.path
        else:
            local_path = resume_url

        try:
            with open(local_path, "rb") as f:
                files = {
                    "resume_file": (resume_name, f)
                }
                # Runs inside a Celery task (never inline in an HTTP request),
                # so it can afford more headroom than DEFAULT_AI_TIMEOUT --
                # resume parsing + AI analysis is slower than a plain MCQ call.
                ai_service_response = self.post(
                    "/analyze-resume", files=files, params=params, timeout=60
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

    def extract_resume_text(self, resume_path, resume_name: str) -> Optional[str]:
        """Plain-text extraction only, no AI call. Shares analyze_resume's
        file-resolution logic (FieldFile / remote URL / local path) since a
        candidate's resume can live on any of Tiaago's configured storage
        backends (local, Cloudinary, Bunny)."""
        if not resume_path:
            return None

        if hasattr(resume_path, 'url'):
            resume_url = resume_path.url
        else:
            resume_url = str(resume_path)

        if not resume_url.startswith(("http://", "https://", "/")):
            from django.conf import settings
            media_url = getattr(settings, 'MEDIA_URL', '/media/')
            if media_url.startswith("http"):
                resume_url = media_url + resume_url
            else:
                resume_url = os.path.join(str(settings.MEDIA_ROOT), resume_url)

        downloaded = resume_url.startswith("http://") or resume_url.startswith("https://")
        if downloaded:
            r = requests.get(resume_url)
            r.raise_for_status()
            tmp_file = NamedTemporaryFile(delete=False, suffix=os.path.splitext(resume_name)[1])
            tmp_file.write(r.content)
            tmp_file.close()
            local_path = tmp_file.name
        elif hasattr(resume_path, 'path'):
            local_path = resume_path.path
        else:
            local_path = resume_url

        try:
            with open(local_path, "rb") as f:
                files = {"resume_file": (resume_name, f)}
                response = self.post("/extract-resume-text", files=files)
            if response is not None and response.ok:
                return response.json().get("text")
            logger.warning(f"extract_resume_text failed: {getattr(response, 'status_code', None)} {getattr(response, 'text', '')}")
            return None
        except Exception as e:
            logger.error(f"extract_resume_text error: {e}")
            return None
        finally:
            if downloaded:
                os.unlink(local_path)

    def generate_interview_preparation(self, payload: dict) -> Optional[dict]:
        """`payload` matches ai/app/models/interview_prep.InterviewPreparationRequest
        -- job_title, job_description, job_requirement, resume_text,
        assessment_score, assessment_results, previous_notes. Returns the
        parsed JSON brief (candidate_snapshot, career_timeline, strengths,
        watch_areas, suggested_focus, assessment_highlights, competencies,
        questions, model_used) or None on failure."""
        try:
            response = self.post("/generate-interview-preparation", json=payload)
        except Exception as e:
            logger.error(f"generate_interview_preparation request error: {e}")
            return None

        if response is None or not response.ok:
            logger.warning(
                f"generate_interview_preparation failed: "
                f"{getattr(response, 'status_code', None)} {getattr(response, 'text', '')}"
            )
            return None
        try:
            return response.json()
        except Exception as e:
            logger.error(f"generate_interview_preparation response parse error: {e}")
            return None

    def transcribe_audio(self, audio_bytes: bytes, filename: str = "chunk.wav") -> Optional[dict]:
        """`audio_bytes` is a short (~10s) single-speaker WAV chunk decoded
        from the base64 payload a WebSocket consumer received. Returns
        {text, confidence, no_speech} or None on failure -- the consumer
        treats a failed/empty chunk as a dropped chunk, not a fatal error."""
        try:
            files = {"audio_file": (filename, audio_bytes, "audio/wav")}
            response = self.post("/transcribe-audio", files=files, timeout=30)
        except Exception as e:
            logger.error(f"transcribe_audio request error: {e}")
            return None

        if response is None or not response.ok:
            logger.warning(
                f"transcribe_audio failed: {getattr(response, 'status_code', None)} {getattr(response, 'text', '')}"
            )
            return None
        try:
            return response.json()
        except Exception as e:
            logger.error(f"transcribe_audio response parse error: {e}")
            return None

    def generate_copilot_suggestion(self, payload: dict) -> Optional[dict]:
        """`payload` matches ai/app/models/interview_live.CopilotSuggestionRequest.
        Returns {has_suggestion, suggestions, evidence} or None on failure --
        the consumer treats a failed call as "no suggestion this cycle"."""
        try:
            response = self.post("/generate-copilot-suggestion", json=payload, timeout=15)
        except Exception as e:
            logger.error(f"generate_copilot_suggestion request error: {e}")
            return None

        if response is None or not response.ok:
            logger.warning(
                f"generate_copilot_suggestion failed: "
                f"{getattr(response, 'status_code', None)} {getattr(response, 'text', '')}"
            )
            return None
        try:
            return response.json()
        except Exception as e:
            logger.error(f"generate_copilot_suggestion response parse error: {e}")
            return None

    def generate_interview_summary(self, payload: dict) -> Optional[dict]:
        """`payload` matches ai/app/models/interview_summary.InterviewSummaryRequest.
        Returns the parsed JSON summary or None on failure."""
        try:
            response = self.post("/generate-interview-summary", json=payload, timeout=120)
        except Exception as e:
            logger.error(f"generate_interview_summary request error: {e}")
            return None

        if response is None or not response.ok:
            logger.warning(
                f"generate_interview_summary failed: "
                f"{getattr(response, 'status_code', None)} {getattr(response, 'text', '')}"
            )
            return None
        try:
            return response.json()
        except Exception as e:
            logger.error(f"generate_interview_summary response parse error: {e}")
            return None

    def generate_candidate_feedback(self, payload: dict) -> Optional[dict]:
        """`payload` matches ai/app/models/interview_summary.CandidateFeedbackRequest.
        Returns {content, model_used} or None on failure."""
        try:
            response = self.post("/generate-candidate-feedback", json=payload, timeout=60)
        except Exception as e:
            logger.error(f"generate_candidate_feedback request error: {e}")
            return None

        if response is None or not response.ok:
            logger.warning(
                f"generate_candidate_feedback failed: "
                f"{getattr(response, 'status_code', None)} {getattr(response, 'text', '')}"
            )
            return None
        try:
            return response.json()
        except Exception as e:
            logger.error(f"generate_candidate_feedback response parse error: {e}")
            return None

    def generate_ai_interview_questions(self, payload: dict) -> Optional[dict]:
        """`payload` matches ai/app/models/interview_questions.InterviewQuestionsRequest
        -- job_title, company_name, description, requirements, resume_summary,
        assessment_score, weak_areas, duration_minutes, questions_count.
        Returns {questions: [...], model_used} or None on failure."""
        try:
            response = self.post("/generate-interview-questions", json=payload, timeout=90)
        except Exception as e:
            logger.error(f"generate_ai_interview_questions request error: {e}")
            return None

        if response is None or not response.ok:
            logger.warning(
                f"generate_ai_interview_questions failed: "
                f"{getattr(response, 'status_code', None)} {getattr(response, 'text', '')}"
            )
            return None
        try:
            return response.json()
        except Exception as e:
            logger.error(f"generate_ai_interview_questions response parse error: {e}")
            return None

    def score_ai_interview(self, payload: dict) -> Optional[dict]:
        """`payload` matches ai/app/models/interview_scoring.InterviewScoringRequest
        -- job_title, company_name, requirements, candidate_name, transcript,
        questions. Returns the parsed JSON scoring result or None on failure."""
        try:
            response = self.post("/score-ai-interview", json=payload, timeout=120)
        except Exception as e:
            logger.error(f"score_ai_interview request error: {e}")
            return None

        if response is None or not response.ok:
            logger.warning(
                f"score_ai_interview failed: "
                f"{getattr(response, 'status_code', None)} {getattr(response, 'text', '')}"
            )
            return None
        try:
            return response.json()
        except Exception as e:
            logger.error(f"score_ai_interview response parse error: {e}")
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

    def check_plagiarism(self, *, question: dict, user_answer: dict) -> dict:
        """
        Call the plagiarism-check endpoint for a single coding-task answer.

        Payload/response shape mirrors grade_single_coding_question:
        {
            "question": { "question": str },
            "user_answer": { "user_answer": str }
        }
        Returns the JSON (plagiarism_score 0..100, verdict, indicators,
        summary) or raises ValueError with server details. Best-effort by
        design at the call site -- callers should catch and log rather than
        let a plagiarism-check failure block grading/scoring.
        """
        endpoint = "/check-plagiarism"

        q_text = (question or {}).get("question") or ""
        question_payload = {"question": q_text}
        user_payload = {"question": q_text, "user_answer": (user_answer or {}).get("user_answer", "")}
        payload = {"question": question_payload, "user_answer": user_payload}

        resp = self.post(endpoint, json=payload, timeout=30)
        if not (200 <= resp.status_code < 300):
            try:
                err = resp.json()
            except Exception:
                err = resp.text
            raise ValueError(f"Plagiarism API {resp.status_code} at {endpoint}: {err}")

        try:
            data = resp.json()
        except Exception as e:
            raise ValueError(f"Non-JSON response from plagiarism API at {endpoint}: {e}") from e

        if not isinstance(data, dict):
            raise ValueError(f"Unexpected plagiarism response type: {type(data).__name__}")

        data["plagiarism_score"] = self._coerce_score(data.get("plagiarism_score", 0))
        return data

    def suggest_open_ended_grade(self, *, question: str, answer: str, rubric: str = "", max_score: float = 100) -> dict:
        """
        Call the open-ended grade-suggestion endpoint for a single free-text
        answer. Returns the JSON (suggested_score 0..max_score,
        suggested_feedback, confidence) or raises ValueError with server
        details. Best-effort by design at the call site (see
        skill_assessment.tasks.suggest_open_ended_grades) -- a failure here
        must never block marking/grading.
        """
        endpoint = "/suggest-open-ended-grade"

        payload = {
            "question": question or "",
            "answer": answer or "",
            "rubric": rubric or None,
            "max_score": max_score or 100,
        }

        resp = self.post(endpoint, json=payload, timeout=30)
        if not (200 <= resp.status_code < 300):
            try:
                err = resp.json()
            except Exception:
                err = resp.text
            raise ValueError(f"Open-ended grade API {resp.status_code} at {endpoint}: {err}")

        try:
            data = resp.json()
        except Exception as e:
            raise ValueError(f"Non-JSON response from open-ended grade API at {endpoint}: {e}") from e

        if not isinstance(data, dict):
            raise ValueError(f"Unexpected open-ended grade response type: {type(data).__name__}")

        data["suggested_score"] = self._coerce_score(data.get("suggested_score", 0), default=0.0)
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
