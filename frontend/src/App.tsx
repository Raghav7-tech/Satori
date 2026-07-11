import { useState, useMemo } from 'react';
import { useAnalysis } from './hooks/useAnalysis';
import { Landing } from './components/Landing';
import { RiskTreemap } from './components/RiskTreemap';
import { DependencyGraph } from './components/DependencyGraph';
import { CommitActivityHeatmap } from './components/CommitActivityHeatmap';
import { NodeDetailPanel } from './components/NodeDetailPanel';
import { CommandPalette } from './components/CommandPalette';
import RepoHealthWidget from './components/RepoHealthWidget';
import { ChatPanel } from './components/ChatPanel';
import type { FileNode } from './api/client';
import { Loader2, AlertCircle } from 'lucide-react';

function App() {
  const { state, data, errorMsg, progressMsg, currentJobId, startAnalysis, loadMock } = useAnalysis();
  const [view, setView] = useState<'landing' | 'treemap' | 'graph' | 'activity'>('landing');
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');

  const filteredFiles = useMemo(() => {
    if (!data || !data.files) return [];
    if (!searchQuery.trim()) return data.files;
    const query = searchQuery.toLowerCase();
    return data.files.filter(f => f.path.toLowerCase().includes(query));
  }, [data, searchQuery]);

  const handleNodeClick = (node: FileNode) => {
    setSelectedNode(node);
  };

  const submitAnalysis = (url: string) => {
    setSelectedNode(null);
    startAnalysis(url);
    setView('treemap');
  };

  const openAppAndFocusSearch = () => {
    setView('treemap');
    setTimeout(() => {
      document.getElementById('main-search-input')?.focus();
    }, 100);
  };

  return (
    <>
      <div className="nav">
        <div className="nav-left">
          <div className="logo" onClick={() => { loadMock(); setView('treemap'); }} style={{cursor: 'pointer'}}><img src="/logo.png" alt="" style={{ width: 46, height: 46, borderRadius: 10, boxShadow: '0 0 22px var(--primary-glow)' }} />SATORI</div>
          <div className="nav-links">
            <a href="#features" onClick={() => setView('landing')}>Features</a>
            <a href="#features" onClick={() => setView('landing')}>How it works</a>
          </div>
        </div>
        <div className="nav-toggle3">
          <button className={view === 'landing' ? 'active' : ''} onClick={() => setView('landing')}>Landing</button>
          <button className={view === 'treemap' ? 'active' : ''} onClick={() => setView('treemap')}>Treemap</button>
          <button className={view === 'graph' ? 'active' : ''} onClick={() => setView('graph')}>Graph</button>
          <button className={view === 'activity' ? 'active' : ''} onClick={() => setView('activity')}>Activity</button>
        </div>
        <button className="nav-cta" onClick={openAppAndFocusSearch}>Analyze a repo →</button>
      </div>

      {view === 'landing' && (
        <Landing onAnalyze={openAppAndFocusSearch} />
      )}

      {view !== 'landing' && (
        <div className="app-shell" id={`page-${view}`}>
          <div className="sidebar">
            <div className={`side-icon ${view === 'treemap' ? 'active' : ''}`} onClick={() => setView('treemap')}>▦</div>
            <div className={`side-icon ${view === 'graph' ? 'active' : ''}`} onClick={() => setView('graph')}>◔</div>
            <div className="side-icon">✎</div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div className="toolbar">
              <div className="search-mini">
                <span>🔍</span>
                <input 
                  id="main-search-input"
                  type="text" 
                  placeholder="https://github.com/..." 
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitAnalysis(urlInput)}
                  className="mono"
                />
              </div>
              <div className="search-mini ml-2" style={{ maxWidth: 200 }}>
                <span>🔍</span>
                <input 
                  type="text" 
                  placeholder="Filter files..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="legend-mini">
                <span><span className="d" style={{ background: 'var(--risk-low)' }}></span>Low</span>
                <span><span className="d" style={{ background: 'var(--risk-mid)' }}></span>Medium</span>
                <span><span className="d" style={{ background: 'var(--risk-high)' }}></span>High</span>
              </div>
            </div>
            
            <div className="canvas">
              {data && data.repo_health_grade && (
                <RepoHealthWidget 
                  grade={data.repo_health_grade} 
                  summary={data.repo_health_summary} 
                  maturityScore={data.project_maturity_score} 
                  isZombieRepo={data.is_zombie_repo} 
                />
              )}
              
              {(state === 'submitting' || state === 'polling') && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(8,8,10,0.8)', backdropFilter: 'blur(4px)', zIndex: 40, flexDirection: 'column', gap: '24px' }}>
                  <Loader2 className="animate-spin text-primary w-12 h-12" />
                  <div className="text-center">
                    <p className="text-lg font-medium text-text">{progressMsg}</p>
                    <p className="text-sm text-muted mt-2">This is heavily dependent on repository size.</p>
                  </div>
                </div>
              )}

              {state === 'error' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40 }}>
                  <div className="bg-card border border-red-500/20 rounded-lg p-6 shadow-2xl">
                    <div className="flex items-center gap-3 text-red-400 mb-4">
                      <AlertCircle size={24} />
                      <h3 className="text-lg font-semibold">Unable to process repository</h3>
                    </div>
                    <p className="text-text/80">{typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : String(errorMsg)}</p>
                  </div>
                </div>
              )}
              
              {(!data || !data.files) && state === 'idle' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: 60, opacity: 0.2 }}>⬢</div>
                  <h2>Gain instant visibility into your technical debt.</h2>
                  <p>Enter a public GitHub repository URL above to begin analysis.</p>
                </div>
              )}

              {data && data.files && view === 'treemap' && (
                <RiskTreemap files={filteredFiles} onNodeClick={handleNodeClick} />
              )}

              {data && data.files && view === 'graph' && (
                <DependencyGraph files={data.files} onNodeClick={handleNodeClick} searchQuery={searchQuery} />
              )}

              {data && data.daily_activity && view === 'activity' && (
                <CommitActivityHeatmap data={data.daily_activity} />
              )}

              {data && data.files && <CommandPalette files={filteredFiles} onSelect={handleNodeClick} />}
              
              {selectedNode && (
                <NodeDetailPanel 
                  node={selectedNode} 
                  onClose={() => setSelectedNode(null)} 
                />
              )}
              <ChatPanel state={state} data={data} currentJobId={currentJobId} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;

