from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.config import settings
from app.models.resume import ResumeAnalysis
import json
from dotenv import load_dotenv
import os
import logging
from typing import Dict, Any
import re
from app.services.text_processor import preprocess_text

# Set up logging
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

# Disable noisy third-party library logs
logging.getLogger("openai").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

load_dotenv()

openai_api_key = os.getenv("OPENAI_API_KEY")

RESUME_OPENING_LOGIT_BIAS = {
    5023: -100,  # "spearheaded"
    6348: -100,  # "utilized"
    3703: -100,  # "leveraged"
    2924: -100,  # "passionate"
}

def _extract_token_usage(response) -> Dict[str, int]:
    """Best-effort extraction of token usage metadata from LangChain/OpenAI responses."""
    token_usage: Dict[str, int] = {}
    if response is None:
        return token_usage

    response_metadata = getattr(response, "response_metadata", None)
    if isinstance(response_metadata, dict):
        usage = response_metadata.get("token_usage")
        if isinstance(usage, dict):
            for key, value in usage.items():
                if isinstance(value, (int, float)):
                    token_usage[key] = int(value)
        else:
            for key in ("prompt_tokens", "completion_tokens", "total_tokens"):
                value = response_metadata.get(key)
                if isinstance(value, (int, float)):
                    token_usage[key] = int(value)

    if not token_usage:
        usage_metadata = getattr(response, "usage_metadata", None)
        if isinstance(usage_metadata, dict):
            mapping = {
                "input_tokens": "prompt_tokens",
                "output_tokens": "completion_tokens",
                "total_tokens": "total_tokens",
                "prompt_tokens": "prompt_tokens",
                "completion_tokens": "completion_tokens",
            }
            for key, target in mapping.items():
                value = usage_metadata.get(key)
                if isinstance(value, (int, float)):
                    token_usage[target] = token_usage.get(target, 0) + int(value)

    additional_kwargs = getattr(response, "additional_kwargs", None)
    if isinstance(additional_kwargs, dict):
        raw_usage = additional_kwargs.get("usage")
        if isinstance(raw_usage, dict):
            for key in ("prompt_tokens", "completion_tokens", "total_tokens"):
                value = raw_usage.get(key)
                if isinstance(value, (int, float)):
                    token_usage[key] = int(value)

    return token_usage

def extract_and_parse_json(text: str) -> dict:
    """
    Extract and parse JSON from AI response text that might contain extra content or be truncated.
    
    Args:
        text: Raw text response that should contain JSON
        
    Returns:
        Parsed JSON as dictionary
        
    Raises:
        ValueError: If no valid JSON is found
    """
    # Clean up the text
    text = text.strip()
    
    # First, try to parse the text directly as JSON
    try:
        result = json.loads(text)
        logger.debug("extract_and_parse_json: Direct JSON parsing succeeded")
        return result
    except json.JSONDecodeError as e:
        logger.debug(f"extract_and_parse_json: Direct JSON parsing failed: {e}")
        pass
    
    # Remove common prefixes that might interfere
    prefixes_to_remove = [
        "```json\n", "```\n", "```", "Here's the JSON:", "Here is the JSON:",
        "Response:", "Assessment:", "JSON:", "\n", " "
    ]
    
    for prefix in prefixes_to_remove:
        if text.startswith(prefix):
            text = text[len(prefix):].strip()
    
    # Remove common suffixes
    suffixes_to_remove = ["\n```", "```", "\n"]
    for suffix in suffixes_to_remove:
        if text.endswith(suffix):
            text = text[:-len(suffix)].strip()
    
    # Try parsing again after cleanup
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    
    # If still failing, try to find JSON content with proper nesting
    brace_count = 0
    start_idx = -1
    
    for i, char in enumerate(text):
        if char == '{':
            if brace_count == 0:
                start_idx = i
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0 and start_idx != -1:
                # Found a complete JSON object
                json_candidate = text[start_idx:i+1]
                try:
                    return json.loads(json_candidate)
                except json.JSONDecodeError:
                    continue
    
    # Handle truncated JSON - try to repair common issues
    if text.count('{') > text.count('}'):
        # JSON appears to be truncated, try to close it
        missing_braces = text.count('{') - text.count('}')
        
        # Check if we're in the middle of an array
        if text.count('[') > text.count(']'):
            missing_brackets = text.count('[') - text.count(']')
            # Close arrays first, then objects
            text += ']' * missing_brackets + '}' * missing_braces
        else:
            text += '}' * missing_braces
            
        # If the last character before our additions was a comma, remove it
        if text.rstrip(']}').endswith(','):
            # Find the last comma before our additions
            clean_text = text.rstrip(']}')
            if clean_text.endswith(','):
                clean_text = clean_text[:-1]
                text = clean_text + text[len(clean_text.rstrip(',')):]
        
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
    
    # Last resort: try to extract content between the first { and last }
    first_brace = text.find('{')
    last_brace = text.rfind('}')
    
    if first_brace != -1 and last_brace != -1 and first_brace < last_brace:
        json_candidate = text[first_brace:last_brace+1]
        try:
            return json.loads(json_candidate)
        except json.JSONDecodeError:
            pass
    
    # Special handling for responses truncated in specific fields
    if '"areas' in text and not text.count('[') == text.count(']'):
        # Likely truncated during areas_for_improvement array
        logger.warning("Detected truncation in areas_for_improvement field, attempting repair")
        
        # Find the last complete field and truncate there
        # Then add default values for missing fields
        try:
            # Try to build a minimal valid JSON with what we have
            partial_obj = {}
            
            # Extract what we can from the partial response
            if '"role_match_status"' in text:
                match = re.search(r'"role_match_status":\s*"([^"]*)"', text)
                if match:
                    partial_obj["role_match_status"] = match.group(1)
            
            if '"resume_review_score"' in text:
                match = re.search(r'"resume_review_score":\s*(\d+)', text)
                if match:
                    partial_obj["resume_review_score"] = int(match.group(1))
            
            if '"skill_matching_score"' in text:
                match = re.search(r'"skill_matching_score":\s*(\d+)', text)
                if match:
                    partial_obj["skill_matching_score"] = int(match.group(1))
            
            if '"experience_relevance_score"' in text:
                match = re.search(r'"experience_relevance_score":\s*(\d+)', text)
                if match:
                    partial_obj["experience_relevance_score"] = int(match.group(1))
            
            if '"education_certifications_score"' in text:
                match = re.search(r'"education_certifications_score":\s*(\d+)', text)
                if match:
                    partial_obj["education_certifications_score"] = int(match.group(1))
            
            if '"total_score"' in text:
                match = re.search(r'"total_score":\s*(\d+)', text)
                if match:
                    partial_obj["total_score"] = int(match.group(1))
            
            # Extract strengths array if present
            if '"strengths"' in text:
                strengths_match = re.search(r'"strengths":\s*\[(.*?)\]', text, re.DOTALL)
                if strengths_match:
                    strengths_str = strengths_match.group(1)
                    # Parse individual strengths
                    strengths = re.findall(r'"([^"]*)"', strengths_str)
                    partial_obj["strengths"] = strengths
            
            # If we have enough data, construct a response
            if len(partial_obj) >= 3:  # At least some core fields
                # Fill in missing required fields with defaults
                complete_obj = {
                    "role_match_status": partial_obj.get("role_match_status", "pass"),
                    "resume_review_score": partial_obj.get("resume_review_score", 25),
                    "skill_matching_score": partial_obj.get("skill_matching_score", 20),
                    "experience_relevance_score": partial_obj.get("experience_relevance_score", 15),
                    "education_certifications_score": partial_obj.get("education_certifications_score", 8),
                    "total_score": partial_obj.get("total_score", 68),
                    "strengths": partial_obj.get("strengths", ["Relevant experience", "Good background"]),
                    "areas_for_improvement": ["Continue skill development", "Expand relevant experience"],
                    "recommendation": "Recommend",
                    "detailed_analysis": "<ul><li>Analysis was partially completed from truncated response</li><li>Candidate shows promise based on available data</li></ul>"
                }
                return complete_obj
                
        except Exception as e:
            logger.warning(f"Failed to parse truncated response: {e}")
    
    raise ValueError(f"Could not extract valid JSON from response: {text[:200]}...")

