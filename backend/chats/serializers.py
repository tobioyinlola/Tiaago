from rest_framework import serializers

from create_user.api.serializers import SimpleUserSerializer
from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):

    class Meta:
        model = Message
        exclude = ('conversation',)


class ConversationListSerializer(serializers.ModelSerializer):
    #initiator = SimpleUserSerializer()
    #receiver = SimpleUserSerializer()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.IntegerField(read_only=True)
    other_user = serializers.SerializerMethodField()
    

    class Meta:
        model = Conversation
        fields = ['id', 'other_user', 'last_message', 'unread_count', 'room_name']

    def get_other_user(self, obj):
        """Returns the user that the current user is chatting with."""
        request = self.context.get('request')
        if request:
            current_user = request.user
            other_user = obj.receiver if obj.initiator == current_user else obj.initiator
            return SimpleUserSerializer(other_user).data if other_user else None
        return None

    def get_last_message(self, obj):
        """Returns the last message in the conversation."""
        message = Message.objects.filter(conversation=obj).order_by('-timestamp').first()
        if message:
            return {
                "id": message.id,
                "text": message.text,
                "sender": message.sender.username if message.sender else None,
                "timestamp": message.timestamp.isoformat(),
                "read": message.read
            }
        return None
    

class ConversationSerializer(serializers.ModelSerializer):
    initiator = SimpleUserSerializer()
    receiver = SimpleUserSerializer()
    messages = MessageSerializer(many=True)

    class Meta:
        model = Conversation
        fields = ('id', 'initiator', 'receiver', 'messages', 'online', 'room_name')
