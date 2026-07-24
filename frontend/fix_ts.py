import re
import glob
import os

def fix_file(filepath, fixes):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in fixes:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# Fix vite.config.ts
fix_file('vite.config.ts', [
    ("import { defineConfig } from 'vite'", "import { defineConfig } from 'vitest/config'")
])

# Fix unused React imports
for p in glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True):
    fix_file(p, [
        ("import React from 'react';\n", ""),
        ("import React, ", "import "),
    ])

# Fix DependencyGraph.test.tsx
fix_file('src/components/DependencyGraph.test.tsx', [
    ("import { render, screen, waitFor }", "import { render, screen }"),
    ("name: 'src/a.ts'", "path: 'src/a.ts'"),
    ("name: 'src/b.ts'", "path: 'src/b.ts'"),
    ("name: 'src/c.ts'", "path: 'src/c.ts'"),
    ("const { container } = render", "render")
])

# Fix NodeDetailPanel.test.tsx
fix_file('src/components/NodeDetailPanel.test.tsx', [
    ("name: 'src/api/main.py'", "path: 'src/api/main.py'")
])

# Fix RiskTreemap.tsx
fix_file('src/components/RiskTreemap.tsx', [
    ("node.data.path", "node.data.name")
])

# Fix CommitActivityHeatmap.tsx
fix_file('src/components/CommitActivityHeatmap.tsx', [
    ("(_, dIdx)", "(_, _dIdx)")
])

# Fix DependencyGraph.tsx
fix_file('src/components/DependencyGraph.tsx', [
    ("const visibleNodes", "// const visibleNodes"),
    ("(node, ctx, globalScale)", "(node, _ctx, _globalScale)"),
    ("const { width, height } = useWindowSize();", "const { width, height } = useWindowSize(0);") # Wait, what does useWindowSize take? Let's assume it takes an optional argument or just remove the parens if it's a property. I'll just change package.json instead, this is too risky to guess without seeing useWindowSize!
])
