from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, time
from unittest.mock import patch, MagicMock

from .models import Scheduler
from create_user.models import TalentProfile, Company

User = get_user_model()

class SchedulerDeleteViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create test users
        self.talent_user = User.objects.create_user(
            username='talent@test.com',
            email='talent@test.com',
            password='testpass123',
            user_type=User.USER_TYPE.TALENT,
            first_name='Test',
            last_name='Talent'
        )
        
        self.company_user = User.objects.create_user(
            username='company@test.com',
            email='company@test.com',
            password='testpass123',
            user_type=User.USER_TYPE.COMPANY_REP,
            first_name='Test',
            last_name='Company'
        )
        
        # Create talent profile
        self.talent_profile = TalentProfile.objects.create(
            user=self.talent_user,
            full_name='Test Talent',
            experience_level='JUNIOR'
        )
        
        # Create company
        self.company = Company.objects.create(
            company_rep=self.company_user,
            company_name='Test Company',
            company_email='company@test.com'
        )
        
        # Create a test meeting
        self.meeting = Scheduler.objects.create(
            title='Test Meeting',
            meeting_date=date(2024, 12, 25),
            start_time=time(10, 0),
            end_time=time(11, 0),
            description='Test meeting description',
            talent=self.talent_profile,
            company=self.company,
            accepted=True,
            room_name='test-room-123'  # Add room name to trigger Daily.co API call
        )

    @patch('scheduler.views.current_app')
    @patch('scheduler.views.emails')
    @patch('scheduler.views.requests.delete')
    def test_company_can_delete_meeting(self, mock_delete, mock_emails, mock_celery):
        """Test that a company can delete a meeting they created"""
        self.client.force_authenticate(user=self.company_user)
        
        # Mock the Daily.co API response
        mock_delete.return_value.status_code = 200
        
        # Mock Celery task revocation
        mock_celery.control.revoke.return_value = None
        
        url = reverse('delete-schedule-meeting', kwargs={'pk': self.meeting.id})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Scheduler.objects.filter(id=self.meeting.id).exists())
        
        # Verify Daily.co room was deleted
        mock_delete.assert_called_once()
        
        # Verify cancellation email was sent
        mock_emails.meeting_cancelled_by_company.assert_called_once()

    @patch('scheduler.views.current_app')
    @patch('scheduler.views.emails')
    @patch('scheduler.views.requests.delete')
    def test_talent_can_delete_meeting(self, mock_delete, mock_emails, mock_celery):
        """Test that a talent can delete a meeting they're part of"""
        self.client.force_authenticate(user=self.talent_user)
        
        # Mock the Daily.co API response
        mock_delete.return_value.status_code = 200
        
        # Mock Celery task revocation
        mock_celery.control.revoke.return_value = None
        
        url = reverse('delete-schedule-meeting', kwargs={'pk': self.meeting.id})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Scheduler.objects.filter(id=self.meeting.id).exists())
        
        # Verify cancellation email was sent
        mock_emails.meeting_cancelled_by_talent.assert_called_once()

    def test_unauthorized_user_cannot_delete_meeting(self):
        """Test that unauthorized users cannot delete meetings"""
        # Create another user who is not part of the meeting
        other_user = User.objects.create_user(
            username='other@test.com',
            email='other@test.com',
            password='testpass123',
            user_type=User.USER_TYPE.TALENT
        )
        
        self.client.force_authenticate(user=other_user)
        
        url = reverse('delete-schedule-meeting', kwargs={'pk': self.meeting.id})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Scheduler.objects.filter(id=self.meeting.id).exists())

    def test_unauthenticated_user_cannot_delete_meeting(self):
        """Test that unauthenticated users cannot delete meetings"""
        url = reverse('delete-schedule-meeting', kwargs={'pk': self.meeting.id})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(Scheduler.objects.filter(id=self.meeting.id).exists())

    @patch('scheduler.views.current_app')
    @patch('scheduler.views.emails')
    @patch('scheduler.views.requests.delete')
    def test_delete_meeting_without_daily_room(self, mock_delete, mock_emails, mock_celery):
        """Test deleting a meeting that doesn't have a Daily.co room"""
        # Create a meeting without Daily.co room
        meeting_no_room = Scheduler.objects.create(
            title='Test Meeting No Room',
            meeting_date=date(2024, 12, 25),
            start_time=time(10, 0),
            end_time=time(11, 0),
            description='Test meeting without room',
            talent=self.talent_profile,
            company=self.company,
            accepted=False  # Not accepted, so no room created
        )
        
        self.client.force_authenticate(user=self.company_user)
        
        url = reverse('delete-schedule-meeting', kwargs={'pk': meeting_no_room.id})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Scheduler.objects.filter(id=meeting_no_room.id).exists())
        
        # Verify Daily.co API was not called
        mock_delete.assert_not_called()


