import uuid
from pathlib import Path
from django.db import models
from rest_framework.serializers import ValidationError
from django.utils import timezone
from django.utils.text import slugify
from base.models import TimeStampedModel
from django.contrib.auth import get_user_model
from jobs.models import JobApplication, Job
from quiz.models import QuizTaker
from create_user.models import Company, TalentProfile
from case_study_projects.models import TalentCaseStudyProject
from roles.models import Role
from skill_assessment.constants import (
    SkillAssessmentTypes,
    SkillAssessmentDifficultyLevels,
)
from django.db.models import Q

User = get_user_model()

SKILL_ASSESSMENT_TYPE_CHOICES = (
    (SkillAssessmentTypes.MCQ, SkillAssessmentTypes.MCQ),
    (SkillAssessmentTypes.CODING_TASK, SkillAssessmentTypes.CODING_TASK),
    (SkillAssessmentTypes.CUSTOM, SkillAssessmentTypes.CUSTOM),
)

SUB_SKILL_ASSESSMENT_TYPE_CHOICES = (
    (SkillAssessmentTypes.MCQ, SkillAssessmentTypes.MCQ),
    (SkillAssessmentTypes.CODING_TASK, SkillAssessmentTypes.CODING_TASK),
)

DIFFICULTY_LEVEL_CHOICES = (
    (SkillAssessmentDifficultyLevels.JUNIOR, SkillAssessmentDifficultyLevels.JUNIOR),
    (
        SkillAssessmentDifficultyLevels.INTERMEDIATE,
        SkillAssessmentDifficultyLevels.INTERMEDIATE,
    ),
    (SkillAssessmentDifficultyLevels.SENIOR, SkillAssessmentDifficultyLevels.SENIOR),
)


class SkillAssessment(models.Model):
    quiz_taken = models.ForeignKey(
        QuizTaker,
        related_name="skill_assessments",
        on_delete=models.SET_NULL,
        null=True,
    )
    project_taken = models.ForeignKey(
        TalentCaseStudyProject,
        related_name="skill_assessments",
        on_delete=models.SET_NULL,
        null=True,
    )
    talent = models.ForeignKey(
        TalentProfile,
        related_name="skill_assessments",
        on_delete=models.SET_NULL,
        null=True,
    )
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    expired = models.DateTimeField(null=True, blank=True)

    def has_passed(self):
        if self.quiz_taken and self.project_taken:
            quiz_percentage_pass = (
                self.quiz_taken.correct_answers / self.quiz_taken.quiz.question_count
            ) * 100
            if quiz_percentage_pass > 70 and self.project_taken.approved:
                return True

        return False

    def has_expired(self):
        return self.expired < timezone.now()

    def __str__(self):
        return f"Skill Assessment for {self.talent.user.username} on {self.created}"


class TechStack(TimeStampedModel):
    stack = models.CharField(max_length=255, blank=True, null=True)
    difficulty_level = models.CharField(max_length=20, blank=True, null=True)
    slug = models.SlugField(blank=True, max_length=70, unique=True)
    icon = models.ImageField(upload_to="stack_icon/%Y/%m/%d/")

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.stack.lower()

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.stack)

            # check for existing slugs that are similar
            existing_slugs = TechStack.objects.filter(
                slug__startswith=self.slug
            ).values_list("slug", flat=True)

            if self.slug in existing_slugs:
                max_slug_number = 1
                # extract number from the slugs and find the highest
                for slug in existing_slugs:
                    try:
                        number = int(slug.split("-")[-1])
                        if number >= max_slug_number:
                            max_slug_number = number + 1
                    except (IndexError, ValueError):
                        continue
                # append the highest number found to the slug
                self.slug = f"{self.slug}-{max_slug_number}"

        super().save(*args, **kwargs)


