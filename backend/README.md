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

## Bachs wallet top-ups

Set `BACHS_ENVIRONMENT` to `sandbox` or `live`, configure the matching
`BACHS_API_KEY_SANDBOX` or `BACHS_API_KEY_LIVE`, and set `BACHS_WEBHOOK_SECRET`.
Wallet checkout sends the user's selected amount and currency as raw `pricing`;
catalog product IDs are not required. See the
[Bachs checkout API](https://docs.bachs.io/api-reference/payments/create-checkout-session).

Configure the signed webhook at `/api/subscriptions/bachs-wallet-fund-webhook/`.
`/webhook` and `/webhook/` also accept deliveries directly. Wallet credits are
applied only after payment verification; a browser redirect never credits a wallet.

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
- `management` - admin tools
- `sourcing` - talent pipeline
- `emails_app` - email templates..

## Tests

```bash
python manage.py test jobs
python manage.py test jobs.tests.SomeTestCase.test_method
```
