"""Pure data computation for the Reports feature. No AI calls anywhere in
this module -- every number is a direct aggregate/count against existing
pipeline, assessment, interview, and billing records. See the module-level
comments below each section for the exact field mapping used and any
schema-driven approximations (documented once here rather than scattered
across the codebase)."""

from datetime import date, datetime, time
from decimal import Decimal

from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone

from ai_interviews.models import AIInterview
from jobs.models import Job, JobApplication
from scheduler.models import InterviewCandidateFeedback, InterviewCompetencyScore, Scheduler
from skill_assessment.models import CandidateAssessmentSubmission, GeneralSkillAssessment, ResumeAnalysis
from subscriptions.models import CandidateBillingRecord

SCORE_BUCKETS = [(0, 20), (20, 40), (40, 60), (60, 80), (80, 101)]


def _day_bounds(d: date, end=False):
    """Timezone-aware start/end-of-day datetime for a plain date, so
    DateTimeField filters against date_from/date_to are inclusive of the
    whole day."""
    t = time(23, 59, 59, 999999) if end else time(0, 0, 0)
    return timezone.make_aware(datetime.combine(d, t))


def _avg_hours(pairs):
    """pairs: iterable of (start_dt, end_dt), either possibly None.
    Returns the average number of hours between each valid pair, or None."""
    diffs = [
        (end - start).total_seconds() / 3600
        for start, end in pairs
        if start is not None and end is not None and end >= start
    ]
    return round(sum(diffs) / len(diffs), 2) if diffs else None


def _avg(queryset, field):
    value = queryset.aggregate(v=Avg(field))["v"]
    return round(float(value), 2) if value is not None else None


def _score_distribution(scores):
    buckets = {f"{lo}-{hi if hi <= 100 else 100}": 0 for lo, hi in SCORE_BUCKETS}
    for score in scores:
        if score is None:
            continue
        for lo, hi in SCORE_BUCKETS:
            if lo <= score < hi:
                buckets[f"{lo}-{hi if hi <= 100 else 100}"] += 1
                break
    return buckets


def _pct(part, whole):
    return round((part / whole) * 100, 1) if whole else 0.0


def _money(value):
    return float(value) if value is not None else 0.0


