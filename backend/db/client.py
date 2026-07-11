import os
from motor.motor_asyncio import AsyncIOMotorClient

# Get Mongo URI from env, default to local docker instance
MONGO_URI = os.environ.get("MONGODB_URI", os.environ.get("MONGO_URI", "mongodb://localhost:27017"))
DB_NAME = os.environ.get("MONGO_DB_NAME", "satori_db")

class Database:
    client: AsyncIOMotorClient = None
    
    @classmethod
    def get_db(cls):
        if cls.client is None:
            cls.client = AsyncIOMotorClient(MONGO_URI)
        return cls.client[DB_NAME]

db = Database()

async def connect_to_mongo():
    Database.client = AsyncIOMotorClient(MONGO_URI)
    
async def close_mongo_connection():
    if Database.client:
        Database.client.close()

def get_repos_collection():
    return db.get_db()["repos"]
