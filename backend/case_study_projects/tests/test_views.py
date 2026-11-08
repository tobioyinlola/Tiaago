from django.contrib.auth import get_user_model
from django.urls import resolve
from rest_framework import status
from rest_framework.test import APITestCase

from create_user.models import TalentProfile
from ..models import (
    CaseStudyProject, 
    TalentCaseStudyProject
)
from ..views import CaseStudyProjectListCreateView

User = get_user_model()

class CaseStudyProjectTestCase(APITestCase):

    def setUp(self):
        self.password = "testpassword01"
        self.talent = User.objects.create_user(
            username="testuser01@talent",
            user_type="T",
            email="testuser01@talent.com",
            password=self.password
        )
        self.talent_profile = TalentProfile.objects.create(
            user=self.talent,
            gender='M',
            experience_level=10,
            portfolio="https://github.com/testuser01"
        )
        self.company_rep = User.objects.create_user(
            username="testuser01@company",
            user_type="CR",
            email="testuser01@company.com",
            password=self.password
        )
        self.staff = User.objects.create_user(
            username="testuser01@staff",
            user_type="ST",
            email="testuser01@staff.com",
            password=self.password,
            is_staff=True
        )
        self.case_study = CaseStudyProject.objects.create(
            title='Case study 1',
            about='About case study 1',
        )
        self.talent_case_study = TalentCaseStudyProject.objects.create(
            project=self.case_study,
            talent=self.talent_profile
        )

class CaseStudyProjectListViewTests(CaseStudyProjectTestCase):

    def setUp(self):
        super().setUp()
        self.client.force_authenticate(self.staff)
        self.response = self.client.get("/api/case-study-projects/")

    def test_status_code(self):
        self.assertEqual(self.response.status_code, status.HTTP_200_OK)

    def test_resolve_url(self):
        view = resolve("/api/case-study-projects/")
        self.assertEqual(view.func.view_class, CaseStudyProjectListCreateView)

    def test_contain_correct_response(self):
        self.assertContains(self.response, self.case_study.id)
        self.assertContains(self.response, self.case_study.title)
        self.assertContains(self.response, self.case_study.about)

class CaseStudyProjectListViewTestsForTalent(CaseStudyProjectTestCase):

    def setUp(self):
        super().setUp()
        self.client.force_authenticate(self.talent)
        self.response = self.client.get("/api/case-study-projects/")

    def test_status_code(self):
        self.assertEqual(self.response.status_code, status.HTTP_403_FORBIDDEN)

class CaseStudyProjectListViewTestsForCompany(CaseStudyProjectTestCase):

    def setUp(self):
        super().setUp()
        self.client.force_authenticate(self.company_rep)
        self.response = self.client.get("/api/case-study-projects/")

    def test_status_code(self):
        self.assertEqual(self.response.status_code, status.HTTP_403_FORBIDDEN)

class CaseStudyProjectListViewTestsForUnauthenticatedUser(CaseStudyProjectTestCase):

    def test_status_code(self):
        response = self.client.get("/api/case-study-projects/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
