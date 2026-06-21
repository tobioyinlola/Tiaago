from datetime import datetime
from django.db import models
from django.utils import timezone
from create_user.models import TalentProfile, Company
from roles.models import Role


class Contract(models.Model):
    """Contract model"""

    talent = models.ForeignKey(
        TalentProfile, related_name="contracts", on_delete=models.CASCADE
    )
    company = models.ForeignKey(
        Company, related_name="contracts", on_delete=models.CASCADE
    )
    role = models.ForeignKey(Role, related_name="contracts", on_delete=models.CASCADE)
    talent_salary = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    value = models.PositiveIntegerField()
    mode = models.TextField(default="", blank=True)
    expires = models.DateTimeField(db_index=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def has_expired(self):
        return timezone.now() > self.expires

    def __str__(self):
        return f"Contract between {self.talent} and {self.company}"
