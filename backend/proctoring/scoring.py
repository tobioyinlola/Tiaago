from .models import ProctoringEvent, ProctoringSession

EventType = ProctoringEvent.EventType
RiskLevel = ProctoringSession.RiskLevel

# (points lost per occurrence, max total points lost for this event type)
PER_OCCURRENCE_PENALTIES = {
    EventType.WINDOW_BLURRED: (3, 15),
    EventType.FULLSCREEN_EXITED: (5, 20),
    EventType.COPY_DETECTED: (8, 24),
    EventType.PASTE_DETECTED: (10, 30),
    EventType.DEVTOOLS_DETECTED: (15, 30),
    EventType.MULTIPLE_FACES_DETECTED: (15, 30),
    EventType.SCREENSHOT_ATTEMPT: (8, 16),
}

TAB_HIDDEN_MAX_PENALTY = 25
NO_FACE_DETECTED_DURATION_THRESHOLD_SECONDS = 60
NO_FACE_DETECTED_PENALTY = 10
RAPID_ANSWERING_PENALTY = 20
FORCED_SUBMISSION_SCORE_CAP = 30


def calculate_integrity_score(session):
    """Pure function: (ProctoringSession) -> (score: int, risk_level: str).
    Computed authoritatively from the session's own stored events -- never
    trusts a client-submitted score."""
    events = list(session.events.all())
    score = 100

    for event_type, (per_occurrence, cap) in PER_OCCURRENCE_PENALTIES.items():
        count = sum(1 for e in events if e.event_type == event_type)
        score -= min(count * per_occurrence, cap)

    if any(e.event_type == EventType.TAB_HIDDEN for e in events):
        score -= TAB_HIDDEN_MAX_PENALTY

    no_face_total_duration = sum(
        (e.duration_seconds or 0) for e in events if e.event_type == EventType.NO_FACE_DETECTED
    )
    if no_face_total_duration > NO_FACE_DETECTED_DURATION_THRESHOLD_SECONDS:
        score -= NO_FACE_DETECTED_PENALTY

    if any(e.event_type == EventType.RAPID_ANSWERING for e in events):
        score -= RAPID_ANSWERING_PENALTY

    if any(e.event_type == EventType.FORCED_SUBMISSION for e in events):
        score = min(score, FORCED_SUBMISSION_SCORE_CAP)

    score = max(0, score)
    return score, _risk_level_for_score(score)


def _risk_level_for_score(score):
    if score >= 80:
        return RiskLevel.LOW
    if score >= 60:
        return RiskLevel.MEDIUM
    if score >= 40:
        return RiskLevel.HIGH
    return RiskLevel.CRITICAL
