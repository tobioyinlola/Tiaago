from django.urls import path
from . import views

urlpatterns = [
    path(
        "start/<int:user_id>/",
        views.StartConversationView.as_view(),
        name="start_convo",
    ),
    path(
        "get-conversation/<int:convo_id>/",
        views.ConversationDetailView.as_view(),
        name="get_conversation",
    ),
    path("", views.ConversationListView.as_view(), name="conversations"),
    path(
        "unread-messages", views.UnreadMessagesAPIView.as_view(), name="unread_messages"
    ),
    path(
        "health-check/", views.ChatHealthCheckView.as_view(), name="chat_health_check"
    ),
]
