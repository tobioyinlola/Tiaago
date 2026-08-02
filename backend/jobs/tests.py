from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from create_user.models import Company, TalentProfile
from jobs.models import Job

User = get_user_model()


class JobApplyByTokenViewTests(APITestCase):
    """Covers the job_status guard added to JobApplyByTokenView -- previously
    the only apply endpoint with no check at all, unlike JobApplyView/
    JobApplyByIdView/ExternalJobApplicationView which already reject
    non-ACTIVE jobs."""

    def setUp(self):
        recruiter = User.objects.create_user(
            username="recruiter@acme.dev", email="recruiter@acme.dev",
            password="testpass123", user_type="CR",
        )
        self.company = Company.objects.create(
            company_rep=recruiter, company_name="Acme", company_email="recruiter@acme.dev",
        )
        self.talent_user = User.objects.create_user(
            username="candidate@example.com", email="candidate@example.com",
            password="testpass123", user_type="T",
        )
        self.talent_user.is_verified = True
        self.talent_user.save(update_fields=["is_verified"])
        TalentProfile.objects.create(user=self.talent_user, full_name="Candidate One")
        self.client.force_authenticate(user=self.talent_user)

    def _apply(self, job):
        url = reverse("job-apply-by-token", args=[job.apply_token])
        return self.client.post(url, {"cover_letter": "Hi"}, format="json")

    def test_rejects_apply_to_paused_job(self):
        job = Job.objects.create(
            company=self.company, role="Backend Engineer", job_type=Job.JobType.FULL_TIME,
            job_status=Job.JobStatus.ON_HOLD, paused_for_billing=True,
        )
        response = self._apply(job)
        self.assertEqual(response.status_code, 400)
        self.assertIn("not accepting applications", response.data["error"])

    def test_rejects_apply_to_expired_job(self):
        job = Job.objects.create(
            company=self.company, role="Backend Engineer", job_type=Job.JobType.FULL_TIME,
            job_status=Job.JobStatus.EXPIRED,
        )
        response = self._apply(job)
        self.assertEqual(response.status_code, 400)

    def test_allows_apply_to_active_job(self):
        job = Job.objects.create(
            company=self.company, role="Backend Engineer", job_type=Job.JobType.FULL_TIME,
            job_status=Job.JobStatus.ACTIVE, hiring_type="Manually",
        )
        response = self._apply(job)
        self.assertEqual(response.status_code, 201, response.data)
