"""
Sample context for every Tiaago transactional email.

Single source of truth used by BOTH:
  - the dev preview route (emails/views.py -> email_index / email_preview)
  - the design-system HTML previews in ui_kits/email/

Each entry maps a template name (without .html) to the context dict the
template expects. Real senders pass their own context; these are only for
local preview and QA.
"""

SAMPLE_CONTEXT = {
    "welcome": {
        "first_name": "Amara",
        "profile_url": "https://app.tiaago.com/profile",
    },
    "welcome_recruiter": {
        "first_name": "Tobi",
        "login_url": "https://app.tiaago.com",
    },
    "magic_link": {
        "email": "amara@example.com",
        "magic_url": "https://app.tiaago.com/signin?token=demo",
    },
    "verify_email": {
        # OTP digits are read as code.0 .. code.5
        "code": list("284913"),
    },
    "password_reset": {
        "email": "amara@example.com",
        "code": list("517402"),
        "reset_url": "https://app.tiaago.com/reset?token=demo",
    },
    "account_security_alert": {
        "device": "Chrome on macOS",
        "location": "Lagos, NG",
        "when": "Jun 12, 2026 \u00b7 9:41 AM WAT",
        "ip": "102.89.x.x",
        "secure_url": "https://app.tiaago.com/security",
        "confirm_url": "https://app.tiaago.com/security/confirm",
    },
    "application_received": {
        "first_name": "Amara",
        "role": "Senior Frontend Engineer",
        "company": "Paystack",
        "submitted": "Jun 12, 2026",
        "track_url": "https://app.tiaago.com/applications",
    },
    "assessment_invitation": {
        "first_name": "Amara",
        "company": "Paystack",
        "skill": "React",
        "duration": "45 minutes",
        "format": "Hands-on coding",
        "deadline": "Sun, Jun 22",
        "assessment_url": "https://app.tiaago.com/assessment",
    },
    "assessment_result": {
        "skill": "React",
        "score": "92%",
        "results_url": "https://app.tiaago.com/results",
    },
    "profile_approved": {
        "first_name": "Amara",
        "profile_url": "https://app.tiaago.com/profile",
    },
    "interview_invite": {
        "first_name": "Amara",
        "company": "Paystack",
        "role": "Senior Frontend Engineer",
        "when": "Thu, Jun 19 \u00b7 2:00 PM WAT",
        "format": "Live AI interview \u00b7 45 min",
        "interview_url": "https://app.tiaago.com/interview",
    },
    "interview_reminder": {
        "first_name": "Amara",
        "company": "Paystack",
        "countdown": "in 1 hour",
        "when": "Thu, Jun 19 \u00b7 2:00 PM WAT",
        "role": "Senior Frontend Engineer",
        "format": "Live AI interview",
        "join_url": "https://app.tiaago.com/interview",
    },
    "job_match_digest": {
        "first_name": "Amara",
        "match_count": "3",
        "jobs": [
            {"role": "Senior Frontend Engineer", "company": "Paystack",
             "location": "Remote, NG", "match": "96%", "accent": "success",
             "url": "https://app.tiaago.com/jobs/1"},
            {"role": "Backend Engineer", "company": "Flutterwave",
             "location": "Lagos, NG", "match": "91%", "accent": "success",
             "url": "https://app.tiaago.com/jobs/2"},
            {"role": "Full-Stack Engineer", "company": "Kuda",
             "location": "Remote", "match": "88%", "accent": "info",
             "url": "https://app.tiaago.com/jobs/3"},
        ],
        "all_matches_url": "https://app.tiaago.com/jobs",
        "settings_url": "https://app.tiaago.com/settings",
    },
    "offer": {
        "first_name": "Amara",
        "company": "Flutterwave",
        "role": "Backend Engineer",
        "comp": "$72,000 / year",
        "start_date": "Jul 7, 2026",
        "offer_url": "https://app.tiaago.com/offer",
    },
    "rejection": {
        "company": "Kuda",
        "role": "Mobile Engineer",
        "jobs_url": "https://app.tiaago.com/jobs",
    },
    "reengagement": {
        "first_name": "Amara",
        "new_count": "12",
        "matches_url": "https://app.tiaago.com/jobs",
    },
    "payment_receipt": {
        "amount": "$299.00",
        "plan": "Growth (monthly)",
        "period": "Jun 12 - Jul 12, 2026",
        "method": "Visa ending 4242",
        "receipt_no": "TGO-2026-0042",
        "invoice_url": "https://app.tiaago.com/billing",
    },
    "recruiter_new_applicant": {
        "candidate": "Amara O.",
        "role": "Senior Frontend Engineer",
        "match": "94%",
        "skills": "React, TypeScript, Node",
        "experience": "5 years",
        "location": "Lagos, NG",
        "profile_url": "https://app.tiaago.com/candidates",
    },
    "recruiter_candidate_advanced": {
        "candidate": "Amara O.",
        "role": "Senior Frontend Engineer",
        "stage": "Interview",
        "next_step": "Schedule a live interview",
        "pipeline_url": "https://app.tiaago.com/pipeline",
    },
    # --- New templates (legacy migration) ---
    "approval_status": {
        "first_name": "Amara",
        "support_email": "support@tiaago.com",
        "profile_url": "https://app.tiaago.com/profile",
    },
    "account_approved": {
        "first_name": "Tobi",
        "login_url": "https://app.tiaago.com",
    },
    "account_rejected": {
        "first_name": "Tobi",
        "support_email": "support@tiaago.com",
    },
    "referral_invite": {
        "inviter": "Amara O.",
        "invite_url": "https://app.tiaago.com/signup?ref=ABC123",
    },
    "company_team_invite": {
        "company_name": "Paystack",
        "inviter": "Tobi A.",
        "role": "Recruiter",
        "invite_url": "https://app.tiaago.com/invite/accept?token=demo",
        "expiry_days": "5",
    },
    "meeting_invite_others": {
        "first_name": "Amara",
        "organizer": "Tobi A.",
        "meeting_title": "Technical interview",
        "when": "Thu, Jun 19 · 2:00 PM WAT",
        "location": "Virtual",
        "join_url": "https://app.tiaago.com/meeting",
    },
    "meeting_cancelled": {
        "first_name": "Amara",
        "company_name": "Paystack",
        "role": "Senior Frontend Engineer",
        "when": "Thu, Jun 19 · 2:00 PM WAT",
        "dashboard_url": "https://app.tiaago.com",
    },
    "meeting_cancelled_by_talent": {
        "talent_name": "Amara O.",
        "role": "Senior Frontend Engineer",
        "when": "Thu, Jun 19 · 2:00 PM WAT",
        "pipeline_url": "https://app.tiaago.com/pipeline",
    },
    "interview_accepted": {
        "candidate_name": "Amara O.",
        "company_name": "Paystack",
        "role": "Senior Frontend Engineer",
        "when": "Thu, Jun 19 · 2:00 PM WAT",
        "pipeline_url": "https://app.tiaago.com/pipeline",
    },
    "unread_message": {
        "first_name": "Tobi",
        "inbox_url": "https://app.tiaago.com/messages",
    },
    "job_post_approved": {
        "first_name": "Tobi",
        "job_title": "Senior Frontend Engineer",
        "dashboard_url": "https://app.tiaago.com",
    },
    "assessment_fail": {
        "first_name": "Amara",
        "score": "58%",
        "job_title": "React",
        "company_name": "Tiaago",
        "retake_days": "7",
        "retake_url": "https://app.tiaago.com/assessments",
    },
    "vetting_fail": {
        "first_name": "Amara",
        "job_title": "Senior Frontend Engineer",
        "company_name": "Paystack",
        "feedback_areas": [
            "Strengthen your portfolio with more recent projects",
            "Add details about your experience with TypeScript",
        ],
        "jobs_url": "https://app.tiaago.com/jobs",
    },
    "payment_failed": {
        "amount": "$299.00",
        "reason": "Payment method declined",
        "retry_url": "https://app.tiaago.com/billing",
    },
}

