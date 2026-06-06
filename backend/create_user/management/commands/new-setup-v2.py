import random
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone
from create_user.models import CustomUser, Company, TalentProfile
from jobs.models import Job, Tool
from subscriptions.models import SubPlan, Subscription
from roles.models import Role
from skill_assessment.models import TechStack 
from create_user.utils import generate_referral_code


tools_data = [
    {"name": "Jira", "category": "Product Management"},
    {"name": "Slack", "category": "Communication"},
    {"name": "Trello", "category": "Project Management"},
    {"name": "Asana", "category": "Project Management"},
    {"name": "GitHub", "category": "Version Control"},
    {"name": "GitLab", "category": "Version Control"},
    {"name": "Bitbucket", "category": "Version Control"},
    {"name": "Zoom", "category": "Communication"},
    {"name": "Microsoft Teams", "category": "Communication"},
    {"name": "Google Drive", "category": "File Sharing"},
    {"name": "Dropbox", "category": "File Sharing"},
    {"name": "Figma", "category": "Design"},
    {"name": "Adobe XD", "category": "Design"},
    {"name": "Notion", "category": "Knowledge Management"},
    {"name": "Confluence", "category": "Knowledge Management"},
    {"name": "Postman", "category": "API Testing"},
    {"name": "Swagger", "category": "API Documentation"},
    {"name": "Docker", "category": "Containerization"},
    {"name": "Kubernetes", "category": "Container Orchestration"},
    {"name": "AWS", "category": "Cloud Services"},
    {"name": "Azure", "category": "Cloud Services"},
    {"name": "Google Cloud", "category": "Cloud Services"},
    {"name": "Jenkins", "category": "CI/CD"},
    {"name": "CircleCI", "category": "CI/CD"},
    {"name": "Travis CI", "category": "CI/CD"},
    {"name": "Selenium", "category": "Test Automation"},
    {"name": "Cypress", "category": "Test Automation"},
    {"name": "Tableau", "category": "Data Visualization"},
    {"name": "Power BI", "category": "Data Visualization"},
    {"name": "MySQL", "category": "Database"},
    {"name": "PostgreSQL", "category": "Database"},
    {"name": "MongoDB", "category": "Database"},
    {"name": "Redis", "category": "Database"},
    {"name": "Elasticsearch", "category": "Search Engine"},
    {"name": "Grafana", "category": "Monitoring"},
    {"name": "Prometheus", "category": "Monitoring"},
    {"name": "New Relic", "category": "Application Monitoring"},
    {"name": "Datadog", "category": "Application Monitoring"},
    {"name": "Splunk", "category": "Log Management"},
    {"name": "Nagios", "category": "Infrastructure Monitoring"},
    {"name": "Adobe Express", "category": "Design"},
    {"name": "Airtable Automations", "category": "Automation"},
    {"name": "Amplitude", "category": "Product Analytics"},
    {"name": "AppSheet", "category": "No-Code Development"},
    {"name": "Bubble", "category": "No-Code Development"},
    {"name": "Buffer", "category": "Social Media Management"},
    {"name": "Canva", "category": "Design"},
    {"name": "ClickUp", "category": "Project Management"},
    {"name": "Discord", "category": "Communication"},
    {"name": "Figma FigJam", "category": "Design Collaboration"},
    {"name": "Git", "category": "Version Control"},
    {"name": "Glide", "category": "No-Code Development"},
    {"name": "Google Analytics 4", "category": "Analytics"},
    {"name": "Google Meet", "category": "Communication"},
    {"name": "Google Slides", "category": "Presentation"},
    {"name": "Google Workspace", "category": "Productivity"},
    {"name": "GCP", "category": "Cloud Services"},
    {"name": "Heroku", "category": "Cloud Hosting"},
    {"name": "Hotjar", "category": "Product Analytics"},
    {"name": "HubSpot", "category": "CRM"},
    {"name": "Keynote", "category": "Presentation"},
    {"name": "Loom", "category": "Video Communication"},
    {"name": "Make (Integromat)", "category": "Automation"},
    {"name": "Metabase", "category": "Data Visualization"},
    {"name": "Microsoft 365", "category": "Productivity"},
    {"name": "Mixpanel", "category": "Product Analytics"},
    {"name": "Monday.com", "category": "Project Management"},
    {"name": "Netlify", "category": "Cloud Hosting"},
    {"name": "n8n", "category": "Automation"},
    {"name": "OnlyOffice", "category": "Productivity"},
    {"name": "Parabola", "category": "Automation"},
    {"name": "Pitch", "category": "Presentation"},
    {"name": "Playwright", "category": "Test Automation"},
    {"name": "PowerPoint", "category": "Presentation"},
    {"name": "Prezi", "category": "Presentation"},
    {"name": "Pipedrive", "category": "CRM"},
    {"name": "Retool", "category": "Internal Tools"},
    {"name": "Salesforce", "category": "CRM"},
    {"name": "SQLite", "category": "Database"},
    {"name": "Superset", "category": "Data Visualization"},
    {"name": "Vercel", "category": "Cloud Hosting"},
    {"name": "Vimeo Record", "category": "Video Communication"},
    {"name": "Zapier", "category": "Automation"},
    {"name": "Zoho CRM", "category": "CRM"},
    {"name": "Zoho Docs", "category": "File Sharing"},
]

