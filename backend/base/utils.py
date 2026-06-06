from django.forms import FileField
from django.http import HttpRequest
from django.conf import settings
import os

def extract_query_from_request(request: HttpRequest, param_name="q"):
    return request.GET.get(param_name)

base_url=os.getenv("BASE_URL", "")
def get_media_url(file):
    if not file:
        return None

    try:
        url = file.url  # handles FileField or ImageField
    except AttributeError:
        url = str(file)  # handles string fallback

    base_url = ""
    if settings.IS_STAGING:
        base_url = ""
    elif settings.IS_DEV:
        base_url = ""
    elif settings.IS_PRODUCTION:
        base_url = ""
    else:
        base_url = ""

    return base_url + url if base_url else url
