import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import App from './App';
import * as client from './api/client';
import React from 'react';

vi.mock('./api/client', () => ({
  analyzeRepo: vi.fn(),
  getJobStatus: vi.fn(),
  getGraphData: vi.fn(),
}));

vi.mock('./components/RiskTreemap', () => ({
  RiskTreemap: ({ onNodeClick }: any) => (
    <div data-testid="mock-treemap" onClick={() => onNodeClick({ path: 'test.ts', churn_score: 1, bug_count: 0, bus_factor: 1, risk_score: 10, dependencies: [] })}>
      Treemap
    </div>
  )
}));

vi.mock('./components/DependencyGraph', () => ({
  DependencyGraph: () => <div data-testid="mock-graph">Graph</div>
}));

describe('App', () => {
  it('renders landing page initially', () => {
    render(<App />);
    expect(screen.getByText(/See where your codebase/i)).toBeDefined();
  });

  it('submits URL and handles polling', async () => {
    vi.mocked(client.analyzeRepo).mockResolvedValueOnce({ job_id: 'test/repo', status: 'pending' });
    vi.mocked(client.getJobStatus).mockResolvedValueOnce({ status: 'done' });
    vi.mocked(client.getGraphData).mockResolvedValueOnce({
      github_url: 'test',
      last_commit_sha: '123',
      status: 'done',
      files: [{ path: 'test.ts', churn_score: 1, bug_count: 0, contributor_count: 1, bus_factor: 1, risk_score: 10, dependencies: [] }]
    });

    render(<App />);
    
    // Switch to Treemap view directly to get the input
    const treemapBtn = screen.getAllByText('Treemap')[0];
    fireEvent.click(treemapBtn);

    const input = screen.getByPlaceholderText('https://github.com/...');
    fireEvent.change(input, { target: { value: 'https://github.com/test/repo' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(client.analyzeRepo).toHaveBeenCalledWith('https://github.com/test/repo');
    
    // Should show loading state
    expect(screen.getByText('Submitting repository...')).toBeDefined();

    // Eventually should show graph (we default to treemap)
    await waitFor(() => {
      expect(screen.getByTestId('mock-treemap')).toBeDefined();
    });
  });

  it('shares selectedNode state between Treemap and Graph views', async () => {
    vi.mocked(client.analyzeRepo).mockResolvedValueOnce({ job_id: 'test/repo', status: 'done' });
    vi.mocked(client.getGraphData).mockResolvedValueOnce({
      github_url: 'test',
      last_commit_sha: '123',
      status: 'done',
      files: [{ path: 'test.ts', churn_score: 1, bug_count: 0, contributor_count: 1, bus_factor: 1, risk_score: 10, dependencies: [] }]
    });

    render(<App />);
    const treemapBtn = screen.getAllByText('Treemap')[0];
    fireEvent.click(treemapBtn);

    const input = screen.getByPlaceholderText('https://github.com/...');
    fireEvent.change(input, { target: { value: 'https://github.com/test/repo' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByTestId('mock-treemap')).toBeDefined();
    });

    // Simulate clicking a node in the Treemap
    const treemapMock = screen.getByTestId('mock-treemap');
    act(() => { fireEvent.click(treemapMock); });
    
    // The detail panel should now be visible and display the file path
    expect(screen.getAllByText('test.ts').length).toBeGreaterThan(0);

    // Toggle the view to Graph (via sidebar or topbar)
    const graphButton = screen.getAllByText('Graph')[0];
    act(() => { fireEvent.click(graphButton); });
    
    expect(screen.getByTestId('mock-graph')).toBeDefined();
    // Detail panel should STILL be visible with test.ts selected
    expect(screen.getAllByText('test.ts').length).toBeGreaterThan(0);
  });

  it('handles API errors gracefully', async () => {
    const error = new AxiosError('Timeout', 'ECONNABORTED', undefined, undefined, {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: {}
    });

    vi.mocked(client.analyzeRepo).mockRejectedValueOnce(error);

    render(<App />);
    
    const treemapBtn = screen.getAllByText('Treemap')[0];
    fireEvent.click(treemapBtn);

    const input = screen.getByPlaceholderText('https://github.com/...');
    fireEvent.change(input, { target: { value: 'https://github.com/test/repo' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Analysis Failed')).toBeDefined();
      expect(screen.getByText('GitHub API is currently timing out. Please try again later.')).toBeDefined();
    });
  });
});
