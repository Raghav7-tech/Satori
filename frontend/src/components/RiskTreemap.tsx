import { ResponsiveTreeMapHtml } from '@nivo/treemap';
import type { FileNode } from '../api/client';
import { useMemo } from 'react';
import { buildHierarchy } from '../utils/transforms';

interface RiskTreemapProps {
  files: FileNode[];
  onNodeClick: (node: any) => void;
}

const getDisplayName = (path: string) => {
  const parts = path.split('/');
  if (parts.length > 1) {
    return parts.slice(-2).join('/');
  }
  return path;
};

const CustomHtmlNode = ({ node }: any) => {
  const isLeaf = node.isLeaf;
  
  if (!isLeaf) {
    const isTinyParent = node.width < 20 || node.height < 20;
    return (
      <div
        style={{
          position: 'absolute',
          top: node.y,
          left: node.x,
          width: Math.max(0, node.width),
          height: Math.max(0, node.height),
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: isTinyParent ? 2 : 8,
          boxSizing: 'border-box'
        }}
      />
    );
  }

  const risk = node.data.risk_score || 0;
  let riskClass = 'low';
  if (risk >= 60) riskClass = 'high';
  else if (risk >= 20) riskClass = 'mid';

  const showLabel = node.width > 50 && node.height > 40;
  const isTinyLeaf = node.width < 34 || node.height < 34;
  
  const displayName = node.data.name.startsWith('Other (') ? node.data.name : getDisplayName(node.data.path);

  return (
    <div
      className={`tile ${riskClass}`}
      style={{
        position: 'absolute',
        top: node.y,
        left: node.x,
        width: Math.max(0, node.width),
        height: Math.max(0, node.height),
        padding: isTinyLeaf ? 0 : undefined,
        borderRadius: isTinyLeaf ? 4 : undefined,
        boxSizing: 'border-box'
      }}
      onMouseEnter={node.onMouseEnter}
      onMouseMove={node.onMouseMove}
      onMouseLeave={node.onMouseLeave}
      onClick={node.onClick}
    >
      {showLabel && (
        <>
          <div className="tile-label" title={node.data.path}>{displayName}</div>
          <div className="tile-score">RISK {Math.round(risk)}</div>
        </>
      )}
    </div>
  );
};

export const RiskTreemap = ({ files, onNodeClick }: RiskTreemapProps) => {
  const processedFiles = useMemo(() => {
    // Sort by risk * churn (impact)
    const sorted = [...files].sort((a, b) => {
      const impactA = a.risk_score * (a.churn_score + 1);
      const impactB = b.risk_score * (b.churn_score + 1);
      return impactB - impactA;
    });

    const MAX_TILES = 35;
    if (sorted.length <= MAX_TILES) return sorted;

    const top = sorted.slice(0, MAX_TILES);
    const rest = sorted.slice(MAX_TILES);
    
    // Create an aggregate file node for the rest
    const avgRisk = rest.reduce((acc, f) => acc + f.risk_score, 0) / rest.length;
    const totalChurn = rest.reduce((acc, f) => acc + f.churn_score, 0);
    const totalBugs = rest.reduce((acc, f) => acc + f.bug_count, 0);

    top.push({
      path: `Other (${rest.length} files)`,
      name: `Other (${rest.length} files)`,
      risk_score: avgRisk,
      churn_score: totalChurn,
      bug_count: totalBugs,
      bus_factor: 1,
      dependencies: []
    } as any);

    return top;
  }, [files]);

  const data = useMemo(() => buildHierarchy(processedFiles), [processedFiles]);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <ResponsiveTreeMapHtml
        data={data}
        identity="name"
        value="size"
        valueFormat=".02s"
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        innerPadding={16}
        outerPadding={12}
        animate={false}
        nodeComponent={CustomHtmlNode}
        tooltip={({ node }: any) => {
          if (!node.isLeaf) return null;
          const risk = Math.min(100, Math.round(node.data.risk_score || 0));
          return (
            <div style={{ background: 'var(--card)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}>
              <strong>{node.data.name}</strong>
              <div style={{ color: 'var(--muted)', marginTop: '4px' }}>Risk Score: {risk}/100</div>
            </div>
          );
        }}
        onClick={(node) => {
          if (node.data && node.data.path && !node.data.path.startsWith('Other (')) {
            onNodeClick(node.data);
          }
        }}
      />
    </div>
  );
};