# role_data = [
#     {"title": "Software Engineer", "is_technical": True},
#     {"title": "Product Manager", "is_technical": False},
#     {"title": "DevOps Engineer", "is_technical": True},
#     {"title": "UI/UX Designer", "is_technical": False},
#     {"title": "Data Scientist", "is_technical": True},
#     {"title": "Business Analyst", "is_technical": False},
#     {"title": "Full Stack Developer", "is_technical": True},
#     {"title": "QA Engineer", "is_technical": True},
#     {"title": "Project Manager", "is_technical": False},
#     {"title": "Network Engineer", "is_technical": True},
#     {"title": "Backend Developer", "is_technical": True},
#     {"title": "Frontend Developer", "is_technical": True},
#     {"title": "Cloud Architect", "is_technical": True},
#     {"title": "Security Analyst", "is_technical": True},
#     {"title": "Business Intelligence Analyst", "is_technical": True},
#     {"title": "Systems Administrator", "is_technical": True},
#     {"title": "Technical Writer", "is_technical": False},
#     {"title": "HR Manager", "is_technical": False},
#     {"title": "Sales Manager", "is_technical": False},
#     {"title": "Marketing Specialist", "is_technical": False},
#     {"title": "Chief Technology Officer (CTO)", "is_technical": True},
#     {"title": "Chief Executive Officer (CEO)", "is_technical": False},
#     {"title": "Chief Product Officer (CPO)", "is_technical": False},
#     {"title": "Operations Manager", "is_technical": False},
#     {"title": "Customer Support Specialist", "is_technical": False},
#     {"title": "Software Architect", "is_technical": True},
#     {"title": "Mobile Developer", "is_technical": True},
#     {"title": "Database Administrator", "is_technical": True},
#     {"title": "Game Developer", "is_technical": True},
#     {"title": "Cloud Engineer", "is_technical": True},
#     {"title": "Embedded Systems Engineer", "is_technical": True},
#     {"title": "Web Designer", "is_technical": False},
#     {"title": "Compliance Officer", "is_technical": False},
#     {"title": "Legal Counsel", "is_technical": False},
#     {"title": "Data Engineer", "is_technical": True},
#     {"title": "Machine Learning Engineer", "is_technical": True},
#     {"title": "Artificial Intelligence Specialist", "is_technical": True},
#     {"title": "Blockchain Developer", "is_technical": True},
#     {"title": "Scrum Master", "is_technical": False},
#     {"title": "Agile Coach", "is_technical": False},
#     {"title": "Digital Marketing Manager", "is_technical": False},
#     {"title": "SEO Specialist", "is_technical": False},
#     {"title": "Content Strategist", "is_technical": False},
#     {"title": "Salesforce Administrator", "is_technical": True},
#     {"title": "SAP Consultant", "is_technical": True},
#     {"title": "ERP Consultant", "is_technical": True},
#     {"title": "IT Support Specialist", "is_technical": True},
#     {"title": "Voice Engineer", "is_technical": True},
#     {"title": "IT Project Manager", "is_technical": False},
#     {"title": "Video Game Tester", "is_technical": True},
#     {"title": "Virtual Reality Developer", "is_technical": True},
#     {"title": "Augmented Reality Developer", "is_technical": True},
#     {"title": "Data Analyst", "is_technical": True},
#     {"title": "Customer Success Manager", "is_technical": False},
#     {"title": "Software Tester", "is_technical": True},
#     {"title": "Test Automation Engineer", "is_technical": True},
#     {"title": "Enterprise Architect", "is_technical": True},
#     {"title": "Chief Information Officer (CIO)", "is_technical": True},
#     {"title": "Chief Operating Officer (COO)", "is_technical": False},
#     {"title": "Vice President of Engineering", "is_technical": True},
#     {"title": "Vice President of Product", "is_technical": False},
#     {"title": "Legal Operations Manager", "is_technical": False},
#     {"title": "Business Development Manager", "is_technical": False},
# ]

