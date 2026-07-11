import { useRef, useMemo, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { FileNode } from '../api/client';
import { buildGraphData, HIGH_RISK_THRESHOLD } from '../utils/transforms';

interface DependencyGraphProps {
  files: FileNode[];
  onNodeClick: (node: any) => void;
  searchQuery?: string;
}

export const DependencyGraph = ({ files, onNodeClick, searchQuery = "" }: DependencyGraphProps) => {
  const fgRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const domNodesRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // We need to keep a ref to the current hover state so that the canvas render loop
  // (which runs outside React's render cycle) can access the latest value.
  const hoverNodeRef = useRef<any>(null);
  const [hoverNodeState, setHoverNodeState] = useState<any>(null);

  const setHoverNode = (node: any) => {
    hoverNodeRef.current = node;
    setHoverNodeState(node);
  };

  const visibleNodesRef = useRef<Set<string> | null>(null);
  
  // Resizing state
  const manualScalesRef = useRef<Record<string, number>>({});
  const resizeStateRef = useRef<{ id: string, startX: number, startScale: number } | null>(null);
  
  // Dragging state
  const dragNodeRef = useRef<{ id: string, node: any, startX: number, startY: number, initX: number, initY: number } | null>(null);

  useEffect(() => {
    // Resize & Drag listeners
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (resizeStateRef.current) {
        // Drag right to increase scale
        const dx = e.clientX - resizeStateRef.current.startX;
        const newScale = Math.max(0.4, resizeStateRef.current.startScale + (dx * 0.015));
        manualScalesRef.current[resizeStateRef.current.id] = newScale;
      } else if (dragNodeRef.current && fgRef.current) {
        // Handle direct node drag
        const zoom = fgRef.current.zoom() || 1;
        const dx = (e.clientX - dragNodeRef.current.startX) / zoom;
        const dy = (e.clientY - dragNodeRef.current.startY) / zoom;
        
        const node = dragNodeRef.current.node;
        node.fx = dragNodeRef.current.initX + dx;
        node.fy = dragNodeRef.current.initY + dy;
        
        // Reheat to update connected links
        fgRef.current.d3ReheatSimulation();
      }
    };
    
    const handleGlobalMouseUp = () => {
      if (resizeStateRef.current) {
        resizeStateRef.current = null;
      }
      if (dragNodeRef.current) {
        // Leave node.fx / node.fy populated so it stays pinned where dropped
        dragNodeRef.current = null;
      }
    };
    
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    // Initial positioning graph ticks to let layout settle
    let ticks = 0;
    const interval = setInterval(() => {
      if (fgRef.current && ticks < 40) {
        fgRef.current.d3ReheatSimulation();
        ticks++;
      } else {
        clearInterval(interval);
      }
    }, 50);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);
  
  const graphData = useMemo(() => buildGraphData(files), [files]);

  const visibleNodes = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    const set = new Set();
    graphData.nodes.forEach((n: any) => {
      if (n.id.toLowerCase().includes(query)) set.add(n.id);
    });
    return set;
  }, [searchQuery, graphData.nodes]);


  const hoverNeighbors = useMemo(() => {
    if (!hoverNodeState) return new Set();
    const set = new Set();
    set.add(hoverNodeState.id);
    graphData.links.forEach((l: any) => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;
      if (sId === hoverNodeState.id) set.add(tId);
      if (tId === hoverNodeState.id) set.add(sId);
    });
    return set;
  }, [hoverNodeState, graphData.links]);

  const hoverNeighborsRef = useRef(hoverNeighbors);
  useEffect(() => {
    hoverNeighborsRef.current = hoverNeighbors;
  }, [hoverNeighbors]);

  // Cleanup map when unmounting
  useEffect(() => {
    const map = domNodesRef.current;
    return () => map.clear();
  }, []);

  const getRiskClass = (score: number) => {
    if (score >= HIGH_RISK_THRESHOLD) return 'high';
    if (score >= 20) return 'mid';
    return 'low';
  };

  // Configure stable physics
  useEffect(() => {
    if (fgRef.current) {
      // Stronger repulsion to prevent clustering, longer distance for links
      fgRef.current.d3Force('charge').strength(-400).distanceMax(800);
      fgRef.current.d3Force('link').distance(60);
    }
  }, [graphData]);

  const getDisplayName = (path: string) => {
    const parts = path.split('/');
    if (parts.length > 1) {
      return parts.slice(-2).join('/');
    }
    return path;
  };

  return (
    <div className="graph-canvas" ref={containerRef}>
      <div className="breadcrumb">← Root</div>
      
      {/* HTML Overlays for Nodes */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
        {graphData.nodes.map((node: any) => (
          <div 
            key={node.id} 
            ref={el => {
              if (el) domNodesRef.current.set(node.id, el);
              else domNodesRef.current.delete(node.id);
            }}
            className={`g-node ${getRiskClass(node.risk_score)}`}
            style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'auto' }}
            onMouseDown={(e) => {
              if (e.defaultPrevented) return;
              
              // Pin node immediately on grab
              node.fx = node.x;
              node.fy = node.y;
              
              dragNodeRef.current = {
                id: node.id,
                node: node,
                startX: e.clientX,
                startY: e.clientY,
                initX: node.x,
                initY: node.y
              };
            }}
            onClick={(e) => {
              // Prevent click if we were resizing or clicked the handle
              if (e.defaultPrevented) return;
              // Prevent click if we dragged the node
              if (dragNodeRef.current && (Math.abs(e.clientX - dragNodeRef.current.startX) > 3 || Math.abs(e.clientY - dragNodeRef.current.startY) > 3)) return;
              onNodeClick(node);
            }}
            onMouseEnter={() => setHoverNode(node)}
            onMouseLeave={() => setHoverNode(null)}
          >
            <span className="dot"></span>
            {getDisplayName(node.name)}
            <span className="sub">{Math.round(node.risk_score)}</span>
            
            <div 
              className="resize-handle"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Find current scale (from manual override or calculated default)
                const currentScale = manualScalesRef.current[node.id] || Math.min(2.5, Math.max(0.6, Math.sqrt(node.size || 1) / 15));
                resizeStateRef.current = {
                  id: node.id,
                  startX: e.clientX,
                  startScale: currentScale
                };
              }}
              onClick={(e) => e.preventDefault()}
            >
              ⤡
            </div>
          </div>
        ))}
      </div>

      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeRelSize={4}
        d3VelocityDecay={0.3} // Dampen movement to prevent jitter/streaking
        warmupTicks={50} // Pre-calculate layout to avoid initial explosion
        cooldownTicks={100} // Stop simulation sooner to prevent endless micro-jitter
        nodeColor={() => 'rgba(0,0,0,0)'} // Fix ghost canvas nodes bleeding through
        enableNodeDrag={false} // Disable drag so DOM events take full precedence seamlessly
        onNodeHover={() => {}} // Disabled in canvas, we use DOM events
        onNodeClick={() => {}} // Disabled in canvas
        nodeCanvasObject={(node: any, ctx: any, globalScale: any) => {
          // Instead of drawing the node in canvas, we update the absolutely positioned DOM element!
          // This entirely replaces the Math.sin() shadowBlur loop and utilizes CSS keyframes perfectly.
          if (!fgRef.current) return;
          
          const dom = domNodesRef.current.get(node.id);
          if (dom) {
            // Only update DOM position/opacity if it's currently rendered in the canvas bounds, 
            // though graph2ScreenCoords handles it anywhere
            const { x, y } = fgRef.current.graph2ScreenCoords(node.x, node.y);
            
            // Calculate dynamic scale based on node size or manual override
            const scale = manualScalesRef.current[node.id] || Math.min(2.5, Math.max(0.6, Math.sqrt(node.size || 1) / 15));
            
            // Use translate3d to avoid layout thrashing (GPU accelerated)
            dom.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale})`;

            // Sync Hit-Testing & Filter Opacity
            const isFilteredOut = visibleNodesRef.current && !visibleNodesRef.current.has(node.id);
            const isTraced = hoverNodeRef.current ? hoverNeighborsRef.current.has(node.id) : true;
            const isVisible = !isFilteredOut && isTraced;

            dom.style.opacity = isVisible ? '1' : '0.1';
            dom.style.pointerEvents = isVisible ? 'auto' : 'none';
          }
        }}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        linkColor={(link: any) => {
          const sId = typeof link.source === 'object' ? link.source.id : link.source;
          const tId = typeof link.target === 'object' ? link.target.id : link.target;
          
          const sVis = visibleNodesRef.current ? visibleNodesRef.current.has(sId) : true;
          const tVis = visibleNodesRef.current ? visibleNodesRef.current.has(tId) : true;
          
          if (!sVis || !tVis) return 'rgba(255,255,255,0.02)';
          
          if (hoverNodeRef.current) {
            if (sId === hoverNodeRef.current.id || tId === hoverNodeRef.current.id) {
              return 'rgba(242,96,107,0.4)'; // Hot link
            }
            return 'rgba(255,255,255,0.05)';
          }
          return 'rgba(255,255,255,0.14)';
        }}
        linkWidth={(link: any) => {
          if (hoverNodeRef.current) {
            const sId = typeof link.source === 'object' ? link.source.id : link.source;
            const tId = typeof link.target === 'object' ? link.target.id : link.target;
            if (sId === hoverNodeRef.current.id || tId === hoverNodeRef.current.id) return 1.6;
          }
          return 1.2;
        }}
      />
      
      <div className="minimap">
        <div className="minimap-dot" style={{ left: '34%', top: '32%', background: 'var(--risk-high)' }}></div>
        <div className="minimap-dot" style={{ left: '52%', top: '40%', background: 'var(--risk-high)' }}></div>
        <div className="minimap-dot" style={{ left: '30%', top: '55%', background: 'var(--risk-mid)' }}></div>
        <div className="minimap-dot" style={{ left: '64%', top: '60%', background: 'var(--risk-mid)' }}></div>
        <div className="minimap-dot" style={{ left: '70%', top: '30%', background: 'var(--risk-low)' }}></div>
        <div className="minimap-dot" style={{ left: '20%', top: '65%', background: 'var(--risk-low)' }}></div>
        <div className="minimap-viewport" style={{ left: '14%', top: '14%', width: '72%', height: '72%' }}></div>
      </div>
    </div>
  );
};
