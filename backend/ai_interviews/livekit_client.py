"""LiveKit room + token provisioning for the AI interview feature. Uses the
Python `livekit-api` SDK (not the Node `livekit-server-sdk` the original spec
assumed -- Django is Python). Room creation is the SDK's only async call
(aiohttp-based `LiveKitAPI.room`); token minting is plain/sync.

Mirrors scheduler.services's DailyRoomProvisioningError pattern for the
equivalent Daily.co provisioning step -- same shape, just for LiveKit.
"""

import asyncio
import logging

from django.conf import settings
from livekit import api
from rest_framework.status import HTTP_500_INTERNAL_SERVER_ERROR

logger = logging.getLogger(__name__)


class LiveKitProvisioningError(Exception):
    def __init__(self, detail, status_code=HTTP_500_INTERNAL_SERVER_ERROR):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


def _require_config():
    if not (settings.LIVEKIT_URL and settings.LIVEKIT_API_KEY and settings.LIVEKIT_API_SECRET):
        logger.error("LIVEKIT_URL/LIVEKIT_API_KEY/LIVEKIT_API_SECRET not fully configured")
        raise LiveKitProvisioningError("Video interview configuration error", HTTP_500_INTERNAL_SERVER_ERROR)


async def _create_room_async(room_name, interview_id):
    async with api.LiveKitAPI(
        settings.LIVEKIT_URL, settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET
    ) as lk:
        await lk.room.create_room(
            api.CreateRoomRequest(
                name=room_name,
                metadata=f'{{"interview_id": "{interview_id}"}}',
                max_participants=2,
                empty_timeout=300,
            )
        )


def create_ai_interview_room(room_name, interview_id):
    """Idempotent -- LiveKit's create_room is a no-op (returns the existing
    room) if a room with this name already exists, so a retried join
    request never errors here."""
    _require_config()
    try:
        asyncio.run(_create_room_async(room_name, interview_id))
    except Exception as e:
        logger.error(f"Failed to create LiveKit room {room_name}: {e}")
        raise LiveKitProvisioningError("Could not start the interview room. Please try again.")


def mint_candidate_token(room_name, identity, participant_name):
    _require_config()
    grants = api.VideoGrants(room_join=True, room=room_name, can_publish=True, can_subscribe=True)
    token = (
        api.AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
        .with_identity(identity)
        .with_name(participant_name or identity)
        .with_grants(grants)
    )
    return token.to_jwt()