def compute_role_data(job: Job, date_from: date, date_to: date):
    start, end = _day_bounds(date_from), _day_bounds(date_to, end=True)

    applications = JobApplication.objects.filter(job=job, applied_date__range=(start, end))
    application_ids = list(applications.values_list("id", flat=True))
    applied_count = len(application_ids)

    # ---- Screening (ResumeAnalysis) ----
    screening_threshold = job.get_screening_threshold()
    screenings = ResumeAnalysis.objects.filter(job_application_id__in=application_ids)
    screened_count = screenings.count()
    passed_screenings = screenings.filter(total_score__gte=screening_threshold)
    passed_screening_count = passed_screenings.count()
    avg_screening_score_all = _avg(screenings, "total_score")
    avg_screening_score_passed = _avg(passed_screenings, "total_score")

    # ---- Assessment (GeneralSkillAssessment -> CandidateAssessmentSubmission) ----
    assessments = GeneralSkillAssessment.objects.filter(job_application_id__in=application_ids)
    assessment_sent_count = assessments.filter(invite_sent_at__isnull=False).count()
    submissions = CandidateAssessmentSubmission.objects.filter(skill_assessment__job_application_id__in=application_ids)
    completed_submissions = submissions.filter(is_completed=True)
    assessment_completed_count = completed_submissions.count()
    avg_assessment_score = _avg(completed_submissions, "total_score")
    assessment_score_distribution = _score_distribution(
        list(completed_submissions.values_list("total_score", flat=True))
    )
    sent_assessments = list(assessments.filter(invite_sent_at__isnull=False))
    avg_assessment_hours_to_complete = _avg_hours([
        (a.invite_sent_at, s.completed_at)
        for a in sent_assessments
        for s in submissions
        if s.skill_assessment_id == a.id and s.completed_at
    ])

    # ---- Interviews (AI or human -- a job is ever only one or the other) ----
    ai_interviews = AIInterview.objects.filter(job=job, job_application_id__in=application_ids, is_preview=False)
    ai_completed = ai_interviews.filter(status=AIInterview.Status.COMPLETED)
    human_interviews = Scheduler.objects.filter(job_application_id__in=application_ids)
    human_completed = human_interviews.filter(status=Scheduler.Status.COMPLETED)
    interviewed_count = ai_completed.count() + human_completed.count()

    # ---- Placements / filled ----
    filled_count = applications.filter(status=JobApplication.JobApplicationStatus.OFFER_ACCEPTED).count()
    # No job-status change-history table exists -- job_status=HIRED + last_updated
    # is the closest available signal for "when this role was filled".
    is_filled = job.job_status == Job.JobStatus.HIRED
    days_to_fill = (job.last_updated.date() - job.date_created.date()).days if is_filled else None
    days_open = days_to_fill if is_filled else (timezone.now().date() - job.date_created.date()).days

    # ---- Time metrics ----
    first_applicant = applications.order_by("applied_date").first()
    days_posted_to_first_applicant = (
        (first_applicant.applied_date.date() - job.date_created.date()).days if first_applicant else None
    )
    screening_by_app_id = {s.job_application_id: s for s in screenings}
    assessment_by_app_id = {a.job_application_id: a for a in assessments}
    avg_hours_application_to_screening = _avg_hours([
        (a.applied_date, screening_by_app_id[a.id].created_at)
        for a in applications if a.id in screening_by_app_id
    ])
    avg_hours_screening_pass_to_assessment_sent = _avg_hours([
        (s.created_at, assessment_by_app_id[s.job_application_id].invite_sent_at)
        for s in passed_screenings
        if s.job_application_id in assessment_by_app_id and assessment_by_app_id[s.job_application_id].invite_sent_at
    ])

    # ---- Cost (actual charged amounts, not re-derived current pricing --
    # historical accuracy over a report's date range) ----
    billing = CandidateBillingRecord.objects.filter(job=job, job_application_id__in=application_ids)
    resume_screening_billed = billing.filter(resume_screening_charged=True)
    assessment_billed = billing.filter(assessment_charged=True)
    resume_screening_total = resume_screening_billed.aggregate(t=Sum("resume_screening_amount"))["t"] or Decimal("0")
    assessment_total = assessment_billed.aggregate(t=Sum("assessment_amount"))["t"] or Decimal("0")
    ai_interview_billed = ai_interviews.filter(billing_charged=True)
    ai_interview_total = ai_interview_billed.aggregate(t=Sum("billing_amount"))["t"] or Decimal("0")
    human_interview_billed = human_interviews.filter(interview_package_charged=True)
    human_interview_total = human_interview_billed.aggregate(t=Sum("interview_package_amount"))["t"] or Decimal("0")
    recording_billed = human_interviews.filter(recording_addon_charged=True)
    recording_total = recording_billed.aggregate(t=Sum("recording_addon_amount"))["t"] or Decimal("0")
    role_total_cost = resume_screening_total + assessment_total + ai_interview_total + human_interview_total + recording_total

    cost = {
        "resume_screening": {"count": resume_screening_billed.count(), "total": _money(resume_screening_total)},
        "assessment": {"count": assessment_billed.count(), "total": _money(assessment_total)},
        "ai_interview": {"count": ai_interview_billed.count(), "total": _money(ai_interview_total)},
        "human_interview": {"count": human_interview_billed.count(), "total": _money(human_interview_total)},
        "recording": {"count": recording_billed.count(), "total": _money(recording_total)},
        "role_total": _money(role_total_cost),
        "cost_per_candidate": round(_money(role_total_cost) / applied_count, 2) if applied_count else 0.0,
        "cost_per_placement": round(_money(role_total_cost) / filled_count, 2) if filled_count else None,
    }

    # ---- Human-interview competency averages (if any) ----
    competency_scores = InterviewCompetencyScore.objects.filter(
        interview__job_application_id__in=application_ids, score_normalised__isnull=False
    )
    competency_averages = list(
        competency_scores.values("competency_name").annotate(avg_score=Avg("score_normalised")).order_by("-avg_score")
    )

    return {
        "job_id": job.id,
        "title": job.title,
        "date_posted": job.date_created.date().isoformat(),
        "date_filled": job.last_updated.date().isoformat() if is_filled else None,
        "status_label": "Filled" if is_filled else ("Active" if job.job_status == Job.JobStatus.ACTIVE else "Closed"),
        "funnel": {
            "applied": applied_count,
            "screened": screened_count,
            "assessment_sent": assessment_sent_count,
            "assessment_completed": assessment_completed_count,
            "interviewed": interviewed_count,
            "filled": filled_count,
        },
        "time": {
            "days_posted_to_first_applicant": days_posted_to_first_applicant,
            "avg_hours_application_to_screening": avg_hours_application_to_screening,
            "avg_hours_screening_pass_to_assessment_sent": avg_hours_screening_pass_to_assessment_sent,
            "avg_hours_assessment_sent_to_completed": avg_assessment_hours_to_complete,
            "days_open": days_open,
            "days_to_fill": days_to_fill,
            "is_filled": is_filled,
        },
        "scores": {
            "avg_screening_score_all": avg_screening_score_all,
            "avg_screening_score_passed": avg_screening_score_passed,
            "avg_assessment_score": avg_assessment_score,
            "assessment_score_distribution": assessment_score_distribution,
        },
        "cost": cost,
        "screening_passed_count": passed_screening_count,
        "screening_pass_rate": _pct(passed_screening_count, screened_count),
        "assessment_completion_rate": _pct(assessment_completed_count, assessment_sent_count),
        "competency_averages": competency_averages,
        "ai_interview_avg_score": _avg(ai_completed, "overall_score"),
        "human_interviews_conducted": human_completed.count(),
        "ai_interviews_conducted": ai_completed.count(),
    }


