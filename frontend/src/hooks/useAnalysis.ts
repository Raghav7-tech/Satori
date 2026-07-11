import { useState, useCallback, useRef } from 'react';
import { analyzeRepo, getJobStatus, getGraphData } from '../api/client';
import type { GraphResponse } from '../api/client';
import { AxiosError } from 'axios';
import { mockGraphData } from '../mockData';

export type AnalysisState = 'idle' | 'submitting' | 'polling' | 'success' | 'error';

export const useAnalysis = () => {
  const [state, setState] = useState<AnalysisState>('idle');
  const [data, setData] = useState<GraphResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  
  const pollingCountRef = useRef(0);
  const MAX_POLLS = 150; // 5 minutes at 2s interval

  const startAnalysis = useCallback(async (url: string) => {
    setState('submitting');
    setErrorMsg(null);
    setData(null);
    setCurrentJobId(null);
    setProgressMsg('Submitting repository...');
    pollingCountRef.current = 0;

    try {
      const { job_id, status } = await analyzeRepo(url);
      setCurrentJobId(job_id);
      
      if (status === 'done') {
        // Re-analysis bypass hit, immediate fetch
        fetchGraph(job_id);
      } else {
        setState('polling');
        setProgressMsg('Waiting for analysis to start...');
        pollStatus(job_id);
      }
    } catch (err: any) {
      handleApiError(err);
    }
  }, []);

  const handleApiError = (err: any) => {
    setState('error');
    if (err instanceof AxiosError && err.response) {
      const status = err.response.status;
      if (status === 503) {
        setErrorMsg('GitHub API is currently timing out. Please try again later.');
      } else if (status === 400 || status === 422) {
        // e.g. validation error or oversized repo
        setErrorMsg(err.response.data?.detail || 'Validation error occurred.');
      } else if (status === 404) {
        setErrorMsg('Analysis job expired or not found.');
      } else {
        setErrorMsg('An unexpected error occurred.');
      }
    } else {
      setErrorMsg(err.message || 'Network error occurred.');
    }
  };

  const fetchGraph = async (jobId: string) => {
    try {
      const result = await getGraphData(jobId);
      setData(result);
      setState('success');
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const pollStatus = async (jobId: string) => {
    try {
      const { status, error_message } = await getJobStatus(jobId);
      
      if (status === 'done') {
        fetchGraph(jobId);
        return;
      }
      
      if (status === 'failed') {
        setState('error');
        setErrorMsg(error_message || 'Analysis failed internally.');
        return;
      }
      
      // Still pending or processing
      pollingCountRef.current += 1;
      
      if (pollingCountRef.current > MAX_POLLS) {
        setState('error');
        setErrorMsg('Analysis timed out after 5 minutes.');
        return;
      }
      
      if (pollingCountRef.current > 30) {
        setProgressMsg('Taking longer than expected... (this is normal for large repos)');
      } else if (status === 'processing') {
        setProgressMsg('Analyzing repository history (this may take a minute)...');
      }
      
      setTimeout(() => pollStatus(jobId), 2000);
      
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const loadMock = useCallback(() => {
    setState('success');
    setErrorMsg(null);
    setData(mockGraphData);
    setCurrentJobId('pallets/click');
  }, []);

  return { state, data, errorMsg, progressMsg, currentJobId, startAnalysis, loadMock };
};
