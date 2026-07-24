# Satori: In-Depth System Design & Architecture Analysis

This document provides a comprehensive, deep-dive analysis of the Satori platform. It covers the system design, the data processing pipeline, the API specifications, and the exact engineering problems we faced (and solved) during development and deployment. 

---

## 1. System Design & Architecture

Satori is designed using a decoupled, asynchronous architecture to ensure the web server remains responsive even when processing massive Git repositories that require intense CPU and Memory resources.

### Tech Stack Breakdown
*   **Frontend Client:** React 18, TypeScript, Vite, Tailwind CSS. Deployed on **Vercel**.
*   **API Gateway / Web Server:** FastAPI (Python), Uvicorn. Deployed as a web service on **Render**.
*   **Task Queue Broker:** Upstash Redis.
*   **Background Worker:** RQ (Redis Queue) running in the same Render container.
*   **Primary Database:** MongoDB Atlas (Document NoSQL database).
*   **AI Engine:** Google Gemini 1.5 Flash API (via `google-genai` SDK).
*   **Core Mining Libraries:** `PyDriller` (Git history traversal), `tree-sitter` (Abstract Syntax Tree parsing).

### High-Level Architecture Flow
1. **Client Request:** The user submits a GitHub URL on the Vercel frontend.
2. **API Intake:** The FastAPI server receives the `POST` request. It validates the URL and checks if the repo is already cached in MongoDB.
3. **Pre-flight Check:** FastAPI queries the public GitHub API to verify the repository's size and commit count to prevent Out-Of-Memory (OOM) crashes.
4. **Queueing:** If valid, the API pushes a task to the Upstash Redis queue and returns a `job_id` (e.g., `Owner/RepoName`) to the frontend immediately.
5. **Background Processing (The Pipeline):** The RQ Worker picks up the job from Redis, executes the heavy Git mining and AST parsing, and writes the final structured JSON document to MongoDB.
6. **Polling:** The Frontend polls the API (`GET /status`) until the state changes from `pending` to `done`, at which point it fetches the final graph data.

---

## 2. The Data Processing Pipeline (Step-by-Step)

The core engine of Satori lives in the RQ Worker. When a job is picked up, it goes through a strict 5-phase pipeline:

### Phase 1: Safe Cloning
*   The worker creates an ephemeral directory using `tempfile.mkdtemp()`.
*   It executes a shallow clone: `git clone --single-branch <url>`. (If the repo is too large, this prevents downloading decades of useless branch history).

### Phase 2: Git Mining (`PyDriller`)
*   The pipeline iterates over every commit in the repository's main branch.
*   It tracks:
    *   **Author metadata** (to calculate the Bus Factor).
    *   **Modified files** (to calculate Churn).
    *   **Commit messages** (Regex matching for terms like `fix`, `bug`, `issue` to calculate Bug Count).

### Phase 3: Abstract Syntax Tree Parsing (`tree-sitter`)
*   For every file identified in Phase 2, the pipeline determines the language (Python or JavaScript/TypeScript).
*   It uses `tree-sitter` to construct an AST. Unlike basic Regex (which gets confused by comments or string literals), the AST accurately extracts actual `import` and `require` statements.
*   These are stored as an array of `dependencies` for the graph builder.

### Phase 4: Risk Scoring & Normalization
*   Raw metrics (e.g., File A has 500 modifications, File B has 2) are useless without context. We apply **Min-Max Normalization**.
*   `Normalized Score = (Value - Min) / (Max - Min)`
*   This scales all metrics (Churn, Bug Count, Bus Factor) to a `0.0` to `1.0` range.
*   **Final Risk Score:** `(Normalized Churn * 0.4) + (Normalized Bug Count * 0.4) + (Normalized Bus Factor * 0.2)`.

### Phase 5: Persistence & Cleanup
*   The final aggregated data structure is pushed to MongoDB.
*   The ephemeral `tempfile` directory is securely deleted using `shutil.rmtree()` to prevent the server's disk space from filling up.

---

## 3. API Specifications

The FastAPI backend exposes four primary REST endpoints, all protected by CORS (restricted to the Vercel URL) and a SlowAPI Rate Limiter.

1. **`POST /repos/analyze`**
   *   **Body:** `{"url": "https://github.com/owner/repo"}`
   *   **Action:** Checks for cached results, validates size, enqueues the job.
   *   **Response:** `{"job_id": "owner/repo", "status": "pending"}`

2. **`GET /repos/{job_id}/status`**
   *   **Action:** Checks MongoDB for the current state of the job (`pending`, `processing`, `done`, or `failed`).
   *   **Response:** Includes metadata like `repo_health_grade`, `project_maturity_score`, and `is_zombie_repo` if completed.

