"""Streamable HTTP MCP Server — wraps mcp_tools for VS Code / remote agent connections."""

import json
import os
import logging
from datetime import datetime, timezone
from mcp.server.fastmcp import FastMCP
from mcp_tools import (
    ensure_workspace, read_file, write_file, edit_file,
    list_directory, create_directory, delete_file, move_file,
    get_file_info, search_files, WORKSPACE_ROOT,
)

logger = logging.getLogger(__name__)

ensure_workspace()

TUNNEL_URL = os.environ.get("TUNNEL_URL", "https://r8zcdngb-8001.inc1.devtunnels.ms")

mcp = FastMCP(
    "Kernal Workspace",
    instructions=(
        "MCP server for the Kernal project workspace. "
        "Provides sandboxed file operations (read, write, edit, list, search, etc.) "
        f"rooted at: {WORKSPACE_ROOT}\n\n"
        "## IMPORTANT — Connection setup (read this first)\n\n"
        "This server runs behind a Microsoft Dev Tunnel. Before calling any file "
        "tools, you MUST:\n\n"
        "1. Call `workspace_status_check` first (pass job_id if you have one, "
        "otherwise pass \"none\").\n"
        "2. Read the `instructions` field in the response — it tells you exactly "
        "what to do.\n"
        "3. If the status says the tunnel needs to be trusted, open the URL it "
        "gives you in a browser (or `curl` it) to clear the Dev Tunnels "
        "interstitial. You only need to do this once per session.\n"
        "4. Once status returns `connection: ok`, you can use all workspace_* "
        "tools normally.\n\n"
        "If any tool call returns a network error or empty response, call "
        "`workspace_status_check` again and follow its instructions.\n"
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


@mcp.tool()
def workspace_status_check(job_id: str = "none") -> str:
    """Check connection health and peer status. CALL THIS FIRST before using any other tool.

    Returns connection status, peer presence, and step-by-step instructions
    if something needs to be fixed (e.g. tunnel trust, missing peers).

    Args:
        job_id: The job ID to check peer status for. Pass "none" to just check connection health.
    """
    try:
        from realtime_handler import realtime_handler
        import server as _srv

        tunnel_url = os.environ.get("TUNNEL_URL", TUNNEL_URL).rstrip("/")

        # ── Step 1: Check basic connectivity ──
        # We're running inside the same process, so if we got here the backend is up.
        connection_ok = True
        supabase_ok = _srv.supabase is not None

        # Check tunnel reachability (non-blocking quick check)
        tunnel_trusted = None  # unknown until explicitly tested
        tunnel_check_instruction = None
        if tunnel_url and not tunnel_url.startswith("http://localhost"):
            tunnel_check_instruction = (
                f"This server runs behind a Dev Tunnel. If tool calls fail with network errors, "
                f"open this URL in your browser first to trust the tunnel: {tunnel_url}\n"
                f"Click 'Continue' on the Microsoft Dev Tunnels interstitial page, then retry."
            )

        # ── Step 2: Build instructions based on state ──
        instructions = []
        status = "ok"

        if not supabase_ok:
            status = "degraded"
            instructions.append(
                "Supabase is not connected. Job/peer features won't work, "
                "but workspace file tools are available."
            )

        # ── Step 3: Check job peer status (if job_id given) ──
        job_info = None
        peer_status = None
        if job_id and job_id != "none":
            supabase_client = _srv.supabase
            if supabase_client:
                try:
                    result = supabase_client.table("mcp_jobs").select("*").eq("id", job_id).execute()
                    if result.data:
                        row = result.data[0]
                        session_id = row.get("session_id", "")
                        job_info = {
                            "job_id": job_id,
                            "title": row.get("title", ""),
                            "session_id": session_id,
                            "job_status": row.get("status", "open"),
                        }

                        # Check realtime handler presence
                        rt_status = realtime_handler.get_job_peers(session_id, job_id)

                        # Merge heartbeat registry
                        registry_key = f"{session_id}:{job_id}"
                        hb_peers = _srv._peer_registry.get(registry_key, {})
                        now = datetime.now(timezone.utc)

                        all_peers = list(rt_status["peers"])
                        seen_cids = {p["client_id"] for p in all_peers}
                        for cid, info in hb_peers.items():
                            if cid in seen_cids:
                                continue
                            last_seen_str = info.get("last_seen", "")
                            stale = True
                            if last_seen_str:
                                try:
                                    last_seen_dt = datetime.fromisoformat(last_seen_str.replace("Z", "+00:00"))
                                    if last_seen_dt.tzinfo is None:
                                        last_seen_dt = last_seen_dt.replace(tzinfo=timezone.utc)
                                    stale = (now - last_seen_dt).total_seconds() > 60
                                except (ValueError, TypeError):
                                    stale = True
                            role = info.get("role", "unknown")
                            if role == "target" and not stale:
                                rt_status["target_online"] = True
                            elif role == "executor" and not stale:
                                rt_status["executor_online"] = True
                            all_peers.append({
                                "client_id": cid,
                                "role": role,
                                "job_id": job_id,
                                "last_seen": last_seen_str,
                                "stale": stale,
                            })

                        peer_matched = rt_status["target_online"] and rt_status["executor_online"]
                        peer_status = {
                            "target_online": rt_status["target_online"],
                            "executor_online": rt_status["executor_online"],
                            "peer_matched": peer_matched,
                            "matched_client_ids": [
                                p["client_id"] for p in all_peers if not p.get("stale", True)
                            ],
                            "peers": all_peers,
                        }

                        if not rt_status["target_online"]:
                            instructions.append(
                                "The host/target is not online for this job. "
                                "The host needs to activate the session from the /console page."
                            )
                        if not rt_status["executor_online"]:
                            instructions.append(
                                "No executor peer is online for this job. "
                                f"Send a heartbeat to register: POST {tunnel_url}/api/mcp/heartbeat "
                                f"with body: {{\"client_id\": \"your-id\", \"job_id\": \"{job_id}\", "
                                f"\"session_id\": \"{session_id}\", \"role\": \"executor\"}}"
                            )
                        if peer_matched:
                            if status == "ok":
                                instructions.append("All good. Both peers are online and matched. You can use all workspace tools.")
                    else:
                        instructions.append(f"Job '{job_id}' was not found. Check the job ID and try again.")
                except Exception as e:
                    instructions.append(f"Could not look up job: {e}")

        # ── Step 4: If connection is OK and no job issues, say so ──
        if status == "ok" and not instructions:
            instructions.append(
                "Connection is healthy. You can use all workspace_* tools. "
                "Available: workspace_read_file, workspace_write_file, workspace_edit_file, "
                "workspace_list_directory, workspace_create_directory, workspace_delete_file, "
                "workspace_move_file, workspace_get_file_info, workspace_search_files."
            )

        if tunnel_check_instruction:
            instructions.append(tunnel_check_instruction)

        return json.dumps({
            "success": True,
            "connection": status,
            "backend_healthy": connection_ok,
            "supabase_connected": supabase_ok,
            "tunnel_url": tunnel_url,
            "mcp_endpoint": f"{tunnel_url}/mcp",
            "job": job_info,
            "peer_status": peer_status,
            "instructions": instructions,
        })
    except Exception as e:
        logger.error(f"workspace_status_check error: {e}")
        return json.dumps({
            "success": False,
            "connection": "error",
            "instructions": [
                f"Status check failed with error: {e}",
                "Try calling workspace_list_directory to test basic connectivity.",
            ],
        })
