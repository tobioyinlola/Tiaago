# skill_assessment/management/commands/test_elevenlabs.py
import json
import os
import sys
import logging
from pathlib import Path

from django.core.management import BaseCommand, CommandError
from django.conf import settings


from utils.elevenlabs_handler import elevenlabs_handler, agent_prompt, first_message

logger = logging.getLogger("elevenlabs")


def _pretty(obj) -> str:
    try:
        return json.dumps(obj, indent=2, ensure_ascii=False)
    except Exception:
        return str(obj)


class Command(BaseCommand):
    help = "Smoke-test ElevenLabs Convai integration (create agent, list conversations, fetch details/audio)."

    def add_arguments(self, parser):
        parser.add_argument("--agent-id", type=str, default=None,
                            help="Existing agent_id. If omitted, the command will create a new agent.")
        parser.add_argument("--name", type=str, default="Tiaago Cultural Fit v1",
                            help="Name for the agent when creating.")
        parser.add_argument("--set-prompt", action="store_true",
                            help="Include prompt/first_message in the created agent's conversation_config.")
        parser.add_argument("--conversation-id", type=str, default=None,
                            help="Conversation ID to fetch details/audio for.")
        parser.add_argument("--save-audio", action="store_true",
                            help="If --conversation-id is given, also fetch and save conversation audio to a file.")
        parser.add_argument("--audio-dir", type=str, default=None,
                            help="Directory to write audio file. Defaults to <BASE_DIR>/media/elevenlabs.")
        parser.add_argument("--verbose-json", action="store_true",
                            help="Pretty-print JSON responses.")
        parser.add_argument("--dry-run", action="store_true",
                            help="Print what would be done without making network calls (except key check).")

    def handle(self, *args, **opts):
        api_key = os.environ.get("ELEVENLABS_API_KEY") or ""
        if not api_key.strip():
            raise CommandError("ELEVENLABS_API_KEY is missing. Export it or set it in your environment.")

        agent_id = opts.get("agent_id")
        name = opts.get("name")
        set_prompt = bool(opts.get("set_prompt"))
        conversation_id = opts.get("conversation_id")
        save_audio = bool(opts.get("save_audio"))
        audio_dir = opts.get("audio_dir")
        verbose_json = bool(opts.get("verbose_json"))
        dry_run = bool(opts.get("dry_run"))

        self.stdout.write(self.style.NOTICE(f"Using API key: {'***' if api_key else '<missing>'}"))
        self.stdout.write(self.style.SUCCESS(f"Dry-run: {dry_run}"))

        # Build conversation_config if requested
        conversation_config = None
        if set_prompt:
            # Minimal but valid shape for handler
            conversation_config = {
                "agent": {
                    "first_message": first_message.strip(),
                    "language": "en",
                    "prompt": {
                        "prompt": agent_prompt.strip(),
                        "llm": "gemini-2.0-flash",
                        "temperature": 0.0,
                        "max_tokens": -1
                    }
                },
                "conversation": {"text_only": False, "max_duration_seconds": 600},
                "tts": {"model_id": "eleven_turbo_v2", "voice_id": "cjVigY5qzO86Huf0OWal"},
                "asr": {"provider": "elevenlabs", "quality": "high", "user_input_audio_format": "pcm_16000"},
                "turn": {"mode": "turn", "turn_timeout": 7.0},
            }

        created = None
        if not agent_id:
            self.stdout.write(self.style.WARNING("No --agent-id provided; will create a new agent."))
            if dry_run:
                self.stdout.write(self.style.NOTICE("DRY RUN: would call create_agent(conversation_config, name)"))
                agent_id = "<DRY_AGENT_ID>"
            else:
                created = elevenlabs_handler.create_agent(conversation_config or {}, name)
                if not created or not isinstance(created, dict):
                    raise CommandError("create_agent returned no data or invalid JSON.")
                agent_id = created.get("agent_id") or created.get("id")
                if not agent_id:
                    self.stdout.write(self.style.ERROR(_pretty(created)))
                    raise CommandError("Could not find agent_id in create_agent response.")
                self.stdout.write(self.style.SUCCESS(f"Created agent_id: {agent_id}"))

       
        if dry_run:
            self.stdout.write(self.style.NOTICE(f"DRY RUN: would call get_agent({agent_id})"))
            agent_info = {"agent_id": agent_id, "dry_run": True}
        else:
            agent_info = elevenlabs_handler.get_agent(agent_id)
            if agent_info is None:
                raise CommandError("get_agent failed (see logs).")
        self.stdout.write(self.style.SUCCESS("get_agent =>"))
        self.stdout.write(_pretty(agent_info) if verbose_json else str(agent_info)[:500])

       
        if dry_run:
            self.stdout.write(self.style.NOTICE(f"DRY RUN: would call get_agent_conversations({agent_id})"))
            conversations = {"items": []}
        else:
            conversations = elevenlabs_handler.get_agent_conversations(agent_id)
            if conversations is None:
                conversations = {"items": []}
        self.stdout.write(self.style.SUCCESS("get_agent_conversations =>"))
        self.stdout.write(_pretty(conversations) if verbose_json else str(conversations)[:500])

        if conversation_id:
            if dry_run:
                self.stdout.write(self.style.NOTICE(f"DRY RUN: would call get_conversation_details({conversation_id})"))
                convo = {"conversation_id": conversation_id, "dry_run": True}
            else:
                convo = elevenlabs_handler.get_conversation_details(conversation_id)
                if convo is None:
                    raise CommandError("get_conversation_details failed (see logs).")
            self.stdout.write(self.style.SUCCESS("get_conversation_details =>"))
            self.stdout.write(_pretty(convo) if verbose_json else str(convo)[:800])

            if save_audio and not dry_run:
                # Resolve output directory
                if audio_dir:
                    out_dir = Path(audio_dir)
                else:
                    # default to BASE_DIR/media/elevenlabs
                    base = getattr(settings, "MEDIA_ROOT", None) or Path(settings.BASE_DIR) / "media"
                    out_dir = Path(base) / "elevenlabs"
                out_dir.mkdir(parents=True, exist_ok=True)

                audio_bytes = elevenlabs_handler.get_conversation_audio(conversation_id)
                if not audio_bytes:
                    raise CommandError("get_conversation_audio returned empty bytes or failed.")
                out_file = out_dir / f"{conversation_id}.wav"
                out_file.write_bytes(audio_bytes)
                self.stdout.write(self.style.SUCCESS(f"Saved audio to: {out_file}"))

       
        self.stdout.write(self.style.SUCCESS("✅ ElevenLabs test completed successfully."))
        return 0
