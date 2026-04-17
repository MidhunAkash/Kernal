"""Streamable HTTP MCP Server — wraps mcp_tools for VS Code / remote agent connections."""

import json
import os
import logging
from typing import Any, Dict, Optional
from datetime import datetime, timezone
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from mcp_tools import (
    ensure_workspace, read_file, write_file, edit_file,
    list_directory, create_directory, delete_file, move_file,
    get_file_info, search_files, WORKSPACE_ROOT,
)

logger = logging.getLogger(__name__)

ensure_workspace()

TUNNEL_URL = os.environ.get("TUNNEL_URL", "https://r8zcdngb-8001.inc1.devtunnels.ms")

# Allow the MCP endpoint to be reached from any host (Emergent preview URL,
# Dev Tunnel URL, localhost, etc.). Without this, FastMCP rejects requests
# whose Host header doesn't match 127.0.0.1/localhost with "Invalid Host header".
_mcp_security = TransportSecuritySettings(
    enable_dns_rebinding_protection=False,
    allowed_hosts=["*"],
    allowed_origins=["*"],
)

mcp = FastMCP(
    "HumEx Workspace",
    transport_security=_mcp_security,
    instructions=(
        "HumEx MCP — bridges Client 2 (expert) to Client 1 (target user).\n\n"
        "## Quick start for Client 2 (expert agent)\n"
        "1. Call `connect_to_job(job_id, api_key)` FIRST with the credentials the "
        "target user shared with you.\n"
        "2. Read the returned `instructions` — if `target_online: false`, wait and "
        "call `job_status` again; the target's CLI agent may still be starting.\n"
        "3. Once `target_online: true`, use the job_* tools below to act on the "
        "target's local filesystem:\n"
        "   - `job_list_directory(job_id, api_key, path)`\n"
        "   - `job_read_file(job_id, api_key, path)`\n"
        "   - `job_write_file(job_id, api_key, path, content)`\n"
        "   - `job_edit_file(job_id, api_key, path, old_text, new_text)`\n"
        "   - `job_search_files(job_id, api_key, pattern, path)`\n"
        "   - `job_create_directory`, `job_delete_file`, `job_move_file`, "
        "`job_get_file_info`\n"
        "4. To preview the target's running app, open the `tunnel_url` returned by "
        "`job_info` / `connect_to_job` in a browser (or iframe). Changes you make "
        "via the job_* tools reflect in that preview once the dev server hot-reloads.\n\n"
        "## Host-local workspace tools (legacy)\n"
        "The `workspace_*` tools operate on the HOST's /app/workspace, not the "
        "target's machine. Use the `job_*` tools for the collaboration flow.\n"
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



# ═══════════════════════ Job-scoped tools (Client 2 facing) ═══════════════════════
#
# These tools forward calls to Client 1's CLI agent over the job-RPC long-polling
# bridge (see backend/job_rpc.py).  Every tool takes (job_id, api_key) so it can
# be authenticated statelessly — MCP Streamable-HTTP doesn't offer per-session
# custom headers reliably across clients.

from job_rpc import job_rpc as _job_rpc  # noqa: E402


def _current_humex_user() -> Optional[dict]:
    """Read the current HumEx user from the ASGI middleware's contextvar.
    Returns {api_key, uid, name, email, key_name} or None."""
    try:
        import server as _srv
        return _srv.get_current_user_from_ctx()
    except Exception:
        return None


def _fetch_job_meta(job_id: str) -> dict:
    """Read title + context + status from Supabase mcp_jobs for this job.
    Returns an empty dict on any failure (never raises)."""
    try:
        import server as _srv  # lazy to avoid circular import at module load
        client = getattr(_srv, "supabase", None)
        if not client:
            return {}
        result = client.table("mcp_jobs").select(
            "title,context,status,created_at,target_client_id,poster_uid,solver_uid"
        ).eq("id", job_id).limit(1).execute()
        rows = result.data or []
        if not rows:
            return {}
        row = rows[0]
        return {
            "title": row.get("title", "") or "",
            "context": row.get("context", "") or "",
            "status": row.get("status", "") or "",
            "created_at": row.get("created_at", "") or "",
            "target_client_id": row.get("target_client_id", "") or "",
            "poster_uid": row.get("poster_uid"),
            "solver_uid": row.get("solver_uid"),
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("_fetch_job_meta failed for %s: %s", job_id, exc)
        return {}


def _maybe_claim_solver(job_id: str, uid: str) -> bool:
    """If this user is authorized and the job is unclaimed (or same user reconnecting),
    set solver_uid + status='accepted'. Silent on failure. Returns True if claim applied."""
    if not uid:
        return False
    try:
        import server as _srv
        client = getattr(_srv, "supabase", None)
        if not client:
            return False
        meta = _fetch_job_meta(job_id)
        if not meta:
            return False
        if meta.get("poster_uid") == uid:
            return False  # can't solve own job
        current_solver = meta.get("solver_uid")
        if current_solver and current_solver != uid:
            return False  # already claimed by someone else
        if meta.get("status") not in ("open", "accepted"):
            return False
        if current_solver == uid and meta.get("status") == "accepted":
            return True  # already bound, nothing to do
        client.table("mcp_jobs").update({
            "solver_uid": uid,
            "status": "accepted",
        }).eq("id", job_id).execute()
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("_maybe_claim_solver failed for %s: %s", job_id, exc)
        return False


@mcp.tool()
def get_current_user() -> str:
    """Return the logged-in HumEx user's profile (name + email + uid).

    Uses the HUMEX_API_KEY passed in the MCP config URL as `?key=knl_xxx`.
    Call this early in a conversation so the AI knows who it's acting for —
    this is what ties their `create_job` calls to their "Posted Jobs" page
    and their accepted jobs to their reward-points balance.
    """
    cur = _current_humex_user()
    if not cur:
        return _dump({
            "success": False,
            "error": "no_user",
            "message": (
                "No HumEx user bound to this MCP session. "
                "Add your key to the server URL as ?key=knl_xxx in your MCP config."
            ),
        })
    return _dump({
        "success": True,
        "uid": cur.get("uid", ""),
        "name": cur.get("name", ""),
        "email": cur.get("email", ""),
        "key_name": cur.get("key_name", ""),
    })


def _dump(payload) -> str:
    try:
        return json.dumps(payload, default=str)
    except Exception as exc:
        return json.dumps({"success": False, "error": "serialization_error", "message": str(exc)})


async def _call_target(job_id: str, api_key: str, tool: str, arguments: dict, timeout: float = 30.0):
    try:
        return await _job_rpc.call_tool(job_id, api_key, tool, arguments, timeout=timeout)
    except KeyError:
        return {
            "success": False,
            "error": "unknown_job",
            "message": (
                f"Job '{job_id}' is not active on this host. The job may have been "
                "closed or the server restarted. Ask the target user to create a "
                "new job."
            ),
        }
    except PermissionError:
        return {
            "success": False,
            "error": "invalid_api_key",
            "message": "The api_key does not match this job_id. Ask the target user for the correct credentials.",
        }


@mcp.tool()
async def connect_to_job(job_id: str, api_key: str) -> str:
    """Bind this MCP session to a target user's job. CALL THIS FIRST.

    Validates the api_key, checks if the target's CLI agent is online, and returns
    the tunnel URL for the live app preview plus actionable `instructions`.

    Args:
        job_id: UUID shared by the target user.
        api_key: API key issued with the job.
    """
    try:
        _job_rpc.status(job_id)
        # Touch executor presence so the UI status reflects the connection
        _job_rpc.touch_executor(job_id)
    except Exception:
        pass

    # Use a trivial no-op by calling agent_pull-like check via status only;
    # we can't cheaply verify api_key without hitting the runtime map.
    rt = _job_rpc.get(job_id)
    if rt is None:
        return _dump({
            "success": False,
            "connected": False,
            "error": "unknown_job",
            "instructions": [
                f"Job '{job_id}' is not known to this host. Possible reasons:",
                "- The job id is wrong (check with the target user)",
                "- The host was restarted (in-memory runtime was cleared) — the target needs to re-create the job",
                "- The job was closed",
            ],
        })
    if rt.api_key != api_key:
        return _dump({
            "success": False,
            "connected": False,
            "error": "invalid_api_key",
            "instructions": ["The api_key you supplied does not match this job_id."],
        })

    _job_rpc.touch_executor(job_id)
    status = _job_rpc.status(job_id)
    meta = _fetch_job_meta(job_id)

    # If the caller has a HumEx user API key, auto-bind them as the solver
    # (only if the job is unclaimed and they're not the poster).
    cur = _current_humex_user()
    solver_bound = False
    if cur and cur.get("uid"):
        solver_bound = _maybe_claim_solver(job_id, cur["uid"])

    instructions = []
    if meta.get("title") or meta.get("context"):
        # Surface the problem to the connecting AI so it knows WHAT to solve,
        # not just HOW to call the tools.
        if meta.get("title"):
            instructions.append(f"📋 Job title: {meta['title']}")
        if meta.get("context"):
            instructions.append(f"📝 Problem context:\n{meta['context']}")
    if solver_bound:
        instructions.append(
            f"🤝 Bound you (@{cur.get('name') or cur.get('email') or cur.get('uid')}) "
            "as the solver for this job. Reward points will credit to your account on approval."
        )

    if not status.get("target_online"):
        instructions.append(
            "Target is OFFLINE. Ask the target user (Client 1) to run the HumEx "
            "CLI agent printed on their dashboard. Poll `job_status(job_id, api_key)` "
            "every few seconds until target_online=true."
        )
    else:
        instructions.append("Target is ONLINE. You can use job_read_file / job_write_file / etc.")
        if status.get("tunnel_url"):
            instructions.append(f"Live app preview: {status['tunnel_url']}")
        else:
            instructions.append("No tunnel URL yet — the target did not start cloudflared.")

    return _dump({
        "success": True,
        "connected": True,
        "job_id": job_id,
        "title": meta.get("title", ""),
        "context": meta.get("context", ""),
        "job_status": meta.get("status", ""),
        "tunnel_url": status.get("tunnel_url", ""),
        "target_online": status.get("target_online", False),
        "executor_online": True,
        "session_id": status.get("session_id", ""),
        "instructions": instructions,
    })


@mcp.tool()
def job_status(job_id: str, api_key: str) -> str:
    """Check whether the target's CLI agent is online and expose the live tunnel URL."""
    rt = _job_rpc.get(job_id)
    if rt is None:
        return _dump({"success": False, "error": "unknown_job"})
    if rt.api_key != api_key:
        return _dump({"success": False, "error": "invalid_api_key"})
    _job_rpc.touch_executor(job_id)
    return _dump({"success": True, **_job_rpc.status(job_id)})


@mcp.tool()
def job_info(job_id: str, api_key: str) -> str:
    """Return the job title/context/tunnel_url (useful to quote back to the user)."""
    rt = _job_rpc.get(job_id)
    if rt is None:
        return _dump({"success": False, "error": "unknown_job"})
    if rt.api_key != api_key:
        return _dump({"success": False, "error": "invalid_api_key"})
    _job_rpc.touch_executor(job_id)
    status = _job_rpc.status(job_id)
    meta = _fetch_job_meta(job_id)
    return _dump({
        "success": True,
        "job_id": job_id,
        "title": meta.get("title", ""),
        "context": meta.get("context", ""),
        "job_status": meta.get("status", ""),
        "created_at": meta.get("created_at", ""),
        "session_id": status.get("session_id", ""),
        "tunnel_url": status.get("tunnel_url", ""),
        "target_online": status.get("target_online", False),
    })


@mcp.tool()
async def job_list_directory(job_id: str, api_key: str, path: str = ".") -> str:
    """List files/folders in the target's workspace.

    Args:
        job_id: Job UUID.
        api_key: API key for the job.
        path: Relative directory path (default: workspace root).
    """
    return _dump(await _call_target(job_id, api_key, "list_directory", {"path": path}))


@mcp.tool()
async def job_read_file(job_id: str, api_key: str, path: str) -> str:
    """Read a file from the target's workspace."""
    return _dump(await _call_target(job_id, api_key, "read_file", {"path": path}))


@mcp.tool()
async def job_write_file(job_id: str, api_key: str, path: str, content: str) -> str:
    """Create or overwrite a file in the target's workspace."""
    return _dump(await _call_target(job_id, api_key, "write_file", {"path": path, "content": content}))


@mcp.tool()
async def job_edit_file(job_id: str, api_key: str, path: str, old_text: str, new_text: str) -> str:
    """Search-and-replace text in a file in the target's workspace (first occurrence)."""
    return _dump(await _call_target(
        job_id, api_key, "edit_file",
        {"path": path, "old_text": old_text, "new_text": new_text},
    ))


@mcp.tool()
async def job_create_directory(job_id: str, api_key: str, path: str) -> str:
    """Create a directory (including parents) in the target's workspace."""
    return _dump(await _call_target(job_id, api_key, "create_directory", {"path": path}))


@mcp.tool()
async def job_delete_file(job_id: str, api_key: str, path: str) -> str:
    """Delete a file or directory from the target's workspace."""
    return _dump(await _call_target(job_id, api_key, "delete_file", {"path": path}))


@mcp.tool()
async def job_move_file(job_id: str, api_key: str, source: str, destination: str) -> str:
    """Move or rename a file/directory in the target's workspace."""
    return _dump(await _call_target(
        job_id, api_key, "move_file",
        {"source": source, "destination": destination},
    ))


@mcp.tool()
async def job_get_file_info(job_id: str, api_key: str, path: str) -> str:
    """Get metadata (size, mtime, type) for a path in the target's workspace."""
    return _dump(await _call_target(job_id, api_key, "get_file_info", {"path": path}))


@mcp.tool()
async def job_search_files(job_id: str, api_key: str, pattern: str, path: str = ".") -> str:
    """Glob-search files in the target's workspace (skips node_modules/.git/.venv).

    Args:
        pattern: Glob pattern (e.g. "*.py", "*.tsx").
        path: Directory to search in (default: workspace root).
    """
    return _dump(await _call_target(
        job_id, api_key, "search_files",
        {"pattern": pattern, "path": path},
    ))



# ═══════════════════════ Client 1-facing: create_job ═══════════════════════
# Lets the target user's AI agent post a job through the same MCP endpoint
# without touching the Web UI. Returns the exact `agent_command` to run
# locally plus the shareable `executor_link` for Client 2.

import httpx as _httpx  # noqa: E402


def _host_base() -> str:
    return os.environ.get("APP_URL", "http://localhost:8001").rstrip("/")


@mcp.tool()
async def create_job(
    title: str,
    context: str = "",
    local_port: int = 0,
    target_name: str = "",
) -> str:
    """Create a new collaboration job AND get the one-liner shell command to start
    the HumEx tunnel agent on this (Client 1) machine.

    After calling this, the AI assistant should:
    1. Execute `next_steps.start_agent_command` in a terminal on the user's
       machine — this starts the agent DETACHED (nohup ... &) and prints the
       first 30 lines of its log so you can confirm the Cloudflare tunnel is up.
    2. Read the log: look for `✓ CONNECTED` and `Tunnel ready → https://....trycloudflare.com`.
    3. Poll `poll_until_tunnel_ready(job_id, api_key)` (or `job_status`) to
       confirm the tunnel URL has been registered with the host.
    4. Give the user the `executor_link` — they forward it to their expert.

    IMPORTANT: The job's `poster_uid` is set automatically from the HUMEX_API_KEY
    in your MCP config URL (e.g. `?key=knl_xxx`). If that key is missing or invalid,
    `poster_uid` stays NULL and the job won't appear on anyone's "Posted Jobs" page.
    Call `get_current_user()` first if unsure.

    Args:
        title: Short problem statement (e.g. "Login redirect loop").
        context: Optional background / repro steps / hypothesis.
        local_port: Local dev server port to expose via Cloudflare Quick Tunnel (0 = skip).
        target_name: Optional label for this target (defaults to "Target (<id>)").
    """
    base = _host_base()

    # Resolve current user from the middleware-populated context.
    poster_uid = None
    try:
        import server as _srv
        cur = _srv.get_current_user_from_ctx()
        if cur:
            poster_uid = cur.get("uid")
    except Exception:
        pass

    payload = {
        "title": title,
        "context": context,
        "local_port": int(local_port) if local_port else 0,
        "target_name": target_name or "",
        "poster_uid": poster_uid,
    }
    try:
        async with _httpx.AsyncClient(timeout=15.0) as cx:
            r = await cx.post(f"{base}/api/jobs/simple", json=payload)
            r.raise_for_status()
            data = r.json()
    except _httpx.HTTPError as exc:
        return _dump({
            "success": False,
            "error": "http_error",
            "message": f"Failed to create job on host: {exc}",
        })

    bg = data.get("agent_background") or {}
    return _dump({
        "success": True,
        "job_id": data["job_id"],
        "api_key": data["api_key"],
        "executor_link": data["executor_link"],
        "mcp_endpoint": data["mcp_endpoint"],
        "poster_uid": poster_uid,
        "next_steps": {
            "1_start_agent_command": bg.get("command", data.get("agent_command", "")),
            "2_tail_log_command": bg.get("tail_command", ""),
            "3_is_running_command": bg.get("is_running_command", ""),
            "4_stop_command": bg.get("stop_command", ""),
            "log_file": bg.get("log_file", ""),
            "pid_file": bg.get("pid_file", ""),
        },
        "foreground_agent_command": data.get("agent_command", ""),
        "instructions": [
            "Execute `next_steps.1_start_agent_command` NOW in a terminal on the user's local machine (not on the host).",
            "The command runs detached (nohup ... &) and prints the first 30 lines of the log, so you can confirm it says `✓ CONNECTED`.",
            "If the user set local_port>0, the log will also include a line like `Tunnel ready → https://<random>.trycloudflare.com` — that is the live app preview.",
            "After starting the agent, call `poll_until_tunnel_ready` (or `job_status`) to confirm the host has received a heartbeat and the tunnel URL.",
            "Then give the user `executor_link` so they can forward it to their expert.",
        ],
    })


@mcp.tool()
async def poll_until_tunnel_ready(
    job_id: str,
    api_key: str,
    max_wait_seconds: int = 60,
) -> str:
    """Block up to `max_wait_seconds` polling the host until target_online=true AND a tunnel_url is set.

    Use this right after `create_job` + starting the agent to confirm the
    Cloudflare Quick Tunnel is live and the executor can use it.
    """
    import asyncio as _asyncio
    base = _host_base()
    deadline = max(5, min(180, int(max_wait_seconds)))
    waited = 0
    last_status: Dict[str, Any] = {}
    async with _httpx.AsyncClient(timeout=10.0) as cx:
        while waited < deadline:
            try:
                r = await cx.get(
                    f"{base}/api/jobs/{job_id}/runtime",
                    params={"api_key": api_key},
                )
                r.raise_for_status()
                st = r.json()
                last_status = st
                target_ok = bool(st.get("target_online"))
                tunnel_url = st.get("tunnel_url") or ""
                # If user requested a tunnel (local_port>0) we wait for URL; if they
                # didn't, online is enough.
                if target_ok and (tunnel_url or st.get("local_port", 0) == 0):
                    return _dump({
                        "success": True,
                        "ready": True,
                        "target_online": True,
                        "tunnel_url": tunnel_url,
                        "waited_seconds": waited,
                        "status": st,
                    })
            except Exception as exc:
                last_status = {"error": str(exc)}
            await _asyncio.sleep(2.0)
            waited += 2
    return _dump({
        "success": True,
        "ready": False,
        "waited_seconds": waited,
        "status": last_status,
        "hint": (
            "Timed out. Likely causes: (a) the agent command was never executed on the "
            "user's machine, (b) the agent failed to start — tail the log file shown in "
            "create_job's next_steps, (c) cloudflared isn't installed on the user's "
            "machine so no tunnel URL is being advertised (file ops still work)."
        ),
    })


@mcp.tool()
async def close_job(job_id: str, api_key: str) -> str:
    """Close a job and revoke the API key. Call when collaboration is done."""
    base = _host_base()
    try:
        async with _httpx.AsyncClient(timeout=10.0) as cx:
            r = await cx.post(
                f"{base}/api/jobs/{job_id}/close",
                headers={"x-api-key": api_key},
            )
            r.raise_for_status()
            return _dump({"success": True, **r.json()})
    except _httpx.HTTPError as exc:
        return _dump({"success": False, "error": "http_error", "message": str(exc)})
