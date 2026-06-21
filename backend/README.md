# TIAAGO Backend

Django 4.2 + DRF + Celery + Channels (Daphne ASGI).

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill DB_URL, REDIS_URL, SECRET_KEY
python manage.py migrate
python manage.py runserver
```

Celery (separate terminal):
```bash
celery -A talentsync_backend worker -l info
celery -A talentsync_backend beat -l info
```

Seed data:
```bash
python manage.py new-setup
```

Default credentials after seeding: password `Tiaago1234#`, admin `admin@tiaago.com`, talents `unsubscribedbisola@tiaago.com` / `subscribedbisola@tiaago.com`, companies `subscribedcompany@shadex.com` / `unsubscribedcompany@shadex.com`.

## Production

Runs on EC2 via Docker Compose. One Docker image, three services dispatched by `ROLE` env var (`web`, `worker`, `beat`) in `entrypoint.sh`. Nginx handles SSL and static files. GitHub Actions deploys on push to `main`.

## Apps

- `create_user` - auth, custom user model
- `jobs` - job listings, portfolios
- `payments` - Stripe, Paystack, Flutterwave
- `subscriptions` - plans, permissions
- `skill_assessment` - AI interviews, assessments
- `quiz` - quizzes
- `case_study_projects` - case studies
- `chats` - WebSocket messaging (Channels)
- `scheduler` - scheduling
- `contract` - contracts
- `roles` - role definitions
- `work_experience` - work history
- `marketing` - ConvertKit integration
- `management` - admin tools
- `sourcing` - talent pipeline
- `emails_app` - email templates

## Tests

```bash
python manage.py test jobs
python manage.py test jobs.tests.SomeTestCase.test_method
```