class GeneralSkillAssessment(TimeStampedModel):
    """
    skill assessment model. Can belong to a company/job-application or not\n
    Skill assessments that have a company field and job application field are assessments that
    were created for job applications. This usually happens when the company is hiring with AI.
    In this case, AI creates the skill assessment\n
    Skill assessments that only have a company field and no job application field are skill assessments that the company created.\n
    Skill assessments with no job application and no company are tiaago skill assessments.
    """

    def upload_to(instance, filename):
        return "/".join(["skill-assessments", str(instance.id), "images", filename])

    icon = models.ImageField(blank=True, null=True, upload_to=upload_to)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        help_text="Company that this skill assessment belongs to",
        blank=True,
        null=True,
    )
    assigned_to = models.ForeignKey(TalentProfile, null=True, blank=True, on_delete=models.CASCADE) #this is used to track talents for tiaago verification
    job_application = models.ForeignKey(
        JobApplication, blank=True, null=True, on_delete=models.SET_NULL, related_name="job_applications"
        
    )
    title = models.CharField(max_length=1000, help_text="Title of the skill assessment")
    published = models.BooleanField(default=False)
    difficulty_level = models.CharField(
        max_length=100, choices=DIFFICULTY_LEVEL_CHOICES
    )
    skillsets = models.ManyToManyField(Role)
    description = models.TextField(help_text="Description of the skill assessment")
    duration_minutes = models.IntegerField()
    passing_grade = models.FloatField()
    display_review_and_approve_responses = models.BooleanField(default=False)
    display_feedback = models.BooleanField(default=False)
    shuffle_questions = models.BooleanField(default=False)
    use_public_link = models.BooleanField(default=False)
    use_start_and_end_time = models.BooleanField(default=False)
    reference = models.CharField(
        max_length=100,
        help_text="Random text to identify this skill assessment",
        unique=True,
    )
    assessment_id = models.CharField(
        max_length=255,
        help_text="Assessment ID returned by AI identify this skill assessment",
        unique=True,
        blank=True,
        null=True
    )
    assessment_type = models.CharField(
        max_length=100, choices=SKILL_ASSESSMENT_TYPE_CHOICES
    )
    assessment_stack = models.ForeignKey(
        TechStack, related_name="skill_assessment_stack",
        on_delete=models.CASCADE, null=True, blank=True,)
    invite_token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        db_index=True,
        help_text="Unguessable token used in the candidate invite link -- lets a candidate "
        "open and take this specific assessment without logging in.",
    )

    def __str__(self):
        return self.title

    #@@property
    #def sections(self):
    #    return self.generalskillassessmentsection_set.all()

    @property
    def is_tiaago_skill_assessment(self):
        return not self.company and not self.job_application


class GeneralSkillAssessmentSection(TimeStampedModel):
    """Company skill assessment section. Can either be MCQ or a coding task"""

    name = models.CharField(max_length=255)
    company_skill_assessment = models.ForeignKey(
        GeneralSkillAssessment, on_delete=models.CASCADE, related_name="sections"
    )
    type = models.CharField(max_length=100, choices=SUB_SKILL_ASSESSMENT_TYPE_CHOICES)
    mcq_questions = models.ManyToManyField(
        "GeneralSkillAssessmentMCQQuestion", blank=True
    )
    mcq_questions_new = models.ManyToManyField(
        "GeneralSkillAssessmentMCQQuestion",
        blank=True,
        related_name="sections_v2",
        through="GeneralSkillAssessmentSectionMCQ",
        through_fields=("section", "mcq"),
    )
    coding_tasks = models.ManyToManyField(
        "CodingTask", blank=True
    )

    class Meta:
        # Sections are created in the intended candidate-facing order (one per
        # category, matching JobAssessmentTemplateSection's `order` field at
        # clone time in send_assessment_link) -- ordering by id preserves that
        # instead of relying on the DB's incidental row-return order.
        ordering = ("id",)

    def __str__(self):
        return f"{self.company_skill_assessment.title} - {self.name}"
    
    @property
    def mcq_questions(self):
        return self.mcq_questions_new.all()

#

class GeneralSkillAssessmentMCQQuestion(TimeStampedModel):
    """
    MCQ Question

    Uses 1 based indexing for correct_option_index.\n
    Options are in the form of:\n
    [
        {"value":"Obscuring", "index":1},
        {"value":"Obscured", "index":2},
        {"value":"Amazing", "index":3},
        {"value":"Detecting", "index":4},
    ]

    and correct_option_index can either be 1,2,3 or 4.
    """

    is_ai_generated = models.BooleanField(default=False)
    question = models.TextField()
    options = models.JSONField()
    correct_option_index = models.IntegerField()

    class Meta:
        ordering = ("id",)

    def __str__(self):
        return self.question


