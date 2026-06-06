from django.contrib import admin

from .models import (
    Conversation,
    Message
)

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    model = Conversation
    list_display = ('id', 'initiator', 'receiver', 'start_time')


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    model = Message
    list_display = ('id', 'sender', 'text', 'read', 'conversation', 'timestamp')