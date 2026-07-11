import type { GraphResponse } from './api/client';

export const mockGraphData: GraphResponse = {
  github_url: 'https://github.com/mock/repo',
  last_commit_sha: 'abc123mock',
  status: 'done',
  repo_health_grade: 'C',
  repo_health_summary: 'Significant technical debt across critical modules.',
  project_maturity_score: 85,
  is_zombie_repo: false,
  files: [
    {
      path: 'src/main.py',
      churn_score: 95,
      bug_count: 12,
      contributor_count: 5,
      bus_factor: 1,
      risk_score: 85,
      vibe_score: 42,
      dependencies: ['src/utils/helpers.py', 'src/db/connection.py']
    },
    {
      path: 'src/db/connection.py',
      churn_score: 40,
      bug_count: 2,
      contributor_count: 2,
      bus_factor: 2,
      risk_score: 45,
      vibe_score: 75,
      dependencies: ['src/config.py']
    },
    {
      path: 'src/utils/helpers.py',
      churn_score: 80,
      bug_count: 5,
      contributor_count: 8,
      bus_factor: 3,
      risk_score: 70,
      dependencies: []
    },
    {
      path: 'src/config.py',
      churn_score: 10,
      bug_count: 0,
      contributor_count: 1,
      bus_factor: 1,
      risk_score: 20,
      dependencies: []
    },
    {
      path: 'src/api/routes.py',
      churn_score: 90,
      bug_count: 8,
      contributor_count: 4,
      bus_factor: 1,
      risk_score: 92,
      dependencies: ['src/db/connection.py', 'src/services/auth.py', 'src/utils/helpers.py']
    },
    {
      path: 'src/services/auth.py',
      churn_score: 60,
      bug_count: 3,
      contributor_count: 3,
      bus_factor: 2,
      risk_score: 65,
      dependencies: ['src/db/connection.py']
    },
    {
      path: 'src/services/billing.py',
      churn_score: 30,
      bug_count: 1,
      contributor_count: 2,
      bus_factor: 2,
      risk_score: 35,
      dependencies: ['src/db/connection.py']
    },
    {
      path: 'frontend/src/App.tsx',
      churn_score: 75,
      bug_count: 6,
      contributor_count: 3,
      bus_factor: 1,
      risk_score: 78,
      dependencies: ['frontend/src/components/Header.tsx', 'frontend/src/hooks/useData.ts']
    },
    {
      path: 'frontend/src/components/Header.tsx',
      churn_score: 20,
      bug_count: 1,
      contributor_count: 4,
      bus_factor: 4,
      risk_score: 15,
      dependencies: []
    },
    {
      path: 'frontend/src/hooks/useData.ts',
      churn_score: 85,
      bug_count: 7,
      contributor_count: 2,
      bus_factor: 1,
      risk_score: 88,
      dependencies: ['frontend/src/api/client.ts']
    },
    {
      path: 'frontend/src/api/client.ts',
      churn_score: 45,
      bug_count: 2,
      contributor_count: 2,
      bus_factor: 2,
      risk_score: 50,
      dependencies: []
    },
    {
      path: 'docs/readme.md',
      churn_score: 5,
      bug_count: 0,
      contributor_count: 10,
      bus_factor: 5,
      risk_score: 5,
      dependencies: []
    },
    {
      path: 'tests/test_main.py',
      churn_score: 65,
      bug_count: 2,
      contributor_count: 3,
      bus_factor: 2,
      risk_score: 60,
      dependencies: ['src/main.py']
    },
    {
      path: 'tests/test_auth.py',
      churn_score: 40,
      bug_count: 1,
      contributor_count: 2,
      bus_factor: 2,
      risk_score: 42,
      dependencies: ['src/services/auth.py']
    },
    {
      path: 'scripts/deploy.sh',
      churn_score: 15,
      bug_count: 0,
      contributor_count: 1,
      bus_factor: 1,
      risk_score: 25,
      dependencies: []
    }
  ]
};