FUNNEL_STAGES = ["applied", "screened", "assessment_sent", "assessment_completed", "interviewed", "filled"]


def compute_summary(roles):
    total_applied = sum(r["funnel"]["applied"] for r in roles)
    total_screened = sum(r["funnel"]["screened"] for r in roles)
    total_screening_passed = sum(r["screening_passed_count"] for r in roles)
    total_assessments = sum(r["funnel"]["assessment_sent"] for r in roles)
    total_cost = sum(r["cost"]["role_total"] for r in roles)
    total_candidates_processed = total_applied
    filled_roles = [r for r in roles if r["time"]["is_filled"] and r["time"]["days_to_fill"] is not None]

    return {
        "total_roles": len(roles),
        "total_applied": total_applied,
        "total_screened_passed": total_screening_passed,
        "screening_pass_rate": _pct(total_screening_passed, total_screened),
        "total_assessments": total_assessments,
        "avg_cost_per_candidate": round(total_cost / total_candidates_processed, 2) if total_candidates_processed else 0.0,
        "avg_cost_per_role_filled": round(
            sum(r["cost"]["role_total"] for r in filled_roles) / len(filled_roles), 2
        ) if filled_roles else None,
        "avg_days_posted_to_filled": round(
            sum(r["time"]["days_to_fill"] for r in filled_roles) / len(filled_roles), 1
        ) if filled_roles else None,
    }


