import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command } from 'cmdk';
import type { FileNode } from '../api/client';
import { getRiskColor, HIGH_RISK_THRESHOLD } from '../utils/transforms';

interface CommandPaletteProps {
  files: FileNode[];
  onSelect: (file: FileNode) => void;
}

export const CommandPalette = ({ files, onSelect }: CommandPaletteProps) => {
  const [open, setOpen] = useState(false);

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-2xl bg-card border border-white/10 rounded-xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <Command className="w-full h-full flex flex-col" label="Command Menu">
          <div className="flex items-center border-b border-white/10 px-4">
            <svg
              className="w-5 h-5 text-muted mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Command.Input 
              placeholder="Search files..." 
              className="flex-1 h-14 bg-transparent outline-none text-text placeholder-muted font-sans"
              autoFocus
            />
          </div>
          
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="p-4 text-center text-muted font-sans">No files found.</Command.Empty>
            
            {files.map(file => (
              <Command.Item
                key={file.path}
                value={file.path}
                onSelect={() => {
                  onSelect(file);
                  setOpen(false);
                }}
                className="flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer aria-selected:bg-white/5 aria-selected:text-white text-muted group transition-colors"
              >
                <span className="font-mono text-sm truncate">{file.path}</span>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getRiskColor(file.risk_score), boxShadow: file.risk_score >= HIGH_RISK_THRESHOLD ? `0 0 8px ${getRiskColor(file.risk_score)}` : 'none' }} />
                    <span className="font-mono text-xs text-muted w-8 text-right group-aria-selected:text-white/80">{file.risk_score}</span>
                  </div>
                </div>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
};
