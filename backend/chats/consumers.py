import json
import logging
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
import base64
import os
from django.core.files.base import ContentFile
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction
from utils.online_tracker import OnlineTracker
from .models import Message, Conversation 

User = get_user_model()
tracker = OnlineTracker()
logger = logging.getLogger(__name__)


class ChatConsumer(AsyncWebsocketConsumer):
    MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024  # 2MB cap

    async def connect(self):
        self.room_id = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_id}"
        self.user = self.scope["user"]
        
        logger.info(f"WebSocket connection attempt - Room: {self.room_id}, User: {self.user}")

        if not self.user or not getattr(self.user, "is_authenticated", False):
            logger.warning(f"Unauthenticated user attempted to connect to room {self.room_id}")
            await self.close()
            return

        if not self._user_belongs_to_room():
            logger.warning(
                f"User {self.user.username} denied access to room {self.room_id}: not a participant"
            )
            await self.close()
            return

        # Check if conversation exists
        conversation = await self.get_or_create_conversation()
        if not conversation:
            logger.error(f"Failed to get/create conversation for room {self.room_id}")
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "Failed to initialize conversation"
            }))
            await self.close()
            return

        if not self._is_conversation_participant(conversation):
            logger.warning(
                f"User {self.user.username} denied access to room {self.room_id}: "
                f"conversation belongs to other users"
            )
            await self.close()
            return
            
        logger.info(f"Conversation found/created: ID={conversation.id}, Room={conversation.room_name}")
            
        # Join room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name) 
        await self.accept()

        # Add user to Redis tracker
        await tracker.add_user(self.room_id, self.user.username)

        # Load and send existing messages
        messages = await self.get_conversation_messages(conversation)
        await self.send(text_data=json.dumps({
            "type": "message_history",
            "messages": messages
        }))

        # Broadcast user online status
        users = await tracker.get_users(self.room_id)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "user_status",
                "user": self.user.username,
                "online": True,
                "message": f"{self.user.username} is online.",
                "users": list(users),
            },
        )

        # Send system message back to user
        await self.send(
            text_data=json.dumps(
                {
                    "type": "system",
                    "message": f"Connected to room {self.room_id} as {self.user.username}",
                    "conversation_id": conversation.id,
                    "room_name": conversation.room_name
                }
            )
        )

        # Start heartbeat task to keep connection healthy and close stale sockets
        self._heartbeat_interval_seconds = 25
        self._heartbeat_timeout_seconds = 60
        self._last_pong_monotonic = asyncio.get_event_loop().time()
        self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())

    async def disconnect(self, close_code):
        logger.info(f"User {self.user.username} disconnecting from room {self.room_id}")

        # Stop heartbeat task
        heartbeat_task = getattr(self, "_heartbeat_task", None)
        if heartbeat_task:
            try:
                heartbeat_task.cancel()
                await heartbeat_task
            except asyncio.CancelledError:
                pass
        
        # Remove user from Redis tracker
        await tracker.remove_user(self.room_id, self.user.username)

        # Broadcast offline status
        users = await tracker.get_users(self.room_id)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "user_status",
                "user": self.user.username,
                "online": False,
                "message": f"{self.user.username} is offline.",
                "users": list(users),
            },
        )

        # Leave group
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        logger.info(f"Received message from {self.user.username} in room {self.room_id}: {text_data[:100] if text_data else 'No data'}")
        
        if not text_data:
            await self.send(
                text_data=json.dumps(
                    {"type": "error", "message": "Empty payload received"}
                )
            )
            return
            
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            await self.send(
                text_data=json.dumps(
                    {"type": "error", "message": "Invalid JSON payload"}
                )
            )
            return

        message_type = data.get("type", "text")
        message_text = data.get("message", "")
        attachment = data.get("attachment")

        # Early reject oversized attachments (2MB cap)
        if attachment:
            try:
                file_info = attachment.get('file') if isinstance(attachment, dict) else None
                file_content = file_info.get('content') if isinstance(file_info, dict) else None
                if file_content and isinstance(file_content, str):
                    if ',' in file_content:
                        file_content = file_content.split(',')[1]
                    # Estimate decoded bytes without decoding
                    base = file_content.rstrip('=')
                    estimated_bytes = (len(base) * 3) // 4
                    if estimated_bytes > self.MAX_ATTACHMENT_BYTES:
                        await self.send(
                            text_data=json.dumps({
                                "type": "error",
                                "message": "Attachment too large. Max size is 2MB."
                            })
                        )
                        return
            except Exception as e:
                logger.warning(f"Attachment size pre-check failed: {e}")

        # Heartbeat handling
        if message_type == "pong":
            # Client responded to ping
            self._last_pong_monotonic = asyncio.get_event_loop().time()
            return
        if message_type == "ping":
            # Respond if client pings first
            await self.send(text_data=json.dumps({"type": "pong"}))
            self._last_pong_monotonic = asyncio.get_event_loop().time()
            return

        if message_type in ["text", "file"] and (message_text or attachment):
            try:
                # Extract receiver_id from the message if present
                receiver_id = data.get("receiver_id")
                
                # Save to DB
                saved_message = await self.save_message(message_text, attachment, receiver_id)
                
                if saved_message:
                    logger.info(f"Message saved successfully: ID={saved_message['id']}")
                    
                    # Broadcast to group
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            "type": "chat_message",
                            "id": saved_message["id"],
                            "sender_id": saved_message["sender_id"],
                            "sender_username": saved_message["sender_username"],
                            "receiver_id": saved_message["receiver_id"],
                            "receiver_username": saved_message["receiver_username"],
                            "message": saved_message["message"],
                            "timestamp": saved_message["timestamp"],
                        },
                    )
                else:
                    logger.error("Failed to save message - no message returned")
                    await self.send(
                        text_data=json.dumps({
                            "type": "error",
                            "message": "Failed to save message"
                        })
                    )
            except Exception as e:
                logger.error(f"Error saving message: {str(e)}", exc_info=True)
                await self.send(
                    text_data=json.dumps({
                        "type": "error", 
                        "message": f"Failed to save message: {str(e)}"
                    })
                )

        

    # Handlers for messages sent to the group
    async def chat_message(self, event):
        await self.send(
            text_data=json.dumps({
                "type": "chat_message",
                "id": event.get("id"),
                "sender_id": event["sender_id"],
                "sender_username": event["sender_username"],
                "receiver_id": event["receiver_id"],
                "receiver_username": event["receiver_username"],
                "message": event["message"],
                "timestamp": event.get("timestamp", ""),
                "attachment": event.get("attachment")
            })
        )

    async def user_status(self, event):
        await self.send(
            text_data=json.dumps({
                "type": "status",
                "user": event["user"],
                "online": event["online"],
                "message": event["message"],
                "users": event["users"],
            })
        )

    

    async def _heartbeat_loop(self):
        """Periodically send ping and close connection if no pong within timeout."""
        try:
            while True:
                await asyncio.sleep(self._heartbeat_interval_seconds)

                # Send ping to client
                try:
                    await self.send(text_data=json.dumps({
                        "type": "ping",
                        "ts": timezone.now().isoformat(),
                    }))
                except Exception as e:
                    logger.warning(f"Failed to send ping to {self.user.username} in room {self.room_id}: {e}")

                # Check timeout using monotonic time
                now = asyncio.get_event_loop().time()
                if now - self._last_pong_monotonic > self._heartbeat_timeout_seconds:
                    logger.info(
                        f"Heartbeat timeout; closing socket for user {self.user.username} in room {self.room_id}"
                    )
                    # Close will trigger disconnect cleanup
                    await self.close()
                    break
        except asyncio.CancelledError:
            # Graceful exit on task cancellation
            raise

    def _user_belongs_to_room(self):
        """Room names are room_<id1>_<id2> (sorted user ids set by StartConversationView).
        The connecting user's id must be one of the two."""
        parts = self.room_id.split("_")
        if len(parts) != 3 or parts[0] != "room":
            return False
        return str(self.user.id) in parts[1:]

    def _is_conversation_participant(self, conversation):
        """The user must be the initiator or receiver of the conversation.
        Conversations created over WS may not have a receiver yet; in that case
        the room-name check already guarantees the user is one of the two
        intended parties, so only a fully-populated conversation can exclude."""
        if conversation.initiator_id is None or conversation.receiver_id is None:
            return True
        return self.user.id in (conversation.initiator_id, conversation.receiver_id)

    @database_sync_to_async
    def get_or_create_conversation(self):
        """Get or create a conversation for the room"""
        try:
            conversation = Conversation.objects.filter(room_name=self.room_id).first()
            
            if not conversation:
                # Check if user can create conversation
                if hasattr(self.user, 'is_company') and self.user.is_company():
                    logger.info(f"Creating new conversation for room {self.room_id} by company user {self.user.username}")
                    conversation = Conversation.objects.create(
                        room_name=self.room_id,
                        initiator=self.user
                    )
                else:
                    logger.warning(f"Non-company user {self.user.username} tried to create conversation for room {self.room_id}")
                    return None
            
            return conversation
        except Exception as e:
            logger.error(f"Error in get_or_create_conversation: {str(e)}", exc_info=True)
            return None

    @database_sync_to_async
    def process_attachment(self, attachment_data):
        """Process a base64 encoded file attachment"""
        try:
            # Extract file info from the data
            file_info = attachment_data.get('file')
            if not file_info:
                return None

            # Get the base64 content and file name
            file_content = file_info.get('content')
            file_name = file_info.get('name')
            
            if not file_content or not file_name:
                return None

            # Remove the base64 prefix if present (e.g., "data:image/jpeg;base64,")
            if ',' in file_content:
                file_content = file_content.split(',')[1]

            # Enforce size cap again (defense in depth)
            base = file_content.rstrip('=')
            estimated_bytes = (len(base) * 3) // 4
            if estimated_bytes > self.MAX_ATTACHMENT_BYTES:
                logger.warning("Attachment rejected: exceeds 2MB cap")
                return None

            # Decode the base64 content
            try:
                file_data = base64.b64decode(file_content)
            except Exception as e:
                logger.error(f"Error decoding base64 content: {str(e)}")
                return None

            # Create a unique filename to avoid conflicts
            name, ext = os.path.splitext(file_name)
            unique_filename = f"{name}_{str(timezone.now().timestamp())}{ext}"

            # Create a Django file object
            return ContentFile(file_data, name=unique_filename)
            
        except Exception as e:
            logger.error(f"Error processing attachment: {str(e)}")
            return None

    @database_sync_to_async
    def get_conversation_messages(self, conversation):
        """Load existing messages for a conversation"""
        try:
            messages = Message.objects.filter(
                conversation=conversation
            ).select_related('sender').order_by('timestamp')[:50]  # Last 50 messages
            
            if conversation.receiver is None or conversation.initiator is None:
                logger.warning(f"Conversation missing receiver or initiator: receiver={conversation.receiver}, initiator={conversation.initiator}")

            result = []
            for msg in messages:
                receiver_id = None
                receiver_username = None
                
                # Determine receiver based on conversation participants
                if conversation.receiver and conversation.initiator:
                    if msg.sender == conversation.initiator:
                        receiver_id = conversation.receiver.id if conversation.receiver else None
                        receiver_username = conversation.receiver.username if conversation.receiver else None
                    else:
                        receiver_id = conversation.initiator.id if conversation.initiator else None
                        receiver_username = conversation.initiator.username if conversation.initiator else None

                result.append({
                    "id": msg.id,
                    "sender_id": msg.sender.id if msg.sender else None,
                    "sender_username": msg.sender.username if msg.sender else "Unknown",
                    "receiver_id": receiver_id,
                    "receiver_username": receiver_username,
                    "message": msg.text,
                    "timestamp": msg.timestamp.isoformat(),
                    "attachment": msg.attachment.url if msg.attachment else None
                })
            
            return result
        except Exception as e:
            logger.error(f"Error loading messages: {str(e)}", exc_info=True)
            return []

    @database_sync_to_async
    @transaction.atomic
    def save_message(self, message_text, attachment_data=None, receiver_id=None):
        """Save a message to the database"""
        try:
            # Get conversation
            conversation = Conversation.objects.filter(room_name=self.room_id).first()
            
            if not conversation:
                logger.error(f"No conversation found for room {self.room_id}")
                # Try to create one if user is a company
                if hasattr(self.user, 'is_company') and self.user.is_company():
                    # If we have receiver_id, get the receiver user
                    receiver = None
                    if receiver_id:
                        from django.contrib.auth import get_user_model
                        User = get_user_model()
                        receiver = User.objects.filter(id=receiver_id).first()
                        if receiver:
                            logger.info(f"Found receiver user: {receiver.username}")
                    
                    conversation = Conversation.objects.create(
                        room_name=self.room_id,
                        initiator=self.user,
                        receiver=receiver
                    )
                    logger.info(f"Created new conversation with ID {conversation.id}")
                else:
                    raise ValueError(f"Conversation does not exist for room {self.room_id}")
            
            # Update receiver if not set but receiver_id is provided
            elif conversation.receiver is None and receiver_id:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                receiver = User.objects.filter(id=receiver_id).first()
                if receiver:
                    conversation.receiver = receiver
                    conversation.save()
                    logger.info(f"Updated conversation {conversation.id} with receiver: {receiver.username}")

            # Process attachment if present
            attachment_file = None
            if attachment_data:
                attachment_file = self.process_attachment(attachment_data)
                if not attachment_file:
                    logger.warning("Failed to process attachment")

            # Create message
            msg = Message.objects.create(
                sender=self.user,
                text=message_text,
                conversation=conversation,
                attachment=attachment_file if attachment_file else None
            )

            # Log for debugging
            logger.info(f"Message created: ID={msg.id}, Conversation={conversation.id}, Sender={self.user.username}")

            # Verify message was saved
            saved_msg = Message.objects.get(id=msg.id)
            logger.info(f"Message verified in DB: ID={saved_msg.id}")

            # Defensive checks for receiver and initiator
            if conversation.receiver is None or conversation.initiator is None:
                logger.warning(f"Conversation missing receiver or initiator: receiver={conversation.receiver}, initiator={conversation.initiator}")
            receiver_id = None
            receiver_username = None
            if conversation.receiver and conversation.initiator:
                if self.user == conversation.initiator:
                    receiver_id = conversation.receiver.id
                    receiver_username = conversation.receiver.username
                else:
                    receiver_id = conversation.initiator.id
                    receiver_username = conversation.initiator.username
            else:
                # Fallback: use None or self.user
                receiver_id = None
                receiver_username = None

            return {
                "id": msg.id,
                "sender_id": self.user.id if self.user else None,
                "sender_username": getattr(self.user, "username", None),
                "receiver_id": receiver_id,
                "receiver_username": receiver_username,
                "message": msg.text,
                "timestamp": msg.timestamp.isoformat(),
                "attachment": msg.attachment.url if msg.attachment else None
            }
            
        except Exception as e:
            logger.error(f"Error in save_message: {str(e)}", exc_info=True)
            raise

