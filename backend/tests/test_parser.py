import os
import tempfile
from core.parser import extract_dependencies

def test_extract_dependencies_python():
    code = """
import os
import sys
from collections import defaultdict
from .utils import helper

def foo():
    pass
"""
    with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as f:
        f.write(code)
        path = f.name
        
    try:
        deps = extract_dependencies(path, "")
        assert "os" in deps
        assert "sys" in deps
        assert "defaultdict" in deps
        assert "helper" in deps
    finally:
        os.remove(path)

def test_extract_dependencies_js():
    code = """
import React from 'react';
import { Button } from './Button';
const fs = require('fs');
"""
    with tempfile.NamedTemporaryFile(suffix=".js", mode="w", delete=False) as f:
        f.write(code)
        path = f.name
        
    try:
        deps = extract_dependencies(path, "")
        assert "react" in deps
        assert "./Button" in deps
        assert "fs" in deps
    finally:
        os.remove(path)