def compute_combined_pipeline(roles):
    combined = {stage: sum(r["funnel"][stage] for r in roles) for stage in FUNNEL_STAGES}
    drop_offs = {}
    largest_drop_stage, largest_drop_pct = None, -1
    for prev, curr in zip(FUNNEL_STAGES, FUNNEL_STAGES[1:]):
        drop_pct = _pct(combined[prev] - combined[curr], combined[prev])
        drop_offs[f"{prev}_to_{curr}"] = drop_pct
        if drop_pct > largest_drop_pct:
            largest_drop_pct, largest_drop_stage = drop_pct, f"{prev}_to_{curr}"

    screening_table = sorted(
        [
            {
                "job_id": r["job_id"], "title": r["title"],
                "pass_rate": r["screening_pass_rate"],
                "avg_score": r["scores"]["avg_screening_score_all"],
            }
            for r in roles
        ],
        key=lambda x: (x["pass_rate"] is not None, x["pass_rate"]), reverse=True,
    )
    assessment_table = [
        {
            "job_id": r["job_id"], "title": r["title"],
            "completion_rate": r["assessment_completion_rate"],
            "avg_score": r["scores"]["avg_assessment_score"],
            "avg_hours_to_complete": r["time"]["avg_hours_assessment_sent_to_completed"],
        }
        for r in roles
    ]
    interview_table = [
        {
            "job_id": r["job_id"], "title": r["title"],
            "human_interviews_conducted": r["human_interviews_conducted"],
            "ai_interviews_conducted": r["ai_interviews_conducted"],
            "competency_averages": r["competency_averages"],
            "ai_interview_avg_score": r["ai_interview_avg_score"],
        }
        for r in roles
        if r["human_interviews_conducted"] or r["ai_interviews_conducted"]
    ]

    return {
        "combined_funnel": combined,
        "drop_offs": drop_offs,
        "largest_drop_off_stage": largest_drop_stage,
        "screening_performance": screening_table,
        "assessment_performance": assessment_table,
        "interview_performance": interview_table,
    }


def compute_costs(roles, date_from, date_to):
    categories = ["resume_screening", "assessment", "ai_interview", "human_interview", "recording"]
    totals = {cat: round(sum(r["cost"][cat]["total"] for r in roles), 2) for cat in categories}
    grand_total = round(sum(totals.values()), 2)

    per_role = sorted(
        [{"job_id": r["job_id"], "title": r["title"], "total": r["cost"]["role_total"]} for r in roles],
        key=lambda x: x["total"], reverse=True,
    )

    # Monthly spend trend -- billed_at timestamps grouped by month, within range.
    start, end = _day_bounds(date_from), _day_bounds(date_to, end=True)
    job_ids = [r["job_id"] for r in roles]
    monthly = {}
    billing_qs = CandidateBillingRecord.objects.filter(job_id__in=job_ids, created_at__range=(start, end))
    for rec in billing_qs:
        key = rec.created_at.strftime("%Y-%m")
        monthly[key] = monthly.get(key, 0) + _money(rec.resume_screening_amount) + _money(rec.assessment_amount)
    for interview in AIInterview.objects.filter(job_id__in=job_ids, billing_charged=True, created_at__range=(start, end)):
        key = interview.created_at.strftime("%Y-%m")
        monthly[key] = monthly.get(key, 0) + _money(interview.billing_amount)
    for meeting in Scheduler.objects.filter(
        job_application__job_id__in=job_ids, created_on__range=(start, end)
    ).filter(Q(interview_package_charged=True) | Q(recording_addon_charged=True)):
        key = meeting.created_on.strftime("%Y-%m")
        monthly[key] = monthly.get(key, 0) + _money(meeting.interview_package_amount) + _money(meeting.recording_addon_amount)

    monthly_trend = [{"month": k, "amount": round(v, 2)} for k, v in sorted(monthly.items())]

    cost_efficiency = [
        {
            "job_id": r["job_id"], "title": r["title"],
            "candidates": r["funnel"]["applied"],
            "cost": r["cost"]["role_total"],
            "placements": r["funnel"]["filled"],
            "cost_per_placement": r["cost"]["cost_per_placement"],
        }
        for r in roles
    ]

    return {
        "breakdown": totals,
        "grand_total": grand_total,
        "cost_per_role": per_role,
        "monthly_trend": monthly_trend,
        "cost_efficiency": cost_efficiency,
    }


