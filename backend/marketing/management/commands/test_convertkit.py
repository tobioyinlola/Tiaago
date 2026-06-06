from django.core.management.base import BaseCommand
from django.conf import settings
from marketing.convertkit import ConvertKitAPI

class Command(BaseCommand):
    help = 'Test ConvertKit integration by subscribing a test email to a form'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Test email address')
        parser.add_argument('--form_id', type=str, help='ConvertKit form ID')

    def handle(self, *args, **options):
        email = options['email']
        form_id = options['form_id']

        if not email or not form_id:
            self.stdout.write(self.style.ERROR('Please provide both email and form_id'))
            return

        try:
            api = ConvertKitAPI()
            metadata = {
                'first_name': 'Test',
                'last_name': 'User',
                'signup_date': '2025-10-23',
                'test_integration': True
            }
            
            response = api.subscribe_to_form(email, form_id, metadata)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully subscribed {email} to ConvertKit form {form_id}. Response: {response}'
                )
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to subscribe to ConvertKit: {str(e)}')
            )