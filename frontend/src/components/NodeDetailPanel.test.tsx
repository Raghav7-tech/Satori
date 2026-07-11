import { render } from '@testing-library/react';
import { expect, test } from 'vitest';
import { NodeDetailPanel } from './NodeDetailPanel';
import type { FileNode } from '../api/client';
import React from 'react';

const mockNode: FileNode = {
  path: 'src/click/core.py',
  name: 'src/click/core.py',
  isLeaf: true,
  size: 100,
  risk_score: 85,
  churn_score: 50,
  bug_count: 5,
  bus_factor: 1,
  dependencies: [],
  vibe_score: 75
};

test('NodeDetailPanel uses flex layout and not absolute', () => {
  const { container } = render(<NodeDetailPanel node={mockNode} onClose={() => {}} />);
  const panel = container.firstChild as HTMLElement;
  
  // Checking CSS classes on the root element
  expect(panel.className).toContain('detail-panel');
  // It shouldn't have absolute positioning classes
  expect(panel.className).not.toContain('absolute');
  expect(panel.className).not.toContain('right-0');
  expect(panel.className).not.toContain('top-0');
});
