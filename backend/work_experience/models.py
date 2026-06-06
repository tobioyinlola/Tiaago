from django.db import models
from create_user.models import TalentProfile


class WorkExperience(models.Model):
    organization = models.CharField(max_length=255)
    role = models.CharField(max_length=255)
    year_from = models.CharField(max_length=4)
    year_to = models.CharField(max_length=4, default="", blank=True)
    organization_logo = models.URLField(default="", blank=True)
    talent = models.ForeignKey(
        TalentProfile, 
        related_name='experiences', 
        on_delete=models.CASCADE
    )

    def __str__(self):
        return f"<WorkExperience: {self.talent} at {self.organization}>"