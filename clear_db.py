import asyncio
import os
from dotenv import load_dotenv

load_dotenv(r"d:\Satori\backend\.env")

from backend.db.client import connect_to_mongo, get_repos_collection, close_mongo_connection

async def clear_click():
    await connect_to_mongo()
    col = get_repos_collection()
    await col.delete_many({"owner": "pallets", "repo": "click"})
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(clear_click())
