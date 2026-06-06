from django.urls import re_path
from .consumers_v1 import PreScreeningInterviewConsumer

websocket_urlpatterns = [
    re_path(r"ws/pre-screening/interview/$", PreScreeningInterviewConsumer.as_asgi()),
]
