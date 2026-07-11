import requests
import time
import sys

API_URL = "http://127.0.0.1:8000"
REPO_URL = "https://github.com/pallets/click"

print(f"Submitting analysis for {REPO_URL}...")
response = requests.post(f"{API_URL}/repos/analyze", json={"url": REPO_URL})

if response.status_code not in (200, 202):
    print(f"Error submitting analysis: {response.text}")
    sys.exit(1)

data = response.json()
job_id = data["job_id"]
print(f"Analysis submitted successfully. Job ID: {job_id}")

while True:
    print("Checking status...")
    status_resp = requests.get(f"{API_URL}/repos/{job_id}/status")
    
    if status_resp.status_code != 200:
        print(f"Error checking status: {status_resp.text}")
        sys.exit(1)
        
    status_data = status_resp.json()
    status = status_data["status"]
    
    if status == "completed":
        print(f"SUCCESS: Analysis completed! Repo Health Grade: {status_data.get('repo_health_grade')}")
        sys.exit(0)
    elif status == "failed":
        print(f"FAILED: Analysis failed. Error: {status_data.get('error_message')}")
        sys.exit(1)
    
    time.sleep(3)
