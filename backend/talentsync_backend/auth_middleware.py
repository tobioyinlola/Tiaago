import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import AuthenticationFailed
from channels.middleware import BaseMiddleware
from urllib.parse import parse_qs
from rest_framework_simplejwt.tokens import AccessToken
from channels.exceptions import DenyConnection
from asgiref.sync import sync_to_async
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


@database_sync_to_async
def get_user_by_token(token_key):
    try:
        token = Token.objects.get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return AnonymousUser()

@database_sync_to_async
def get_user_by_id(user_id):
    # Your logic to retrieve user object from user ID
    try:
        user = User.objects.get(pk=user_id)
        return user
    except User.DoesNotExist:
        return AnonymousUser()


def get_user_id_from_jwt(jwt_token):
    # Your logic to decode and extract user ID from JWT token
    try:
        # Remove 'Bearer ' prefix if present
        if jwt_token.startswith('Bearer '):
            jwt_token = jwt_token[7:]
            
        logger.debug("Attempting to decode token: %s", jwt_token[:10] + '...')
        
        # Decode the JWT token
        decoded_token = jwt.decode(
            jwt_token, 
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )
        
        # Try different possible user ID fields
        for field in ['user_id', 'sub', 'id']:
            if field in decoded_token:
                user_id = decoded_token[field]
                logger.debug("Found user_id %s in field %s", user_id, field)
                return user_id
                
        logger.error("No user ID field found in token payload: %s", decoded_token.keys())
        raise KeyError("No user ID field found in token")
        
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        raise AuthenticationFailed('Expired token')
    except jwt.InvalidTokenError as e:
        logger.warning("Invalid token: %s", str(e))
        raise AuthenticationFailed(f'Invalid token: {str(e)}')
    except KeyError as e:
        logger.warning("Missing user ID in token: %s", str(e))
        raise AuthenticationFailed(f'Invalid token format: {str(e)}')


# class TokenAuthMiddleware(BaseMiddleware):

#     def __init__(self, inner):
#         self.inner = inner

#     async def __call__(self, scope, receive, send):
#         headers = dict(scope['headers'])
#         if b'authorization' in headers:
#             token_name, token_key = headers[b'authorization'].decode().split()
#             if token_name == 'Token':
#                 scope['user'] = await get_user(token_key)
#         return await super().__call__(scope, receive, send)

# class CookieMiddleware(BaseMiddleware):

#     def __init__(self, inner):
#         self.inner = inner

#     async def __call__(self, scope, receive, send):
#         # Access specific cookie by name
#         query_string = str(scope['query_string'])
#         try:
#             jwt_token = query_string.split('=')[1].replace("'", "")
#             if jwt_token:
#                 # Process the JWT token or perform authentication
#                 # Example: You can use dj_rest_auth.utils.jwt_decode_handler to decode the token
#                 try:
#                     user_id = get_user_id_from_jwt(jwt_token)
#                 except AuthenticationFailed:
#                     user_id = None
#                 if user_id:
#                     # Attach user object to the scope
#                     scope['user'] = await get_user_by_id(user_id)
#                 else:
#                     scope['user'] = AnonymousUser()
#             return await super().__call__(scope, receive, send)
#         except IndexError:
#             return await super().__call__(scope, receive, send)


class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware to authenticate users via JWT in WebSocket connections.
    """

    async def __call__(self, scope, receive, send):
        # Extract query params
        query_string = scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        logger.info("🔑 Incoming WebSocket connection...")
        logger.debug(f"Query string: {query_string}")
        logger.debug(f"Extracted token: {token}")

        if token:
            try:
                # Validate token using SimpleJWT UntypedToken
                validated_token = UntypedToken(token)
                payload = validated_token.payload
                user_id = payload.get("user_id")

                logger.info(f"✅ Token valid for user_id={user_id}")
                logger.debug(f"Token payload: {payload}")

                scope["user"] = await self.get_user(user_id)

            except (InvalidToken, TokenError) as e:
                logger.warning(f"❌ Token validation failed: {e}")
                scope["user"] = None
        else:
            logger.warning("⚠️ No token provided in WebSocket connection.")
            scope["user"] = None

        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            logger.error(f"🚫 User with id={user_id} not found in DB")
            return None
