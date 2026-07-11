import React from 'react';

interface RepoHealthWidgetProps {
  grade?: string;
  summary?: string;
  maturityScore?: number;
  isZombieRepo?: boolean;
}

const RepoHealthWidget: React.FC<RepoHealthWidgetProps> = ({ grade, summary, maturityScore, isZombieRepo }) => {
  if (!grade) return null;

  return (
    <div className={`health-widget ${grade}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="grade-circle">
          {grade}
        </div>
        <div className="health-text">
          <div className="h-title">Repo Health: {grade}</div>
          <div className="h-sub">{summary || "Analysis complete."}</div>
        </div>
      </div>
      
      {maturityScore !== undefined && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
          <div style={{ color: 'var(--muted-dim)' }}>
            Maturity Score: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{maturityScore}/100</span>
          </div>
          {isZombieRepo && (
            <div style={{ background: 'rgba(242,96,107,0.15)', color: 'var(--risk-high)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, border: '1px solid rgba(242,96,107,0.3)' }}>
              ZOMBIE REPO
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RepoHealthWidget;
