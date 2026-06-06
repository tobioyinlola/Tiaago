from app.utils.helpers import extract_keywords, calculate_keyword_match


def test_extract_keywords_basic():
    text = "Python, Django, REST APIs and testing! Python?"
    kws = extract_keywords(text)
    # Should be lowercase unique tokens
    assert "python" in kws
    assert "django" in kws
    assert "rest" in kws
    assert "apis" in kws
    # No punctuation
    assert "," not in kws and "!" not in kws


def test_calculate_keyword_match_fraction():
    resume = ["python", "django", "fastapi"]
    job = ["python", "django", "pytest", "sql"]
    score = calculate_keyword_match(resume, job)
    # Intersection: python, django => 2/4 = 0.5
    assert abs(score - 0.5) < 1e-9


def test_calculate_keyword_match_handles_empty_job_list():
    assert calculate_keyword_match(["python"], []) == 0


