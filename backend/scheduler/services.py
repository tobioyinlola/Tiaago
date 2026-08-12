import logging
import uuid
from datetime import datetime, timedelta

import requests
from django.conf import settings
from django.utils import timezone
from rest_framework.status import HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR

logger = logging.getLogger(__name__)

# Matches JOIN_WINDOW_MINUTES on the frontend (recruiter dashboard's
# InterviewJoinButton, interviews.constants.ts) and the "room will open 30
# minutes before your interview" copy in the candidate confirmation/reminder
# emails. Defined here (rather than only in copilot_views.py, which imports
# it from here) because provision_daily_room below needs it too: the ROOM's
# own nbf/exp (set once, at slot-claim time) has to grant the same early-join
# buffer as the per-participant meeting tokens minted later, or Daily.co
# rejects entry before the room's own nbf regardless of how permissive the
# token is -- a valid token for a room that itself isn't open yet still
# can't join, which is exactly the "video room isn't ready" symptom.
JOIN_WINDOW_MINUTES = 30


class DailyRoomProvisioningError(Exception):
    """Raised when Daily.co room/token provisioning fails.

    Carries the same HTTP status + detail message the inline view code this was
    extracted from used to return directly, so callers can translate it back into
    a Response without changing behavior.
    """

    def __init__(self, detail, status_code=HTTP_500_INTERNAL_SERVER_ERROR):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


def provision_daily_room(meeting_date, start_time, end_time):
    """Provision a time-boxed Daily.co room + owner token for a confirmed meeting.

    Returns {"room_id": uuid.UUID, "room_name": str, "room_url": str, "token": str}.
    Raises DailyRoomProvisioningError on any failure.
    """
    start_dt = datetime.combine(meeting_date, start_time)
    end_dt = datetime.combine(meeting_date, end_time)
    # The room itself must be open at least as early as JOIN_WINDOW_MINUTES
    # before the scheduled start (matching every join token minted against
    # it later) and for a grace period after the scheduled end -- an nbf/exp
    # scoped to the exact start/end left no room for the early-join window
    # every other part of the app promises (buttons, emails), and a
    # recruiter/candidate arriving even one second before the exact start
    # was rejected by Daily.co with the room not existing/ready yet.
    epoch_start_time_in_seconds = int(
        (timezone.make_aware(start_dt) - timedelta(minutes=JOIN_WINDOW_MINUTES)).timestamp()
    )
    epoch_end_time_in_seconds = int(
        (timezone.make_aware(end_dt) + timedelta(hours=1)).timestamp()
    )

    daily_api_token = getattr(settings, "DAILY_API_TOKEN", None)
    if not daily_api_token:
        logger.error("DAILY_API_TOKEN not found in settings")
        raise DailyRoomProvisioningError(
            "Video conferencing configuration error", HTTP_500_INTERNAL_SERVER_ERROR
        )

    try:
        request_data = {
            "privacy": "private",
            "properties": {
                # Daily.co's API expects nbf/exp as integer Unix timestamps,
                # not strings -- sent as str() before, which is incorrect
                # per Daily's documented room-properties schema.
                "nbf": epoch_start_time_in_seconds,
                "exp": epoch_end_time_in_seconds,
            },
        }
        logger.info(f"Sending request to Daily.co with data: {request_data}")

        res = requests.post(
            "https://api.daily.co/v1/rooms/",
            json=request_data,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": f"Bearer {daily_api_token}",
            },
        )

        if res.status_code != 200:
            logger.error(f"Daily.co API error: Status {res.status_code}, Response: {res.text}")
            raise DailyRoomProvisioningError(
                f"Room creation failed: {res.text}", HTTP_500_INTERNAL_SERVER_ERROR
            )

        result = res.json()
        logger.info(f"Successfully created Daily.co room: {result}")

    except requests.HTTPError as e:
        logger.error(f"HTTP Error creating Daily.co room: {str(e)}")
        raise DailyRoomProvisioningError(f"Cannot create room: {str(e)}", HTTP_400_BAD_REQUEST)
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Connection error with Daily.co API: {str(e)}")
        raise DailyRoomProvisioningError(f"Connection error. Try again: {str(e)}", HTTP_400_BAD_REQUEST)
    except requests.RequestException as e:
        logger.error(f"Network error with Daily.co API: {str(e)}")
        raise DailyRoomProvisioningError(
            f"Network error. Try again: {str(e)}", HTTP_500_INTERNAL_SERVER_ERROR
        )
    except DailyRoomProvisioningError:
        raise
    except Exception as e:
        logger.error(f"Unexpected error creating Daily.co room: {str(e)}")
        raise DailyRoomProvisioningError(
            f"An unexpected error occurred: {str(e)}", HTTP_500_INTERNAL_SERVER_ERROR
        )

    if not result.get("api_created"):
        raise DailyRoomProvisioningError(
            "Room creation did not complete as expected", HTTP_500_INTERNAL_SERVER_ERROR
        )

    room_id = uuid.UUID(result.get("id"))
    room_name = result.get("name")
    room_url = result.get("url")

    try:
        token_request_data = {
            "properties": {
                "room_name": room_name,
                "eject_at_token_exp": True,
                "nbf": epoch_start_time_in_seconds,
                "exp": epoch_end_time_in_seconds,
                "is_owner": True,
                "enable_screenshare": True,
            }
        }
        logger.info(f"Requesting Daily.co token with data: {token_request_data}")

        res = requests.post(
            "https://api.daily.co/v1/meeting-tokens",
            json=token_request_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {daily_api_token}",
            },
        )

        if res.status_code != 200:
            logger.error(f"Daily.co token creation error: Status {res.status_code}, Response: {res.text}")
            raise DailyRoomProvisioningError(
                f"Token creation failed: {res.text}", HTTP_500_INTERNAL_SERVER_ERROR
            )

        token_result = res.json()
        if "token" not in token_result:
            logger.error(f"No token in Daily.co response: {token_result}")
            raise DailyRoomProvisioningError(
                "Invalid token response from server", HTTP_500_INTERNAL_SERVER_ERROR
            )

        token = token_result.get("token")

    except requests.HTTPError as e:
        logger.error(f"HTTP Error creating Daily.co token: {str(e)}")
        raise DailyRoomProvisioningError(f"Cannot create token: {str(e)}", HTTP_400_BAD_REQUEST)
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Connection error creating token: {str(e)}")
        raise DailyRoomProvisioningError(f"Connection error. Try again: {str(e)}", HTTP_400_BAD_REQUEST)
    except requests.RequestException as e:
        logger.error(f"Network error creating token: {str(e)}")
        raise DailyRoomProvisioningError(
            f"Network error. Try again: {str(e)}", HTTP_500_INTERNAL_SERVER_ERROR
        )
    except DailyRoomProvisioningError:
        raise
    except Exception as e:
        logger.error(f"Unexpected error creating token: {str(e)}")
        raise DailyRoomProvisioningError(
            f"An unexpected error occurred: {str(e)}", HTTP_500_INTERNAL_SERVER_ERROR
        )

    return {"room_id": room_id, "room_name": room_name, "room_url": room_url, "token": token}