# Human labels + subject lines for the dev index and for sending.
EMAIL_META = {
    "welcome": ("Welcome (talent)", "Welcome to Tiaago"),
    "welcome_recruiter": ("Welcome (recruiter)", "Welcome to Tiaago"),
    "magic_link": ("Magic-link sign-in", "Your Tiaago sign-in link"),
    "verify_email": ("Email verification (OTP)", "Verify your email"),
    "password_reset": ("Password reset", "Reset your password"),
    "account_security_alert": ("Account security alert", "New sign-in to your account"),
    "application_received": ("Application received", "We received your application"),
    "assessment_invitation": ("Assessment invitation", "Start your skill assessment"),
    "assessment_result": ("Assessment result", "Your assessment results are ready"),
    "profile_approved": ("Profile approved", "Your profile is verified"),
    "interview_invite": ("Interview invitation", "You have an interview"),
    "interview_reminder": ("Interview reminder", "Your interview starts soon"),
    "job_match_digest": ("Weekly job-match digest", "Your weekly job matches"),
    "offer": ("Offer extended", "You have an offer"),
    "rejection": ("Rejection", "An update on your application"),
    "reengagement": ("Re-engagement nudge", "New roles are waiting for you"),
    "payment_receipt": ("Payment receipt", "Your Tiaago receipt"),
    "recruiter_new_applicant": ("Recruiter: new applicant", "A new candidate applied"),
    "recruiter_candidate_advanced": ("Recruiter: candidate advanced", "A candidate advanced"),
    # --- New templates (legacy migration) ---
    "approval_status": ("Profile under review", "Your profile is under review"),
    "account_approved": ("Account approved", "Your Tiaago account is approved"),
    "account_rejected": ("Account rejected", "An update on your Tiaago account"),
    "referral_invite": ("Referral invitation", "You're invited to join Tiaago"),
    "company_team_invite": ("Company team invite", "Join your team on Tiaago"),
    "meeting_invite_others": ("Meeting invite (others)", "Meeting invitation"),
    "meeting_cancelled": ("Meeting cancelled (to talent)", "Meeting cancelled"),
    "meeting_cancelled_by_talent": ("Meeting cancelled (to company)", "Meeting cancelled by candidate"),
    "interview_accepted": ("Interview accepted", "Interview accepted"),
    "unread_message": ("Unread messages", "You have unread messages"),
    "job_post_approved": ("Job post approved", "Your job post is live"),
    "assessment_fail": ("Assessment failed", "Your assessment results"),
    "vetting_fail": ("Resume screening failed", "An update on your application"),
    "payment_failed": ("Payment failed", "Payment could not be processed"),
}

# Display order for the dev index.
EMAIL_ORDER = [
    "welcome", "welcome_recruiter", "magic_link", "verify_email", "password_reset",
    "account_security_alert", "approval_status", "account_approved", "account_rejected",
    "application_received", "assessment_invitation", "assessment_result", "assessment_fail",
    "profile_approved", "interview_invite", "interview_reminder", "interview_accepted",
    "meeting_invite_others", "meeting_cancelled", "meeting_cancelled_by_talent",
    "job_match_digest", "offer", "rejection", "vetting_fail",
    "reengagement", "unread_message", "payment_receipt", "payment_failed",
    "job_post_approved", "referral_invite", "company_team_invite",
    "recruiter_new_applicant", "recruiter_candidate_advanced",
]
