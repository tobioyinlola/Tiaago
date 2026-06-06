import re

def extract_keywords(text: str) -> list[str]:
    # Simple keyword extraction (you might want to use a more sophisticated method)
    words = re.findall(r'\b\w+\b', text.lower())
    return list(set(words))  # Remove duplicates

def calculate_keyword_match(resume_keywords: list[str], job_keywords: list[str]) -> float:
    resume_set = set(resume_keywords)
    job_set = set(job_keywords)
    matched = resume_set.intersection(job_set)
    return len(matched) / len(job_set) if job_set else 0