import io
import os
import types
import pytest

from app.services import file_handler as fh
from app.services import text_extractor as te
from app.services.storage_service import AssessmentStorage
from app.models.assessment import MultiStageAssessment, AssessmentResult, StageResult, Question


class _DummyUploadFile:
    # Minimal UploadFile-like object for our save function
    def __init__(self, filename: str, content: bytes):
        self.filename = filename
        self.file = io.BytesIO(content)


def test_file_handler_save_and_remove_tmp(monkeypatch, tmp_path):
    # Point TEMP_FILE_DIR to tmp_path
    from app.config import settings
    monkeypatch.setattr(settings, "TEMP_FILE_DIR", str(tmp_path))

    uf = _DummyUploadFile("sample.txt", b"hello")
    path = pytest.run(async_fn=fh.save_upload_file_tmp, args=(uf,)) if hasattr(pytest, "run") else None

    # Fallback call for sync test runner
    if path is None:
        import asyncio
        path = asyncio.get_event_loop().run_until_complete(fh.save_upload_file_tmp(uf))

    assert os.path.exists(path)
    with open(path, "rb") as f:
        assert f.read() == b"hello"

    fh.remove_temp_file(path)
    assert not os.path.exists(path)


def test_text_extractor_pdf(monkeypatch, tmp_path):
    # Create a fake pdf file path
    pdf_path = str(tmp_path / "file.pdf")
    with open(pdf_path, "wb") as f:
        f.write(b"%PDF-1.4\n...")

    class _FakePage:
        def extract_text(self):
            return "PDF TEXT"

    class _FakeReader:
        def __init__(self, file):
            self.pages = [_FakePage(), _FakePage()]

    monkeypatch.setattr(te.PyPDF2, "PdfReader", _FakeReader)

    text = te.extract_text(pdf_path)
    assert text == "PDF TEXTPDF TEXT"


def test_text_extractor_docx(monkeypatch, tmp_path):
    docx_path = str(tmp_path / "file.docx")
    with open(docx_path, "wb") as f:
        f.write(b"PK\x03\x04")  # minimal zip header bytes

    monkeypatch.setattr(te, "docx2txt", types.SimpleNamespace(process=lambda p: "DOCX TEXT"))
    text = te.extract_text(docx_path)
    assert text == "DOCX TEXT"


def _sample_assessment():
    # Minimal MultiStageAssessment with MCQ and coding
    mcq = AssessmentResult(
        assessment_type="mcq",
         questions=[Question(question="Q1", options=["A","B"], correct_answer="A", explanation="")],
         ai_determined_difficulty="intermediate",
         role_type="technical",
         skills_assessed=["python"],
    )
    coding = AssessmentResult(
        assessment_type="coding",
        questions=[Question(question="Code Q1", correct_answer="pass", test_cases=[], explanation="")],
        ai_determined_difficulty="intermediate",
        role_type="technical",
        skills_assessed=["python"],
    )
    return MultiStageAssessment(
        ai_determined_difficulty="intermediate",
        mcq_assessment=mcq,
        coding_assessment=coding,
        role_type="technical",
        assessment_id="abc123",
        stage_completed=[],
        job_description="Sample JD",
        current_stage="mcq",
        total_stages=2,
    )


def test_storage_service_crud_and_progression():
    store = AssessmentStorage()
    ms = _sample_assessment()
    aid = store.store_assessment(ms)
    assert aid == "abc123"
    assert store.get_assessment(aid) is not None

    # Current stage should be MCQ initially
    cur = store.get_current_stage_questions(aid)
    assert cur["current_stage"] == "mcq"
    assert cur["question_count"] == 1

    # Record MCQ completion
    sr1 = StageResult(stage="mcq", grading_results=[], overall_score=80.0, feedback="ok")
    store.record_stage_completion(aid, "mcq", sr1)
    cur2 = store.get_current_stage_questions(aid)
    assert cur2["current_stage"] == "coding"

    # Record coding completion
    sr2 = StageResult(stage="coding", grading_results=[], overall_score=90.0, feedback="ok")
    store.record_stage_completion(aid, "coding", sr2)
    cur3 = store.get_current_stage_questions(aid)
    assert cur3["current_stage"] == "completed"

    # Link candidate
    store.link_candidate_to_assessment("cand1", aid)
    assert aid in store.get_candidate_assessments("cand1")


