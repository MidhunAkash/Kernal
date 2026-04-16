"""MCP File Operation Tools — Sandboxed filesystem CRUD for the MCP tunnel."""

import shutil
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any

WORKSPACE_ROOT = Path("/app/workspace")


def ensure_workspace():
    """Create workspace root if it doesn't exist."""
    WORKSPACE_ROOT.mkdir(parents=True, exist_ok=True)


def _safe_path(path: str) -> Path:
    """Resolve *path* inside the workspace and reject traversal."""
    resolved = (WORKSPACE_ROOT / path).resolve()
    if not str(resolved).startswith(str(WORKSPACE_ROOT.resolve())):
        raise ValueError(f"Path '{path}' escapes the workspace")
    return resolved


# ────────────────────────── Tools ──────────────────────────

def read_file(path: str) -> Dict[str, Any]:
    safe = _safe_path(path)
    if not safe.exists():
        return {"error": f"File not found: {path}", "success": False}
    if not safe.is_file():
        return {"error": f"Not a file: {path}", "success": False}
    try:
        content = safe.read_text(encoding="utf-8")
        return {"content": content, "path": path, "size": safe.stat().st_size, "success": True}
    except Exception as e:
        return {"error": str(e), "success": False}


def write_file(path: str, content: str) -> Dict[str, Any]:
    safe = _safe_path(path)
    try:
        safe.parent.mkdir(parents=True, exist_ok=True)
        safe.write_text(content, encoding="utf-8")
        return {"path": path, "size": len(content), "success": True}
    except Exception as e:
        return {"error": str(e), "success": False}


def edit_file(path: str, old_text: str, new_text: str) -> Dict[str, Any]:
    safe = _safe_path(path)
    if not safe.exists():
        return {"error": f"File not found: {path}", "success": False}
    try:
        content = safe.read_text(encoding="utf-8")
        if old_text not in content:
            return {"error": "Text not found in file", "success": False}
        new_content = content.replace(old_text, new_text, 1)
        safe.write_text(new_content, encoding="utf-8")
        return {"path": path, "replacements": 1, "success": True}
    except Exception as e:
        return {"error": str(e), "success": False}


def list_directory(path: str = ".") -> Dict[str, Any]:
    safe = _safe_path(path)
    if not safe.exists():
        return {"error": f"Directory not found: {path}", "success": False}
    if not safe.is_dir():
        return {"error": f"Not a directory: {path}", "success": False}
    try:
        entries = []
        for entry in sorted(safe.iterdir()):
            rel = str(entry.relative_to(WORKSPACE_ROOT))
            entries.append({
                "name": entry.name,
                "path": rel,
                "type": "directory" if entry.is_dir() else "file",
                "size": entry.stat().st_size if entry.is_file() else 0,
            })
        return {"path": path, "entries": entries, "success": True}
    except Exception as e:
        return {"error": str(e), "success": False}


def create_directory(path: str) -> Dict[str, Any]:
    safe = _safe_path(path)
    try:
        safe.mkdir(parents=True, exist_ok=True)
        return {"path": path, "success": True}
    except Exception as e:
        return {"error": str(e), "success": False}


def delete_file(path: str) -> Dict[str, Any]:
    safe = _safe_path(path)
    if not safe.exists():
        return {"error": f"Not found: {path}", "success": False}
    try:
        if safe.is_dir():
            shutil.rmtree(safe)
        else:
            safe.unlink()
        return {"path": path, "success": True}
    except Exception as e:
        return {"error": str(e), "success": False}


def move_file(source: str, destination: str) -> Dict[str, Any]:
    src = _safe_path(source)
    dst = _safe_path(destination)
    if not src.exists():
        return {"error": f"Source not found: {source}", "success": False}
    try:
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src), str(dst))
        return {"source": source, "destination": destination, "success": True}
    except Exception as e:
        return {"error": str(e), "success": False}


def get_file_info(path: str) -> Dict[str, Any]:
    safe = _safe_path(path)
    if not safe.exists():
        return {"error": f"Not found: {path}", "success": False}
    try:
        stat = safe.stat()
        return {
            "path": path,
            "name": safe.name,
            "type": "directory" if safe.is_dir() else "file",
            "size": stat.st_size,
            "modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
            "created": datetime.fromtimestamp(stat.st_ctime, tz=timezone.utc).isoformat(),
            "success": True,
        }
    except Exception as e:
        return {"error": str(e), "success": False}


def search_files(pattern: str, path: str = ".") -> Dict[str, Any]:
    safe = _safe_path(path)
    try:
        matches = []
        for match in safe.rglob(pattern):
            rel = str(match.relative_to(WORKSPACE_ROOT))
            matches.append({
                "path": rel,
                "name": match.name,
                "type": "directory" if match.is_dir() else "file",
            })
        return {"pattern": pattern, "matches": matches, "count": len(matches), "success": True}
    except Exception as e:
        return {"error": str(e), "success": False}


# ────────────────────────── Registry ──────────────────────────

TOOLS = {
    "read_file": read_file,
    "write_file": write_file,
    "edit_file": edit_file,
    "list_directory": list_directory,
    "create_directory": create_directory,
    "delete_file": delete_file,
    "move_file": move_file,
    "get_file_info": get_file_info,
    "search_files": search_files,
}

TOOL_SCHEMAS = {
    "read_file": {
        "args": ["path"],
        "description": "Read file contents",
    },
    "write_file": {
        "args": ["path", "content"],
        "description": "Create or overwrite a file",
    },
    "edit_file": {
        "args": ["path", "old_text", "new_text"],
        "description": "Search and replace text in a file",
    },
    "list_directory": {
        "args": ["path"],
        "description": "List directory contents (default: workspace root)",
    },
    "create_directory": {
        "args": ["path"],
        "description": "Create a directory",
    },
    "delete_file": {
        "args": ["path"],
        "description": "Delete a file or directory",
    },
    "move_file": {
        "args": ["source", "destination"],
        "description": "Move a file or directory",
    },
    "get_file_info": {
        "args": ["path"],
        "description": "Get file metadata",
    },
    "search_files": {
        "args": ["pattern", "path"],
        "description": "Search for files matching a glob pattern",
    },
}


def dispatch_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Dispatch a tool call and return the result dict."""
    if tool_name not in TOOLS:
        return {"error": f"Unknown tool: {tool_name}", "success": False}
    try:
        return TOOLS[tool_name](**arguments)
    except TypeError as e:
        return {"error": f"Invalid arguments: {e}", "success": False}
    except Exception as e:
        return {"error": str(e), "success": False}
