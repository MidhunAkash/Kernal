#!/usr/bin/env python3
"""HumEx CLI agent — runs on Client 1's (target's) machine.

Responsibilities:
1. (optional) Spawn `cloudflared tunnel --url http://localhost:<port>` to expose
   Client 1's local dev server at a public trycloudflare URL.
2. Register the tunnel URL with the HumEx host via PATCH /api/jobs/{id}/tunnel.
3. Long-poll /api/jobs/{id}/agent/pull for tool-requests from Client 2 (via Host MCP).
4. Execute tool-requests on the LOCAL workspace filesystem.
5. POST results back to /api/jobs/{id}/agent/respond.
6. Heartbeat /api/jobs/{id}/agent/heartbeat every 20 s.

Dependencies: only `requests` from the standard-ish library ecosystem.
No Supabase SDK required — everything is plain HTTPS.

Usage:
    python humex_agent.py \
        --host https://your-host.example.com \
        --job-id <uuid> \
        --api-key <mcp_...> \
        --workspace ./my-project \
        --local-port 3000           # optional — spawns cloudflared if given
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import os
import queue
import re
import shutil
import signal
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import requests
except ImportError:
    print("Missing dependency: requests.  Install with  pip install requests", file=sys.stderr)
    sys.exit(1)


# ───────────────────────── Local tool implementations ─────────────────────────

def _resolve(workspace: Path, path: str) -> Path:
    """Sandbox-safe path join — refuses any path that escapes workspace root."""
    p = (workspace / path).resolve()
    root = workspace.resolve()
    if not str(p).startswith(str(root)):
        raise ValueError(f"path escapes workspace: {path}")
    return p


def t_list_directory(ws: Path, path: str = ".") -> Dict[str, Any]:
    target = _resolve(ws, path)
    if not target.exists():
        return {"success": False, "error": "not_found", "path": path}
    if not target.is_dir():
        return {"success": False, "error": "not_a_directory", "path": path}
    entries = []
    for child in sorted(target.iterdir()):
        try:
            st = child.stat()
            entries.append({
                "name": child.name,
                "type": "dir" if child.is_dir() else "file",
                "size": st.st_size if child.is_file() else 0,
                "mtime": st.st_mtime,
            })
        except OSError:
            continue
    return {"success": True, "path": path, "entries": entries}


def t_read_file(ws: Path, path: str) -> Dict[str, Any]:
    target = _resolve(ws, path)
    if not target.exists() or not target.is_file():
        return {"success": False, "error": "not_found", "path": path}
    try:
        content = target.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return {"success": False, "error": "binary_file", "path": path}
    return {"success": True, "path": path, "content": content, "size": len(content)}


def t_write_file(ws: Path, path: str, content: str) -> Dict[str, Any]:
    target = _resolve(ws, path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return {"success": True, "path": path, "size": len(content)}


def t_edit_file(ws: Path, path: str, old_text: str, new_text: str) -> Dict[str, Any]:
    target = _resolve(ws, path)
    if not target.exists() or not target.is_file():
        return {"success": False, "error": "not_found", "path": path}
    content = target.read_text(encoding="utf-8")
    if old_text not in content:
        return {"success": False, "error": "old_text_not_found", "path": path}
    content = content.replace(old_text, new_text, 1)
    target.write_text(content, encoding="utf-8")
    return {"success": True, "path": path, "size": len(content)}


def t_create_directory(ws: Path, path: str) -> Dict[str, Any]:
    target = _resolve(ws, path)
    target.mkdir(parents=True, exist_ok=True)
    return {"success": True, "path": path}


def t_delete_file(ws: Path, path: str) -> Dict[str, Any]:
    target = _resolve(ws, path)
    if not target.exists():
        return {"success": False, "error": "not_found", "path": path}
    if target.is_dir():
        shutil.rmtree(target)
    else:
        target.unlink()
    return {"success": True, "path": path}


def t_move_file(ws: Path, source: str, destination: str) -> Dict[str, Any]:
    src = _resolve(ws, source)
    dst = _resolve(ws, destination)
    if not src.exists():
        return {"success": False, "error": "source_not_found", "source": source}
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))
    return {"success": True, "source": source, "destination": destination}


def t_get_file_info(ws: Path, path: str) -> Dict[str, Any]:
    target = _resolve(ws, path)
    if not target.exists():
        return {"success": False, "error": "not_found", "path": path}
    st = target.stat()
    return {
        "success": True,
        "path": path,
        "type": "dir" if target.is_dir() else "file",
        "size": st.st_size,
        "mtime": st.st_mtime,
    }


def t_search_files(ws: Path, pattern: str, path: str = ".") -> Dict[str, Any]:
    root = _resolve(ws, path)
    if not root.exists():
        return {"success": False, "error": "not_found", "path": path}
    matches: List[str] = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Skip common noise
        dirnames[:] = [d for d in dirnames if d not in {".git", "node_modules", "__pycache__", ".venv", "venv", ".next", "dist", "build"}]
        for name in filenames:
            if fnmatch.fnmatch(name, pattern):
                full = Path(dirpath) / name
                rel = full.relative_to(ws)
                matches.append(str(rel))
                if len(matches) >= 500:
                    break
        if len(matches) >= 500:
            break
    return {"success": True, "pattern": pattern, "matches": matches, "count": len(matches)}


TOOL_MAP = {
    "list_directory": t_list_directory,
    "read_file": t_read_file,
    "write_file": t_write_file,
    "edit_file": t_edit_file,
    "create_directory": t_create_directory,
    "delete_file": t_delete_file,
    "move_file": t_move_file,
    "get_file_info": t_get_file_info,
    "search_files": t_search_files,
}


def dispatch(workspace: Path, tool: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    fn = TOOL_MAP.get(tool)
    if fn is None:
        return {"success": False, "error": "unknown_tool", "tool": tool}
    try:
        return fn(workspace, **arguments)
    except TypeError as exc:
        return {"success": False, "error": "bad_arguments", "message": str(exc)}
    except Exception as exc:
        return {"success": False, "error": "exception", "message": str(exc)}


# ───────────────────────── Cloudflared tunnel ─────────────────────────

CF_URL_RE = re.compile(r"https://[a-zA-Z0-9\-]+\.trycloudflare\.com")


def spawn_cloudflared(local_port: int, out_queue: queue.Queue) -> Optional[subprocess.Popen]:
    bin_path = shutil.which("cloudflared")
    if not bin_path:
        print("[agent] cloudflared not found on PATH — skipping tunnel. Install it from:")
        print("        https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/")
        return None

    cmd = [bin_path, "tunnel", "--url", f"http://localhost:{local_port}", "--no-autoupdate"]
    print(f"[agent] Spawning cloudflared: {' '.join(cmd)}")
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    def _reader():
        for line in proc.stdout:  # type: ignore[union-attr]
            line = line.rstrip()
            print(f"[cloudflared] {line}")
            m = CF_URL_RE.search(line)
            if m:
                out_queue.put(m.group(0))

    threading.Thread(target=_reader, daemon=True).start()
    return proc


# ───────────────────────── HTTP client to host ─────────────────────────

class HostClient:
    def __init__(self, host: str, job_id: str, api_key: str) -> None:
        self.host = host.rstrip("/")
        self.job_id = job_id
        self.api_key = api_key
        self.client_id = f"agent-{uuid.uuid4().hex[:10]}"
        self.session = requests.Session()
        self.session.headers.update({
            "x-api-key": api_key,
            "content-type": "application/json",
            "accept": "application/json",
        })

    def self_check(self) -> bool:
        """Block until the first heartbeat succeeds, or print a loud error and exit."""
        url = f"{self.host}/api/jobs/{self.job_id}/agent/heartbeat"
        print(f"[agent] probing host → POST {url}")
        try:
            r = self.session.post(url, json={"client_id": self.client_id}, timeout=20)
        except requests.RequestException as exc:
            print("[agent] ✗ cannot reach host:")
            print(f"[agent]   {type(exc).__name__}: {exc}")
            print("[agent]   Check: (a) your internet, (b) --host value, (c) any corporate proxy/firewall.")
            return False
        body_preview = r.text[:300]
        if r.status_code == 200:
            print(f"[agent] ✓ host reachable — heartbeat accepted (HTTP 200)")
            try:
                st = r.json().get("status", {})
                print(f"[agent]   server says target_online={st.get('target_online')}, session_id={st.get('session_id','?')[:8]}")
            except Exception:
                pass
            return True
        print(f"[agent] ✗ heartbeat rejected: HTTP {r.status_code}")
        print(f"[agent]   body: {body_preview}")
        if r.status_code == 401:
            print("[agent]   → the --api-key does not match this --job-id. Copy the command from /target again.")
        elif r.status_code == 404:
            print("[agent]   → the --job-id is unknown. Did you paste it completely? Was the job closed?")
        return False

    def heartbeat(self, tunnel_url: str = "", local_port: int = 0) -> None:
        url = f"{self.host}/api/jobs/{self.job_id}/agent/heartbeat"
        body = {"client_id": self.client_id}
        if tunnel_url:
            body["tunnel_url"] = tunnel_url
        if local_port:
            body["local_port"] = local_port
        try:
            r = self.session.post(url, json=body, timeout=15)
            if r.status_code >= 400:
                print(f"[agent] heartbeat failed: {r.status_code} {r.text[:200]}")
        except requests.RequestException as exc:
            print(f"[agent] heartbeat error: {exc}")

    def pull(self, max_wait: int = 15) -> List[Dict[str, Any]]:
        url = f"{self.host}/api/jobs/{self.job_id}/agent/pull"
        try:
            r = self.session.post(
                url, json={"max_wait": max_wait, "client_id": self.client_id},
                timeout=max_wait + 10,
            )
            if r.status_code >= 400:
                print(f"[agent] pull failed: {r.status_code} {r.text[:200]}")
                return []
            return r.json().get("requests", [])
        except requests.RequestException as exc:
            print(f"[agent] pull error: {exc}")
            return []

    def respond(self, request_id: str, result: Dict[str, Any]) -> None:
        url = f"{self.host}/api/jobs/{self.job_id}/agent/respond"
        try:
            r = self.session.post(
                url,
                json={"request_id": request_id, "result": result},
                timeout=15,
            )
            if r.status_code >= 400:
                print(f"[agent] respond failed: {r.status_code} {r.text[:200]}")
        except requests.RequestException as exc:
            print(f"[agent] respond error: {exc}")


# ───────────────────────── Main loop ─────────────────────────

_stop = threading.Event()


def _handle_signal(signum, frame):  # noqa: ANN001
    print(f"\n[agent] signal {signum} — shutting down")
    _stop.set()


def heartbeat_thread(client: HostClient, state: Dict[str, Any]) -> None:
    while not _stop.is_set():
        client.heartbeat(tunnel_url=state.get("tunnel_url", ""), local_port=state.get("local_port", 0))
        _stop.wait(20)


def main() -> int:
    parser = argparse.ArgumentParser(description="HumEx CLI agent — Client 1 side")
    parser.add_argument("--host", required=True, help="HumEx host base URL (e.g. https://humex.example.com)")
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--api-key", required=True)
    parser.add_argument("--workspace", default=".", help="Local directory to expose for file ops (default: cwd)")
    parser.add_argument("--local-port", type=int, default=0, help="Spawn cloudflared for http://localhost:<port>")
    parser.add_argument("--tunnel-url", default="", help="Advertise this tunnel URL instead of spawning cloudflared")
    args = parser.parse_args()

    workspace = Path(args.workspace).expanduser().resolve()
    if not workspace.is_dir():
        print(f"[agent] workspace is not a directory: {workspace}", file=sys.stderr)
        return 2

    print(f"[agent] workspace = {workspace}")
    print(f"[agent] host      = {args.host}")
    print(f"[agent] job_id    = {args.job_id}")
    print(f"[agent] api_key   = {args.api_key[:12]}…{args.api_key[-4:]}")

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    client = HostClient(args.host, args.job_id, args.api_key)

    # Probe the host FIRST — fail loudly if we can't talk to it.
    if not client.self_check():
        print("[agent] aborting — could not establish first heartbeat. See message above.")
        return 1

    state: Dict[str, Any] = {"tunnel_url": args.tunnel_url, "local_port": args.local_port}

    cloudflared_proc: Optional[subprocess.Popen] = None
    url_q: queue.Queue = queue.Queue()

    if args.local_port and not args.tunnel_url:
        cloudflared_proc = spawn_cloudflared(args.local_port, url_q)

    # Kick off heartbeat
    hb = threading.Thread(target=heartbeat_thread, args=(client, state), daemon=True)
    hb.start()

    # Initial registration heartbeat (with tunnel_url if user supplied one)
    if state["tunnel_url"] or state["local_port"]:
        client.heartbeat(tunnel_url=state["tunnel_url"], local_port=state["local_port"])

    print("=" * 60)
    print(f"[agent] ✓ CONNECTED — job {args.job_id[:8]}… is live on the host")
    print(f"[agent]   dashboard: {args.host}/executor?job={args.job_id}&key={args.api_key}")
    print("[agent]   long-polling for tool-requests (Ctrl-C to stop)")
    print("=" * 60)

    try:
        while not _stop.is_set():
            # Pick up any new tunnel URL from cloudflared
            try:
                while True:
                    new_url = url_q.get_nowait()
                    if new_url and new_url != state.get("tunnel_url"):
                        state["tunnel_url"] = new_url
                        print(f"[agent] Tunnel ready → {new_url}")
                        client.heartbeat(tunnel_url=new_url, local_port=state["local_port"])
            except queue.Empty:
                pass

            requests_out = client.pull(max_wait=15)
            for req in requests_out:
                req_id = req.get("request_id")
                tool = req.get("tool", "")
                args_in = req.get("arguments", {}) or {}
                print(f"[agent] → {tool}({json.dumps(args_in)[:160]})")
                result = dispatch(workspace, tool, args_in)
                ok = result.get("success", False)
                print(f"[agent] ← {tool} {'ok' if ok else 'error'}")
                client.respond(req_id, result)
    finally:
        _stop.set()
        if cloudflared_proc and cloudflared_proc.poll() is None:
            print("[agent] Stopping cloudflared")
            cloudflared_proc.terminate()
            try:
                cloudflared_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                cloudflared_proc.kill()

    print("[agent] bye")
    return 0


if __name__ == "__main__":
    sys.exit(main())
