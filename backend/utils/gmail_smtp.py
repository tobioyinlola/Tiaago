"""Shared Gmail App Password SMTP sending -- extracted from
sourcing.views.SendOutreachView (the existing recruiter "connect your Gmail
to email pipeline candidates" feature) so that talent_network's job-match
notifications can send through the exact same, already-working mechanism
instead of a second, duplicated implementation. Behavior is unchanged from
the original inline code: same host/port/TLS flow, same message shape.
"""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


def send_gmail_email(smtp_config, from_name: str, to_email: str, subject: str, html_body: str) -> tuple[bool, str]:
    """Sends a single email through a connected GmailSmtpConfig.

    Returns (success, error_message). Never raises -- SMTP auth/connection
    failures are caught and reported back so callers can update their own
    tracking rows without a try/except around every call site."""
    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_config.gmail_address, smtp_config.app_password)

            msg = MIMEMultipart("alternative")
            msg["From"] = f"{from_name} <{smtp_config.gmail_address}>"
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(html_body, "html"))

            server.sendmail(smtp_config.gmail_address, to_email, msg.as_string())
        return True, ""
    except smtplib.SMTPAuthenticationError:
        return False, "SMTP authentication failed"
    except Exception as e:
        return False, str(e)[:500]
