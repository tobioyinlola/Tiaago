MANUALLY = "Manually"
WITH_AI = "With AI"

NON_TECHNICAL_ASSESSMENT_CATEGORIES = ["Role Knowledge", "Practical Scenarios", "Problem Solving"]
# Technical roles get a 4th "Coding" category -- still MCQ (question/options/correct_option_index),
# but the questions embed real code snippets (see generate_categorized_mcq_batch's
# CODING_CATEGORY_NAMES branch in the ai/ service) instead of plain-text scenarios.
TECHNICAL_ASSESSMENT_CATEGORIES = ["Technical Knowledge", "Practical Scenarios", "Problem Solving", "Coding"]