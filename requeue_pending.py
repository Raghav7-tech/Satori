import os
from dotenv import load_dotenv
from pymongo import MongoClient
from redis import Redis
from rq import Queue

load_dotenv(r"d:\Satori\backend\.env")

client = MongoClient(os.environ["MONGO_URI"])
db = client["satori_db"]

redis_conn = Redis.from_url(os.environ["REDIS_URL"])
q = Queue("satori_tasks", connection=redis_conn)

pending_repos = list(db.repos.find({"status": "pending"}))
print(f"Found {len(pending_repos)} pending repos to re-enqueue.")

for repo in pending_repos:
    repo_id = repo["_id"]
    github_url = repo.get("github_url", f"https://github.com/{repo_id}")
    print(f"Re-enqueuing: {repo_id}")
    q.enqueue("backend.worker.tasks.analyze_task", repo_id, github_url, job_timeout=600)

print("Done!")
