from django.core.management.base import BaseCommand
from django.conf import settings
from create_user.models import CustomUser
from marketing.tasks import sync_user_to_convertkit
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Sync all existing users to ConvertKit'

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of users to process in each batch (default: 100)',
        )
        parser.add_argument(
            '--user-type',
            type=str,
            choices=['T', 'CR', 'ST'],
            help='Filter users by type (T=Talent, CR=Company Rep, ST=Staff)',
        )

    def handle(self, *args, **options):
        batch_size = options['batch_size']
        user_type_filter = options.get('user_type')
        
        # Get all users or filter by type
        users = CustomUser.objects.all()
        if user_type_filter:
            users = users.filter(user_type=user_type_filter)
        
        total_users = users.count()
        synced_count = 0
        failed_count = 0

        self.stdout.write(
            self.style.WARNING(
                f'Starting to sync {total_users} existing users to ConvertKit...'
            )
        )

        # Process users in batches
        for i in range(0, total_users, batch_size):
            batch = users[i:i + batch_size]
            self.stdout.write(f'Processing batch {i//batch_size + 1} ({len(batch)} users)...')
            
            for user in batch:
                try:
                    # Prepare user metadata
                    try:
                        has_company = bool(user.company)
                    except CustomUser.company.RelatedObjectDoesNotExist:
                        has_company = False

                    try:
                        has_profile = bool(user.profile)
                    except CustomUser.profile.RelatedObjectDoesNotExist:
                        has_profile = False

                    metadata = {
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "signup_date": user.date_joined.isoformat() if user.date_joined else None,
                        "user_type": user.get_user_type_display(),
                        "profile_completed": has_profile or has_company,
                    }

                    # Determine which form to use based on user type
                    form_id = (
                        settings.CONVERTKIT_RECRUITER_FORM
                        if user.user_type == CustomUser.USER_TYPE.COMPANY_REP
                        else settings.CONVERTKIT_CANDIDATE_FORM
                    )

                    # Only sync if form_id is configured
                    if form_id:
                        # Sync user to ConvertKit
                        sync_user_to_convertkit.delay(
                            email=user.email,
                            form_id=form_id,
                            metadata=metadata
                        )
                        synced_count += 1
                        if synced_count % 10 == 0:
                            self.stdout.write(f'  Queued {synced_count} users...')
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f'  Skipping user {user.email}: form_id not configured'
                            )
                        )

                except Exception as e:
                    failed_count += 1
                    logger.error(f'Failed to sync user {user.email}: {str(e)}')
                    self.stdout.write(
                        self.style.ERROR(f'Failed to sync user {user.email}: {str(e)}')
                    )

        self.stdout.write(self.style.SUCCESS(
            f'\nFinished syncing users to ConvertKit.\n'
            f'Successfully queued: {synced_count} users\n'
            f'Failed to sync: {failed_count} users'
        ))