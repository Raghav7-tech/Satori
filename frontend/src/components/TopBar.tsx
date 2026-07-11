import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import type { AnalysisState } from '../hooks/useAnalysis';

import type { GraphResponse } from '../api/client';

interface TopBarProps {
  onAnalyze: (url: string) => void;
  status: AnalysisState;
  viewMode: 'treemap' | 'graph';
  onViewChange: (mode: 'treemap' | 'graph') => void;
  onLoadMock?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  data: GraphResponse | null;
}

export const TopBar = ({ onAnalyze, status, viewMode, onViewChange, onLoadMock, searchQuery, onSearchChange, data }: TopBarProps) => {
  const [url, setUrl] = useState('');

  const handleExportCSV = () => {
    if (!data || !data.files) return;
    const header = ['File Path', 'Risk Score', 'Churn Score', 'Bug Count', 'Bus Factor', 'Vibe Score', 'Dependencies'];
    const rows = data.files.map(f => [
      f.path,
      f.risk_score,
      f.churn_score,
      f.bug_count,
      f.bus_factor,
      f.vibe_score || 'N/A',
      f.dependencies.length
    ]);
    const csvContent = [header, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const urlBlob = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", urlBlob);
    link.setAttribute("download", "satori_analysis.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onAnalyze(url.trim());
    }
  };

  const isBusy = status === 'submitting' || status === 'polling';

  return (
    <div className="topbar">
      <div className="logo"><span className="logo-mark"></span>Satori</div>
      
      <form onSubmit={handleSubmit} className="flex-1 max-w-xl" style={{ display: 'flex' }}>
        <div className="search-bar">
          <Search size={15} />
          <input
            type="text"
            className="mono"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            disabled={isBusy}
          />
        </div>
      </form>

      <div className="view-toggle">
        <button
          onClick={() => onViewChange('treemap')}
          className={viewMode === 'treemap' ? 'active' : ''}
        >
          Treemap
        </button>
        <button
          onClick={() => onViewChange('graph')}
          className={viewMode === 'graph' ? 'active' : ''}
        >
          Graph
        </button>
      </div>

      <div className="legend">
        <span className="legend-dot"><span className="dot" style={{ background: 'var(--risk-low)' }}></span>Low</span>
        <span className="legend-dot"><span className="dot" style={{ background: 'var(--risk-mid)' }}></span>Medium</span>
        <span className="legend-dot"><span className="dot" style={{ background: 'var(--risk-high)' }}></span>High</span>
      </div>

      {data && (
        <div className="search-bar" style={{ maxWidth: '200px' }}>
          <Search size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter files..."
          />
        </div>
      )}

      {isBusy && (
        <div className="flex items-center text-primary text-sm gap-2">
          <Loader2 className="animate-spin" size={16} />
        </div>
      )}

      {import.meta.env.DEV && onLoadMock && (
        <button
          onClick={onLoadMock}
          className="px-3 py-1 bg-primary/20 text-primary hover:bg-primary/30 rounded-md text-sm font-medium transition-colors border border-primary/30"
          title="Dev only: Bypass API and load mock data"
        >
          Mock
        </button>
      )}

      {data && (
        <button
          onClick={handleExportCSV}
          className="px-3 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-md text-sm font-medium transition-colors border border-blue-500/30"
        >
          CSV
        </button>
      )}
    </div>
  );
};
