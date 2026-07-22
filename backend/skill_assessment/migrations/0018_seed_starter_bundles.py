"""Seed starter Question Bank content + AssessmentBundles for the new
assessment-creation wizard's "Test Library" -- so recruiters have real,
usable bundles to pick from on day one instead of an empty bank."""

from django.db import migrations


def _mcq(question, options, correct_option_index):
    """options: list of option text, 1-based correct_option_index."""
    return {
        "question": question,
        "options": [{"value": text, "index": i + 1} for i, text in enumerate(options)],
        "correct_option_index": correct_option_index,
    }


BUNDLES = [
    {
        "role_title": "Backend Engineer",
        "name": "Backend Engineer (Junior)",
        "description": "Core REST API design, HTTP semantics, and relational database fundamentals for an entry-level backend role.",
        "difficulty_level": "JUNIOR",
        "estimated_duration_minutes": 40,
        "is_recommended": True,
        "mcqs": [
            _mcq(
                "Which HTTP status code should a REST API return after successfully creating a new resource?",
                ["200 OK", "201 Created", "204 No Content", "301 Moved Permanently"], 2,
            ),
            _mcq(
                "In a relational database, which type of join returns only rows that have matching values in both tables?",
                ["LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "FULL OUTER JOIN"], 3,
            ),
            _mcq(
                "What is the primary purpose of database indexing?",
                ["To enforce foreign key constraints", "To speed up read queries at the cost of extra write overhead", "To automatically back up the database", "To encrypt sensitive columns"], 2,
            ),
            _mcq(
                "Which HTTP method is idempotent -- calling it multiple times with the same input produces the same result as calling it once?",
                ["POST", "PATCH", "PUT", "None of the above"], 3,
            ),
            _mcq(
                "What does 'N+1 query problem' refer to in backend development?",
                ["Running one query per row returned by an earlier query, instead of a single joined/batched query", "A database migration that adds exactly one new column", "An off-by-one error in pagination", "A race condition between two concurrent writes"], 1,
            ),
            _mcq(
                "Which of the following best describes a stateless API?",
                ["The server stores session data in memory between requests", "Each request from a client contains all the information needed to process it, with no reliance on stored server-side session state", "The API never returns errors", "The API can only be called once per client"], 2,
            ),
        ],
        "coding_task": {
            "title": "Order Totals by Customer",
            "description": (
                "Given a list of orders, each with a customer_id and an amount, write a function "
                "that returns a mapping of customer_id to their total spend across all orders. "
                "Handle an empty input list by returning an empty mapping."
            ),
            "constraints": "def total_spend_by_customer(orders: list[dict]) -> dict:  # orders: [{'customer_id': str, 'amount': float}, ...]",
            "sample_input": "[{'customer_id': 'c1', 'amount': 20.5}, {'customer_id': 'c2', 'amount': 5}, {'customer_id': 'c1', 'amount': 9.5}]",
            "sample_output": "{'c1': 30.0, 'c2': 5}",
            "difficulty_level": "JUNIOR",
            "skills_assessed": ["data structures", "aggregation", "problem solving"],
            "test_cases": [
                {"input_data": "[]", "expected_output": "{}", "is_sample": False},
                {"input_data": "[{'customer_id': 'c1', 'amount': 10}]", "expected_output": "{'c1': 10}", "is_sample": True},
            ],
        },
    },
    {
        "role_title": "Frontend Engineer",
        "name": "Frontend Engineer (Junior)",
        "description": "JavaScript fundamentals, the DOM, CSS layout, and React basics for an entry-level frontend role.",
        "difficulty_level": "JUNIOR",
        "estimated_duration_minutes": 40,
        "is_recommended": True,
        "mcqs": [
            _mcq(
                "In JavaScript, what does the '===' operator check that '==' does not?",
                ["Nothing, they behave identically", "Type, in addition to value", "Only object reference equality", "Whether both operands are truthy"], 2,
            ),
            _mcq(
                "Which CSS property is used to create space between a flex container's items along the main axis?",
                ["align-items", "justify-content", "flex-direction", "gap"], 4,
            ),
            _mcq(
                "In React, what triggers a functional component to re-render?",
                ["Only when the page is refreshed", "A change in its props or state (via useState/useReducer)", "Only when its parent unmounts", "Calling console.log inside the component"], 2,
            ),
            _mcq(
                "What is the main purpose of React's useEffect hook?",
                ["To define reusable CSS classes", "To perform side effects (e.g. data fetching, subscriptions) in a function component", "To create new React components", "To style components conditionally"], 2,
            ),
            _mcq(
                "Which of these correctly describes CSS specificity from lowest to highest?",
                ["ID selector < class selector < element selector", "Element selector < class selector < ID selector", "Class selector < ID selector < element selector", "They all have equal specificity"], 2,
            ),
            _mcq(
                "What does 'debouncing' a function accomplish in a UI context (e.g. a search input)?",
                ["It permanently disables the function", "It delays invoking the function until a pause in the triggering events, avoiding excessive calls", "It runs the function on a separate thread", "It caches the function's return value forever"], 2,
            ),
        ],
        "coding_task": {
            "title": "Implement a Debounce Function",
            "description": (
                "Implement a debounce(fn, delayMs) function that returns a new function which only "
                "invokes fn after delayMs milliseconds have passed since the last time the returned "
                "function was called. If called again before delayMs elapses, the previous pending "
                "call should be cancelled and the timer restarted."
            ),
            "constraints": "function debounce(fn, delayMs) { /* return a debounced version of fn */ }",
            "sample_input": "debounce(() => console.log('run'), 300)",
            "sample_output": "Only the final call within any 300ms window actually invokes fn",
            "difficulty_level": "JUNIOR",
            "skills_assessed": ["javascript", "closures", "timing/async"],
            "test_cases": [
                {"input_data": "rapid calls within 300ms", "expected_output": "fn invoked once, after the last call", "is_sample": True},
                {"input_data": "calls spaced 500ms apart", "expected_output": "fn invoked once per call", "is_sample": False},
            ],
        },
    },
    {
        "role_title": "QA Engineer",
        "name": "QA Engineer (Junior)",
        "description": "Testing fundamentals, the test pyramid, and hands-on test-case reasoning for an entry-level QA role.",
        "difficulty_level": "JUNIOR",
        "estimated_duration_minutes": 35,
        "is_recommended": True,
        "mcqs": [
            _mcq(
                "In the testing pyramid, which layer should typically have the most tests?",
                ["Manual exploratory tests", "End-to-end (UI) tests", "Unit tests", "Load tests"], 3,
            ),
            _mcq(
                "What is the key difference between a bug and a defect in most QA terminology?",
                ["There is no difference -- the terms are used interchangeably", "A bug is found before release; a defect is found by a customer after release", "A bug only applies to backend code, a defect only to frontend code", "A defect is always more severe than a bug"], 2,
            ),
            _mcq(
                "What does 'regression testing' verify?",
                ["That new features meet their requirements for the first time", "That previously working functionality still works after a code change", "That the application can handle high load", "That the UI matches the design mockups pixel-for-pixel"], 2,
            ),
            _mcq(
                "Which of the following is an example of a boundary value test for an input field that accepts integers 1-100?",
                ["Testing with the value 50", "Testing with the values 0, 1, 100, and 101", "Testing with a random string", "Testing with a negative float"], 2,
            ),
            _mcq(
                "What is the primary goal of a smoke test?",
                ["To exhaustively test every edge case in a feature", "To quickly verify that the most critical functionality works before deeper testing begins", "To measure the application's performance under load", "To test the visual design across browsers"], 2,
            ),
        ],
        "open_ended": {
            "question": (
                "Walk us through how you would test a 'log in with email and password' feature before "
                "it ships. What test cases would you prioritize, and what would you consider out of scope "
                "for a first pass?"
            ),
            "grading_guidance": (
                "Look for: coverage of the happy path plus meaningful negative cases (wrong password, "
                "unregistered email, empty fields, SQL-injection-style input, case sensitivity, "
                "account lockout/rate limiting, session persistence). Strong answers prioritize by risk "
                "and clearly separate must-test-now from nice-to-have. Penalize answers that only "
                "mention the happy path or list tests with no reasoning."
            ),
            "max_score": 100,
        },
    },
    {
        "role_title": "Product Manager",
        "name": "Product Manager (Core)",
        "description": "Prioritization frameworks, metrics literacy, and product judgment for a generalist PM role.",
        "difficulty_level": "INTERMEDIATE",
        "estimated_duration_minutes": 35,
        "is_recommended": True,
        "mcqs": [
            _mcq(
                "The RICE prioritization framework scores initiatives based on which four factors?",
                ["Reach, Impact, Confidence, Effort", "Revenue, Investment, Cost, Effort", "Risk, Importance, Complexity, Estimate", "Reach, Innovation, Cost, Execution"], 1,
            ),
            _mcq(
                "A product's 'North Star metric' is best described as:",
                ["Whichever metric investors ask about most often", "The single metric that best captures the core value a product delivers to customers, correlated with long-term business success", "The metric with the highest absolute number on a dashboard", "A metric only used during the beta phase"], 2,
            ),
            _mcq(
                "What distinguishes a leading indicator from a lagging indicator?",
                ["A leading indicator predicts future outcomes; a lagging indicator reports on outcomes that already happened", "There is no meaningful distinction", "Leading indicators are always revenue-based", "Lagging indicators are set before a feature launches"], 1,
            ),
            _mcq(
                "In an A/B test, why is statistical significance important before rolling out a 'winning' variant?",
                ["It isn't important -- any observed difference is real", "It reduces the risk of concluding a variant is better when the difference is actually due to random chance", "It guarantees the variant will keep performing well forever", "It only matters for tests run longer than a month"], 2,
            ),
            _mcq(
                "What is the main risk of shipping a feature based purely on the loudest customer feedback, without other validation?",
                ["There is no risk -- customer feedback is always representative", "It can optimize for a vocal minority rather than the broader user base's actual needs", "It always leads to feature bloat but never to wasted engineering time", "It only affects B2C products, not B2B"], 2,
            ),
        ],
        "open_ended": {
            "question": (
                "Describe a product decision you made (or would make) where the data and user feedback "
                "pointed in different directions. How did you resolve the tension, and what was the outcome?"
            ),
            "grading_guidance": (
                "Look for: a concrete, specific example (not hypothetical hand-waving), clear reasoning "
                "about how they weighed conflicting signals, awareness of trade-offs, and a stated outcome "
                "or learning. Penalize vague answers with no real decision-making shown."
            ),
            "max_score": 100,
        },
    },
    {
        "role_title": "Technical Product Manager",
        "name": "Technical Product Manager",
        "description": "A blend of technical fluency and product judgment for PMs who work closely with engineering.",
        "difficulty_level": "INTERMEDIATE",
        "estimated_duration_minutes": 35,
        "is_recommended": False,
        "mcqs": [
            _mcq(
                "When engineering says a feature requires 'breaking API changes,' what does that generally mean for a TPM to plan around?",
                ["Nothing -- API changes never affect existing clients", "Existing consumers of the API may need to be migrated or versioned, requiring coordination beyond just the new feature", "It only affects the database schema, not the API", "It means the feature must be cancelled"], 2,
            ),
            _mcq(
                "What is technical debt, in the context a TPM needs to weigh against new feature work?",
                ["A literal financial loan taken out by the engineering team", "The implied cost of future rework caused by choosing an easier, faster solution now instead of a better approach", "A bug tracking label with no real prioritization weight", "Debt that only accrues in legacy codebases, never in new ones"], 2,
            ),
            _mcq(
                "Why might a TPM push back on a proposed API design that returns deeply nested, inconsistent JSON structures across endpoints?",
                ["Nested JSON is always invalid", "Inconsistent response shapes increase integration cost and bugs for every client consuming the API, now and in the future", "JSON doesn't support nesting", "It has no real impact on integration cost"], 2,
            ),
            _mcq(
                "A TPM is told a project is '80% done.' What is the most important follow-up question?",
                ["What does 'done' mean here, and what specifically is left in the remaining 20%?", "Can we ship today regardless?", "Who said that?", "None -- 80% done means 80% of the timeline remains"], 1,
            ),
            _mcq(
                "What's the main purpose of a system design review before a large feature is built?",
                ["To assign blame if something goes wrong later", "To surface architectural risks, edge cases, and cross-team dependencies before significant engineering effort is spent", "To finalize the UI copy", "It's purely a formality with no real value"], 2,
            ),
        ],
        "open_ended": {
            "question": (
                "Engineering estimates a requested feature will take 6 weeks; the business wants it in 2. "
                "How would you approach this conversation and arrive at a plan?"
            ),
            "grading_guidance": (
                "Look for: scoping down to an MVP, understanding the real driver of the deadline, involving "
                "engineering in trade-off discussions rather than dictating, and a realistic path forward "
                "(phased rollout, cut scope, etc.) rather than simply 'push the team harder.'"
            ),
            "max_score": 100,
        },
    },
    {
        "role_title": "DevOps Engineer",
        "name": "DevOps Engineer (Core)",
        "description": "CI/CD, containers, and cloud infrastructure fundamentals for a DevOps/platform role.",
        "difficulty_level": "INTERMEDIATE",
        "estimated_duration_minutes": 40,
        "is_recommended": True,
        "mcqs": [
            _mcq(
                "What is the main benefit of running an application inside a Docker container versus directly on a host machine?",
                ["Containers are always faster than native execution", "Consistent, isolated runtime environment across dev/staging/production, independent of the host's installed packages", "Containers eliminate the need for any monitoring", "Containers automatically scale horizontally with zero configuration"], 2,
            ),
            _mcq(
                "In a CI/CD pipeline, what is the purpose of a staging environment?",
                ["It's just a second production environment for load balancing", "To validate a release in a production-like environment before it reaches real users", "To permanently store build artifacts", "It replaces the need for automated tests"], 2,
            ),
            _mcq(
                "What does 'infrastructure as code' (e.g. Terraform) primarily provide?",
                ["A way to write application business logic", "Declarative, version-controlled, repeatable provisioning of infrastructure", "A replacement for containers", "Automatic code review for application code"], 2,
            ),
            _mcq(
                "Why is a blue-green (or canary) deployment strategy used?",
                ["To reduce cloud costs by turning off unused servers", "To reduce the risk and blast radius of a bad release by shifting traffic gradually or allowing instant rollback", "It's required by most cloud providers", "To speed up the build step of a pipeline"], 2,
            ),
            _mcq(
                "What is the difference between horizontal and vertical scaling?",
                ["There is no difference", "Horizontal scaling adds more machines/instances; vertical scaling increases the resources (CPU/RAM) of an existing machine", "Horizontal scaling only applies to databases", "Vertical scaling always requires containers"], 2,
            ),
            _mcq(
                "What is a common purpose of a health check endpoint (e.g. /healthz) in a deployed service?",
                ["To expose the full database schema", "To let load balancers/orchestrators determine whether an instance is ready to receive traffic", "To serve as the main API entrypoint", "It has no practical use in production"], 2,
            ),
        ],
        "coding_task": {
            "title": "Log Line Error-Rate Script",
            "description": (
                "Write a function that takes a list of log lines (strings), each optionally containing "
                "the substring 'ERROR', and returns the percentage of lines that are errors, rounded to "
                "2 decimal places. Return 0.0 for an empty list."
            ),
            "constraints": "def error_rate(log_lines: list[str]) -> float: ...",
            "sample_input": "['INFO start', 'ERROR db timeout', 'INFO ok', 'ERROR disk full']",
            "sample_output": "50.0",
            "difficulty_level": "INTERMEDIATE",
            "skills_assessed": ["scripting", "string processing", "operational tooling"],
            "test_cases": [
                {"input_data": "[]", "expected_output": "0.0", "is_sample": False},
                {"input_data": "['INFO ok', 'INFO ok']", "expected_output": "0.0", "is_sample": True},
            ],
        },
    },
    {
        "role_title": "Data Analyst",
        "name": "Data Analyst (Core)",
        "description": "SQL fluency and statistical reasoning for a data analyst role.",
        "difficulty_level": "INTERMEDIATE",
        "estimated_duration_minutes": 40,
        "is_recommended": True,
        "mcqs": [
            _mcq(
                "Which SQL clause is used to filter grouped results after a GROUP BY, based on an aggregate condition?",
                ["WHERE", "HAVING", "FILTER", "GROUP FILTER"], 2,
            ),
            _mcq(
                "What does a LEFT JOIN return that an INNER JOIN does not?",
                ["Fewer rows than an INNER JOIN in every case", "All rows from the left table, with NULLs for unmatched columns from the right table", "Only rows present in both tables", "It behaves identically to INNER JOIN"], 2,
            ),
            _mcq(
                "A metric increased after a change, but the sample size was very small. What should an analyst be most cautious about?",
                ["Nothing -- any increase confirms the change worked", "The result may not be statistically significant and could be due to random variation", "Small samples always overstate results in the negative direction", "Sample size never affects reliability"], 2,
            ),
            _mcq(
                "What is the difference between correlation and causation?",
                ["They are the same thing", "Two variables moving together (correlation) doesn't necessarily mean one causes the other (causation)", "Causation is weaker evidence than correlation", "Causation can only be shown with SQL, not statistics"], 2,
            ),
            _mcq(
                "Which SQL window function would you use to rank rows within a partition without skipping numbers for ties?",
                ["RANK()", "DENSE_RANK()", "ROW_NUMBER() only", "COUNT()"], 2,
            ),
        ],
        "open_ended": {
            "question": (
                "A key metric (e.g. weekly active users) dropped 15% last week. Walk through how you'd "
                "investigate the cause before reporting a conclusion to stakeholders."
            ),
            "grading_guidance": (
                "Look for: checking data pipeline/tracking issues first (before assuming a real behavioral "
                "change), segmenting the drop (by platform, geography, cohort, etc.), checking for "
                "seasonality or external events, and being appropriately cautious before asserting a root "
                "cause. Penalize answers that jump straight to a conclusion without an investigation process."
            ),
            "max_score": 100,
        },
    },
]

NEW_ROLES = [
    {"title": "DevOps Engineer", "slug": "devops-engineer", "is_technical": True},
    {"title": "Data Analyst", "slug": "data-analyst", "is_technical": True},
]


def seed_starter_bundles(apps, schema_editor):
    Role = apps.get_model("roles", "Role")
    GeneralSkillAssessmentMCQQuestion = apps.get_model("skill_assessment", "GeneralSkillAssessmentMCQQuestion")
    CodingTask = apps.get_model("skill_assessment", "CodingTask")
    TestCase = apps.get_model("skill_assessment", "TestCase")
    OpenEndedQuestion = apps.get_model("skill_assessment", "OpenEndedQuestion")
    TalentQuestionBank = apps.get_model("skill_assessment", "TalentQuestionBank")
    AssessmentBundle = apps.get_model("skill_assessment", "AssessmentBundle")

    for role_data in NEW_ROLES:
        # Historical models (apps.get_model) skip Role's custom save() that
        # auto-slugifies -- set slug explicitly here, or every blank-slug
        # row collides on the unique constraint.
        Role.objects.get_or_create(
            title=role_data["title"],
            defaults={"is_technical": role_data["is_technical"], "slug": role_data["slug"]},
        )

    # All of GeneralSkillAssessmentMCQQuestion/CodingTask/TestCase/
    # OpenEndedQuestion/TalentQuestionBank/AssessmentBundle extend
    # TimeStampedModel, which declares `all_objects` (plain Manager) BEFORE
    # `objects` (a soft-delete-filtering custom manager) -- Django's
    # migration state only serializes a historical model's *first*-declared
    # manager, under its original name, so historical models here expose
    # `all_objects`, not `objects`. (Role has no custom manager, so it's
    # unaffected and keeps using `.objects` below.)
    for spec in BUNDLES:
        role = Role.objects.filter(title=spec["role_title"]).first()
        if not role:
            continue
        if AssessmentBundle.all_objects.filter(name=spec["name"]).exists():
            continue

        bank_entries = []
        for mcq_data in spec["mcqs"]:
            mcq = GeneralSkillAssessmentMCQQuestion.all_objects.create(
                question=mcq_data["question"],
                options=mcq_data["options"],
                correct_option_index=mcq_data["correct_option_index"],
                is_ai_generated=False,
            )
            bank_entries.append(TalentQuestionBank.all_objects.create(
                mcq_question=mcq, role=role, difficulty_level=spec["difficulty_level"],
            ))

        coding_data = spec.get("coding_task")
        if coding_data:
            test_cases = coding_data.pop("test_cases", [])
            task = CodingTask.all_objects.create(**coding_data)
            for tc in test_cases:
                TestCase.all_objects.create(coding_task=task, **tc)
            bank_entries.append(TalentQuestionBank.all_objects.create(
                coding_task=task, role=role, difficulty_level=spec["difficulty_level"],
            ))

        open_ended_data = spec.get("open_ended")
        if open_ended_data:
            oeq = OpenEndedQuestion.all_objects.create(is_ai_generated=False, skills_assessed=[], **open_ended_data)
            bank_entries.append(TalentQuestionBank.all_objects.create(
                open_ended_question=oeq, role=role, difficulty_level=spec["difficulty_level"],
            ))

        bundle = AssessmentBundle.all_objects.create(
            name=spec["name"], description=spec["description"], role=role,
            difficulty_level=spec["difficulty_level"],
            estimated_duration_minutes=spec["estimated_duration_minutes"],
            is_recommended=spec["is_recommended"], active=True,
        )
        bundle.bank_questions.set(bank_entries)


def unseed_starter_bundles(apps, schema_editor):
    AssessmentBundle = apps.get_model("skill_assessment", "AssessmentBundle")
    TalentQuestionBank = apps.get_model("skill_assessment", "TalentQuestionBank")

    names = [spec["name"] for spec in BUNDLES]
    bundles = AssessmentBundle.all_objects.filter(name__in=names)
    bank_entries = TalentQuestionBank.all_objects.filter(bundles__in=bundles).distinct()

    mcqs = [b.mcq_question for b in bank_entries if b.mcq_question_id]
    coding_tasks = [b.coding_task for b in bank_entries if b.coding_task_id]
    open_ended_questions = [b.open_ended_question for b in bank_entries if b.open_ended_question_id]

    bundles.delete()
    for entry in bank_entries:
        entry.delete()
    for mcq in mcqs:
        mcq.delete()
    for task in coding_tasks:
        task.delete()
    for oeq in open_ended_questions:
        oeq.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("skill_assessment", "0017_openendedquestion_and_more"),
        ("roles", "0003_rename_is_startup_role_is_recruiter_role"),
    ]

    operations = [
        migrations.RunPython(seed_starter_bundles, unseed_starter_bundles),
    ]
