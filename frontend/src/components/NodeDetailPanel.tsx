import type { FileNode } from '../api/client';
import VibeScore from './VibeScore';

interface NodeDetailPanelProps {
  node: FileNode | null;
  onClose: () => void;
}

export const NodeDetailPanel = ({ node, onClose }: NodeDetailPanelProps) => {
  if (!node) return null;
  
  const getRiskClass = (score: number) => {
    if (score < 20) return 'low';
    if (score < 60) return 'mid';
    return 'high';
  };
  
  const riskClass = getRiskClass(node.risk_score);

  return (
    <div className="detail-panel">
      <div className="panel-row">
        <div style={{minWidth: 0}}>
          <div className="panel-title">{node.path.split('/').pop()}</div>
          <div className="panel-path">{node.path}</div>
        </div>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className={`risk-badge ${riskClass}`}>
        <b>{Math.round(node.risk_score)}</b>
        <span>Risk<br/>Score</span>
      </div>

      <div className="stat-grid">
        <div className="stat"><b>{node.churn_score}</b><span>Churn</span></div>
        <div className="stat"><b>{node.bug_count}</b><span>Bugs Fixed</span></div>
        <div className="stat"><b>{node.bus_factor}</b><span>Bus Factor</span></div>
        <div className="stat"><b>{node.dependencies.length}</b><span>Dependencies</span></div>
      </div>

      <VibeScore score={node.vibe_score} />

      {node.recommendations && node.recommendations.length > 0 && (
        <div style={{ background: 'rgba(245,184,78,0.08)', border: '1px solid rgba(245,184,78,0.2)', padding: '14px', borderRadius: '12px' }}>
          <div className="section-label" style={{ color: 'var(--risk-mid)', marginBottom: '10px' }}>Actionable Recommendations</div>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11.5px', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {node.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {node.dependencies.length > 0 && (
        <div>
          <div className="section-label">Depends On</div>
          <div className="dep-list">
            {node.dependencies.map((dep, i) => (
              <div key={i} className="dep-item" title={dep}>{dep}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
