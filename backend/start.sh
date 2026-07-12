#!/bin/bash
echo "Starting RQ worker..."
rq worker -u $REDIS_URL --worker-class rq.worker.SimpleWorker satori_tasks &

echo "Starting Uvicorn server..."
uvicorn api.main:app --host 0.0.0.0 --port $PORT
