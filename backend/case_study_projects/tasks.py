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
    subject = "Congratulations! You're Now a Vetted Talent on Tiaago"
    template_name = "emails/email_templates/Talent_Assessment_Pass.html"
    return EmailHandler(user.email).send_mail(
        subject=subject,
        context={"first_name": user.first_name},
        template=template_name,
        email_type=EmailTypes.TALENT_ASSESSMENT_PASS_MAIL,
    )