class QuestionBankQuestion(TimeStampedModel):
    """Question bank"""

    def upload_to(instance, filename):
        return "/".join(["question-bank", str(instance.id), "images", filename])

    icon = models.ImageField(blank=True, null=True, upload_to=upload_to)
    image = models.ImageField(blank=True, null=True, upload_to=upload_to)
    role = models.ForeignKey(Role, on_delete=models.CASCADE, blank=True, null=True)
    job = models.ForeignKey(Job, on_delete=models.CASCADE, blank=True, null=True)
    question = models.TextField()
    options = models.JSONField()
    # zero based indexing
    correct_option_index = models.IntegerField()
    difficulty_level = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return self.question


class CodingTask(TimeStampedModel):
    """Coding task"""
    is_ai_generated = models.BooleanField(default=False)
    title = models.CharField(max_length=255)  # Title of coding question
    description = models.TextField()  # Detailed problem statement
    input_format = models.TextField(
        blank=True, null=True
    )  # Description of input format
    output_format = models.TextField(
        blank=True, null=True
    )  # Description of output format
    constraints = models.TextField(blank=True, null=True)  # Constraints for the problem
    sample_input = models.TextField(
        blank=True, null=True
    )  # Sample input for the question
    sample_output = models.TextField(
        blank=True, null=True
    )  # expected output for the sample input
    difficulty_level = models.CharField(
        max_length=100, choices=DIFFICULTY_LEVEL_CHOICES
    )
    skills_assessed = models.JSONField(default=list)
    max_score = models.PositiveIntegerField(default=100)  # maximum score
    time_limit = models.PositiveIntegerField(
        default=60, help_text="Time limit in seconds"
    )
    assessment_id = models.CharField(max_length=255, blank=True, null=True)
    is_for_verification = models.BooleanField(default=False)
    correct_answer = models.TextField(blank=True, null=True)
    stack = models.ForeignKey(
        TechStack,
        related_name="talent_tech_stack",
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    def __str__(self):
        return f"{self.title}"


class TestCase(TimeStampedModel):
    """Test case for coding task"""

    coding_task = models.ForeignKey(
        CodingTask, on_delete=models.CASCADE, related_name="test_cases"
    )
    input_data = models.TextField()  # Input for the test case
    expected_output = models.TextField()  # Expected output for the given input
    is_sample = models.BooleanField(
        default=False
    )  # whether this testcase is a sample (visible or not visible to candidate)

    def __str__(self):
        return f"Test Case for {self.coding_task.title}"

class TalentQuestionBank(TimeStampedModel):
    mcq_question = models.ForeignKey(
        GeneralSkillAssessmentMCQQuestion,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="questionbank_entry"
    )
    coding_task = models.ForeignKey(
        CodingTask,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="questionbank_entry"
    )
    stack = models.ForeignKey(
        TechStack,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Relevant stack for the coding or MCQ question"
    )
    difficulty_level = models.CharField(
        max_length=100, choices=DIFFICULTY_LEVEL_CHOICES
    )
    role = models.ForeignKey(Role, on_delete=models.CASCADE, blank=True, null=True)

    def __str__(self):
        return f"TalentQuestionBank: {'MCQ' if self.mcq_question else 'Coding'} - {self.stack}"
    
    def clean(self):
        if self.mcq_question and self.coding_task:
            raise ValidationError("Only one of mcq_question or coding_task should be set.")
        if not self.mcq_question and not self.coding_task:
            raise ValidationError("One of mcq_question or coding_task must be set.")

    def save(self, *args, **kwargs):
        self.clean() 
        super().save(*args, **kwargs)

class CandidateAssessmentSectionSubmission(TimeStampedModel):
    """Candidate assessment section submission"""


    skill_assessment_section = models.ForeignKey(
        GeneralSkillAssessmentSection, blank=True, null=True, on_delete=models.SET_NULL
    )
    time_taken = models.PositiveIntegerField(
        help_text="Time taken in minutes.", null=True, blank=True
    )
    total_score = models.FloatField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    coding_task_answer = models.TextField(null=True, blank=True)

    def __str__(self):
        return "Candidate assessment section" + str(self.skill_assessment_section.id)


class CandidateAssessmentMCQAnswer(TimeStampedModel):
    section_submission = models.ForeignKey(
        CandidateAssessmentSectionSubmission, on_delete=models.CASCADE
    )
    question = models.ForeignKey(
        GeneralSkillAssessmentMCQQuestion, on_delete=models.CASCADE
    )
    selected_answer_index = models.IntegerField(blank=True, null=True)

    def __str__(self):
        return f"{self.question.question} - {self.question.correct_option_index} - {self.selected_answer_index}"

class CandidateAssessmentCodingAnswer(TimeStampedModel):
    """Candidate Assessment Coding Answer"""
    section_submission = models.ForeignKey(
        CandidateAssessmentSectionSubmission, on_delete=models.CASCADE,
        related_name="coding_task_answers"
    )
    coding_task = models.ForeignKey(
        CodingTask, on_delete=models.CASCADE,
        related_name="submitted_answers"
    )
    user_answer = models.TextField() 

    def __str__(self):
        return f"Answer to {self.coding_task.title}"

class CandidateAssessmentSubmission(TimeStampedModel):
    """Full candidate assessment submission"""

    class MarkStatusChoices(models.TextChoices):
        PENDING = "Pending", "Pending"
        FAILED_TO_MARK = "Failed to Mark", "Failed to Mark"
        MARKED = "Marked", "Marked"

    candidate = models.ForeignKey(
        TalentProfile, related_name="candidate_assessments", on_delete=models.CASCADE
    )
    skill_assessment = models.ForeignKey(
        GeneralSkillAssessment, on_delete=models.SET_NULL, blank=True, null=True
    )
    skill_assessment_section_submissions = models.ManyToManyField(
        CandidateAssessmentSectionSubmission, blank=True
    )
    time_taken = models.PositiveIntegerField(
        help_text="Time taken in minutes.", null=True, blank=True
    )
    total_score = models.FloatField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    is_passed = models.BooleanField(default=False)
    mark_status = models.CharField(
        max_length=40,
        choices=MarkStatusChoices.choices,
        default=MarkStatusChoices.PENDING,
    )
    candidate_display_name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Name the candidate confirmed/edited on the no-login invite flow for this "
        "specific attempt -- display only, does not update the candidate's TalentProfile.",
    )
    feedback_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    feedback_comment = models.TextField(blank=True, default="")

    class Meta:
        indexes = [
            models.Index(fields=["candidate", "is_completed"]),
            models.Index(fields=["candidate", "skill_assessment"]),
        ]

    def __str__(self):
        return f"{self.candidate} - {self.skill_assessment.title}"


