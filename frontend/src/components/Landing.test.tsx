import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { Landing } from './Landing';
import React from 'react';

test('Landing page renders properly and triggers analysis', () => {
  const onAnalyze = vi.fn();
  render(<Landing onAnalyze={onAnalyze} />);
  
  expect(screen.getByText(/See where your codebase/i)).toBeDefined();
  expect(screen.getByText(/Onboarding shouldn't require tribal knowledge/i)).toBeDefined();
  
  const btn = screen.getAllByText(/Analyze your repo/i)[0];
  fireEvent.click(btn);
  expect(onAnalyze).toHaveBeenCalledTimes(1);
});
