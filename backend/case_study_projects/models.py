from django.db import models
from django.utils import timezone
from create_user.models import TalentProfile
from roles.models import Role

class CaseStudyProject(models.Model):
    '''Case study project model'''
    title = models.CharField(max_length=255, unique=True)
    about = models.TextField(max_length=3000)
    roles = models.ManyToManyField(Role)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class TalentCaseStudyProject(models.Model):
    '''Talent case study project. Used to store details about a case study taken by a talent.'''
    project = models.ForeignKey(
        CaseStudyProject,
        related_name="talent_case_study_projects",
        on_delete=models.CASCADE
    )
    talent = models.ForeignKey(
        TalentProfile,
        related_name="talent_case_study_projects",
        on_delete=models.CASCADE
    )
    approved = models.BooleanField(null=True, blank=True)
    submission = models.URLField(null=True, blank=True)
    remark = models.TextField(max_length=3000, null=True, blank=True)
    last_attempt = models.DateTimeField(default=timezone.now)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.talent.user.username + ' - ' + self.project.title