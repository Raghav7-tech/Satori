import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import sys

load_dotenv(r"d:\Satori\backend\.env")

async def test_scoping():
    uri = os.environ.get("MONGO_URI")
    print(f"Loaded MONGO_URI (prefix): {uri[:30]}...")
    
    client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
    
    try:
        # Test 1: Access allowed database (satori_db)
        print("\n--- Test 1: Access satori_db ---")
        db_allowed = client.get_database("satori_db")
        count = await db_allowed.repos.count_documents({})
        print(f"SUCCESS: Connected to satori_db. Current repos count: {count}")
        
        # Test 2: Access disallowed database (e.g. admin or dummy_db)
        print("\n--- Test 2: Access forbidden database (admin) ---")
        db_forbidden = client.get_database("admin")
        try:
            await db_forbidden.command("ping")
            print("FAILURE: Was able to access admin database!")
            sys.exit(1)
        except Exception as e:
            print(f"SUCCESS: Access to admin database denied as expected.")
            print(f"Error received: {type(e).__name__}: {e}")
            
        print("\n--- Test 3: Access forbidden database (dummy_db) ---")
        db_dummy = client.get_database("dummy_db")
        try:
            await db_dummy.list_collection_names()
            print("FAILURE: Was able to list collections in dummy_db!")
            sys.exit(1)
        except Exception as e:
            print(f"SUCCESS: Access to dummy_db denied as expected.")
            print(f"Error received: {type(e).__name__}: {e}")
            
    except Exception as e:
        print(f"FATAL ERROR: {type(e).__name__}: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_scoping())