role_data = [
    # Talent roles
    {"title": "Full stack Engineer", "is_technical": True, "is_startup_role": False},
    {"title": "Mobile App Engineer", "is_technical": True, "is_startup_role": False},
    {"title": "Technical Product Manager", "is_technical": False, "is_startup_role": False},
    {"title": "Product Manager", "is_technical": False, "is_startup_role": False},
    {"title": "Product Designer", "is_technical": False, "is_startup_role": False},
    {"title": "Frontend Engineer", "is_technical": True, "is_startup_role": False},
    {"title": "Backend Engineer", "is_technical": True, "is_startup_role": False},
    {"title": "AI/ML Engineer", "is_technical": True, "is_startup_role": False},
    {"title": "Social Media Manager", "is_technical": False, "is_startup_role": False},
    {"title": "Community Manager", "is_technical": False, "is_startup_role": False},
    {"title": "Customer Support", "is_technical": False, "is_startup_role": False},
    {"title": "Copywriter/Content Writer", "is_technical": False, "is_startup_role": False},
    {"title": "Virtual Assistant", "is_technical": False, "is_startup_role": False},
    {"title": "Brand Designer", "is_technical": False, "is_startup_role": False},

    # Startup roles
    {"title": "HR Manager", "is_technical": False, "is_startup_role": True},
    {"title": "Recruiter", "is_technical": False, "is_startup_role": True},
    {"title": "Startup", "is_technical": False, "is_startup_role": True},
]


tech_stacks = [
    {"label": "Python"},
    {"label": "JavaScript"},
    {"label": "TypeScript"},
    {"label": "Java"},
    {"label": "C#"},
    {"label": "Go"},
    {"label": "Ruby"},
    {"label": "PHP"},
    {"label": "C++"},
    {"label": "C"},
    {"label": "Swift"},
    {"label": "Kotlin"},
    {"label": "Dart"},
    {"label": "Rust"},
    {"label": "R"},
    {"label": "Scala"},
    {"label": "Perl"},
    {"label": "Elixir"},
    {"label": "Haskell"},
    {"label": "MATLAB"},
    {"label": "SQL"},
    {"label": "NoSQL"},
    {"label": "HTML/CSS"},
    
    # Frameworks
    {"label": "Django"},
    {"label": "Flask"},
    {"label": "FastAPI"},
    {"label": "React"},
    {"label": "Vue.js"},
    {"label": "Angular"},
    {"label": "Next.js"},
    {"label": "Express.js"},
    {"label": "NestJS"},
    {"label": "Spring Boot"},
    {"label": ".NET"},
    {"label": "Ruby on Rails"},
    {"label": "Laravel"},
    {"label": "Flutter"},
    {"label": "React Native"},
    {"label": "Qt"},
    {"label": "Electron"},
    {"label": "Unity"},
    {"label": "TensorFlow"},
    {"label": "PyTorch"},
    {"label": "Keras"},
    {"label": "Hugging Face Transformers"}
]


pword = "Tiaago1234#"
default_user_properties = {
    "country": "Nigeria",
    "bio": "Tiaago autogenerated user",
    "verified": True,
    "is_verified": True,
}


def generate_phone_number():
    base = "+234902215"
    numbers = "".join([str(random.randint(0, 9)) for i in range(4)])
    return base + numbers

def log_success(msg, command):
    command.stdout.write(command.style.SUCCESS(msg))

def log_warn(msg, command):
    command.stdout.write(command.style.WARNING(msg))

def log_error(msg, command):
    command.stderr.write(command.style.ERROR(msg))


STAFF = "staff"
UNSUBSCRIBED_TALENT = "unsubscribed_talent"
SUBSCRIBED_TALENT = "subscribed_talent"
SUBSCRIBED_COMPANY = "subscribed_company"
UNSUBSCRIBED_COMPANY = "unsubscribed_company"

