from django.db import models
from django.conf import settings

class ConversationManager(models.Manager):
    def get_or_create_room(self, room_name):
        return super().get_or_create(room_name=room_name)



class Conversation(models.Model):
    room_name = models.CharField(max_length=255, unique=True)
    initiator = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name="convo_starter"
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name="convo_participant"
    )
    online = models.ManyToManyField(
        to=settings.AUTH_USER_MODEL,
        blank=True
    )
    start_time = models.DateTimeField(auto_now_add=True)

    objects = ConversationManager()

    def __str__(self):
        return self.room_name or f"{self.initiator.username} started a convo with {self.receiver.username}"

    def get_online_count(self):
        return self.online.count()

    def join(self, user):
        self.online.add(user)
        self.save()

    def leave(self, user):
        self.online.remove(user)
        self.save()


class Message(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                              null=True, related_name='message_sender')
    text = models.TextField(max_length=4000, blank=True)
    attachment = models.FileField(blank=True)
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE,
        related_name="messages"    
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)

    class Meta:
        ordering = ("-timestamp",)
        verbose_name_plural = "chat messages"
        indexes = [
            models.Index(fields=["conversation", "read"]),
            models.Index(fields=["conversation", "-timestamp"]),
        ]

    def __str__(self):
        return f"{self.sender.username} send message to {self.conversation.receiver.username} on {self.timestamp.strftime('%Y-%m-%d:%H:%M:%S')}"