def create_meeting_token(room_name, is_owner, participant_name=None, nbf=None, exp=None, enable_recording=False):
    """Create a Daily.co meeting token scoped to one participant. Used to
    mint separate recruiter (is_owner=True) / candidate (is_owner=False)
    tokens for the interview-copilot flow -- provision_daily_room above
    only ever creates a single owner token, which isn't enough once a
    non-owner candidate needs to join the same room."""
    daily_api_token = getattr(settings, "DAILY_API_TOKEN", None)
    if not daily_api_token:
        logger.error("DAILY_API_TOKEN not found in settings")
        raise DailyRoomProvisioningError(
            "Video conferencing configuration error", HTTP_500_INTERNAL_SERVER_ERROR
        )

    properties = {
        "room_name": room_name,
        "eject_at_token_exp": True,
        "is_owner": is_owner,
        "enable_screenshare": True,
    }
    if participant_name:
        properties["user_name"] = participant_name
    if nbf is not None:
        properties["nbf"] = int(nbf)
    if exp is not None:
        properties["exp"] = int(exp)
    if enable_recording:
        # Only meaningful on the owner/recruiter token -- Daily.co requires
        # is_owner for a participant to be allowed to start a cloud recording.
        properties["enable_recording"] = "cloud"

    try:
        res = requests.post(
            "https://api.daily.co/v1/meeting-tokens",
            json={"properties": properties},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {daily_api_token}",
            },
        )
        if res.status_code != 200:
            logger.error(f"Daily.co token creation error: Status {res.status_code}, Response: {res.text}")
            raise DailyRoomProvisioningError(
                f"Token creation failed: {res.text}", HTTP_500_INTERNAL_SERVER_ERROR
            )
        token_result = res.json()
        if "token" not in token_result:
            logger.error(f"No token in Daily.co response: {token_result}")
            raise DailyRoomProvisioningError(
                "Invalid token response from server", HTTP_500_INTERNAL_SERVER_ERROR
            )
        return token_result["token"]
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Connection error creating token: {str(e)}")
        raise DailyRoomProvisioningError(f"Connection error. Try again: {str(e)}", HTTP_400_BAD_REQUEST)
    except requests.RequestException as e:
        logger.error(f"Network error creating token: {str(e)}")
        raise DailyRoomProvisioningError(
            f"Network error. Try again: {str(e)}", HTTP_500_INTERNAL_SERVER_ERROR
        )
    except DailyRoomProvisioningError:
        raise
    except Exception as e:
        logger.error(f"Unexpected error creating token: {str(e)}")
        raise DailyRoomProvisioningError(
            f"An unexpected error occurred: {str(e)}", HTTP_500_INTERNAL_SERVER_ERROR
        )


