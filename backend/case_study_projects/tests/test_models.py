from django.test import TestCase
from django.contrib.auth import get_user_model

from create_user.models import TalentProfile
from roles.models import Role
from ..models import CaseStudyProject, TalentCaseStudyProject

class GeneralCaseStudyTestCase(TestCase):

    def setUp(self):
        user = get_user_model().objects.create_user(
            username='testuser', 
            email='testuser@example.com',
            password='testpassword',
            user_type='T'
        )
        self.talent = TalentProfile.objects.create(
            user = user,
            gender='M',
            experience_level=10,
            portfolio="https://github.com/testuser01"
        )
        self.role = Role.objects.create(title="Backend Developer", slug='backend-developer')
        self.case_study = CaseStudyProject.objects.create(
            title="This is the title",
            about="This is the about",
        )
        self.case_study.roles.add(self.role)
        self.talent_case_study = TalentCaseStudyProject.objects.create(
            project = self.case_study,
            talent = self.talent
        )

class CaseStudyProjectTest(GeneralCaseStudyTestCase):

    def test_model_fields(self):
        self.assertEqual(self.case_study.title, 'This is the title')
        self.assertEqual(self.case_study.about, 'This is the about')
        self.assertIn(self.role, self.case_study.roles.all())

    def test_str_method(self):
        self.assertEqual(str(self.case_study), self.case_study.title)

class TalentCaseStudyProjectTest(GeneralCaseStudyTestCase):

    def test_model_fields(self):
        self.assertEqual(self.talent_case_study.project, self.case_study)
        self.assertEqual(self.talent_case_study.talent, self.talent)

    def test_str_method(self):
        self.assertEqual(str(self.talent_case_study), f'{self.talent.user.username} - {self.case_study.title}')