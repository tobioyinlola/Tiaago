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
