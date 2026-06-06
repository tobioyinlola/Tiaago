from django.contrib.auth import get_user_model
from django.db.models import Q, Count, Max
from django.shortcuts import redirect, reverse
from rest_framework.generics import (
    CreateAPIView,
    ListAPIView,
    RetrieveAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.status import (
    HTTP_400_BAD_REQUEST,
    HTTP_403_FORBIDDEN,
    HTTP_404_NOT_FOUND,
    HTTP_200_OK,
)
# Removed incorrect base.models import as we use django.db.models
from subscriptions.permissions import IsCompanyRepOrTalentUser, IsCompanyRepUser
from create_user.models import CustomUser
from .models import Conversation
from .serializers import ConversationListSerializer, ConversationSerializer
import logging
from django.db import IntegrityError
from rest_framework.filters import SearchFilter
from .models import Message 

User = get_user_model()


class StartConversationView(CreateAPIView):
    Conversation.objects.all()
    serializer_class = ConversationSerializer
    permission_classes = [IsCompanyRepUser]

    def post(self, request, *args, **kwargs):
        user_id = kwargs.pop("user_id")
        try:
            participant = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"message": "You cannot chat with a non existent user"},
                status=HTTP_400_BAD_REQUEST,
            )

        if request.user == participant:
            return Response(
                {"message": "You cannot chat with yourself"}, status=HTTP_403_FORBIDDEN
            )

        if (
            request.user.user_type == CustomUser.USER_TYPE.TALENT
            and participant.user_type == CustomUser.USER_TYPE.TALENT
        ):
            return Response(
                {"message": "Talent to Talent conversation not allowed"},
                status=HTTP_403_FORBIDDEN,
            )

        if (
            request.user.user_type == CustomUser.USER_TYPE.COMPANY_REP
            and participant.user_type == CustomUser.USER_TYPE.COMPANY_REP
        ):
            return Response(
                {"message": "company_rep to company_rep conversation not allowed"},
                status=HTTP_403_FORBIDDEN,
            )

        conversation = Conversation.objects.filter(
            Q(initiator=request.user, receiver=participant)
            | Q(initiator=participant, receiver=request.user)
        )
        if conversation.exists():
            return Response(ConversationSerializer(instance=conversation.first()).data)
        else:
            # Generate a unique room name using sorted user IDs
            user_ids = sorted([request.user.id, participant.id])
            room_name = f"room_{user_ids[0]}_{user_ids[1]}"
            try:
                conversation, created = Conversation.objects.get_or_create(
                    initiator=request.user,
                    receiver=participant,
                    room_name=room_name
                )
                return Response(ConversationSerializer(instance=conversation).data)
            except IntegrityError:
                conversation = Conversation.objects.get(room_name=room_name)
                return Response(ConversationSerializer(instance=conversation).data)


class ConversationDetailView(RetrieveAPIView):
    serializer_class = ConversationSerializer
    queryset = Conversation.objects.all()
    permission_classes = [IsCompanyRepOrTalentUser]
    

    def retrieve(self, request, *args, **kwargs):
        conversation = Conversation.objects.filter(id=kwargs["convo_id"])
        if not conversation.exists():
            return Response(
                {"message": "Conversation does not exist"}, status=HTTP_404_NOT_FOUND
            )
        else:
            serializer = ConversationSerializer(instance=conversation[0])

        # mark all messages as read automatically (except those sent by the current user)....still working on this part(the read and unread feature)
            Message.objects.filter(conversation=conversation[0], read=False).exclude(sender=request.user).update(read=True)
            return Response(serializer.data)




class ConversationListView(ListAPIView):
    serializer_class = ConversationListSerializer
    queryset = Conversation.objects.all()
    permission_classes = [IsCompanyRepOrTalentUser]
    filter_backends = [SearchFilter]
    search_fields = ['initiator__username', 'receiver__username']

    def get_queryset(self):
        # Get conversations where user is either initiator or receiver
        conversation_list = Conversation.objects.filter(
            Q(initiator=self.request.user) | Q(receiver=self.request.user)
        ).prefetch_related('messages')
        
        # Filter conversations that have messages and order by latest message
        conversation_list = conversation_list.filter(messages__isnull=False).distinct()
        
        # Annotate with last message timestamp for ordering....still working on the unread message count feature
        conversation_list = conversation_list.annotate(
            last_message_time=Max('messages__timestamp'),
            unread_count=Count(
                'messages',
                filter=Q(messages__read=False) & ~Q(messages__sender_id=self.request.user.id),
            )
        ).order_by('-last_message_time')

        return conversation_list

