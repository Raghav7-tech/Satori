import asyncio
import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    uri = os.environ.get("MONGO_URI") or os.environ.get("MONGODB_URI")
    client = AsyncIOMotorClient(uri)
    db = client.get_database("satori_db")
    repos = await db.repos.find({"status": {"$in": ["processing", "pending"]}}).to_list(100)
    for repo in repos:
        print(f"Stuck Job: {repo['_id']} - Status: {repo['status']}")
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