TIME_STAGE_KEYS = [
    ("avg_hours_application_to_screening", "Application to screening result"),
    ("avg_hours_screening_pass_to_assessment_sent", "Screening pass to assessment sent"),
    ("avg_hours_assessment_sent_to_completed", "Assessment sent to assessment completed"),
]

BENCHMARK_DAYS_TO_FILL = 23


def compute_time_analysis(roles):
    stage_durations = {}
    for key, label in TIME_STAGE_KEYS:
        values = [r["time"][key] for r in roles if r["time"][key] is not None]
        stage_durations[key] = {"label": label, "avg_hours": round(sum(values) / len(values), 2) if values else None}

    time_to_fill = sorted(
        [
            {"job_id": r["job_id"], "title": r["title"], "days_to_fill": r["time"]["days_to_fill"]}
            for r in roles if r["time"]["days_to_fill"] is not None
        ],
        key=lambda x: x["days_to_fill"],
    )
    for row in time_to_fill:
        row["beats_benchmark"] = row["days_to_fill"] <= BENCHMARK_DAYS_TO_FILL

    return {
        "stage_durations": stage_durations,
        "time_to_fill": time_to_fill,
        "benchmark_days": BENCHMARK_DAYS_TO_FILL,
    }


def compute_experience(roles):
    drop_off_table = []
    for prev, curr in zip(FUNNEL_STAGES, FUNNEL_STAGES[1:]):
        entered = sum(r["funnel"][prev] for r in roles)
        left = entered - sum(r["funnel"][curr] for r in roles)
        drop_off_table.append({
            "stage": f"{prev} -> {curr}",
            "entered": entered,
            "left": left,
            "drop_off_rate": _pct(left, entered),
        })

    total_sent = sum(r["funnel"]["assessment_sent"] for r in roles)
    total_completed = sum(r["funnel"]["assessment_completed"] for r in roles)
    avg_hours_to_complete_values = [
        r["time"]["avg_hours_assessment_sent_to_completed"] for r in roles
        if r["time"]["avg_hours_assessment_sent_to_completed"] is not None
    ]

    job_ids = [r["job_id"] for r in roles]
    total_interviewed = sum(r["funnel"]["interviewed"] for r in roles)
    feedback_sent_count = InterviewCandidateFeedback.objects.filter(
        interview__job_application__job_id__in=job_ids, sent_at__isnull=False
    ).count()
    feedback_rate = _pct(feedback_sent_count, total_interviewed)
    avg_hours_interview_to_feedback = _avg_hours([
        (f.interview.ended_at, f.sent_at)
        for f in InterviewCandidateFeedback.objects.filter(
            interview__job_application__job_id__in=job_ids, sent_at__isnull=False
        ).select_related("interview")
        if f.interview.ended_at
    ])

    return {
        "drop_off_analysis": drop_off_table,
        "assessment_response": {
            "avg_hours_invite_to_completion": (
                round(sum(avg_hours_to_complete_values) / len(avg_hours_to_complete_values), 2)
                if avg_hours_to_complete_values else None
            ),
            "completion_rate": _pct(total_completed, total_sent),
        },
        "feedback": {
            "sent_count": feedback_sent_count,
            "total_interviewed": total_interviewed,
            "rate": feedback_rate,
            "avg_hours_to_send": avg_hours_interview_to_feedback,
        },
    }


def compute_report_data(report):
    jobs = list(Job.objects.filter(id__in=report.job_ids, company_id=report.organisation_id))
    roles = [compute_role_data(job, report.date_from, report.date_to) for job in jobs]

    return {
        "generated_at": timezone.now().isoformat(),
        "date_from": report.date_from.isoformat(),
        "date_to": report.date_to.isoformat(),
        "organisation": {"name": report.organisation.company_name},
        "roles": roles,
        "summary": compute_summary(roles),
        "pipeline": compute_combined_pipeline(roles),
        "costs": compute_costs(roles, report.date_from, report.date_to),
        "time": compute_time_analysis(roles),
        "experience": compute_experience(roles),
    }
