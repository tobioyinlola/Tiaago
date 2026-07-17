import logging
import uuid
from datetime import datetime

import requests
from django.conf import settings
from django.utils import timezone
from rest_framework.status import HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR

logger = logging.getLogger(__name__)


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
    epoch_start_time_in_seconds = int(timezone.make_aware(start_dt).timestamp())
    epoch_end_time_in_seconds = int(timezone.make_aware(end_dt).timestamp())

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
                "nbf": str(epoch_start_time_in_seconds),
                "exp": str(epoch_end_time_in_seconds),
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
                "nbf": str(epoch_start_time_in_seconds),
                "exp": str(epoch_end_time_in_seconds),
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
