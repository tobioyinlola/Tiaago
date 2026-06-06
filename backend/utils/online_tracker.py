import redis.asyncio as redis
import environ

env = environ.Env()
REDIS_URL = env("REDIS_URL", default="redis://127.0.0.1:6379/0")

class OnlineTracker:
    def __init__(self, redis_url=REDIS_URL):
        self.redis = redis.from_url(redis_url, decode_responses=True,)

    async def add_user(self, room, username):
        await self.redis.sadd(f"room:{room}:online", username)

    async def remove_user(self, room, username):
        await self.redis.srem(f"room:{room}:online", username)

    async def get_users(self, room):
        return await self.redis.smembers(f"room:{room}:online")