class AssessmentSubmissionSnapshot(TimeStampedModel):
    """Periodic camera captures taken during a no-login candidate's assessment
    attempt, for the recruiter to spot-check afterward."""

    def upload_to(instance, filename):
        return "/".join(["assessment-snapshots", str(instance.submission_id), filename])

    submission = models.ForeignKey(
        CandidateAssessmentSubmission, on_delete=models.CASCADE, related_name="snapshots"
    )
    image = models.ImageField(upload_to=upload_to)

    def __str__(self):
        return f"Snapshot for submission {self.submission_id}"


class PendingResumeAnalysis(TimeStampedModel):
    job_application = models.ForeignKey(
        "jobs.JobApplication", blank=True, null=True, on_delete=models.SET_NULL
    )
    resume_path = models.CharField(max_length=500)
    resume_name = models.CharField(max_length=200)


class ResumeAnalysis(TimeStampedModel):
    """Resume analysis model"""

    job_application = models.ForeignKey(
        "jobs.JobApplication", blank=True, null=True, on_delete=models.SET_NULL
    )
    resume_path = models.CharField(max_length=500)
    resume_name = models.CharField(max_length=200)
    resume_review_score = models.IntegerField()
    skill_matching_score = models.IntegerField()
    experience_relevance_score = models.IntegerField()
    education_certifications_score = models.IntegerField()
    total_score = models.IntegerField()
    recommendation = models.CharField(max_length=50)
    detailed_analysis = models.TextField()
    areas_for_improvement = models.TextField()
    strengths = models.TextField()
    role_match_status= models.CharField(max_length=50, blank=True, null=True)
    text_authencity=models.CharField(max_length=50, blank=True, null=True)
    text_authencity_explanation=models.TextField(blank=True, null=True)
    experience_validation=models.CharField(max_length=50, blank=True, null=True)
    experience_validation_explanation=models.TextField(blank=True, null=True)
    achievement_quality=models.TextField(blank=True, null=True)
    

    def __str__(self):
        return str(self.resume_review_score)


