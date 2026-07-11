import React, { useMemo, useState } from 'react';
import type { DailyActivity } from '../api/client';

interface CommitActivityHeatmapProps {
  data?: DailyActivity[];
}

export const CommitActivityHeatmap: React.FC<CommitActivityHeatmapProps> = ({ data }) => {
  const [hoveredCell, setHoveredCell] = useState<{
    date: string;
    commits: number;
    riskLevel: string;
    x: number;
    y: number;
  } | null>(null);

  const { cells, maxDateStr, minDateStr } = useMemo(() => {
    if (!data || data.length === 0) {
      return { cells: [], maxDateStr: '', minDateStr: '' };
    }

    // data is already sorted by date in the backend, the last item is the latest commit
    const maxDateStr = data[data.length - 1].date;
    const maxDate = new Date(maxDateStr + 'T00:00:00Z');

    // Generate last 365 days
    const minDate = new Date(maxDate);
    minDate.setDate(minDate.getDate() - 364);
    
    // We want the grid to start on a Sunday
    const startDayOffset = minDate.getUTCDay();
    const gridStartDate = new Date(minDate);
    gridStartDate.setDate(gridStartDate.getDate() - startDayOffset);

    // End date should pad to the end of the week (Saturday)
    const endDayOffset = 6 - maxDate.getUTCDay();
    const gridEndDate = new Date(maxDate);
    gridEndDate.setDate(gridEndDate.getDate() + endDayOffset);

    const lookup = new Map<string, DailyActivity>();
    for (const d of data) {
      lookup.set(d.date, d);
    }

    const cellsToRender = [];
    let currentDate = new Date(gridStartDate);
    
    while (currentDate <= gridEndDate) {
      // YYYY-MM-DD
      const dateStr = currentDate.toISOString().split('T')[0];
      const activity = lookup.get(dateStr);
      
      const outOfBounds = currentDate < minDate || currentDate > maxDate;

      cellsToRender.push({
        dateStr,
        activity,
        outOfBounds
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { cells: cellsToRender, maxDateStr, minDateStr: minDate.toISOString().split('T')[0] };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-title">No Activity Data</div>
        <div className="empty-sub">This repository has no commit history to display.</div>
      </div>
    );
  }

  // Weeks are columns
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="heatmap-container">
      <div className="heatmap-header">
        <h2>Commit Activity Risk</h2>
        <p className="heatmap-sub">
          {minDateStr} to {maxDateStr}
        </p>
      </div>

      <div className="heatmap-scroll-area">
        <div className="heatmap-grid" onMouseLeave={() => setHoveredCell(null)}>
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="heatmap-col">
              {week.map((cell, dIdx) => {
                let cellClass = 'empty';
                if (cell.outOfBounds) {
                  cellClass = 'hidden';
                } else if (cell.activity) {
                  cellClass = cell.activity.risk_level;
                }

                return (
                  <div
                    key={cell.dateStr}
                    className={`heatmap-cell ${cellClass}`}
                    onMouseEnter={(e) => {
                      if (cell.outOfBounds) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredCell({
                        date: cell.dateStr,
                        commits: cell.activity ? cell.activity.commit_count : 0,
                        riskLevel: cell.activity ? cell.activity.risk_level : 'none',
                        x: rect.left + rect.width / 2,
                        y: rect.top
                      });
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="heatmap-legend">
        <span>Less risk</span>
        <div className="heatmap-cell empty"></div>
        <div className="heatmap-cell low"></div>
        <div className="heatmap-cell mid"></div>
        <div className="heatmap-cell high"></div>
        <span>More risk</span>
      </div>

      {hoveredCell && (
        <div 
          className="heatmap-tooltip"
          style={{
            left: hoveredCell.x,
            top: hoveredCell.y - 8,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <strong>{hoveredCell.date}</strong>
          <div>{hoveredCell.commits} commits</div>
          <div style={{textTransform: 'capitalize', color: 'var(--text-secondary)'}}>
            Risk: {hoveredCell.riskLevel}
          </div>
        </div>
      )}
    </div>
  );
};
