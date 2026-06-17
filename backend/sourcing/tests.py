from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from create_user.models import Company
from .models import PipelineCandidate, PipelineCategory

User = get_user_model()


class PipelineModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testcompany",
            email="test@company.dev",
            password="testpass123",
            user_type="CR",
        )
        self.company = Company.objects.create(
            company_rep=self.user,
            company_name="Test Corp",
            company_email="test@company.dev",
        )

    def test_create_category(self):
        cat = PipelineCategory.objects.create(
            name="Frontend Engineers",
            description="React specialists",
            company=self.company,
            created_by=self.user,
        )
        self.assertEqual(str(cat), "Frontend Engineers")
        self.assertTrue(cat.is_active)

    def test_create_candidate(self):
        entry = PipelineCandidate.objects.create(
            name="Jane Doe",
            email="jane@example.com",
            role="Frontend Developer",
            skills=["React", "TypeScript"],
            company=self.company,
            added_by=self.user,
        )
        self.assertEqual(entry.status, "new")
        self.assertEqual(str(entry), "Jane Doe (new)")

    def test_candidate_category_relationship(self):
        cat = PipelineCategory.objects.create(
            name="Backend", company=self.company,
        )
        entry = PipelineCandidate.objects.create(
            name="John", company=self.company, category=cat,
        )
        self.assertEqual(cat.candidates.count(), 1)
        self.assertEqual(entry.category, cat)


class PipelineAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="apiuser",
            email="api@company.dev",
            password="testpass123",
            user_type="CR",
        )
        self.user.verified = True
        self.user.is_verified = True
        self.user.save()
        self.company = Company.objects.create(
            company_rep=self.user,
            company_name="API Corp",
            company_email="api@company.dev",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_list_pipeline_empty(self):
        resp = self.client.get("/api/sourcing/pipeline/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["total_in_pipeline"], 0)
        self.assertEqual(resp.data["entries"], [])

    def test_add_to_pipeline(self):
        resp = self.client.post("/api/sourcing/add-to-pipeline/", {
            "name": "Test Candidate",
            "email": "candidate@test.com",
            "role": "Developer",
            "skills": ["Python", "Django"],
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.data["success"])
        self.assertEqual(resp.data["data"]["name"], "Test Candidate")
        self.assertEqual(resp.data["data"]["status"], "new")

    def test_list_pipeline_with_entries(self):
        PipelineCandidate.objects.create(
            name="A", status="new", company=self.company,
        )
        PipelineCandidate.objects.create(
            name="B", status="contacted", company=self.company,
        )
        resp = self.client.get("/api/sourcing/pipeline/")
        self.assertEqual(resp.data["total_in_pipeline"], 2)
        self.assertEqual(resp.data["total_new"], 1)
        self.assertEqual(resp.data["total_contacted"], 1)

    def test_remove_from_pipeline(self):
        entry = PipelineCandidate.objects.create(
            name="Remove Me", company=self.company,
        )
        resp = self.client.delete(f"/api/sourcing/remove-from-pipeline/{entry.pk}/")
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(PipelineCandidate.objects.filter(pk=entry.pk).exists())

    def test_update_pipeline_status(self):
        entry = PipelineCandidate.objects.create(
            name="Status Test", company=self.company,
        )
        resp = self.client.patch(
            f"/api/sourcing/pipeline/{entry.pk}/",
            {"status": "contacted"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["status"], "contacted")

    def test_company_isolation(self):
        other_user = User.objects.create_user(
            username="other", email="other@co.dev", password="pass", user_type="CR",
        )
        other_company = Company.objects.create(
            company_rep=other_user, company_name="Other Corp", company_email="other@co.dev",
        )
        PipelineCandidate.objects.create(
            name="Other's candidate", company=other_company,
        )
        resp = self.client.get("/api/sourcing/pipeline/")
        self.assertEqual(resp.data["total_in_pipeline"], 0)

    def test_category_crud(self):
        resp = self.client.post("/api/sourcing/categories/", {
            "name": "Frontend Engineers",
            "description": "React specialists",
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        cat_id = resp.data["id"]

        resp = self.client.get("/api/sourcing/categories/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)

        resp = self.client.patch(
            f"/api/sourcing/categories/{cat_id}/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data["is_active"])

        resp = self.client.delete(f"/api/sourcing/categories/{cat_id}/")
        self.assertEqual(resp.status_code, 204)

    def test_filter_by_category(self):
        cat = PipelineCategory.objects.create(
            name="Backend", company=self.company,
        )
        PipelineCandidate.objects.create(
            name="In Cat", company=self.company, category=cat,
        )
        PipelineCandidate.objects.create(
            name="No Cat", company=self.company,
        )
        resp = self.client.get(f"/api/sourcing/pipeline/?category={cat.pk}")
        self.assertEqual(resp.data["total_in_pipeline"], 1)
        self.assertEqual(resp.data["entries"][0]["name"], "In Cat")

    def test_bulk_add(self):
        resp = self.client.post("/api/sourcing/add-to-pipeline/", {
            "candidates": [
                {"name": "Bulk 1", "role": "Dev"},
                {"name": "Bulk 2", "role": "Designer"},
            ]
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(len(resp.data["data"]), 2)