def create_default_analysis(error_message: str = None) -> Dict[str, Any]:
    """Create a default analysis dictionary with optional error details."""
    detailed_analysis = "<ul><li>The system encountered an error while analyzing the resume</li>"
    if error_message:
        detailed_analysis += f"<li>Error details: {error_message}</li>"
    detailed_analysis += "<li>Unable to complete comprehensive analysis</li><li>Please check server configuration and retry</li></ul>"
    
    return {
        "role_match_status": "fail",
        "text_authenticity": "Unknown",
        "text_authenticity_explanation": "Analysis could not be completed",
        "experience_validation": "Unknown",
        "experience_validation_explanation": "Analysis could not be completed",
        "achievement_quality": "Unknown", 
        "achievement_quality_explanation": "Analysis could not be completed",
        "resume_review_score": 0,
        "skill_matching_score": 0,
        "experience_relevance_score": 0,
        "education_certifications_score": 0,
        "total_score": 0,
        "strengths": [],
        "areas_for_improvement": [],
        "recommendation": "Analysis could not be completed",
        "detailed_analysis": detailed_analysis,
        "token_usage": None,
    }

# Removed manual skill extraction - using AI-only approach

def analyze_resume(resume_text: str, job_description: str) -> ResumeAnalysis:
    try:
        logger.debug(f"Starting resume analysis")
        logger.debug(f"Resume length: {len(resume_text)}")
        logger.debug(f"Job description length: {len(job_description)}")
        
        # Check if OpenAI API key is configured
        if not openai_api_key:
            error_msg = "OpenAI API key not configured"
            logger.error(error_msg)
            return ResumeAnalysis(**create_default_analysis(error_msg))

        # Preprocess texts for AI analysis
        resume_text_clean = preprocess_text(resume_text)
        job_description_clean = preprocess_text(job_description)
        
        logger.debug("Using AI-only approach for resume analysis - no manual skill extraction")
        logger.debug(f"Using OpenAI model: {settings.OPENAI_MODEL_NAME}")

        # Prepare prompts first so we can dynamically budget tokens
        system_prompt = """You are an experienced recruiter with 2 decades of experience recruiting for top companies like Google, Microsoft, top YC companies, and other leading technology organizations. You conduct thorough role-specific evaluation with advanced authenticity detection. Follow these guidelines:
... (truncated for clarity in code) ...
"""

        human_prompt = """Analyze this resume for the position described below. Conduct all three critical assessment layers plus STRICT role matching and WORK EXPERIENCE VALIDATION.

Job Description:
{job_description}

Resume text:
{resume}

CRITICAL ANALYSIS REQUIRED:
... (truncated for clarity in code) ...

Respond with ONLY the JSON object. No other text."""

        # Dynamically control token usage: estimate tokens and cap completion tokens
        def approx_tokens(s: str) -> int:
            # Rough heuristic: 1 token ≈ 4 chars
            return max(1, len(s) // 4)

        # Build a draft message to estimate size
        draft_human = human_prompt.format(resume=resume_text_clean, job_description=job_description_clean)
        prompt_token_estimate = approx_tokens(system_prompt) + approx_tokens(draft_human)
        model_name = settings.OPENAI_MODEL_NAME
        context_limit = 8192 if "gpt-4" in model_name.lower() else 8192
        # Leave headroom to be safe
        headroom = 256
        max_completion_tokens = min(1500, max(512, context_limit - prompt_token_estimate - headroom))

        # If still negative, truncate inputs proportionally and recompute
        if max_completion_tokens < 512:
            # Truncate resume and job description to fit
            # Allocate 70% budget to resume, 30% to JD
            target_prompt_tokens = context_limit - headroom - 512
            if target_prompt_tokens < 1000:
                target_prompt_tokens = 1000
            resume_share = int(target_prompt_tokens * 0.7)
            jd_share = target_prompt_tokens - resume_share
            # Convert tokens back to rough chars
            resume_chars = max(500, resume_share * 4)
            jd_chars = max(300, jd_share * 4)
            resume_text_clean = resume_text_clean[:resume_chars]
            job_description_clean = job_description_clean[:jd_chars]
            # Recalculate
            draft_human = human_prompt.format(resume=resume_text_clean, job_description=job_description_clean)
            prompt_token_estimate = approx_tokens(system_prompt) + approx_tokens(draft_human)
            max_completion_tokens = min(1500, max(512, context_limit - prompt_token_estimate - headroom))

        # Initialize the chat model with computed max tokens
        try:
            logger.info(f"Initializing OpenAI model: {model_name}")
            logger.info(f"Using max_tokens={max_completion_tokens} for model {model_name}")
            chat = ChatOpenAI(
                temperature=0,
                model_name=model_name,
                openai_api_key=openai_api_key,
                max_tokens=max_completion_tokens,
                timeout=120,
                max_retries=2,
                request_timeout=120,
                streaming=False,
                logit_bias=RESUME_OPENING_LOGIT_BIAS,
            )
            logger.debug("ChatOpenAI model initialized successfully")
        except Exception as e:
            error_msg = f"Failed to initialize ChatOpenAI model: {e}"
            logger.error(error_msg)
            return ResumeAnalysis(**create_default_analysis(error_msg))

        # Enhanced system prompt with authenticity checks and flexible role matching criteria
        system_prompt = """You are an experienced recruiter with 2 decades of experience recruiting for top companies like Google, Microsoft, top YC companies, and other leading technology organizations. You conduct thorough role-specific evaluation with advanced authenticity detection. Follow these guidelines:

CRITICAL WORK EXPERIENCE VALIDATION (MUST BE PERFORMED FIRST):
   - PRIORITIZE REAL, VERIFIABLE WORK EXPERIENCE over project-based work
   - Real work experience must include ALL of the following:
     * A company or organization name
     * A clearly stated job title/role
     * Employment dates or duration
     * Clear employment relationship (full-time, part-time, contract)
   - Projects (personal, freelance, or academic) without dates, organizational context, or clear employment relationships should NOT be treated as professional work experience
   - WORK EXPERIENCE VALIDATION RULES:
     * If candidate lists mostly projects (personal, freelance, or academic) with no solid work experience (no defined job titles, company names, or clear employment durations), they should be graded below 60%, even if role match status passes or qualifications align with job description
     * Projects without dates or organizational context or insight into achievements in a specific role are NOT professional experience
     * Even when overall role match or skill alignment appears high, validate that candidate's listed work experience clearly supports the claimed proficiency level
     * If strong skills are present but there's no verifiable professional experience or timeline to back them up, CAP THE TOTAL SCORE AT 60% OR BELOW
   - IMPROVEMENT RECOMMENDATIONS for project-only candidates:
     * Always include in areas_for_improvement: "Need to gain more hands-on, structured work experience to strengthen future applications"
     * Highlight that real-world professional experience is critical for this role
     * Suggest seeking internships, entry-level positions, or structured employment to build verifiable work history

0. Role Match Assessment (CRITICAL - Pass/Fail - SMART MATCHING):
   - PRIMARY GOAL: Evaluate if the candidate has relevant skills and experience for the target role.
   - Look for evidence of experience in the target role OR closely related roles with transferable skills.
   - CONSIDER ROLE EVOLUTION: Fullstack developers can qualify for frontend-only or backend-only roles.
   - CONSIDER TECHNOLOGY STACKS: Django developers can apply for backend roles, Node.js developers for backend roles, etc.
   
   SMART ROLE MATCHING RULES:
   - For Product Manager roles: Candidate should have Product Manager, Product Owner, Product Lead, OR relevant business/strategy experience
   - For Software Engineer roles: Candidate should have Software Engineer, Developer, Programmer, Fullstack Developer, Frontend Developer, Backend Developer experience
   - For Frontend Developer roles: Candidate should have Frontend Developer, Fullstack Developer, Software Engineer, OR relevant frontend experience
   - For Backend Developer roles: Candidate should have Backend Developer, Fullstack Developer, Software Engineer, OR relevant backend experience
   - For Data Scientist roles: Candidate should have Data Scientist, Data Analyst, ML Engineer, OR relevant data/analytics experience
   - For Design roles: Candidate should have Designer, UX/UI Designer, Product Designer, OR relevant design experience
   
   QUALIFICATION CRITERIA (PASS):
   - Fullstack developers applying for frontend roles = PASS (they have frontend skills)
   - Fullstack developers applying for backend roles = PASS (they have backend skills)
   - Backend developers applying for backend roles = PASS (regardless of specific technology)
   - Frontend developers applying for frontend roles = PASS (regardless of specific framework)
   - Software engineers applying for developer roles = PASS (same domain)
   
   REJECTION CRITERIA (AUTOMATIC FAIL):
   - Completely unrelated roles (e.g., Marketing applying for Software Engineer)
   - No relevant technical experience for technical roles
   - No relevant business experience for business roles
   - Major domain mismatch (e.g., Finance applying for Design roles)
   
   - CONSIDER transferable skills and related experience as valid qualifications
   - ALLOW candidates to pass based on relevant skills even if job titles don't match exactly
   - PROCEED with detailed scoring if there's reasonable role alignment
   - FOCUS on skills and experience rather than exact job title matches

TEXT AUTHENTICITY LAYER (Critical Assessment):
   - Flag overly polished or repetitive language that suggests AI generation
   - Detect high buzzword density without substance
   - Identify heavy overlap with job description that suggests AI tailoring
   - Look for unnatural phrasing or templated language patterns
   - Score: Authentic/Suspicious/Likely AI-Generated with brief explanation

EXPERIENCE-SKILL VALIDATION LAYER (Critical Assessment):
   - Check that career timelines are plausible and consistent
   - Verify claimed skills align with actual role history and progression
   - Weight concrete achievements much higher than vague duties
   - Look for skill claims that don't match the roles held
   - Score: Validated/Questionable/Inconsistent with brief explanation

ACHIEVEMENT QUALITY LAYER (Critical Assessment):
   - Rank measurable, specific, and varied outcomes above generic claims
   - Flag cookie-cutter achievements that appear across multiple resumes
   - Prioritize quantified results over vague responsibilities
   - Assess uniqueness and relevance of accomplishments
   - Score: High-Quality/Average/Generic with brief explanation

1. Resume Review (35% of total score):
   - Carefully examine the candidate's resume incorporating authenticity findings.
   - Compare the skills, experience, and qualifications listed in the resume against the job description.
   - Assign a score out of 35 based on how well the resume matches the job requirements.
   - Consider factors such as relevant work experience, education, technical skills, and certifications.
   - Heavily weight experience and projects specific to the role being applied for.
   - Reduce scores significantly for suspected AI-generated content or inconsistencies.

2. Skill Matching (30% of total score):
   - Identify key skills mentioned in the job description.
   - Check for the presence and depth of these skills in the candidate's resume.
   - TECHNOLOGY-SPECIFIC MATCHING: Factor in specific technologies and frameworks:
     * Django backend vs Node.js backend vs Python backend vs JavaScript backend
     * React frontend vs Angular frontend vs Vue.js frontend vs vanilla JavaScript
     * Different databases: PostgreSQL vs MongoDB vs MySQL vs Redis
     * Cloud platforms: AWS vs Azure vs GCP vs Heroku
     * DevOps tools: Docker vs Kubernetes vs Jenkins vs Terraform
   - Assign a score out of 30 based on the match between required and possessed skills.
   - Consider both role-specific technical skills and soft skills.
   - Skills must be demonstrated through actual work experience or projects, not just listed.
   - Give partial credit for related technologies (e.g., Django experience for Python backend roles).
   - If required experience or skills are missing, cap the score below 60.

3. Experience Relevance (25% of total score):
   - CRITICAL: Evaluate REAL WORK EXPERIENCE FIRST (with company names, job titles, and employment dates)
   - PRIORITIZE verified employment over projects, personal work, or academic projects
   - CALCULATE YEARS OF EXPERIENCE: Extract dates from VERIFIED WORK HISTORY only and calculate total relevant experience
   - EXPERIENCE-BASED SCORING (do not score zero for insufficient experience):
     * 0-1 years relevant REAL WORK experience: Score 5-12 (very limited but not zero)
     * 1-2 years relevant REAL WORK experience: Score 10-18 (junior level)
     * 2-4 years relevant REAL WORK experience: Score 15-22 (mid-level)
     * 4+ years relevant REAL WORK experience: Score 18-25 (senior level)
   - Projects without employment context should NOT contribute to years of experience calculation
   - Consider how past roles demonstrate problem-solving, leadership, collaboration, and adaptability.
   - Look for evidence of continuous learning and skill development in the target domain.
   - Factor in technology stack alignment (Django vs Node.js vs React vs Angular, etc.).
   - Internships with company names and dates can be considered, but should be weighted lower than full-time employment
   - Freelance work with client names and dates can be considered, but should be weighted lower than structured employment
   - Personal or academic projects without employment context should receive minimal or zero weight in experience scoring
   - Score more strictly for insufficient REAL WORK experience rather than giving zero scores.

4. Education and Certifications (10% of total score):
   - Review the candidate's educational background and any listed certifications.
   - Compare these against any specific educational or certification requirements in the job description.
   - Assign a score out of 10 based on how well the candidate's education and certifications match the job requirements.
   - Consider role-specific certifications and training.

5. Overall Assessment:
   - MANDATORY WORK EXPERIENCE VALIDATION CHECK: Before finalizing scores, verify if candidate has real work experience (company name + job title + dates) or mostly projects
   - MANDATORY SCORING CAP: If candidate lists mostly projects (personal, freelance, or academic) with no solid work experience (no defined job titles, company names, or clear employment durations), CAP THE TOTAL SCORE AT 60% OR BELOW, even if role match status passes or skills align with job description
   - MANDATORY: If the Role Match Assessment is failed (completely unrelated roles), set ALL scores to 0 and recommend "Do Not Recommend" IMMEDIATELY.
   - If there's reasonable role alignment, proceed with detailed scoring even if not perfect match.
   - EXPERIENCE-BASED SCORING: Score candidates based on their actual REAL WORK experience level rather than giving zeros.
   - VALIDATE EXPERIENCE SUPPORTS SKILLS: Even when overall role match or skill alignment appears high, validate that candidate's listed work experience clearly supports the claimed proficiency level. If strong skills are present but no verifiable professional experience or timeline to back them up, cap total score at 60% or below.
   - TECHNOLOGY CONSIDERATION: Factor in specific technology stacks and give partial credit for related technologies.
   - If authenticity concerns are raised, significantly reduce scores.
   - Resumes with good role alignment and relevant REAL WORK experience should score 60+.
   - Sum up the scores from categories 1-4 to get a total score out of 100.
   - APPLY WORK EXPERIENCE CAP: After calculating total score, if work experience validation fails (mostly projects, no real employment), cap total score at maximum of 60%.
   - Provide a brief summary of the candidate's strengths and potential areas for improvement.
   - IMPROVEMENT RECOMMENDATIONS: For candidates with mostly projects and no real work experience, always include: "Need to gain more hands-on, structured work experience to strengthen future applications" in areas_for_improvement
   - Offer a recommendation using these FLEXIBLE criteria:
     * "Strongly Recommend" (85-100): Excellent role match with strong qualifications and relevant REAL WORK experience
     * "Recommend" (70-84): Good role match with solid qualifications and adequate REAL WORK experience
     * "Consider" (60-69): Reasonable role match with some relevant experience but needs development OR mostly projects without real work experience
     * "Do Not Recommend" (<60 or failed role match): Poor role alignment, insufficient qualifications, or authenticity concerns

FORMATTING REQUIREMENTS:
- Use HTML unordered lists (<ul><li>item</li></ul>) in detailed_analysis field
- Format key points as proper HTML bulleted lists
- CRITICAL: Ensure all JSON strings are properly escaped (newlines as \\n, quotes as \\\", etc.)
- Do not include literal newlines, tabs, or unescaped quotes in JSON string values

=== NEGATIVE EXAMPLES (never output these) ===

❌ BAD role-match reasoning:  
 "Candidate worked as a teacher, but job needs Python developer → FAIL"  
 → This ignores transferable skills / boot-camp transitions / self-taught coders.

❌ BAD authenticity flag:  
 "Resume contains the word 'spearheaded' → Likely AI-Generated"  
 → Flag only when multiple generic buzz-words appear with no measurable results.

❌ BAD experience validation:  
 "No FAANG company → Questionable"  
 → Validate timeline logic (dates, gaps, promotions), not brand names.

❌ BAD achievement quality:  
 "Bullet does not contain a number → Generic"  
 → A bullet can be high-quality without a metric if it shows unique impact.

✅ GOOD examples:  
 Role-match: "Candidate taught CS for 3 yrs, then built 2 Django SaaS apps → PASS (transferable)"  
 Authenticity: "High buzz-word density and 87 % sentence overlap with JD → Suspicious"  
 Experience: "Employment dates jump from 2022→2020→2023 → Inconsistent"  
 Achievement: "Designed curriculum that increased student CS pass-rate from 42 %→78 % → High-Quality"

Respond ONLY with a valid JSON object in this exact format:
{
    "role_match_status": "pass/fail",
    "text_authenticity": "Authentic/Suspicious/Likely AI-Generated",
    "text_authenticity_explanation": "Brief explanation of authenticity assessment",
    "experience_validation": "Validated/Questionable/Inconsistent", 
    "experience_validation_explanation": "Brief explanation of experience validation",
    "achievement_quality": "High-Quality/Average/Generic",
    "achievement_quality_explanation": "Brief explanation of achievement assessment",
    "resume_review_score": 0-35,
    "skill_matching_score": 0-30,
    "experience_relevance_score": 0-25,
    "education_certifications_score": 0-10,
    "total_score": 0-100,
    "strengths": ["strength1", "strength2", ...],
    "areas_for_improvement": ["area1", "area2", ...],
    "recommendation": "Strongly Recommend/Recommend/Consider/Do Not Recommend",
    "detailed_analysis": "Positive, encouraging analysis focusing on candidate's potential and how their background could contribute to the role. Use HTML bullet points."
}"""

        human_prompt = """First list 5 positive and 5 negative observations about this candidate, then pick the 3 strongest positives and 3 most actionable negatives and return them in the JSON. Conduct all three critical assessment layers plus STRICT role matching and WORK EXPERIENCE VALIDATION.

Job Description:
{job_description}

Resume text:
{resume}

CRITICAL ANALYSIS REQUIRED:
0. WORK EXPERIENCE VALIDATION (MUST BE PERFORMED FIRST):
   - Identify ALL listed work experience entries and verify each has: company/organization name, job title/role, and employment dates/duration
   - Count how many entries are REAL WORK EXPERIENCE (with company + title + dates) vs PROJECTS (personal, freelance, academic without employment context)
   - If candidate lists mostly projects (personal, freelance, or academic) with no solid work experience (no defined job titles, company names, or clear employment durations), CAP TOTAL SCORE AT 60% OR BELOW
   - Even if role match status passes or skills align with job description, candidates with mostly projects and no real work experience must be capped at 60% or below
   - Validate that work experience clearly supports claimed proficiency level - if strong skills are present but no verifiable professional experience, cap total score at 60% or below
   - For candidates with mostly projects, always include in areas_for_improvement: "Need to gain more hands-on, structured work experience to strengthen future applications"

1. TEXT AUTHENTICITY LAYER: Assess for AI generation, buzzword density, job description overlap
2. EXPERIENCE-SKILL VALIDATION LAYER: Verify timeline consistency, skill-role alignment, achievement authenticity, AND validate real work experience vs projects
3. ACHIEVEMENT QUALITY LAYER: Evaluate specificity, measurability, and uniqueness of accomplishments
4. ROLE MATCH ASSESSMENT (MOST CRITICAL): Does the candidate's PRIMARY role/expertise EXACTLY match the position?

SMART ROLE MATCHING REQUIREMENTS:
- FIRST: Check if the candidate has relevant skills and experience for the target role
- For Product Manager roles: Look for Product Manager/Product Owner experience OR relevant business/strategy experience
- For Software Engineer roles: Look for Software Engineer/Developer/Fullstack/Frontend/Backend experience
- For Frontend Developer roles: Look for Frontend/Fullstack/Software Engineer experience with frontend skills
- For Backend Developer roles: Look for Backend/Fullstack/Software Engineer experience with backend skills
- For Data Scientist roles: Look for Data Scientist/Data Analyst/ML Engineer experience OR relevant data experience
- For Design roles: Look for Designer/UX/UI Designer experience OR relevant design experience
- CONSIDER transferable skills and related experience as valid qualifications
- ALLOW fullstack developers to qualify for frontend-only or backend-only roles
- FACTOR IN specific technology stacks (Django vs Node.js vs React vs Angular, etc.)

FLEXIBLE REQUIREMENTS:
- If there's reasonable role alignment, proceed with scoring even if not perfect match
- Score candidates based on their actual experience level rather than giving zeros
- Factor in specific technology stacks and give partial credit for related technologies
- If authenticity concerns are raised, significantly reduce scores
- Resumes with good role alignment and relevant skills should score 60+
- Use flexible scoring criteria: Strongly Recommend (85-100), Recommend (70-84), Consider (60-69), Do Not Recommend (<60)

Respond with ONLY the JSON object. No other text."""

        human_prompt += """

Before you return JSON, silently write a checklist:
1. I verified every work block has company, title, and dates.
2. I flagged authenticity only if ≥2 independent signals exist.
3. I did not penalise boot-camps, career-changers, or non-FAANG names.
4. My areas_for_improvement are actionable, not generic ("expand relevant experience").
5. My total_score equals the sum of the four category scores (no math error)."""

        # Create messages with cleaned text
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "human", "content": human_prompt.format(
                resume=resume_text_clean,
                job_description=job_description_clean
            )}
        ]

        # Get response
        logger.debug("Sending request to OpenAI API")
        usage: Dict[str, int] = {}
        try:
            response = chat.invoke(messages)
            logger.debug("Received response from API")
            logger.debug(f"Response type: {type(response.content)}")
            logger.debug(f"Raw response: {response.content}")
            usage = _extract_token_usage(response)
            
            # Check if response seems complete (contains both opening and closing braces)
            if not (response.content.strip().startswith('{') and response.content.strip().endswith('}')):
                logger.warning("Response may be incomplete - missing proper JSON structure")
                if not response.content.strip().endswith('}'):
                    logger.warning("Response appears to be truncated - missing closing brace")
        except Exception as e:
            error_msg = f"OpenAI API request failed: {e}"
            logger.error(error_msg)
            return ResumeAnalysis(**create_default_analysis(error_msg))

        try:
            # Use robust JSON parsing
            content = response.content.strip()
            logger.debug(f"Raw content length: {len(content)}")
            logger.debug(f"Content preview: {content[:200]}...")
            
            # Fix common JSON issues with control characters in string values
            # This is a more sophisticated approach that only escapes control chars within strings
            def fix_json_control_chars(json_str):
                result = []
                in_string = False
                escape_next = False
                
                for i, char in enumerate(json_str):
                    if escape_next:
                        result.append(char)
                        escape_next = False
                        continue
                        
                    if char == '\\':
                        escape_next = True
                        result.append(char)
                        continue
                        
                    if char == '"' and not escape_next:
                        in_string = not in_string
                        result.append(char)
                        continue
                    
                    if in_string:
                        # We're inside a string value, escape control characters
                        if char == '\n':
                            result.append('\\n')
                        elif char == '\r':
                            result.append('\\r')
                        elif char == '\t':
                            result.append('\\t')
                        else:
                            result.append(char)
                    else:
                        # We're outside string values, keep formatting
                        result.append(char)
                
                return ''.join(result)
            
            content = fix_json_control_chars(content)
            
            # First try simple JSON parsing, then use robust parser if needed
            try:
                analysis_dict = json.loads(content)
                logger.debug("Successfully parsed JSON with simple parser")
            except json.JSONDecodeError as e:
                logger.debug(f"Simple JSON parsing failed: {e}, trying robust parser")
                logger.debug(f"Failed content first 100 chars: {repr(content[:100])}")
                analysis_dict = extract_and_parse_json(content)
            
            logger.debug(f"Successfully parsed JSON: {analysis_dict}")
            
            # SMART ROLE MATCHING VALIDATION
            if analysis_dict.get("role_match_status") == "fail":
                logger.warning("Role match failed - checking if it's a complete mismatch or just needs stricter scoring")
                # Only apply zero scores for completely unrelated roles
                # For related roles with insufficient experience, apply stricter scoring instead
                analysis_dict["resume_review_score"] = max(0, analysis_dict.get("resume_review_score", 0) - 10)
                analysis_dict["skill_matching_score"] = max(0, analysis_dict.get("skill_matching_score", 0) - 10)
                analysis_dict["experience_relevance_score"] = max(0, analysis_dict.get("experience_relevance_score", 0) - 10)
                analysis_dict["education_certifications_score"] = max(0, analysis_dict.get("education_certifications_score", 0) - 5)
                
                # Recalculate total score
                total = (
                    analysis_dict["resume_review_score"] +
                    analysis_dict["skill_matching_score"] +
                    analysis_dict["experience_relevance_score"] +
                    analysis_dict["education_certifications_score"]
                )
                analysis_dict["total_score"] = max(0, min(100, total))
                
                # Update recommendation based on new score
                if total >= 85:
                    analysis_dict["recommendation"] = "Strongly Recommend"
                elif total >= 70:
                    analysis_dict["recommendation"] = "Recommend"
                elif total >= 60:
                    analysis_dict["recommendation"] = "Consider"
                else:
                    analysis_dict["recommendation"] = "Do Not Recommend"
                
                analysis_dict["detailed_analysis"] = "<ul><li>Role alignment concerns detected - candidate may need additional experience or training</li><li>Consider if transferable skills and potential outweigh current limitations</li></ul>"
                logger.info("Applied smart role matching with stricter scoring")
            
            # Enhanced logging for debugging areas_for_improvement
            if 'areas_for_improvement' in analysis_dict:
                logger.info(f"areas_for_improvement found in parsed JSON: {analysis_dict['areas_for_improvement']}")
            else:
                logger.error("areas_for_improvement MISSING from parsed JSON!")
                logger.error(f"Available keys: {list(analysis_dict.keys())}")

            analysis_dict["token_usage"] = usage or None

            # Validate and ensure all required fields
            required_fields = {
                "role_match_status", "text_authenticity", "text_authenticity_explanation",
                "experience_validation", "experience_validation_explanation", 
                "achievement_quality", "achievement_quality_explanation",
                "resume_review_score", "skill_matching_score",
                "experience_relevance_score", "education_certifications_score",
                "total_score", "strengths", "areas_for_improvement",
                "recommendation", "detailed_analysis"
            }

            # Check for missing fields and handle them gracefully
            missing_fields = required_fields - set(analysis_dict.keys())
            if missing_fields:
                logger.warning(f"Missing fields in response: {missing_fields}")
                
                # For critical missing fields, return default analysis
                critical_fields = {"role_match_status", "total_score", "recommendation"}
                missing_critical = critical_fields.intersection(missing_fields)
                if missing_critical:
                    logger.error(f"Critical fields missing: {missing_critical}")
                    return ResumeAnalysis(**create_default_analysis())
                
                # For non-critical fields, provide reasonable defaults
                if "areas_for_improvement" in missing_fields:
                    logger.warning("areas_for_improvement missing - using default values")
                    analysis_dict["areas_for_improvement"] = ["Continue skill development", "Expand relevant experience"]
                    
                if "strengths" in missing_fields:
                    analysis_dict["strengths"] = ["Relevant background", "Good potential"]
                    
                if "detailed_analysis" in missing_fields:
                    analysis_dict["detailed_analysis"] = "<ul><li>Analysis completed with partial data</li><li>Candidate shows potential for the role</li></ul>"
                
                # Add defaults for new authenticity assessment fields
                if "text_authenticity" in missing_fields:
                    analysis_dict["text_authenticity"] = "Authentic"
                if "text_authenticity_explanation" in missing_fields:
                    analysis_dict["text_authenticity_explanation"] = "Standard resume format and language"
                if "experience_validation" in missing_fields:
                    analysis_dict["experience_validation"] = "Validated"
                if "experience_validation_explanation" in missing_fields:
                    analysis_dict["experience_validation_explanation"] = "Experience appears consistent"
                if "achievement_quality" in missing_fields:
                    analysis_dict["achievement_quality"] = "Average"
                if "achievement_quality_explanation" in missing_fields:
                    analysis_dict["achievement_quality_explanation"] = "Standard achievement descriptions"
                
                # Fill in any other missing non-score fields with defaults
                for field in missing_fields:
                    if field not in analysis_dict:
                        if field.endswith("_score"):
                            analysis_dict[field] = 0
                        elif field == "role_match_status":
                            analysis_dict[field] = "pass"
                        elif field == "recommendation":
                            analysis_dict[field] = "Consider"

            # Ensure proper types
            analysis_dict["resume_review_score"] = max(0, min(35, int(analysis_dict["resume_review_score"])))
            analysis_dict["skill_matching_score"] = max(0, min(30, int(analysis_dict["skill_matching_score"])))
            analysis_dict["experience_relevance_score"] = max(0, min(20, int(analysis_dict["experience_relevance_score"])))
            analysis_dict["education_certifications_score"] = max(0, min(10, int(analysis_dict["education_certifications_score"])))
            analysis_dict["total_score"] = int(analysis_dict["total_score"])

            # Ensure lists are lists
            if not isinstance(analysis_dict["strengths"], list):
                analysis_dict["strengths"] = [str(analysis_dict["strengths"])]
            if not isinstance(analysis_dict["areas_for_improvement"], list):
                analysis_dict["areas_for_improvement"] = [str(analysis_dict["areas_for_improvement"])]

            # Let AI handle all skill matching - no manual override
            # NOTE: The AI is instructed to validate work experience and cap total_score at 60% 
            # for candidates with mostly projects (personal, freelance, academic) and no real work experience
            # (no defined job titles, company names, or clear employment durations).
            # The AI should have already applied this cap if needed based on the prompts.
            # Recompute total score with caps
            total = (
                analysis_dict["resume_review_score"] +
                analysis_dict["skill_matching_score"] +
                analysis_dict["experience_relevance_score"] +
                analysis_dict["education_certifications_score"]
            )
            analysis_dict["total_score"] = max(0, min(100, total))
            
            # Note: If AI has properly followed instructions, total_score should already be capped at 60%
            # for candidates with mostly projects and no real work experience. The AI validation 
            # in the prompts handles this enforcement.
            # Re-evaluate recommendation based on strict role-matching criteria
            if total >= 85:
                rec = "Strongly Recommend"
            elif total >= 70:
                rec = "Recommend"
            elif total >= 60:
                rec = "Consider"
            else:
                rec = "Do Not Recommend"
            analysis_dict["recommendation"] = rec
            
            # Final normalization to guarantee all fields are present and non-empty where applicable
            def ensure_complete_resume_analysis(d: dict) -> dict:
                defaults = {
                    "role_match_status": "pass",
                    "text_authenticity": "Authentic",
                    "text_authenticity_explanation": "Standard resume format and language",
                    "experience_validation": "Validated",
                    "experience_validation_explanation": "Experience appears consistent",
                    "achievement_quality": "Average",
                    "achievement_quality_explanation": "Standard achievement descriptions",
                    "resume_review_score": 0,
                    "skill_matching_score": 0,
                    "experience_relevance_score": 0,
                    "education_certifications_score": 0,
                    "total_score": 0,
                    "strengths": ["Relevant background", "Good potential"],
                    "areas_for_improvement": ["Continue skill development", "Expand relevant experience"],
                    "recommendation": "Consider",
                    "detailed_analysis": "<ul><li>Analysis completed</li><li>All fields normalized</li></ul>",
                    "token_usage": None,
                }
                # Ensure keys exist
                for k, v in defaults.items():
                    if k not in d or d[k] is None or (isinstance(d[k], str) and d[k].strip() == ""):
                        d[k] = v
                # Clamp score ranges again for safety
                d["resume_review_score"] = max(0, min(35, int(d.get("resume_review_score", 0))))
                d["skill_matching_score"] = max(0, min(30, int(d.get("skill_matching_score", 0))))
                d["experience_relevance_score"] = max(0, min(20, int(d.get("experience_relevance_score", 0))))
                d["education_certifications_score"] = max(0, min(10, int(d.get("education_certifications_score", 0))))
                # Ensure lists are non-empty lists
                if not isinstance(d.get("strengths"), list) or len(d.get("strengths", [])) == 0:
                    d["strengths"] = defaults["strengths"]
                if not isinstance(d.get("areas_for_improvement"), list) or len(d.get("areas_for_improvement", [])) == 0:
                    d["areas_for_improvement"] = defaults["areas_for_improvement"]
                # Recompute total score if inconsistent
                total_calc = (
                    d["resume_review_score"] +
                    d["skill_matching_score"] +
                    d["experience_relevance_score"] +
                    d["education_certifications_score"]
                )
                d["total_score"] = max(0, min(100, int(d.get("total_score", total_calc))))
                # Normalize recommendation from total
                total = d["total_score"]
                if total >= 85:
                    d["recommendation"] = "Strongly Recommend"
                elif total >= 70:
                    d["recommendation"] = "Recommend"
                elif total >= 60:
                    d["recommendation"] = "Consider"
                else:
                    d["recommendation"] = "Do Not Recommend"
                return d

            analysis_dict = ensure_complete_resume_analysis(analysis_dict)

            # Final logging before creating ResumeAnalysis object
            logger.info(f"Final analysis_dict before ResumeAnalysis creation:")
            logger.info(f"- areas_for_improvement: {analysis_dict.get('areas_for_improvement', 'MISSING')}")
            logger.info(f"- total_score: {analysis_dict.get('total_score')}")
            
            return ResumeAnalysis(**analysis_dict)

        except (json.JSONDecodeError, ValueError) as e:
            error_msg = f"JSON parsing error: {e}"
            logger.error(error_msg)
            logger.error(f"Attempted to parse: {content}")
            logger.error(f"Content length: {len(content)}")
            logger.error(f"Full content: {content}")
            return ResumeAnalysis(**create_default_analysis(error_msg))
            
        except Exception as e:
            error_msg = f"Error processing response: {e}"
            logger.error(error_msg)
            logger.error(f"Response content: {content}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return ResumeAnalysis(**create_default_analysis(error_msg))

    except Exception as e:
        error_msg = f"Error in analyze_resume: {str(e)}"
        logger.error(error_msg)
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return ResumeAnalysis(**create_default_analysis(error_msg))