# ---------------------------------------------------------------------------
# Interview confirmation content
#
# A confirmation has to say when the interview is, how long it runs, which
# platform it is on, and give a link that actually works -- which differs
# between a Tiaago-hosted Daily.co room and an interview the recruiter runs on
# their own platform.
# ---------------------------------------------------------------------------

from django.test import SimpleTestCase  # noqa: E402

from emails.emails import _flatten_meeting  # noqa: E402

_MEETING = {
    "title": "Interview for Backend Engineer",
    "date": "Monday, 01 September 2026",
    "start_time": "10:00 AM",
    "end_time": "10:45 AM",
    "duration": 45,
    "company_name": "Acme",
}


class FlattenMeetingTests(SimpleTestCase):
    def test_in_house_uses_the_tiaago_room(self):
        ctx = _flatten_meeting({
            **_MEETING,
            "interview_type": "IN_HOUSE",
            "platform": "In-app (Daily.co)",
            "is_external": False,
            "room_url": "https://tiaago.daily.co/abc",
            "external_meeting_url": "",
        })
        self.assertEqual(ctx["join_url"], "https://tiaago.daily.co/abc")
        self.assertFalse(ctx["is_external"])

    def test_external_uses_the_recruiters_own_link(self):
        ctx = _flatten_meeting({
            **_MEETING,
            "interview_type": "ZOOM",
            "platform": "Zoom",
            "is_external": True,
            # A stale Daily room must never win over the real link.
            "room_url": "https://tiaago.daily.co/stale",
            "external_meeting_url": "https://zoom.us/j/123",
        })
        self.assertEqual(ctx["join_url"], "https://zoom.us/j/123")
        self.assertEqual(ctx["interview_url"], "https://zoom.us/j/123")
        self.assertTrue(ctx["is_external"])
        self.assertEqual(ctx["platform"], "Zoom")

    def test_confirmation_carries_every_detail_the_candidate_needs(self):
        ctx = _flatten_meeting({
            **_MEETING,
            "interview_type": "GOOGLE_MEET",
            "platform": "Google Meet",
            "is_external": True,
            "external_meeting_url": "https://meet.google.com/xyz",
        }, company_name="Acme")

        self.assertIn("Monday, 01 September 2026", ctx["when"])
        self.assertIn("10:00 AM", ctx["when"])
        self.assertEqual(ctx["duration_minutes"], 45)
        self.assertEqual(ctx["platform"], "Google Meet")
        self.assertEqual(ctx["join_url"], "https://meet.google.com/xyz")
        self.assertEqual(ctx["company"], "Acme")

    def test_platform_is_used_as_the_location_label(self):
        ctx = _flatten_meeting({
            **_MEETING, "platform": "Zoom", "is_external": True,
            "external_meeting_url": "https://zoom.us/j/1",
        })
        self.assertEqual(ctx["location"], "Zoom")

    def test_empty_details_stay_empty(self):
        self.assertEqual(_flatten_meeting(None), {})
