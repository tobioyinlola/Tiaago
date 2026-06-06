# talentsync-v2-backend

backend development for talentsync v2 product

set up your .env file to look similar to .env.dist

To get started with a python virtual environment:

1. Create a virtual environment and activate it
2. Install the required packages with `pip install -r requirements.txt`
3. Run `python manage.py new-setup`
4. After running that, you should have some dummy data to work with:

   - All passwords are `Tiaago1234#`
   - A staff user with email `admin@tiaago.com`. This user is also a superuser (Django Admin)
   - 2 talent users.

     `unsubscribedbisola@tiaago.com` and `subscribedbisola@tiaago.com`.

   - 2 companies. One is subscribed to the premium plan while the other isn't subscribed to any plan

     The emails for the company reps are `subscribedcompany@shadex.com` and `unsubscribedcompany@shadex.com`

5. Run `python manage.py runserver`
6. You can login to django admin with username `admin` and password `Tiaago1234#`

To get started with Docker:

1. Set `REDIS_HOST='tiaago_redis_server'` in your .env file
2. If you're using a mac, replace instances of `localhost` in your .env file with `host.docker.internal`
3. Run `docker-compose -f docker-compose.dev.yml up`
4. Exec into the container
5. Run `python manage.py new-setup`
6. After running that, you should have some dummy data to work with:

   - All passwords are `Tiaago1234#`
   - A staff user with email `admin@tiaago.com`. This user is also a superuser (Django Admin)
   - 2 talent users.

     `unsubscribedbisola@tiaago.com` and `subscribedbisola@tiaago.com`.

   - 2 companies. One is subscribed to the premium plan while the other isn't subscribed to any plan

     The emails for the company reps are `subscribedcompany@shadex.com` and `unsubscribedcompany@shadex.com`

7. Run `python manage.py runserver`
8. You can login to django admin with username `admin` and password `Tiaago1234#`

#

# NOTE

- This Django project currently has too many apps than it needs, so please
  try to avoid creating new apps as much as you can

- The base folder contains mixins, abstract models, permissions and some utility functions that are used throughout the project
- The logs folder contains logs
- The utils folder contains utility functions

### APPS

- `case_study_project` - for case study projects
- `chats` - handles everything relating to chats
- `contract` - app for contracts
- `create_user` - for authentication, user creation etc.
- `jobs` - for jobs and portfolio
- `management` - app for admins (Tiaago admins)
- `payments` - app to handle payments
- `quiz` - ??
- `roles` - ??
- `scheduler` - ??
- `subscriptions` - ??
- `work_experience` - ??
