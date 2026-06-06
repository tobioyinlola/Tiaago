
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from chats.models import Conversation, Message
from django.db.models import Count, Q

User = get_user_model()

class Command(BaseCommand):
    help = 'Debug chat messages and conversations'

    def handle(self, *args, **options):
        self.stdout.write("=" * 50)
        self.stdout.write("CHAT DEBUG REPORT")
        self.stdout.write("=" * 50)
        
        # Check total conversations
        total_conversations = Conversation.objects.count()
        self.stdout.write(f"\nTotal Conversations: {total_conversations}")
        
        # Check total messages
        total_messages = Message.objects.count()
        self.stdout.write(f"Total Messages: {total_messages}\n")
        
        # List all conversations with message counts
        self.stdout.write("\n" + "-" * 50)
        self.stdout.write("CONVERSATIONS DETAIL:")
        self.stdout.write("-" * 50)
        
        conversations = Conversation.objects.annotate(
            message_count=Count('messages')
        ).order_by('-start_time')
        
        for conv in conversations:
            self.stdout.write(f"\nConversation ID: {conv.id}")
            self.stdout.write(f"  Room Name: {conv.room_name}")
            self.stdout.write(f"  Initiator: {conv.initiator.username if conv.initiator else 'None'}")
            self.stdout.write(f"  Receiver: {conv.receiver.username if conv.receiver else 'None'}")
            self.stdout.write(f"  Message Count: {conv.message_count}")
            self.stdout.write(f"  Created: {conv.start_time}")
            
            # Show last 3 messages
            messages = Message.objects.filter(conversation=conv).order_by('-timestamp')[:3]
            if messages:
                self.stdout.write("  Recent Messages:")
                for msg in messages:
                    sender_name = msg.sender.username if msg.sender else "Unknown"
                    text_preview = msg.text[:50] if msg.text else "No text"
                    self.stdout.write(f"    [{msg.timestamp.strftime('%Y-%m-%d %H:%M')}] {sender_name}: {text_preview}")
            else:
                self.stdout.write("  No messages in this conversation")
        
        # Check for orphaned messages (messages without valid conversation)
        self.stdout.write("\n" + "-" * 50)
        self.stdout.write("CHECKING FOR ISSUES:")
        self.stdout.write("-" * 50)
        
        orphaned_messages = Message.objects.filter(conversation__isnull=True)
        if orphaned_messages.exists():
            self.stdout.write(f"\n⚠️  Found {orphaned_messages.count()} orphaned messages!")
        else:
            self.stdout.write("\n✅ No orphaned messages found")
        
        # Check for conversations with duplicate room_names
        duplicate_rooms = Conversation.objects.values('room_name').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        if duplicate_rooms:
            self.stdout.write(f"\n⚠️  Found duplicate room names:")
            for dup in duplicate_rooms:
                self.stdout.write(f"    Room '{dup['room_name']}': {dup['count']} conversations")
        else:
            self.stdout.write("✅ No duplicate room names found")
        
        # Check WebSocket room name format
        self.stdout.write("\n" + "-" * 50)
        self.stdout.write("ROOM NAME ANALYSIS:")
        self.stdout.write("-" * 50)
        
        for conv in Conversation.objects.all()[:5]:  # Check first 5
            self.stdout.write(f"\nConversation {conv.id}:")
            self.stdout.write(f"  Stored room_name: '{conv.room_name}'")
            self.stdout.write(f"  WebSocket format would be: 'chat_{conv.room_name}'")
            
            # Check if room_name matches expected patterns
            if conv.room_name == "default_room":
                self.stdout.write("  ⚠️  Using default room name")
            elif not conv.room_name:
                self.stdout.write("  ⚠️  Empty room name!")
        
        self.stdout.write("\n" + "=" * 50)
        self.stdout.write("END OF DEBUG REPORT")
        self.stdout.write("=" * 50)