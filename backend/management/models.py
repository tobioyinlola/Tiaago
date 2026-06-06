from django.db import models
from base.models import TimeStampedModel


class EmailTrack(TimeStampedModel):
    """Model to represent the tracking of mail sent."""

    # Email Status
    FAILED = 0
    SUCCESS = 1

    EMAIL_STATUS_CHOICES = (
        (FAILED, 0),
        (SUCCESS, 1),
    )

    email = models.EmailField()
    email_type = models.CharField(max_length=400)
    status = models.CharField(max_length=100, choices=EMAIL_STATUS_CHOICES)

    def __str__(self):
        return f"{self.email} | {self.email_type} - {self.status}"
