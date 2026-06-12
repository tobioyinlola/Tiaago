from django.test import TestCase
from django.contrib.auth import get_user_model
from allauth.account.models import EmailAddress

User = get_user_model()

class CreateUserManagerTests(TestCase):

    def setUp(self):
        self.user = {
            "email": "test01@example.com",
            "username": "test01",
            "password": "testpassword123",
        }

    def test_create_user_for_talent_user_type(self):
        user = User.objects.create_user(
            email=self.user.get("email"),
            password=self.user.get("password"), 
            username=self.user.get("username"),
            user_type="T"
        )
        email_address = user.get_associated_emails()  # get all created associated email
        self.assertEqual(user.email, "test01@example.com")
        self.assertEqual(user.username, "test01")
        self.assertTrue(user.check_password("testpassword123"))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertEqual(user.user_type, "T")
        self.assertFalse(email_address.exists())   # check that no associated email is created

    def test_create_user_for_company_rep_user_type(self):
        user = User.objects.create_user(
            email=self.user.get("email"),
            password=self.user.get("password"), 
            username=self.user.get("username"),
            user_type="CR"
        )
        email_address = user.get_associated_emails()  # get all created associated email
        self.assertEqual(user.email, "test01@example.com")
        self.assertEqual(user.username, "test01")
        self.assertTrue(user.check_password("testpassword123"))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertEqual(user.user_type, "CR")
        self.assertFalse(email_address.exists())   # check that no associated email is created

    def test_create_user_for_staff_user_type(self):
        user = User.objects.create_user(
            email=self.user.get("email"),
            password=self.user.get("password"), 
            username=self.user.get("username"),
            user_type="ST",
            is_staff=True,
            is_superuser=True
        )
        email_address = user.get_associated_emails()  # get all created associated email
        self.assertEqual(user.email, "test01@example.com")
        self.assertEqual(user.username, "test01")
        self.assertTrue(user.check_password("testpassword123"))
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertEqual(user.user_type, "ST")
        self.assertFalse(email_address.exists())   # check that no associated email is created

class CreateTalentUserManagerTests(TestCase):

    def setUp(self):
        self.user = {
            "email": "test01@example.com",
            "username": "test01",
            "password": "testpassword123",
        }

    def test_create_talent_user(self):
        user = User.objects.create_talent_user(
            email=self.user.get("email"),
            password=self.user.get("password"), 
            username=self.user.get("username"),
        )
        email_address = user.get_associated_emails()  # get all created associated email
        self.assertEqual(user.email, "test01@example.com")
        self.assertEqual(user.username, "test01")
        self.assertTrue(user.check_password("testpassword123"))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertEqual(user.user_type, "T")
        self.assertFalse(email_address.exists())   # check that no associated email is created

    def test_create_talent_user_and_verify(self):
        # an associated verified email is to be created automatically
        user = User.objects.create_talent_user_and_verify(
            email=self.user.get("email"),
            password=self.user.get("password"), 
            username=self.user.get("username"),
        )
        email_address = user.get_associated_emails()  # get the associated email address
        self.assertEqual(user.email, "test01@example.com")
        self.assertEqual(user.username, "test01")
        self.assertTrue(user.check_password("testpassword123"))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertEqual(user.user_type, "T")
        self.assertTrue(email_address[0].primary)
        self.assertTrue(email_address[0].verified)


class CreateCompanyRepUserManagerTests(TestCase):

    def setUp(self):
        self.user = {
            "email": "test01@example.com",
            "username": "test01",
            "password": "testpassword123",
        }

    def test_create_company_rep_user(self):
        user = User.objects.create_company_user(
            email=self.user.get("email"),
            password=self.user.get("password"), 
            username=self.user.get("username"),
        )
        email_address = user.get_associated_emails()  # get all created associated email
        self.assertEqual(user.email, "test01@example.com")
        self.assertEqual(user.username, "test01")
        self.assertTrue(user.check_password("testpassword123"))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertEqual(user.user_type, "CR")
        self.assertFalse(email_address.exists())   # check that no associated email is created

    def test_create_company_rep_user_and_verify(self):
        # an associated verified email is to be created automatically
        user = User.objects.create_company_user_and_verify(
            email=self.user.get("email"),
            password=self.user.get("password"), 
            username=self.user.get("username"),
        )
        email_address = user.get_associated_emails()  # get the associated email address
        self.assertEqual(user.email, "test01@example.com")
        self.assertEqual(user.username, "test01")
        self.assertTrue(user.check_password("testpassword123"))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertEqual(user.user_type, "CR")
        self.assertTrue(email_address[0].primary)
        self.assertTrue(email_address[0].verified)

class CreateSuperUserManagerTests(TestCase):

    def setUp(self):
        self.user = {
            "email": "admin@example.com",
            "username": "admin",
            "password": "testpassword123",
        }

    def test_create_super_user(self):
        user = User.objects.create_superuser(
            email=self.user.get("email"),
            password=self.user.get("password"), 
            username=self.user.get("username"),
        )
        email_address = user.get_associated_emails()  # get all created associated email
        self.assertEqual(user.email, "admin@example.com")
        self.assertEqual(user.username, "admin")
        self.assertTrue(user.check_password("testpassword123"))
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertEqual(user.user_type, "ST")
        self.assertFalse(email_address.exists())   # check that no associated email is created

    def test_create_super_user_and_verify(self):
        # an associated verified email is to be created automatically
        user = User.objects.create_superuser_and_verify(
            email=self.user.get("email"),
            password=self.user.get("password"), 
            username=self.user.get("username"),
        )
        email_address = user.get_associated_emails()  # get the associated email address
        self.assertEqual(user.email, "admin@example.com")
        self.assertEqual(user.username, "admin")
        self.assertTrue(user.check_password("testpassword123"))
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertEqual(user.user_type, "ST")
        self.assertTrue(email_address[0].primary)
        self.assertTrue(email_address[0].verified)