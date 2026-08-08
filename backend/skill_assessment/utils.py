"""Shared helpers for resolving a candidate's display identity across both
assessment "modes": the job-application-backed flow (always a real
TalentProfile) and the standalone, account-less invite flow (never a
TalentProfile -- see GeneralSkillAssessment.invited_email/invited_name).

Centralized here so every place that needs "this submission's candidate
name/email" (recruiter reports, proctoring, notification emails) branches
the same way instead of each re-deriving it -- and to keep None-handling out
of the call sites that just want a name/email.
"""


def get_submission_candidate_name(submission):
    """submission: CandidateAssessmentSubmission (or None-safe on missing FKs)."""
    if submission is None:
        return None
    if submission.candidate_id:
        candidate = submission.candidate
        return (
            submission.candidate_display_name
            or candidate.full_name
            or candidate.user.get_full_name()
            or candidate.user.username
        )
    assessment = submission.skill_assessment
    return getattr(assessment, "invited_name", None) or None


def get_submission_candidate_email(submission):
    if submission is None:
        return None
    if submission.candidate_id:
        return submission.candidate.user.email
    assessment = submission.skill_assessment
    return getattr(assessment, "invited_email", None) or None


def resolve_invite_talent(assessment):
    """The TalentProfile behind an invite-token assessment, or None for a
    standalone (account-less) invite. Used at every AllowAny invite-flow
    view instead of each repeating `assessment.job_application.applicant`
    directly, which assumes a job_application always exists."""
    if assessment is None:
        return None
    if assessment.job_application_id:
        return assessment.job_application.applicant
    if assessment.assigned_to_id:
        return assessment.assigned_to
    return None


def get_assessment_candidate_name(assessment):
    """assessment: GeneralSkillAssessment. Used where we only have the
    assessment (e.g. resolving the invite-token flow before a submission
    row necessarily exists)."""
    if assessment is None:
        return None
    if assessment.job_application_id:
        # job_application.candidate_full_name already falls back to the
        # guest's submitted name when there's no TalentProfile (a guest
        # job application) -- invited_name is a further fallback in case
        # that's also unset.
        return assessment.job_application.candidate_full_name or assessment.invited_name
    if assessment.assigned_to_id:
        talent = assessment.assigned_to
        return talent.full_name or talent.user.get_full_name() or talent.user.username
    return assessment.invited_name


def get_assessment_candidate_email(assessment):
    if assessment is None:
        return None
    if assessment.job_application_id:
        return assessment.job_application.candidate_email or assessment.invited_email
    if assessment.assigned_to_id:
        return assessment.assigned_to.user.email
    return assessment.invited_email


# Proctoring defaults applied when there's no Job to read settings from (a
# standalone assessment). Mirrors Job's own field defaults (jobs/models.py)
# so a standalone assessment gets the same out-of-the-box behaviour as a
# job-backed one. Shared between proctoring/views.py (settings_snapshot at
# session-creation time) and skill_assessment/serializers.py (the
# pre-assessment briefing page's `proctoring` block) -- living here, not in
# either app, avoids a circular import between them.
STANDALONE_PROCTORING_DEFAULTS = {
    "proctoring_enabled": True,
    "require_fullscreen": True,
    "require_webcam": True,
    "webcam_snapshots_enabled": True,
    "snapshot_interval_seconds": 60,
    "max_tab_switches_before_warning": 2,
    "max_tab_switches_before_termination": 5,
    "copy_paste_blocked": True,
    "right_click_blocked": True,
    "devtools_detection_enabled": True,
    "force_submit_on_critical_violation": False,
}
