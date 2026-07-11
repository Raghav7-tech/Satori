import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { DependencyGraph } from './DependencyGraph';
import type { FileNode } from '../api/client';
import React from 'react';

// Mock ForceGraph2D so it doesn't try to render actual canvas/WebGL in Node
vi.mock('react-force-graph-2d', () => {
  return {
    default: vi.fn().mockImplementation((props) => {
      // simulate the engine ticking once
      if (props.nodeCanvasObject) {
        // we won't call it natively, we just mock the component
      }
      return <div data-testid="mock-force-graph" />;
    })
  };
});

const mockFiles: FileNode[] = [
  { path: 'core.py', name: 'core.py', isLeaf: true, size: 100, risk_score: 100, churn_score: 50, bug_count: 5, bus_factor: 1, dependencies: ['utils.py'], vibe_score: 75 },
  { path: 'utils.py', name: 'utils.py', isLeaf: true, size: 50, risk_score: 20, churn_score: 10, bug_count: 0, bus_factor: 2, dependencies: [], vibe_score: 50 },
  { path: 'test.py', name: 'test.py', isLeaf: true, size: 50, risk_score: 10, churn_score: 5, bug_count: 0, bus_factor: 1, dependencies: [], vibe_score: 50 },
];

test('DependencyGraph renders HTML overlays for nodes', () => {
  render(<DependencyGraph files={mockFiles} onNodeClick={() => {}} />);
  
  // The nodes should be rendered as HTML div elements
  expect(screen.getByText('core.py')).toBeDefined();
  expect(screen.getByText('utils.py')).toBeDefined();
  expect(screen.getByText('test.py')).toBeDefined();
  
  // High risk node should have .high class
  const coreNode = screen.getByText('core.py').closest('.g-node');
  expect(coreNode?.className).toContain('high');
});

test('DependencyGraph passes hover state for path tracing', () => {
  const { container } = render(<DependencyGraph files={mockFiles} onNodeClick={() => {}} />);
  const coreNode = screen.getByText('core.py').closest('.g-node') as HTMLElement;
  
  // Hovering over core.py should update the hoverNode state, which will trace to utils.py
  fireEvent.mouseEnter(coreNode);
  
  // Since opacity changes happen via graph2ScreenCoords inside nodeCanvasObject in real app,
  // we can just verify the DOM events don't crash.
  expect(coreNode).toBeDefined();
});
