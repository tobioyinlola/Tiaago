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


class Command(BaseCommand):
    def handle(self, *args, **options):
    
        for role in role_data:
            title = role.get("title")
            is_technical = role.get("is_technical")
            #### create roles ####
            Role.objects.get_or_create(title=title, is_technical=is_technical)
        self.stdout.write(self.style.SUCCESS("Roles created ✅"))
        for stacks in tech_stacks:
            stack = stacks.get("label")
            TechStack.objects.get_or_create(
                stack = stack
            )
        self.stdout.write(self.style.SUCCESS("Tech Stacks created ✅"))
        for item in tools_data:
            name = item.get("name")
            category = item.get("category")
            Tool.objects.get_or_create(name=name, category=category)
        self.stdout.write(self.style.SUCCESS("Tools created ✅"))
        if settings.IS_STAGING or settings.IS_DEV:
            # create sub plans
            talent_premium_plan = None
            company_premium_plan = None
            for plan in sub_plans:
                sub_obj, _ = SubPlan.objects.get_or_create(
                    name=plan.get("name"),
                    description=plan.get("description"),
                    info=plan.get("info"),
                    sub_type=plan.get("sub_type"),
                    user_type=plan.get("user_type"),
                    no_of_days=plan.get("no_of_days"),
                    amount=plan.get("amount"),
                )
                if (
                    sub_obj.user_type == SubPlan.SUB_USER_TYPE.TALENT
                    and sub_obj.sub_type == SubPlan.SUB_TYPE.PREMIUM
                ):
                    talent_premium_plan = sub_obj
                if (
                    sub_obj.user_type == SubPlan.SUB_USER_TYPE.COMPANY_REP
                    and sub_obj.sub_type == SubPlan.SUB_TYPE.PREMIUM
                ):
                    company_premium_plan = sub_obj
            self.stdout.write(self.style.SUCCESS("Subscription plans created ✅"))
            # create users
            users = {}
            for user_type, user_props in user_properties.items():
                email = user_props.get("email")
                username = email[: email.index("@")]
                first_name = user_props.get("first_name")
                last_name = user_props.get("last_name")
                user_type_ = user_props.get("user_type")
                phone_number = user_props.get("phone_number")
                user_obj = CustomUser(
                    user_type=user_type_,
                    phone_number=phone_number,
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    **default_user_properties,
                    username=username,
                )
                user_obj.set_password(pword)
                user_obj.save()
                self.stdout.write(
                    self.style.SUCCESS(f"User {email} created with password {pword} ✅")
                )
                users[user_type] = user_obj
            self.stdout.write(self.style.SUCCESS("All Users created ✅"))
            ### make staff user django admin user) ###
            staff_user = users[STAFF]
            staff_user.is_staff = True
            staff_user.is_superuser = True
            staff_user.save()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Made Tiaago Staff - {staff_user.email} superuser ✅"
                )
            )

            ### create subscribed company ###
            subscribed_company_rep = users[SUBSCRIBED_COMPANY]
            subscribed_company_name = user_properties[SUBSCRIBED_COMPANY].get(
                "company_name"
            )
            subscribed_company_obj = Company.objects.create(
                company_rep=subscribed_company_rep,
                company_name=subscribed_company_name,
                company_email=subscribed_company_rep.email,
                website="https://www.google.com",
                role=Role.objects.order_by("?").first(),
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created subscribed company {subscribed_company_name} and assigned {subscribed_company_rep.email} as company rep ✅"
                )
            )

            ### create unsubscribed company ###
            unsubscribed_company_rep = users[UNSUBSCRIBED_COMPANY]
            unsubscribed_company_name = user_properties[UNSUBSCRIBED_COMPANY].get(
                "company_name"
            )
            unsubscribed_company_obj = Company.objects.create(
                company_rep=unsubscribed_company_rep,
                company_name=unsubscribed_company_name,
                company_email=unsubscribed_company_rep.email,
                website="https://www.facebook.com",
                role="Technology",
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created unsubscribed company {unsubscribed_company_name} and assigned {unsubscribed_company_rep.email} as company rep ✅"
                )
            )

            ### create talent users ###
            subscribed_talent_user = users[SUBSCRIBED_TALENT]
            unsubscribed_talent_user = users[UNSUBSCRIBED_TALENT]
            subscribed_user_role = Role.objects.order_by("?").first()
            unsubscribed_user_role = Role.objects.order_by("?").first()
            TalentProfile.objects.create(
                user=subscribed_talent_user,
                full_name=subscribed_talent_user.get_full_name(),
                gender=TalentProfile.GENDER_TYPE.MALE,
                role=subscribed_user_role,
                referral_code=generate_referral_code(),
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created Talent Profile for {subscribed_talent_user.email}✅"
                )
            )
            TalentProfile.objects.create(
                user=unsubscribed_talent_user,
                full_name=unsubscribed_talent_user.get_full_name(),
                gender=TalentProfile.GENDER_TYPE.FEMALE,
                role=unsubscribed_user_role,
                referral_code=generate_referral_code(),
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created Talent Profile for {unsubscribed_talent_user.email}✅"
                )
            )
            # create subscription for subscribed talent
            Subscription.objects.create(
                user=subscribed_talent_user,
                sub_plan=talent_premium_plan,
                status="success",
                end_date=timezone.now() + timezone.timedelta(days=1000),
                transaction_reference=timezone.now().isoformat(),
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created Subscription for {subscribed_talent_user.email}✅"
                )
            )

            # create subscription for subscribed company
            Subscription.objects.create(
                user=subscribed_company_rep,
                sub_plan=company_premium_plan,
                status="success",
                end_date=timezone.now() + timezone.timedelta(days=1000),
                transaction_reference=timezone.now().isoformat(),
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created premium company Subscription for {subscribed_company_rep.email}✅"
                )
            )

            ### create job for subscribed company ###
            Job.objects.create(
                title="Job Title",
                role=subscribed_user_role,
                min_salary=1000000,
                max_salary=4000000,
                currency="NGN",
                experience=5,
                job_type=Job.JobType.FULL_TIME,
                job_level=Job.JobLevel.SENIOR,
                country="Nigeria",
                city="Abuja",
                company=subscribed_company_obj,
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created job for {subscribed_company_obj.company_name} company✅"
                )
            )

            ### create job for unsubscribed company ###
            Job.objects.create(
                title="Job Title",
                role=unsubscribed_user_role,
                min_salary=100000,
                max_salary=300000,
                currency="NGN",
                experience=5,
                job_type=Job.JobType.FULL_TIME,
                job_level=Job.JobLevel.ENTRY,
                country="Nigeria",
                city="Abuja",
                company=unsubscribed_company_obj,
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created job for {unsubscribed_company_obj.company_name} company✅"
                )
            )
