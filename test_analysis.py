import asyncio
import os
from dotenv import load_dotenv

load_dotenv(r"d:\Satori\backend\.env")

from backend.worker.tasks import mine_repository
from backend.db.client import connect_to_mongo, get_repos_collection, close_mongo_connection

async def run_analysis():
    # Connect to MongoDB first so the client is available
    await connect_to_mongo()
    
    repo_owner = "pallets"
    repo_name = "click"
    
    print(f"Starting analysis for {repo_owner}/{repo_name}...")
    try:
        # process_repository usually runs in a separate process, but we can call it here.
        # However, it's an async or sync function? Let's assume it handles its own asyncio loop or is sync.
        # Wait, if we are in an event loop, running a sync function that creates an event loop might fail.
        # Let's run it in an executor just in case it's sync.
        
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, mine_repository, repo_owner, repo_name)
        print("Analysis completed successfully!")
        
        col = get_repos_collection()
        doc = await col.find_one({"owner": repo_owner, "repo": repo_name})
        if doc:
            print("Verified: Document successfully saved in satori_db.repos!")
        else:
            print("Error: Document not found in DB.")
            
    except Exception as e:
        print(f"Analysis failed: {e}")
        
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(run_analysis())
