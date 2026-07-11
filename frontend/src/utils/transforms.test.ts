import { describe, it, expect } from 'vitest';
import { buildHierarchy, buildGraphData, getRiskColor } from './transforms';
import type { FileNode } from '../api/client';

describe('Transforms', () => {
  const mockFiles: FileNode[] = [
    {
      path: 'src/index.js',
      churn_score: 10,
      bug_count: 1,
      contributor_count: 2,
      bus_factor: 1,
      risk_score: 50,
      dependencies: ['src/utils.js']
    },
    {
      path: 'src/utils.js',
      churn_score: 5,
      bug_count: 0,
      contributor_count: 1,
      bus_factor: 1,
      risk_score: 10,
      dependencies: []
    },
    {
      path: 'package.json',
      churn_score: 1,
      bug_count: 0,
      contributor_count: 1,
      bus_factor: 1,
      risk_score: 5,
      dependencies: []
    }
  ];

  describe('buildHierarchy', () => {
    it('should nest files correctly by directory path', () => {
      const hierarchy = buildHierarchy(mockFiles);
      
      expect(hierarchy.name).toBe('root');
      expect(hierarchy.children.length).toBe(2); // 'src' and 'package.json'
      
      const srcNode = hierarchy.children.find(c => c.name === 'src');
      expect(srcNode).toBeDefined();
      expect(srcNode.children.length).toBe(2); // 'index.js' and 'utils.js'
      
      const indexNode = srcNode.children.find((c: any) => c.name === 'index.js');
      expect(indexNode).toBeDefined();
      expect(indexNode.size).toBe(11); // churn_score + 1
      expect(indexNode.risk_score).toBe(50);
      expect(indexNode.path).toBe('src/index.js');
    });

    it('should handle flat repositories', () => {
      const flatFiles: FileNode[] = [{
        path: 'main.py',
        churn_score: 0, bug_count: 0, contributor_count: 1, bus_factor: 1, risk_score: 0, dependencies: []
      }];
      const hierarchy = buildHierarchy(flatFiles);
      expect(hierarchy.children.length).toBe(1);
      expect(hierarchy.children[0].name).toBe('main.py');
    });
  });

  describe('buildGraphData', () => {
    it('should create nodes for all files and only links for internal dependencies', () => {
      const { nodes, links } = buildGraphData(mockFiles);
      
      expect(nodes.length).toBe(3);
      expect(nodes[0].id).toBe('src/index.js');
      expect(nodes[0].val).toBe(11); // churn + 1
      
      // index.js depends on utils.js
      expect(links.length).toBe(1);
      expect(links[0].source).toBe('src/index.js');
      expect(links[0].target).toBe('src/utils.js');
    });

    it('should ignore external dependencies that are not in the files list', () => {
      const filesWithExternal: FileNode[] = [
        ...mockFiles,
        {
          path: 'test.js',
          churn_score: 1, bug_count: 0, contributor_count: 1, bus_factor: 1, risk_score: 0,
          dependencies: ['react', 'src/utils.js']
        }
      ];
      
      const { links } = buildGraphData(filesWithExternal);
      
      // Should have link index->utils and test->utils, but NO link to 'react'
      expect(links.length).toBe(2);
      expect(links.find(l => l.target === 'react')).toBeUndefined();
    });

    it('should correctly resolve relative paths to avoid false positives with duplicate basenames', () => {
      const filesWithDuplicates: FileNode[] = [
        {
          path: 'apps/client/src/components/Sidebar.jsx',
          churn_score: 1, bug_count: 0, contributor_count: 1, bus_factor: 1, risk_score: 0,
          dependencies: ['../context/AuthContext']
        },
        {
          path: 'apps/client/src/context/AuthContext.jsx',
          churn_score: 1, bug_count: 0, contributor_count: 1, bus_factor: 1, risk_score: 0,
          dependencies: []
        },
        {
          path: 'apps/admin/src/context/AuthContext.jsx',
          churn_score: 1, bug_count: 0, contributor_count: 1, bus_factor: 1, risk_score: 0,
          dependencies: []
        }
      ];

      const { links } = buildGraphData(filesWithDuplicates);
      
      expect(links.length).toBe(1);
      expect(links[0].source).toBe('apps/client/src/components/Sidebar.jsx');
      expect(links[0].target).toBe('apps/client/src/context/AuthContext.jsx');
    });
  });

  describe('getRiskColor', () => {
    it('should map risk scores to appropriate colors', () => {
      expect(getRiskColor(10)).toBe('#4ade80'); // Green/emerald for low risk
      expect(getRiskColor(45)).toBe('#fbbf24'); // Yellow/amber for medium risk
      expect(getRiskColor(80)).toBe('#f87171'); // Red/crimson for high risk
    });
  });
});
