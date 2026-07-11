import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from redis import Redis
from rq import SimpleWorker as Worker, Queue

redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
conn = Redis.from_url(redis_url)

if __name__ == '__main__':
    worker = Worker(['satori_tasks'], connection=conn)
    worker.work()
