import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import sys

# Test old password and new password to find the valid one
passwords = ["Dhingra2007", "rnPuQXThYJGPgMm3"]

async def find_valid_password():
    for pwd in passwords:
        uri = f"mongodb+srv://raghavdhingrax_db_user:{pwd}@cluster0.dfsvsst.mongodb.net/"
        client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
        try:
            await client.admin.command('ping')
            print(f"Valid password found! Updating .env to use it.")
            # Drop the stray collection if it exists
            db = client.get_database("satori_db")
            if "satori_app_user" in await db.list_collection_names():
                await db.drop_collection("satori_app_user")
                print("Dropped stray satori_app_user collection.")
            client.close()
            return uri
        except Exception as e:
            client.close()
            continue
    print("FATAL: Neither password worked for raghavdhingrax_db_user.")
    sys.exit(1)

if __name__ == "__main__":
    uri = asyncio.run(find_valid_password())
    # Update .env
    env_path = r"d:\Satori\backend\.env"
    with open(env_path, "r") as f:
        lines = f.readlines()
    with open(env_path, "w") as f:
        for line in lines:
            if line.startswith("MONGO_URI="):
                f.write(f"MONGO_URI={uri}\n")
            else:
                f.write(line)
