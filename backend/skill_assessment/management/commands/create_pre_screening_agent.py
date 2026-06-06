from django.core.management.base import BaseCommand
from utils.elevenlabs_handler import elevenlabs_handler, first_message, agent_prompt
from skill_assessment.models import PreScreeningAgent


class Command(BaseCommand):
    help = "Create a universal AI Pre-Screening Agent Powered by ElevenLabs"

    def handle(self, *args, **kwargs):
        if PreScreeningAgent.objects.exists():
            self.stdout.write(self.style.WARNING("Agent already exists. Skipping creation."))
            return

        agent = elevenlabs_handler.create_agent(
            conversation_config={
                "asr": {
                    "quality": "high",
                    "provider": "elevenlabs",
                    "keyword": ["cultural fitness"],
                },
                "turn": {
                    "turn_timeout": 15
                },
                "tts": {
                    "model_id": "eleven_flash_v2",
                    "voice_id": "ZIlrSGI4jZqobxRKprJz",
                },
                "conversation": {
                    "max_duration_seconds": 900,  #maximum of 15mins
                    "client_events" : [
                        "conversation_initiation_metadata",
                        "ping",
                        "audio",
                        "agent_response",
                        "user_transcript",
                        "interruption",
                        "agent_response_correction"
                    ]
                },
                "agent": {
                    "first_message": first_message,
                    "prompt": {
                        "prompt": agent_prompt,
                        "llm": "gpt-4o-mini",
                        "temperature": 0.3,
                        "max_tokens": 4096,
                    },
                },
            },
            name="tiaago_interviewer",
        )

        if not agent:
            self.stdout.write(self.style.ERROR("Agent creation failed."))
            return

        PreScreeningAgent.objects.create(
            agent_id=agent["agent_id"],
            agent_name='tiaago_interviewer'
        )

        self.stdout.write(self.style.SUCCESS("Universal pre-screening agent created successfully."))
