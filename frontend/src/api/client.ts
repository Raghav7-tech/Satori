import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000', // Assuming default FastAPI port
});

export interface JobStatusResponse {
  job_id: string;
  status: string;
}

export interface RepoStatusResponse {
  status: string;
  error_message?: string;
}

export interface FileNode {
  path: string;
  churn_score: number;
  bug_count: number;
  contributor_count: number;
  bus_factor: number;
  risk_score: number;
  vibe_score?: number;
  dependencies: string[];
  recommendations?: string[];
}

export interface DailyActivity {
  date: string;
  commit_count: number;
  risk_level: 'low' | 'mid' | 'high';
  raw_risk: number;
  risk_score: number;
}

export interface GraphResponse {
  github_url: string;
  last_commit_sha: string;
  status: string;
  repo_health_grade?: string;
  repo_health_summary?: string;
  project_maturity_score?: number;
  is_zombie_repo?: boolean;
  files: FileNode[];
  daily_activity?: DailyActivity[];
  error_message?: string;
}

export const analyzeRepo = async (url: string): Promise<JobStatusResponse> => {
  const response = await api.post('/repos/analyze', { url });
  return response.data;
};

export const getJobStatus = async (jobId: string): Promise<RepoStatusResponse> => {
  const response = await api.get(`/repos/${jobId}/status`);
  return response.data;
};

export const getGraphData = async (jobId: string): Promise<GraphResponse> => {
  const response = await api.get(`/repos/${jobId}/graph`);
  return response.data;
};
