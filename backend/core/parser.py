import os
import logging
from typing import List
import tree_sitter
import tree_sitter_python
import tree_sitter_javascript

logger = logging.getLogger(__name__)

try:
    PY_LANGUAGE = tree_sitter.Language(tree_sitter_python.language())
    JS_LANGUAGE = tree_sitter.Language(tree_sitter_javascript.language())
except Exception as e:
    logger.error(f"Failed to initialize tree-sitter languages: {e}")
    PY_LANGUAGE = None
    JS_LANGUAGE = None

# Queries to extract imports
# Python: import foo, from foo import bar
PY_IMPORT_QUERY = """
(import_statement (dotted_name) @import)
(import_from_statement (dotted_name) @import_from)
"""

# JavaScript: import foo from 'foo', require('foo')
JS_IMPORT_QUERY = """
(import_statement source: (string (string_fragment) @import))
(call_expression
  function: (identifier) @func (#eq? @func "require")
  arguments: (arguments (string (string_fragment) @require))
)
"""

def get_parser(language: tree_sitter.Language):
    parser = tree_sitter.Parser(language)
    return parser

def extract_dependencies(file_path: str, repo_root: str) -> List[str]:
    """
    Parse a file to extract its dependencies (imports/requires).
    Returns a list of dependency paths or module names.
    If parsing fails, it logs a warning and returns an empty list.
    """
    if not os.path.exists(file_path):
        return []
        
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == ".py":
        lang = PY_LANGUAGE
        query_str = PY_IMPORT_QUERY
    elif ext in (".js", ".jsx", ".ts", ".tsx"):
        lang = JS_LANGUAGE
        query_str = JS_IMPORT_QUERY
    else:
        return [] # unsupported language
        
    if not lang:
        return []
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            code = f.read()
            
        parser = get_parser(lang)
        tree = parser.parse(bytes(code, "utf8"))
        
        query = tree_sitter.Query(lang, query_str)
        cursor = tree_sitter.QueryCursor(query)
        captures = cursor.captures(tree.root_node)
        
        deps = set()
        for capture_name, nodes in captures.items():
            if capture_name in ("import", "import_from", "import_source", "require"):
                for node in nodes:
                    deps.add(node.text.decode("utf8"))
                    
        return list(deps)
    except Exception as e:
        logger.warning(f"Failed to parse {file_path}: {e}")
        return []
