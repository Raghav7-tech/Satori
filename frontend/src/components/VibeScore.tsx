import React from 'react';

interface VibeScoreProps {
  score?: number;
}

const VibeScore: React.FC<VibeScoreProps> = ({ score }) => {
  if (score === undefined) {
    return null;
  }

  return (
    <div className="vibe-row">
      🤖 AI-Assistance Likelihood: {score}% — heuristic proxy, not a verdict
    </div>
  );
};

export default VibeScore;