sub_plans = [
    {
        "name": "Basic (Talent)",
        "description": "Basic Plan for talents",
        "info": "Basic plan for talents",
        "sub_type": SubPlan.SUB_TYPE.BASIC,
        "user_type": SubPlan.SUB_USER_TYPE.TALENT,
        "no_of_days": 1000,
        "amount": 10,
    },
    {
        "name": "Premium (Talent)",
        "description": "Premium Plan for talents",
        "info": "Premium plan for talents",
        "sub_type": SubPlan.SUB_TYPE.PREMIUM,
        "user_type": SubPlan.SUB_USER_TYPE.TALENT,
        "no_of_days": 1000,
        "amount": 100,
    },
    {
        "name": "Basic (Company Rep)",
        "description": "Basic Plan for companies",
        "info": "Basic plan for companies",
        "sub_type": SubPlan.SUB_TYPE.BASIC,
        "user_type": SubPlan.SUB_USER_TYPE.COMPANY_REP,
        "no_of_days": 1000,
        "amount": 10,
    },
    {
        "name": "Premium (Company Rep)",
        "description": "Premium Plan for companies",
        "info": "Premium plan for companies",
        "sub_type": SubPlan.SUB_TYPE.PREMIUM,
        "user_type": SubPlan.SUB_USER_TYPE.COMPANY_REP,
        "no_of_days": 1000,
        "amount": 100,
    },
]

user_properties = {
    STAFF: {
        "email": "admin@tiaago.com",
        "first_name": "Tiaago",
        "last_name": "Admin",
        "user_type": CustomUser.USER_TYPE.STAFF,
        "phone_number": generate_phone_number(),
    },
    SUBSCRIBED_COMPANY: {
        "email": "subscribedcompany@shadex.com",
        "company_name": "Subscribed Company",
        "first_name": "Subscribed",
        "last_name": "CompanyRep",
        "user_type": CustomUser.USER_TYPE.COMPANY_REP,
        "phone_number": generate_phone_number(),
    },
    UNSUBSCRIBED_COMPANY: {
        "email": "unsubscribedcompany@shadex.com",
        "company_name": "UnSubscribed Company",
        "first_name": "UnSubscribed",
        "last_name": "CompanyRep",
        "user_type": CustomUser.USER_TYPE.COMPANY_REP,
        "phone_number": generate_phone_number(),
    },
    UNSUBSCRIBED_TALENT: {
        "email": "unsubscribedbisola@tiaago.com",
        "first_name": "Unsubscribed",
        "last_name": "Bisola",
        "user_type": CustomUser.USER_TYPE.TALENT,
        "phone_number": generate_phone_number(),
    },
    SUBSCRIBED_TALENT: {
        "email": "subscribedbisola@tiaago.com",
        "first_name": "Subscribed",
        "last_name": "Bisola",
        "user_type": CustomUser.USER_TYPE.TALENT,
        "phone_number": generate_phone_number(),
    },
}

default_user_properties = {"country": "Nigeria", "bio": "Tiaago autogenerated user", "verified": True, "is_verified": True}


