from django.utils import timezone
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.template.defaultfilters import slugify
from uuid import uuid4

from create_user.models import TalentProfile
from roles.models import Role

class QuizManager(models.Manager):
    def get_queryset(self, *args, **kwargs):
        queryset = super().get_queryset(*args, **kwargs)
        queryset = queryset.filter(roll_out=True)
        return queryset

class Quiz(models.Model):
    id = models.UUIDField(primary_key=True, editable=False, default=uuid4)
    name = models.CharField(max_length=255, unique=True)
    question_count = models.PositiveIntegerField(default=20)
    questions_on = ArrayField(models.CharField(max_length=70), size=10)
    minutes = models.PositiveIntegerField(default=30)
    description = models.TextField()
    slug = models.SlugField(null=True, blank=True)
    roll_out = models.BooleanField(default=False)
    roles = models.ManyToManyField(Role)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    objects = models.Manager()
    answerable = QuizManager()

    class Meta:
        ordering = ('-created', 'minutes')
        verbose_name_plural = "Quizzes"

    def __str__(self):
        return self.name

    @property
    def is_completed(self):
        return self.question_count == self.question_set.count()

class Question(models.Model):
    label = models.TextField(max_length=1000)
    quiz = models.ManyToManyField(Quiz)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.label


class Answer(models.Model):
    question = models.ForeignKey(Question, related_name="answers", on_delete=models.CASCADE)
    text = models.TextField(max_length=1000)
    is_correct = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.text


class QuizTaker(models.Model):
    talent = models.ForeignKey(
        TalentProfile,
        related_name="quiz_takers",
        on_delete=models.CASCADE
    )
    quiz = models.ForeignKey(
        Quiz,
        related_name="quiz_takers",
        on_delete=models.CASCADE
    )
    correct_answers = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)
    timestamp = models.DateTimeField(default=timezone.now)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.talent.user.username +" on " + self.timestamp.strftime("%Y-%m-%d")


class Response(models.Model):
    quiztaker = models.ForeignKey(
        QuizTaker,
        related_name="responses",
        on_delete=models.CASCADE
    )
    question = models.ForeignKey(
        Question,
        related_name="responses",
        on_delete=models.CASCADE,
    )
    answer = models.ForeignKey(
        Answer,
        related_name="responses",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.question.label

@receiver(post_save, sender=Quiz)
def slugify_name(sender, instance, created, **kwargs):
    if created:
        instance.slug = slugify(instance.name)
        instance.save()

@receiver(post_save, sender=Response)
def mark_question(sender, instance, created, **kwargs):
    if created:
        ans = instance.answer
        if ans is not None and ans.is_correct:
            instance.quiztaker.correct_answers += 1
            instance.quiztaker.save()