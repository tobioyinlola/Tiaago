from rest_framework import serializers

from skill_assessment.models import AssessmentSubmissionSnapshot, CandidateAssessmentCodingAnswer
from skill_assessment.utils import get_submission_candidate_name
from .models import ProctoringSession, ProctoringEvent


class ProctoringSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentSubmissionSnapshot
        fields = ("id", "image", "created_at")
        read_only_fields = fields


class CodingAnswerPlagiarismSerializer(serializers.Serializer):
    """One coding-task answer's AI plagiarism/AI-generation check result."""

    question = serializers.SerializerMethodField()
    plagiarism_score = serializers.FloatField()
    verdict = serializers.CharField(source="plagiarism_verdict")
    indicators = serializers.JSONField(source="plagiarism_indicators")
    summary = serializers.CharField(source="plagiarism_summary")

    def get_question(self, obj):
        return obj.coding_task.title or obj.coding_task.description[:80]


class ProctoringEventInputSerializer(serializers.Serializer):
    """One event out of a batched flush from the candidate's browser."""

    event_type = serializers.ChoiceField(choices=ProctoringEvent.EventType.choices)
    occurred_at = serializers.DateTimeField()
    duration_seconds = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    metadata = serializers.JSONField(required=False, default=dict)
    severity = serializers.ChoiceField(choices=ProctoringEvent.Severity.choices, default=ProctoringEvent.Severity.INFO)


class ProctoringEventBatchInputSerializer(serializers.Serializer):
    events = ProctoringEventInputSerializer(many=True)


class CompleteProctoringSessionInputSerializer(serializers.Serializer):
    terminated_reason = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=255)


class ProctoringEventSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source="get_event_type_display", read_only=True)

    class Meta:
        model = ProctoringEvent
        fields = ("id", "event_type", "event_type_display", "occurred_at", "duration_seconds", "metadata", "severity")


class ProctoringSessionSummarySerializer(serializers.ModelSerializer):
    """Lightweight summary for the applicant table (score badge + flag icon)."""

    has_violation = serializers.SerializerMethodField()

    class Meta:
        model = ProctoringSession
        fields = ("id", "status", "integrity_score", "risk_level", "has_violation")

    def get_has_violation(self, obj):
        return obj.events.filter(severity=ProctoringEvent.Severity.VIOLATION).exists()


class ProctoringReportSerializer(serializers.ModelSerializer):
    """Full recruiter-facing report for one attempt."""

    events = ProctoringEventSerializer(many=True, read_only=True)
    event_counts = serializers.SerializerMethodField()
    candidate_name = serializers.SerializerMethodField()
    job_title = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    snapshots = serializers.SerializerMethodField()
    plagiarism_flags = serializers.SerializerMethodField()

    class Meta:
        model = ProctoringSession
        fields = (
            "id", "status", "integrity_score", "risk_level", "terminated_reason",
            "started_at", "ended_at", "settings_snapshot", "events", "event_counts",
            "candidate_name", "job_title", "company_name",
            "ip_address", "location", "snapshots", "plagiarism_flags",
        )

    def get_event_counts(self, obj):
        counts = {"INFO": 0, "WARNING": 0, "VIOLATION": 0}
        for event in obj.events.all():
            counts[event.severity] = counts.get(event.severity, 0) + 1
        return counts

    def get_candidate_name(self, obj):
        return get_submission_candidate_name(obj.assessment_attempt)

    def get_job_title(self, obj):
        return obj.job.title if obj.job_id else obj.assessment_attempt.skill_assessment.title

    def get_company_name(self, obj):
        if obj.job_id:
            return obj.job.company.company_name if obj.job.company_id else None
        assessment = obj.assessment_attempt.skill_assessment
        return assessment.company.company_name if assessment and assessment.company_id else None

    def get_snapshots(self, obj):
        snapshots = obj.assessment_attempt.snapshots.order_by("created_at")
        return ProctoringSnapshotSerializer(snapshots, many=True, context=self.context).data

    def get_plagiarism_flags(self, obj):
        section_submissions = obj.assessment_attempt.skill_assessment_section_submissions.all()
        coding_answers = (
            CandidateAssessmentCodingAnswer.objects
            .filter(section_submission__in=section_submissions, plagiarism_score__isnull=False)
            .select_related("coding_task")
        )
        return CodingAnswerPlagiarismSerializer(coding_answers, many=True).data


class AdminHighRiskSessionSerializer(serializers.ModelSerializer):
    candidate_name = serializers.SerializerMethodField()
    organisation = serializers.SerializerMethodField()
    job_title = serializers.SerializerMethodField()
    top_violations = serializers.SerializerMethodField()

    class Meta:
        model = ProctoringSession
        fields = (
            "id", "assessment_attempt_id", "candidate_name", "organisation", "job_title",
            "integrity_score", "risk_level", "top_violations", "created_at",
        )

    def get_candidate_name(self, obj):
        return get_submission_candidate_name(obj.assessment_attempt)

    def get_organisation(self, obj):
        if obj.job_id:
            return obj.job.company.company_name if obj.job.company_id else None
        assessment = obj.assessment_attempt.skill_assessment
        return assessment.company.company_name if assessment and assessment.company_id else None

    def get_job_title(self, obj):
        return obj.job.title if obj.job_id else obj.assessment_attempt.skill_assessment.title

    def get_top_violations(self, obj):
        counts = {}
        for event_type in obj.events.filter(severity=ProctoringEvent.Severity.VIOLATION).values_list("event_type", flat=True):
            counts[event_type] = counts.get(event_type, 0) + 1
        top = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:3]
        return [event_type for event_type, _ in top]
