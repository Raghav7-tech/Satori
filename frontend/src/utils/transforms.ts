import type { FileNode } from '../api/client';

export const buildHierarchy = (files: FileNode[]) => {
  const root = { name: 'root', children: [] as any[] };
  
  files.forEach(file => {
    const parts = file.path.split('/');
    let current = root;
    
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        current.children.push({
          ...file,
          name: part,
          path: file.path,
          size: file.churn_score + 1, // Add 1 so even untouched files have minimal area
          risk_score: file.risk_score
        });
      } else {
        let child = current.children.find(c => c.name === part && c.children);
        if (!child) {
          child = { name: part, children: [] };
          current.children.push(child);
        }
        current = child;
      }
    });
  });
  
  return root;
};

export const HIGH_RISK_THRESHOLD = 60;

// Colors approximate Section 5 specification (desaturated)
// We apply basic hex values here, full glow/effects deferred to Phase 4
export const getRiskColor = (risk: number) => {
  if (risk < 20) return '#4ade80'; // desaturated emerald
  if (risk < HIGH_RISK_THRESHOLD) return '#fbbf24'; // desaturated amber
  return '#f87171'; // desaturated crimson
};

export const resolveRelativePath = (sourcePath: string, dep: string): string | null => {
  if (!dep.startsWith('.')) return null;

  const sourceParts = sourcePath.split('/');
  sourceParts.pop(); // remove filename

  const depParts = dep.split('/');
  for (const part of depParts) {
    if (part === '.') continue;
    if (part === '..') {
      if (sourceParts.length === 0) return null; // Prevent going above root
      sourceParts.pop();
    } else {
      sourceParts.push(part);
    }
  }

  return sourceParts.join('/');
};

export const buildGraphData = (files: FileNode[]) => {
  const nodes = files.map(f => ({
    ...f,
    id: f.path,
    name: f.path,
    val: f.churn_score + 1, // Node size
    color: getRiskColor(f.risk_score)
  }));

  const links: any[] = [];
  files.forEach(f => {
    f.dependencies.forEach(dep => {
      let targetFile;

      // 1. Try exact relative resolution first
      if (dep.startsWith('.')) {
        const resolvedPath = resolveRelativePath(f.path, dep);
        if (resolvedPath) {
          targetFile = files.find(file => file.path.replace(/\.[^/.]+$/, "") === resolvedPath);
        }
      }

      // 2. Fallback to fuzzy matching
      if (!targetFile) {
        let cleanDep = dep;
        if (cleanDep.includes('/')) {
          // Strip ./, ../, and @/ aliases
          cleanDep = cleanDep.replace(/^(\.\.\/|\.\/|@\/|~?\/)+/, '');
        } else {
          cleanDep = cleanDep.replace(/\./g, '/');
        }

        // Strip extension from cleanDep to match against noExtPath safely
        cleanDep = cleanDep.replace(/\.[^/.]+$/, "");

        targetFile = files.find(file => {
          const noExtPath = file.path.replace(/\.[^/.]+$/, "");
          return noExtPath.endsWith(cleanDep);
        });
      }

      if (targetFile && targetFile.path !== f.path) {
        links.push({
          source: f.path,
          target: targetFile.path,
        });
      }
    });
  });

  return { nodes, links };
};