def delete_daily_room(room_name):
    """Delete a Daily.co room. Best-effort: logs and returns False on any
    failure rather than raising -- this is meant to be called from a
    scheduled cleanup job well after the interview is over, where there's
    no user-facing request to fail and retrying indefinitely isn't worth it."""
    daily_api_token = getattr(settings, "DAILY_API_TOKEN", None)
    if not daily_api_token or not room_name:
        logger.warning(f"Skipping Daily.co room deletion for '{room_name}': missing token or room name")
        return False
    try:
        res = requests.delete(
            f"https://api.daily.co/v1/rooms/{room_name}",
            headers={"Authorization": f"Bearer {daily_api_token}"},
        )
        # 404 means it's already gone -- treat as success, not a failure to log/alert on.
        if res.status_code in (200, 404):
            logger.info(f"Deleted Daily.co room '{room_name}' (status {res.status_code})")
            return True
        logger.error(f"Failed to delete Daily.co room '{room_name}': {res.status_code} {res.text}")
        return False
    except Exception as e:
        logger.error(f"Error deleting Daily.co room '{room_name}': {str(e)}")
        return False


def get_recording(recording_id):
    """Fetch a Daily.co recording's current state. Returns
    {"status": str, "download_url": str|None, "duration": int|None, "file_size": int|None}
    or None on failure. Does not poll internally -- the caller (a periodic
    Celery task) is expected to call this repeatedly until status=='finished'."""
    daily_api_token = getattr(settings, "DAILY_API_TOKEN", None)
    if not daily_api_token:
        logger.error("DAILY_API_TOKEN not found in settings")
        return None
    try:
        res = requests.get(
            f"https://api.daily.co/v1/recordings/{recording_id}",
            headers={"Authorization": f"Bearer {daily_api_token}"},
        )
        if res.status_code != 200:
            logger.error(f"Failed to fetch Daily.co recording '{recording_id}': {res.status_code} {res.text}")
            return None
        data = res.json()
        download_url = None
        if data.get("status") == "finished":
            access_res = requests.get(
                f"https://api.daily.co/v1/recordings/{recording_id}/access-link",
                headers={"Authorization": f"Bearer {daily_api_token}"},
            )
            if access_res.status_code == 200:
                download_url = access_res.json().get("download_link")
            else:
                logger.error(
                    f"Recording '{recording_id}' finished but access-link fetch failed: "
                    f"{access_res.status_code} {access_res.text}"
                )
        return {
            "status": data.get("status"),
            "download_url": download_url,
            "duration": data.get("duration"),
            "file_size": data.get("file_size"),
        }
    except Exception as e:
        logger.error(f"Error fetching Daily.co recording '{recording_id}': {str(e)}")
        return None


def validate_api_key():
    """Sanity-check DAILY_API_TOKEN against Daily.co. Returns True if valid;
    raises DailyRoomProvisioningError with a clear, actionable message
    otherwise (missing key, or a 401 meaning the key was rejected)."""
    daily_api_token = getattr(settings, "DAILY_API_TOKEN", None)
    if not daily_api_token:
        raise DailyRoomProvisioningError(
            "DAILY_API_TOKEN is not configured", HTTP_500_INTERNAL_SERVER_ERROR
        )
    try:
        res = requests.get(
            "https://api.daily.co/v1/rooms?limit=1",
            headers={"Authorization": f"Bearer {daily_api_token}"},
        )
    except requests.RequestException as e:
        raise DailyRoomProvisioningError(f"Could not reach Daily.co: {str(e)}", HTTP_500_INTERNAL_SERVER_ERROR)
    if res.status_code == 401:
        raise DailyRoomProvisioningError(
            "DAILY_API_TOKEN was rejected by Daily.co -- check the key in the dashboard", 401
        )
    if res.status_code != 200:
        raise DailyRoomProvisioningError(f"Unexpected Daily.co response: {res.status_code}", res.status_code)
    return True
