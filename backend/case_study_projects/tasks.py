from celery import shared_task
from django.contrib.auth import get_user_model
from utils.email_handler import EmailHandler, EmailTypes

User = get_user_model()


@shared_task
def talent_assessment_pass_mail(user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return
    from django.conf import settings
    return EmailHandler(user.email).send_mail(
        subject="Your profile is verified",
        context={
            "first_name": user.first_name,
            "profile_url": settings.TIAAGO_TALENT_LOGIN_URL,
        },
        template="emails/profile_approved.html",
        email_type=EmailTypes.TALENT_ASSESSMENT_PASS_MAIL,
    )