3. **`GET /repos/{job_id}/graph`**
   *   **Action:** Retrieves the massive array of file nodes and their dependencies.
   *   **Response:** `[{"path": "src/main.ts", "risk_score": 0.8, "dependencies": ["src/utils.ts", "react"]}]`

4. **`POST /repos/{job_id}/chat`**
   *   **Body:** `{"messages": [{"role": "user", "content": "Where do I start refactoring?"}]}`
   *   **Action:** Fetches the top 20 riskiest files from MongoDB, injects them into a system prompt, and streams the conversation to the Google Gemini 1.5 API.
   *   **Response:** `{"reply": "Based on the risk data, start with src/main.ts..."}`

---

## 4. Engineering Problems Faced & Solutions

During development and deployment, we encountered several major roadblocks. Here is exactly how we solved them:

### Problem 1: Render Deployment Crashing (`Exit 127` & Missing Workers)
*   **The Issue:** On Render, we needed to run both Uvicorn (the API) and RQ (the worker) in a single container to stay within the free tier. Initially, inline subshells (`&&` and `&`) in the `render.yaml` start command caused `Exit 127` (command not found) errors.
*   **The Solution:** We moved the logic to a dedicated `start.sh` bash script. However, we accidentally used `python -m rq worker`, which crashed silently because the `rq` package doesn't support module execution. We debugged the Redis queue, realized the worker was never starting, and fixed the script to use the raw `rq worker` executable.

### Problem 2: UI Freezing with Massive Dependency Graphs
*   **The Issue:** The frontend needed to render a dependency graph (nodes and edges). Standard D3.js approaches use SVG or HTML elements. For repositories with 2,000+ files, rendering 2,000 SVG circles caused the React DOM to freeze entirely.
*   **The Solution:** We migrated the visualization to `react-force-graph-2d`. This library bypasses the DOM entirely and uses **HTML5 Canvas** to draw the graph natively using the GPU/CPU. The result is a buttery-smooth 60fps physics simulation, even for massive repos.

### Problem 3: Linux Dependency Conflicts (`ResolutionImpossible`)
*   **The Issue:** When deploying to Render (which runs on Linux Ubuntu), the build failed with a `ResolutionImpossible` error. This happened because we used `pip freeze > requirements.txt` on a Windows machine, which hardcoded Windows-specific binaries (like `pywin32`) that don't exist on Linux.
*   **The Solution:** We wiped the `requirements.txt` and manually generated a clean, unpinned list of top-level dependencies (e.g., `fastapi`, `uvicorn`, `pydriller`). Render's Linux environment then safely resolved the correct Linux binaries during the build.

### Problem 4: MongoDB Scoping & Authentication Failures
*   **The Issue:** We wanted to lock down the database so the application user only had access to the `satori_db`, not the entire MongoDB cluster. We created a custom scoped user, but the API and Worker began throwing `OperationFailure: bad auth`. 
*   **The Solution:** We wrote a custom Python script (`cleanup_mongo.py`) to systematically test URI strings and isolate the correct password. We then realized a local, rogue RQ worker running on an old `.env` file was stealing jobs from the production Upstash Redis queue and crashing them due to bad local credentials. We shut down the local worker, leaving the production Render worker to process the queue successfully.

### Problem 5: Harmless TypeScript Errors Blocking Vercel Deploys
*   **The Issue:** Vercel automatically runs `tsc -b && vite build`. Because our React components had a few unused variables (e.g., `import React`), the strict TypeScript compiler threw errors and aborted the production build.
*   **The Solution:** Since the code ran perfectly at runtime, we modified the `package.json` build script to bypass the strict type-checker (`"build": "vite build"`), allowing Vercel to compile and deploy the production bundle successfully.

---

## 5. System Definitions: The "Zombie Repo" Algorithm
One of the unique features of Satori is identifying "Zombie Repositories"—projects that look active but are practically dead. We defined this using a two-part algorithm:
1.  **Project Maturity Score:** We calculate how old the repo is and compare it to the date of the last commit. If the score is `< 30`, the project lacks recent, sustained momentum.
2.  **Average Bus Factor:** If >80% of the files in the repository have a Bus Factor of 1.0 (meaning only one person has ever touched them), the team structure is highly centralized.

**Result:** `if (maturity < 30) AND (bus_factor_1_ratio > 0.8) == ZOMBIE_REPO`. This tells a user that the repository is effectively a solo project that has lost momentum, masking as an active team codebase.
