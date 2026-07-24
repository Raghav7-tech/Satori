# Satori: In-Depth Project Explanation & Interview Guide

This document is designed to help you explain the **Satori** project in a technical interview. It covers the architecture, key design decisions, technical challenges, and potential cross-questions an interviewer might ask.

---

## 1. Project Overview (The "Elevator Pitch")

**What is it?** 
Satori is a full-stack web application that mines the Git history of public GitHub repositories to visualize code risk, technical debt, and team knowledge distribution. 

**What problem does it solve?** 
When developers join a new codebase, they struggle to identify which files are fragile, which are heavily modified (high churn), or which rely entirely on a single contributor (high bus factor). Satori solves this by turning raw git metadata into interactive visualizations (Risk Treemaps and Dependency Graphs) and provides an AI assistant to query the codebase context.

---

## 2. Technical Stack & Architecture

### **Frontend**
*   **Core:** React 18, TypeScript, Vite.
*   **Visualizations:** `@nivo/treemap` (for the risk heatmap), `react-force-graph-2d` (Canvas-based network graph).
*   **Styling:** Tailwind CSS.
*   **Deployment:** Vercel.

### **Backend**
*   **Core API:** FastAPI (Python), Uvicorn.
*   **Git Mining Engine:** `PyDriller` (for parsing git commit history), `GitPython` (for cloning).
*   **Dependency Parsing:** `tree-sitter` (AST parsing for Python/JS).
*   **Database:** MongoDB Atlas (NoSQL Document Store).
*   **Task Queue:** Redis (Upstash) + RQ (Redis Queue) for background processing.
*   **AI Integration:** Google Gemini 1.5 Flash API.
*   **Deployment:** Render (Free Tier).

### **System Architecture Flow**
1. User enters a GitHub URL on the Frontend.
2. Frontend sends a `POST /repos/analyze` request to the FastAPI Backend.
3. Backend immediately returns a `job_id` and enqueues a background task in Redis via RQ.
4. The RQ Worker picks up the task, clones the repo to a temporary directory, uses PyDriller to analyze every commit, calculates risk scores, and parses ASTs for dependencies.
5. The Worker saves the final JSON document to MongoDB and marks the job as "completed".
6. Meanwhile, the Frontend polls `GET /repos/{job_id}/status`. Once completed, it fetches the graph data and renders the Treemap/Graph.

---

## 3. Core Algorithms & Metrics

### How is "Risk" calculated?
The backend calculates a **Risk Score (0.0 to 1.0)** for every file based on three factors:
1.  **Churn:** How frequently the file is modified compared to others.
2.  **Bug Count:** How often the file appears in commits with messages containing "fix", "bug", "patch", etc. (Regex matching on commit messages).
3.  **Bus Factor:** The percentage of commits made by the primary contributor. If one person wrote 95% of a crucial file, the bus factor is high (high risk if they leave).

### How are Dependencies mapped?
We use **Tree-sitter** (an Abstract Syntax Tree parser) rather than basic regex. Tree-sitter parses Python (`import`, `from X import Y`) and JavaScript (`require`, `import`) files to accurately extract file-to-file dependencies, which are then fed into the force-directed graph.

---

## 4. Interview Cross-Questions & Deep Dives

### Q1: Why did you use RQ and Redis instead of just `async/await` in FastAPI?
**Answer:** `async/await` is meant for I/O-bound tasks (like waiting for a database response). Analyzing thousands of git commits using PyDriller and parsing ASTs with Tree-sitter are heavily **CPU-bound** and synchronous operations. If I ran them on the FastAPI main thread, they would block the event loop, causing the entire API to freeze and reject other users' requests. By offloading this to a separate RQ worker process backed by Redis, the API remains lightning fast and scalable.

### Q2: How do you handle massive repositories like React or Linux?
**Answer:** Cloning and analyzing massive repos can cause Out-Of-Memory (OOM) errors and timeout issues. To handle this:
1.  **Pre-flight checks:** Before queuing, I use the GitHub API (authenticated with a PAT to avoid strict rate limits) to check the repository size and commit count. If it exceeds a safety threshold, the backend rejects it early.
2.  **Shallow Clones/Temp Dirs:** The worker securely clones the repo into a temporary directory (`tempfile.TemporaryDirectory`) using `git clone --single-branch`. Once the analysis is done, Python's garbage collector automatically wipes the temp directory so the server's disk doesn't fill up.

### Q3: Why did you choose MongoDB over a SQL database like PostgreSQL?
**Answer:** The output of our Git analysis is a deeply nested, schema-less JSON tree (representing a file system hierarchy with arbitrary metadata like churn, bug counts, and variable-length dependency arrays). 
Mapping this arbitrary tree structure to rigid SQL tables with foreign keys would be extremely inefficient and require complex recursive `JOIN` queries to reconstruct the directory tree for the frontend. MongoDB's document model allows us to store the entire analyzed repository state as a single JSON document, making read operations blazing fast.

### Q4: The Dependency Graph can have thousands of nodes. How did you prevent the browser from freezing?
**Answer:** Initially, rendering thousands of DOM elements or SVG nodes (like standard D3.js approaches) causes massive repaints and DOM lag in React. I solved this by using `react-force-graph-2d`, which renders the entire graph on an **HTML5 Canvas**. Canvas draws pixels directly via the GPU/CPU rather than maintaining thousands of DOM nodes, allowing the physics engine (d3-force) to animate massive graphs at 60fps smoothly.

### Q5: How did you secure the deployment?
**Answer:** 
1.  **CORS Lockdown:** The FastAPI backend's `CORS_ORIGINS` is strictly locked to the Vercel production URL, rejecting API requests from unauthorized domains or Postman.
2.  **Database Scoping:** MongoDB uses a scoped database user that only has read/write access to the specific `satori_db`, rather than cluster admin privileges.
3.  **Environment Variables:** All sensitive keys (Gemini API, GitHub Token, Mongo URI) are injected via Render/Vercel secrets, never committed to git.

### Q6: How does the AI Chat feature work without exceeding context windows?
**Answer:** Instead of feeding the raw code of the entire repository to the LLM (which would exceed token limits and cost too much), we feed the LLM our **analyzed metadata**. We send Gemini the JSON summary of the highest-risk files, architecture dependencies, and team contributor stats. The LLM acts as an analytical engine over our mined metrics, allowing users to ask "Where should I start refactoring?" and getting mathematically backed answers.

### Q7: What happens to Render's free tier sleeping issue?
**Answer:** Render spins down free-tier web services after 15 minutes of inactivity, which would cause a 50-second cold start for the next user. I solved this by implementing a GitHub Actions workflow (`keep-alive.yml`) that runs a `cron` job every 10 minutes to ping the backend's health endpoint, ensuring the API is always warm and responsive.
