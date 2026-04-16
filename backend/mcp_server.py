"""Streamable HTTP MCP Server — wraps mcp_tools for VS Code / remote agent connections."""

import json
from mcp.server.fastmcp import FastMCP
from mcp_tools import (
    ensure_workspace, read_file, write_file, edit_file,
    list_directory, create_directory, delete_file, move_file,
    get_file_info, search_files, WORKSPACE_ROOT,
)

ensure_workspace()

mcp = FastMCP(
    "Kernal Workspace",
    instructions=(
        "MCP server for the Kernal project workspace. "
        "Provides sandboxed file operations (read, write, edit, list, search, etc.) "
        f"rooted at: {WORKSPACE_ROOT}"
    ),
)


# ────────────────────────── Tools ──────────────────────────

@mcp.tool()
def workspace_read_file(path: str) -> str:
    """Read the contents of a file in the workspace.

    Args:
        path: Relative path inside the workspace (e.g. "src/App.js")
    """
    result = read_file(path)
    if not result.get("success"):
        return json.dumps(result)
    return result["content"]


@mcp.tool()
def workspace_write_file(path: str, content: str) -> str:
    """Create or overwrite a file in the workspace.

    Args:
        path: Relative path inside the workspace
        content: Full file content to write
    """
    result = write_file(path, content)
    return json.dumps(result)


@mcp.tool()
def workspace_edit_file(path: str, old_text: str, new_text: str) -> str:
    """Search-and-replace text in an existing file.

    Args:
        path: Relative path inside the workspace
        old_text: Exact text to find (first occurrence)
        new_text: Replacement text
    """
    result = edit_file(path, old_text, new_text)
    return json.dumps(result)


@mcp.tool()
def workspace_list_directory(path: str = ".") -> str:
    """List files and folders in a workspace directory.

    Args:
        path: Relative directory path (default: workspace root)
    """
    result = list_directory(path)
    return json.dumps(result)


@mcp.tool()
def workspace_create_directory(path: str) -> str:
    """Create a directory (including parents) in the workspace.

    Args:
        path: Relative directory path to create
    """
    result = create_directory(path)
    return json.dumps(result)


@mcp.tool()
def workspace_delete_file(path: str) -> str:
    """Delete a file or directory from the workspace.

    Args:
        path: Relative path to delete
    """
    result = delete_file(path)
    return json.dumps(result)


@mcp.tool()
def workspace_move_file(source: str, destination: str) -> str:
    """Move or rename a file/directory in the workspace.

    Args:
        source: Current relative path
        destination: New relative path
    """
    result = move_file(source, destination)
    return json.dumps(result)


@mcp.tool()
def workspace_get_file_info(path: str) -> str:
    """Get metadata (size, timestamps, type) for a workspace path.

    Args:
        path: Relative path inside the workspace
    """
    result = get_file_info(path)
    return json.dumps(result)


@mcp.tool()
def workspace_search_files(pattern: str, path: str = ".") -> str:
    """Search for files matching a glob pattern in the workspace.

    Args:
        pattern: Glob pattern (e.g. "*.py", "**/*.js")
        path: Directory to search in (default: workspace root)
    """
    result = search_files(pattern, path)
    return json.dumps(result)