class PreScreeningAgent(models.Model):
    agent_id = models.CharField(max_length=255)
    agent_name = models.CharField(max_length=255)

    def save(self, *args, **kwargs):
        PreScreeningAgent.objects.exclude(pk=self.pk).delete()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.agent_name} with id - {self.agent_id}"


class PreScreeningInterviewSession(models.Model):
    candidate = models.ForeignKey(
        TalentProfile, related_name="pre_screening", on_delete=models.CASCADE
    )
    job_application = models.ForeignKey(
        JobApplication, related_name="pre_screening", on_delete=models.CASCADE
    )
    assessment = models.ForeignKey(
        GeneralSkillAssessment, related_name="pre_screening", on_delete=models.CASCADE
    )
    conversation_id = models.CharField(max_length=255)
    total_points = models.IntegerField(null=True, blank=True)
    final_evaluation = models.CharField(max_length=255, null=True, blank=True)
    agent_comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class PreScreeningInterviewQuestionResponse(models.Model):
    session = models.ForeignKey(
        PreScreeningInterviewSession,
        on_delete=models.CASCADE,
        related_name="pre_screening_response",
    )
    question = models.TextField()
    answer = models.TextField()
    follow_up_asked = models.BooleanField(default=False)
    follow_up_question = models.TextField(null=True, blank=True)
    follow_up_response = models.TextField(null=True, blank=True)

    # Analysis fields
    value_alignment = models.JSONField()
    strengths = models.JSONField()
    concerns = models.JSONField()
    bias_check = models.JSONField()

    # Scoring fields
    relevance = models.IntegerField()
    alignment = models.IntegerField()
    self_awareness = models.IntegerField()
    adjustments = models.IntegerField()
    total = models.IntegerField()


class InterviewSessionQueue(models.Model):
    """
    Queue for interview sessions.
    This is used to manage the order of interview sessions.
    """
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        FAILED = "failed", "Failed"
    status = models.CharField(
        max_length=20, choices=Status.choices, default="queued"
    )

    session = models.ForeignKey(
        PreScreeningInterviewSession, on_delete=models.CASCADE, related_name="queue"
    )
    position = models.IntegerField(
        help_text="Position in the queue. Lower number means higher priority."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position"]

    def __str__(self):
        return f"Queue Position {self.position} for Session {self.session.id}"


class SkillAssessmentPayment(models.Model):
    talent = models.ForeignKey(TalentProfile, on_delete=models.CASCADE)
    assessment = models.ForeignKey(GeneralSkillAssessment, on_delete=models.CASCADE,blank=True,null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10)
    payment_provider = models.CharField(max_length=10, choices=[("stripe", "Stripe"), ("paystack", "Paystack")])
    payment_reference = models.CharField(max_length=100, unique=True)
    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("talent", "assessment")


class Certificate(TimeStampedModel):
    """
    Certificate model to store information about certificates issued to talents.
    
    """
    
    talent = models.ForeignKey(TalentProfile, on_delete=models.CASCADE)
    skill_assessment = models.ForeignKey(
        GeneralSkillAssessment, on_delete=models.CASCADE
    )
    certificate_url = models.FileField(upload_to="certificates", blank=True, null=True)
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["talent", "skill_assessment"],
                name="uniq_certificate_per_talent_assessment",
            )
        ]

    def __str__(self):
        return f"Certificate for {self.talent.user.username} - {self.skill_assessment.title}"


