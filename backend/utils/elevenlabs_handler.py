import logging
import os
import requests
from django.conf import settings
from utils.logged_requests import APIHandler
from skill_assessment.models import PreScreeningAgent

logger = logging.getLogger("elevenlabs")

base_url = "https://api.elevenlabs.io/v1/convai"
base_headers = {
    "xi-api-key": os.environ.get("ELEVENLABS_API_KEY"),
    "Content-Type": "application/json",
}

first_message = f"""
    Hi. I'm Jane and I'm your virtual recruiter at Tiaago, I'm here to explore how well you might align with our team's culture and values. This won’t be a typical Q&A — we’re looking to understand your approach to teamwork, communication, adaptability, and what drives you.
    Take your time, be honest, and feel free to express your personality — let’s get started when you're ready!
"""

agent_prompt = f"""
    You are InterviewAI, an expert virtual interviewer specializing in assessing a candidate's cultural fitness.
    Your tasks are:
    before anything say the first message which is {first_message}
    1. Ask a thoughtful, open-ended cultural fitness question (choose from the list provided below).
    2. After the candidate responds:
        - Carefully analyze the answer ("Chain of Thought"):
            - Evaluate the candidate’s behavior, attitude, and values for cultural alignment.
            - Classify the answer as:
                • Strong Fit — clear alignment
                • Moderate Fit — partial alignment or minor concerns
                • Poor Fit — weak alignment or major concerns
        - Score the answer:
            • Strong Fit → 3 points
            • Moderate Fit → 2 points
            • Poor Fit → 1 point
    3. Adaptive Follow-up:
        - If the score is 2 or 1:
            • Ask a follow-up question to clarify or challenge the answer.
            • Score any useful adjustments from the follow-up and replace the grades given in 2 if clarity was made, if not continue to the next question.
        - If the score is 3:
            • Proceed directly to the next main question.
    4. Repeat steps 1–3 until 5 main questions have been completed (follow-ups do not count toward the 5).
    5. Final Summary:
        - Sum up the total score for each question asked and find the average returned as a whole number.
        - Give a final evaluation:
            • 12–15 points → Excellent Cultural Fit
            • 8–11 points → Acceptable Cultural Fit with Minor Risks
            • 5–7 points → Poor Cultural Fit
        - Provide a brief comment on strengths and risks.
    ---
    Main Questions to Choose From:
    - "Describe a time you had to adapt to significant organizational change. What was your approach?"
    - "Tell me about a complex team project. What role did you play and why?"
    - "Share an example of an ethical dilemma you faced. How did you resolve it?"
    - "Give an example of feedback that changed how you work. What was the outcome?"
    - "What leadership qualities do you value most and why?"
    ---
    Scoring Matrix:
    | Criteria        | Strong (3)              | Moderate (2)           | Poor (1)               |
    |----------------|--------------------------|-------------------------|------------------------|
    | Relevance       | Direct, specific example | General or vague example | No clear example      |
    | Alignment       | Multiple value matches   | Partial alignment       | Misaligned values      |
    | Self-awareness  | Clear growth mindset     | Limited reflection      | Defensive or rigid      |
    ---
    Follow-up Strategy (only if score is 2 or 1):
    - Ask questions like:
        • "Can you give a more specific example?"
        • "How did your actions impact the team?"
        • "What lessons did you learn?"
        • "What would you do differently now?"
    ---
    Your response must return only a JSON object wrapped in the following format:
    {{
    "agent_response_event": {{
        interview_transcript: [
            {{
                "question_1": "Original question 1",
                "response_1": "Candidate's response",
                "follow_up_asked": true,
                "follow_up_question": "follow up question by agent",
                "follow_up_response": "Candidate's response to follow up question"
                "analysis": {{
                "value_alignment": ["teamwork", "resilience"],
                "strengths": ["adapts well", "communicates clearly"],
                "concerns": ["hesitation on responsibility"],
                "bias_check": "Passed"
                }},
                "scoring": {{
                "relevance": 3,
                "alignment": 2,
                "self_awareness": 3,
                "total": 8
                }}
            }},
            ...
            ...
            ...
            {{
                "question_n": "Original question n",
                "response_n": "Candidate's response",
                "follow_up_asked": true,
                "follow_up_question": "follow up question by agent",
                "follow_up_response": "Candidate's response to follow up question"
                "analysis": {{
                "value_alignment": ["teamwork", "resilience"],
                "strengths": ["adapts well", "communicates clearly"],
                "concerns": ["hesitation on responsibility"],
                "bias_check": "Passed"
                }},
                "scoring": {{
                "relevance": 3,
                "alignment": 2,
                "self_awareness": 2,
                "total": 8
                }}
            }}
        ],
        "agent_response": {{
            "total_points": 12,
            "final_evaluation": "Excellent Cultural Fit",
            "agent_comment": "Strong alignment with core values, growth mindset evident. Minor hesitation on leadership responsibilities."
        }}
    }}
    }}
"""
def _auth_headers() -> dict:
    """Auth-only header for GET requests."""
    return {"xi-api-key": os.environ.get("ELEVENLABS_API_KEY", base_headers.get("xi-api-key", ""))}

