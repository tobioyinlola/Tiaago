"""Thin wrapper around Nango's REST API (https://api.nango.dev).

There's no official Nango Python SDK yet (Nango's docs say "coming soon" --
last checked July 2026), so this talks to the HTTP API directly with
`requests`, the same way @nangohq/node does under the hood. Every call here
must run server-side only: NANGO_SECRET_KEY must never reach the frontend.
"""

from typing import Any

import requests
from django.conf import settings

NANGO_BASE_URL = "https://api.nango.dev"
_TIMEOUT = 30


class NangoError(Exception):
    """Raised for any non-2xx response from Nango, or missing config."""


def _secret_key() -> str:
    key = settings.NANGO_SECRET_KEY
    if not key:
        raise NangoError("NANGO_SECRET_KEY is not configured on the backend.")
    return key


def _headers(extra: dict | None = None) -> dict:
    headers = {
        "Authorization": f"Bearer {_secret_key()}",
        "Content-Type": "application/json",
    }
    if extra:
        headers.update(extra)
    return headers


def _raise_for_status(resp: requests.Response) -> None:
    if resp.ok:
        return
    try:
        detail = resp.json()
    except ValueError:
        detail = resp.text
    raise NangoError(f"Nango API error ({resp.status_code}): {detail}")


def create_connect_session(
    *, end_user_id: str, end_user_email: str, organization_id: str, allowed_integrations: list[str]
) -> dict[str, Any]:
    """POST /connect/sessions -- issues a short-lived (30 min) session token
    the frontend uses to open Nango's Connect UI, without ever seeing our
    secret key. See https://nango.dev/docs/reference/backend/http-api/connect/sessions/create
    """
    resp = requests.post(
        f"{NANGO_BASE_URL}/connect/sessions",
        headers=_headers(),
        json={
            "tags": {
                "end_user_id": end_user_id,
                "end_user_email": end_user_email,
                "organization_id": organization_id,
            },
            "allowed_integrations": allowed_integrations,
        },
        timeout=_TIMEOUT,
    )
    _raise_for_status(resp)
    return resp.json()["data"]


def proxy_get(
    *,
    connection_id: str,
    provider_config_key: str,
    endpoint: str,
    params: dict | None = None,
    extra_headers: dict | None = None,
) -> requests.Response:
    """GET https://api.nango.dev/proxy{endpoint} -- Nango injects the
    connection's credentials and forwards the call to the underlying ATS.
    `endpoint` must start with "/" (e.g. "/v1/candidates").

    `extra_headers` is for headers the *target* API needs that Nango won't
    add on its own -- e.g. Teamtailor requires a static `X-Api-Version`
    header alongside the credential it injects.

    Returns the raw Response (not parsed JSON) because some providers
    paginate via a response header (Greenhouse's `Link` header) rather than
    a field in the JSON body -- callers that only need the body can just
    call `.json()` on the result."""
    resp = requests.get(
        f"{NANGO_BASE_URL}/proxy{endpoint}",
        headers=_headers({"Connection-Id": connection_id, "Provider-Config-Key": provider_config_key, **(extra_headers or {})}),
        params=params or {},
        timeout=_TIMEOUT,
    )
    _raise_for_status(resp)
    return resp


def proxy_post(
    *, connection_id: str, provider_config_key: str, endpoint: str, json: dict | None = None
) -> requests.Response:
    """POST https://api.nango.dev/proxy{endpoint} -- same as proxy_get but
    for providers whose list endpoints are POST/RPC-style rather than REST
    GET (e.g. Ashby's `/candidate.list`, `/job.list`)."""
    resp = requests.post(
        f"{NANGO_BASE_URL}/proxy{endpoint}",
        headers=_headers({"Connection-Id": connection_id, "Provider-Config-Key": provider_config_key}),
        json=json or {},
        timeout=_TIMEOUT,
    )
    _raise_for_status(resp)
    return resp


def list_integrations() -> list[dict[str, Any]]:
    """GET /integrations -- every integration configured in this Nango
    account (unique_key, display_name, provider, logo, ...). Used to drive
    the "Connect your ATS" picker so it only ever shows what's actually set
    up in Nango, instead of a hardcoded guess on our side."""
    resp = requests.get(f"{NANGO_BASE_URL}/integrations", headers=_headers(), timeout=_TIMEOUT)
    _raise_for_status(resp)
    return resp.json().get("data", [])


def delete_connection(*, connection_id: str, provider_config_key: str) -> None:
    """DELETE /connections/{connectionId} -- frees the connection slot.
    Only ever call this after a sync has fully succeeded; see
    tasks.run_ats_sync for why a failed sync must NOT reach this call."""
    resp = requests.delete(
        f"{NANGO_BASE_URL}/connections/{connection_id}",
        headers=_headers(),
        params={"provider_config_key": provider_config_key},
        timeout=_TIMEOUT,
    )
    _raise_for_status(resp)
