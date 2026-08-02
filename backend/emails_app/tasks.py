from celery import shared_task

from utils.email_handler import EmailHandler


@shared_task(name="send_email_task")
def send_email_task(recipients, subject, template, context, email_type=None, **kwargs):
    """Generic async wrapper around EmailHandler.send_mail -- lets a call
    site fire-and-forget instead of blocking its request/response cycle on
    Resend's up-to-2-attempt-plus-Mailgun-fallback latency (EmailHandler.send_mail,
    utils/email_handler.py). kwargs forwards send_mail's optional args
    (security, from_email, from_name, headers) unchanged."""
    EmailHandler(recipients).send_mail(subject, context, template, email_type=email_type, **kwargs)


@shared_task(name="send_basic_email_task")
def send_basic_email_task(recipients, subject, message, email_type=None):
    """Async wrapper around EmailHandler.send_basic_email (plain-text, Resend
    then SMTP fallback)."""
    EmailHandler(recipients).send_basic_email(subject, message, email_type=email_type)