class UnreadMessagesAPIView(APIView):
    permission_classes = [IsCompanyRepOrTalentUser]

    def get(self, request):
        user_convos = Conversation.objects.prefetch_related("messages").filter(
            Q(initiator=request.user) | Q(receiver=request.user)
        )
        filter_statement = Count(
            "messages",
            filter=Q(messages__read=False) & ~Q(messages__sender_id=request.user.id),
        )
        unread_convos = user_convos.annotate(unread_messages=filter_statement)
        result = [
            {"conversation_id": convo.id, "unread_messages": convo.unread_messages}
            for convo in unread_convos
        ]
        return Response(data=result)


class ChatHealthCheckView(APIView):
    """
    Health check endpoint for chat system
    """
    permission_classes = [IsCompanyRepOrTalentUser]

    def get(self, request):
        origin = f"{request.scheme}://{request.get_host()}"
        host = request.get_host()

        health_status = {
            "status": "success",
            "message": "Chat system is working",
            "origin": origin,
            "host": host,
            "checks": {},
            "websocket_url": f"ws://{request.get_host()}/ws/chat/",
            "websocket_url_secure": f"wss://{request.get_host()}/ws/chat/",
        }

        try:
            # Check 1: User Authentication
            if not request.user.is_authenticated:
                health_status["status"] = "error"
                health_status["message"] = "User not authenticated"
                health_status["checks"]["authentication"] = {
                    "status": "failed",
                    "message": "User not authenticated"
                }
                return Response(health_status, status=HTTP_403_FORBIDDEN)
            
            health_status["checks"]["authentication"] = {
                "status": "passed",
                "user_id": request.user.id,
                "user_type": getattr(request.user, 'user_type', None)
            }

            # Check 2: Database Connection
            try:
                user_convos = Conversation.objects.filter(
                    Q(initiator=request.user) | Q(receiver=request.user)
                )
                health_status["checks"]["database"] = {
                    "status": "passed",
                    "conversations_count": user_convos.count()
                }
            except Exception as e:
                health_status["checks"]["database"] = {
                    "status": "failed",
                    "message": str(e)
                }
                health_status["status"] = "error"

            # Check 3: Redis Connection
            try:
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync
                
                channel_layer = get_channel_layer()
                test_group = "health_check_test"
                test_channel = "test_channel"
                
                # Test Redis operations
                async_to_sync(channel_layer.group_add)(test_group, test_channel)
                async_to_sync(channel_layer.group_send)(test_group, {
                    "type": "test.message",
                    "text": "health_check"
                })
                async_to_sync(channel_layer.group_discard)(test_group, test_channel)
                
                health_status["checks"]["redis"] = {
                    "status": "passed",
                    "message": "Redis connection and operations working"
                }
            except Exception as e:
                health_status["checks"]["redis"] = {
                    "status": "failed",
                    "message": f"Redis error: {str(e)}"
                }
                health_status["status"] = "error"

            # Check 4: WebSocket Routing
            try:
                import chats.routing
                websocket_patterns = chats.routing.websocket_urlpatterns
                health_status["checks"]["websocket_routing"] = {
                    "status": "passed",
                    "patterns_count": len(websocket_patterns),
                    "patterns": [str(pattern.pattern) for pattern in websocket_patterns]
                }
            except Exception as e:
                health_status["checks"]["websocket_routing"] = {
                    "status": "failed",
                    "message": f"WebSocket routing error: {str(e)}"
                }
                health_status["status"] = "error"

            # Check 5: ASGI Application
            try:
                from talentsync_backend.asgi import application
                if hasattr(application, 'application_mapping'):
                    protocols = list(application.application_mapping.keys())
                    if 'websocket' in protocols:
                        health_status["checks"]["asgi_application"] = {
                            "status": "passed",
                            "protocols": protocols
                        }
                    else:
                        health_status["checks"]["asgi_application"] = {
                            "status": "failed",
                            "message": "WebSocket protocol not configured"
                        }
                        health_status["status"] = "error"
                else:
                    health_status["checks"]["asgi_application"] = {
                        "status": "failed",
                        "message": "ASGI application not properly configured"
                    }
                    health_status["status"] = "error"
            except Exception as e:
                health_status["checks"]["asgi_application"] = {
                    "status": "failed",
                    "message": f"ASGI error: {str(e)}"
                }
                health_status["status"] = "error"

            # Determine overall status
            failed_checks = [check for check in health_status["checks"].values() 
                           if check.get("status") == "failed"]
            
            if failed_checks:
                health_status["status"] = "error"
                health_status["message"] = f"Chat system has {len(failed_checks)} failed checks"
            else:
                health_status["message"] = "All chat system components are healthy"

            return Response(health_status, status=HTTP_200_OK)

        except Exception as e:
            logging.error(f"Chat health check error: {str(e)}")
            return Response({
                "status": "error",
                "message": f"Chat system error: {str(e)}",
                "checks": {}
            }, status=HTTP_400_BAD_REQUEST)