# --- Management Command ---
class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        # Create Roles
        for role in role_data:
            Role.objects.get_or_create(title=role["title"], is_technical=role["is_technical"])
        log_success("Roles created ✅", self)

        # Create Tech Stacks
        for stack in tech_stacks:
            TechStack.objects.get_or_create(stack=stack["label"])
        log_success("Tech stacks created ✅", self)

        # Create Tools
        for tool in tools_data:
            Tool.objects.get_or_create(name=tool["name"], category=tool["category"])
        log_success("Tools created ✅", self)

        if not (settings.IS_DEV or settings.IS_STAGING):
            return

        # Create Sub Plans
        talent_premium_plan = None
        company_premium_plan = None
        for plan in sub_plans:
            sub_obj, _ = SubPlan.objects.get_or_create(**plan)
            if plan["user_type"] == SubPlan.SUB_USER_TYPE.TALENT and plan["sub_type"] == SubPlan.SUB_TYPE.PREMIUM:
                talent_premium_plan = sub_obj
            elif plan["user_type"] == SubPlan.SUB_USER_TYPE.COMPANY_REP and plan["sub_type"] == SubPlan.SUB_TYPE.PREMIUM:
                company_premium_plan = sub_obj
        log_success("Subscription plans created ✅", self)

        # Create Users
        users = {}
        for utype, props in user_properties.items():
            email = props["email"]
            defaults = {
                **default_user_properties,
                "username": email.split("@")[0],
                "first_name": props["first_name"],
                "last_name": props["last_name"],
                "user_type": props["user_type"],
                "phone_number": props["phone_number"],
            }
            user, created = CustomUser.objects.get_or_create(email=email, defaults=defaults)
            if created:
                user.set_password(pword)
                user.save()
                log_success(f"Created user {email} ✅", self)
            else:
                log_warn(f"User already exists: {email}", self)
            users[utype] = user

        # Promote staff user
        staff = users[STAFF]
        staff.is_staff = True
        staff.is_superuser = True
        staff.save()
        log_success(f"Promoted {staff.email} to superuser ✅", self)

        # Create Companies
        for comp_type in [SUBSCRIBED_COMPANY, UNSUBSCRIBED_COMPANY]:
            try:
                user = users[comp_type]
                company_name = user_properties[comp_type]["company_name"]
                company, created = Company.objects.get_or_create(company_rep=user, defaults={
                    "company_name": company_name,
                    "company_email": user.email,
                    "website": "https://example.com",
                    "role": Role.objects.order_by("?").first()
                })
                log_success(f"Company '{company_name}' created ✅", self)
            except Exception as e:
                log_error(f"Error creating company for {comp_type}: {e}", self)

        # Create TalentProfiles
        for talent_type in [SUBSCRIBED_TALENT, UNSUBSCRIBED_TALENT]:
            try:
                user = users[talent_type]
                TalentProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        "full_name": user.get_full_name(),
                        "gender": TalentProfile.GENDER_TYPE.MALE if talent_type == SUBSCRIBED_TALENT else TalentProfile.GENDER_TYPE.FEMALE,
                        "role": Role.objects.order_by("?").first(),
                    },
                    referral_code=generate_referral_code()
                )
                log_success(f"Talent profile created for {user.email} ✅", self)
            except Exception as e:
                log_error(f"Error creating talent profile: {e}", self)

        # Create Subscriptions
        try:
            Subscription.objects.get_or_create(
                user=users[SUBSCRIBED_TALENT],
                sub_plan=talent_premium_plan,
                defaults={
                    "status": "success",
                    "end_date": timezone.now() + timezone.timedelta(days=1000),
                    "transaction_reference": timezone.now().isoformat(),
                },
            )
            log_success(f"Subscription for {users[SUBSCRIBED_TALENT].email} ✅", self)

            Subscription.objects.get_or_create(
                user=users[SUBSCRIBED_COMPANY],
                sub_plan=company_premium_plan,
                defaults={
                    "status": "success",
                    "end_date": timezone.now() + timezone.timedelta(days=1000),
                    "transaction_reference": timezone.now().isoformat(),
                },
            )
            log_success(f"Subscription for {users[SUBSCRIBED_COMPANY].email} ✅", self)
        except Exception as e:
            log_error(f"Subscription error: {e}", self)

        # Create Jobs
        try:
            # Get the company object for the subscribed company user
            subscribed_company_obj = Company.objects.get(company_rep=users[SUBSCRIBED_COMPANY])
            subscribed_user_role = Role.objects.order_by("?").first()  # Or set to a specific role if needed

            # Get the company object for the unsubscribed company user
            unsubscribed_company_obj = Company.objects.get(company_rep=users[UNSUBSCRIBED_COMPANY])
            unsubscribed_user_role = Role.objects.order_by("?").first()  # Or set to a specific role if needed

            # Create job for subscribed company
            Job.objects.create(
                role=subscribed_user_role,
                job_type=Job.JobType.FULL_TIME,
                location="Nigeria",
                experience=5,
                salary_duration=Job.SalaryDuration.PER_MONTH,
                payment_currency=Job.PaymentCurrency.USD,
                payment_range_usd=Job.DollarPaymentRange.RANGE_1100_1500,
                about_company="We are a top-tier subscribed company focused on tech innovation.",
                job_requirement="• 5+ years experience in software engineering.\n• Proficiency in Django or similar frameworks.",
                description="Exciting opportunity to join our engineering team and work on impactful projects.",
                hiring_type=Job.HIRING_TYPES[0],
                job_status=Job.JobStatus.ACTIVE,
                company=subscribed_company_obj,
            )

            log_success(f"Created job for {subscribed_company_obj.company_name} company ✅", self)


            # Create job for unsubscribed company
            Job.objects.create(
                role=unsubscribed_user_role,
                job_type=Job.JobType.CONTRACT,
                location="Remote",
                experience=2,
                salary_duration=Job.SalaryDuration.CONTRACT,
                payment_currency=Job.PaymentCurrency.USD,
                payment_range_usd=Job.DollarPaymentRange.RANGE_50_200,
                about_company="We are a small, growing company looking for passionate talent.",
                job_requirement="• 1-3 years experience in frontend development.\n• Familiarity with React and REST APIs.",
                description="Help us build delightful UI experiences for our global customers.",
                hiring_type=Job.HIRING_TYPES[1],
                job_status=Job.JobStatus.ACTIVE,
                company=unsubscribed_company_obj,
            )

            log_success(f"Created job for {unsubscribed_company_obj.company_name} company ✅", self)

                        
        except Exception as e:
            log_error(f"Job creation failed: {e}", self)