class GeneralSkillAssessmentSectionMCQ(models.Model):
    section = models.ForeignKey(
        "GeneralSkillAssessmentSection",
        on_delete=models.CASCADE,
        related_name="section_mcqs",
        db_index=True,
    )
    mcq = models.ForeignKey(
        "GeneralSkillAssessmentMCQQuestion",
        on_delete=models.CASCADE,
        related_name="mcq_sections",
        db_index=True,
    )

    class Meta:
        unique_together = ("section", "mcq")
        ordering = ("id",)
        indexes = [
            models.Index(fields=["section", "mcq"]),
            models.Index(fields=["mcq", "section"]),
        ]

class AssessmentCooldown(TimeStampedModel):
    """
    Tracks failed skill assessments to enforce cooldown periods.
    When a talent fails an assessment, they must wait 14 days before retaking it.
    """
    talent = models.ForeignKey(
        TalentProfile, 
        on_delete=models.CASCADE, 
        related_name="assessment_cooldowns"
    )
    skill_assessment = models.ForeignKey(
        GeneralSkillAssessment,
        on_delete=models.CASCADE,
        related_name="cooldowns"
    )
    failed_at = models.DateTimeField(auto_now_add=True)
    cooldown_ends_at = models.DateTimeField()
    
    class Meta:
        unique_together = ("talent", "skill_assessment")
        indexes = [
            models.Index(fields=["talent", "cooldown_ends_at"]),
            models.Index(fields=["skill_assessment", "cooldown_ends_at"]),
        ]
        
    def save(self, *args, **kwargs):
        if not self.cooldown_ends_at:
            from datetime import timedelta
            self.cooldown_ends_at = self.failed_at + timedelta(days=14)
        super().save(*args, **kwargs)
        
    def is_active(self):
        """Check if the cooldown period is still active"""
        return timezone.now() < self.cooldown_ends_at
        
    def days_remaining(self):
        """Get the number of days remaining in the cooldown period"""
        if not self.is_active():
            return 0
        delta = self.cooldown_ends_at - timezone.now()
        return max(0, delta.days)
        
    def __str__(self):
        return f"Cooldown for {self.talent.user.username} - {self.skill_assessment.title} until {self.cooldown_ends_at.date()}"


class MCQToCodingLink(models.Model):
    """
    Pairs an MCQ to a CodingTask under the SAME parent assessment.
    Create it immediately (coding_task=None), populate coding_task when the worker finishes.
    """
    assessment = models.ForeignKey(
        "GeneralSkillAssessment", on_delete=models.CASCADE, related_name="mcq_coding_links"
    )
    section = models.ForeignKey(
        "GeneralSkillAssessmentSection", on_delete=models.CASCADE, related_name="mcq_coding_links"
    )
    mcq = models.ForeignKey(
        "GeneralSkillAssessmentMCQQuestion", on_delete=models.CASCADE, related_name="coding_links"
    )
    coding_task = models.ForeignKey(
        "CodingTask", on_delete=models.SET_NULL, null=True, blank=True, related_name="mcq_links"
    )

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            # Enforce uniqueness once a coding_task is set (allows multiple drafts prior to creation).
            models.UniqueConstraint(
                fields=("assessment", "mcq", "coding_task"),
                name="uniq_assessment_mcq_codingtask",
                condition=Q(coding_task__isnull=False),
            ),
        ]
        indexes = [
            models.Index(fields=["assessment", "mcq"]),
            models.Index(fields=["coding_task"]),
        ]

    def clean(self):
        # 1) Section must belong to assessment
        if self.section.company_skill_assessment_id != self.assessment_id:
            raise ValidationError("Section does not belong to the given assessment.")

        # 2) MCQ must be attached to the section (via through table)
        exists = GeneralSkillAssessmentSectionMCQ.objects.filter(
            section=self.section, mcq=self.mcq
        ).exists()
        if not exists:
            raise ValidationError("MCQ is not attached to the provided section.")

        # 3) If coding_task is present, it must be attached to the same assessment
        if self.coding_task_id:
            same_parent = GeneralSkillAssessmentSection.objects.filter(
                company_skill_assessment=self.assessment,
                coding_tasks=self.coding_task,
            ).exists()
            if not same_parent:
                raise ValidationError("CodingTask is not attached to this assessment.")