def _json_headers() -> dict:
    """Headers for JSON POST/PATCH."""
    return {
        "xi-api-key": os.environ.get("ELEVENLABS_API_KEY", base_headers.get("xi-api-key", "")),
        "Content-Type": "application/json",
    }




class ElevenLabsHandler(APIHandler):
    def create_agent(self, conversation_config: dict, name: str):
        url = f"{base_url}/agents/create"
        data = {"conversation_config": conversation_config, "name": name}
        try:
            r = self.requests.post(url, json=data, headers=_json_headers(), timeout=15)
            if r.status_code >= 400:
                logger.error("Error creating agent (status=%s): %s", r.status_code, (r.text or "")[:400])
                r.raise_for_status()
            ct = r.headers.get("Content-Type", "")
            if "application/json" not in ct:
                logger.error("create_agent expected JSON, got %s; body=%r", ct, r.text[:300])
                return None
            res = r.json()
            if res:
                agent_id=res.get("agent_id", None)
                #save agent in DB
                prescreening_agent=PreScreeningAgent.objects.create(agent_id=agent_id)
                prescreening_agent.save()
            logger.debug("ElevenLabs Agent Creation Response: %s", res)
            return res
        except requests.exceptions.RequestException as e:
            logger.exception("Request error creating agent: %s", e)
            return None
        except Exception as e:
            logger.exception("Request error creating agent: %s", e)
            return None

    def get_agent(self, agent_id: str):
        url = f"{base_url}/agents/{agent_id}"
        try:
            r = self.requests.get(url=url, headers=_auth_headers(), timeout=10)
            if r.status_code == 204 or not (r.content and r.content.strip()):
                logger.debug("get_agent: empty body for %s (status=%s)", agent_id, r.status_code)
                return {}
            ct = r.headers.get("Content-Type", "")
            if "application/json" not in ct:
                logger.error("get_agent expected JSON, got %s; body=%r", ct, r.text[:300])
                r.raise_for_status()
                return {}
            r.raise_for_status()
            return r.json()
        except requests.exceptions.RequestException as e:
            logger.exception("Network/HTTP error in get_agent(%s): %s", agent_id, e)
            return None

    def get_agent_conversations(self, agent_id: str | None = None):
        url = f"{base_url}/conversations"
        try:
            r = self.requests.get(
                url,
                headers=_auth_headers(),
                params={"agent_id": agent_id} if agent_id else None,
                timeout=10,
            )
            if r.status_code == 204 or not (r.content and r.content.strip()):
                logger.debug("No conversations returned (status=%s).", r.status_code)
                return {"items": []}
            ct = r.headers.get("Content-Type", "")
            if "application/json" not in ct:
                logger.error("Expected JSON but got %s; body=%r", ct, r.text[:300])
                r.raise_for_status()
                return {"items": []}
            r.raise_for_status()
            return r.json()
        except requests.exceptions.RequestException as e:
            logger.exception("Error fetching conversations: %s", e)
            return {"items": []}

    def get_conversation_details(self, conversation_id: str):
        url = f"{base_url}/conversations/{conversation_id}"
        try:
            r = self.requests.get(url=url, headers=_auth_headers(), timeout=10)
            if r.status_code == 204 or not (r.content and r.content.strip()):
                logger.debug("No body for conversation %s (status=%s).", conversation_id, r.status_code)
                return {}
            ct = r.headers.get("Content-Type", "")
            if "application/json" not in ct:
                logger.error(
                    "Expected JSON for conversation %s, got %s; body=%r",
                    conversation_id, ct, r.text[:300]
                )
                r.raise_for_status()
                return {}
            r.raise_for_status()
            return r.json()
        except requests.exceptions.RequestException as e:
            logger.exception("Error fetching conversation %s: %s", conversation_id, e)
            return None

    def get_conversation_audio(self, conversation_id: str):
        url = f"{base_url}/conversations/{conversation_id}/audio"
        try:
            r = self.requests.get(url, headers=_auth_headers(), timeout=20)
            r.raise_for_status()
            return r.content  # raw audio bytes
        except requests.exceptions.RequestException as e:
            logger.exception("Error fetching conversation audio %s: %s", conversation_id, e)
            return b""


def get_universal_agent_id():
    agent = PreScreeningAgent.objects.first()  # or .order_by("-id").first() if you want latest
    if not agent:
        raise ValueError("Universal agent not found.")
    return agent.agent_id


elevenlabs_handler = ElevenLabsHandler(logger)