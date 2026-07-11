import asyncio
import os
from dotenv import load_dotenv

load_dotenv(r"d:\Satori\backend\.env")
from backend.db.client import connect_to_mongo, get_repos_collection, close_mongo_connection

async def test():
    try:
        await connect_to_mongo()
        col = get_repos_collection()
        count = await col.count_documents({})
        print("Connected to DB successfully using:", os.environ.get("MONGO_URI"))
        print("Document count:", count)
        await close_mongo_connection()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test())
