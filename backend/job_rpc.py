"""Job RPC — async request/response between the Host MCP and Client 1's CLI agent.

Architecture:
- MCP tool called by Client 2's agent → enqueues a tool-request on the job's queue
  and awaits a matching tool-response via an asyncio.Future keyed by request_id.
- Client 1 CLI long-polls `agent/pull` → pops queued tool-requests and executes them
  locally → POSTs results back to `agent/respond`, which resolves the pending Future.

This avoids installing supabase-py / Realtime on the user's machine: plain HTTP only.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


@dataclass
class JobRuntime:
    """Per-job in-memory state: queues, pending futures, agent presence."""
    job_id: str
    api_key: str
    session_id: str
    # Pending tool-requests waiting for the CLI agent to pull
    queue: asyncio.Queue = field(default_factory=asyncio.Queue)
    # request_id -> Future holding the MCP caller's awaiting coroutine
    pending: Dict[str, asyncio.Future] = field(default_factory=dict)
    # CLI agent presence
    agent_client_id: str = ""
    agent_last_seen: Optional[str] = None
    tunnel_url: str = ""
    local_port: int = 0
    # Executor presence (Client 2's AI agent, tracked via MCP tool calls)
    executor_last_seen: Optional[str] = None


class JobRPC:
    """Singleton orchestrator for job-scoped RPC between MCP and CLI agents."""

    AGENT_STALE_SECONDS = 45
    EXECUTOR_STALE_SECONDS = 45
    DEFAULT_TOOL_TIMEOUT = 30.0

    def __init__(self) -> None:
        self._runtimes: Dict[str, JobRuntime] = {}

    # ── runtime registry ───────────────────────────────────────

    def register(self, job_id: str, api_key: str, session_id: str) -> JobRuntime:
        rt = self._runtimes.get(job_id)
        if rt is None:
            rt = JobRuntime(job_id=job_id, api_key=api_key, session_id=session_id)
            self._runtimes[job_id] = rt
        else:
            rt.api_key = api_key
            rt.session_id = session_id
        return rt

    def get(self, job_id: str) -> Optional[JobRuntime]:
        return self._runtimes.get(job_id)

    def require(self, job_id: str, api_key: str) -> JobRuntime:
        rt = self._runtimes.get(job_id)
        if rt is None:
            raise KeyError(f"job '{job_id}' not registered")
        if rt.api_key != api_key:
            raise PermissionError("invalid api_key")
        return rt

    def forget(self, job_id: str) -> None:
        rt = self._runtimes.pop(job_id, None)
        if rt is None:
            return
        # Cancel any pending futures so callers get an error instead of hanging
        for fut in rt.pending.values():
            if not fut.done():
                fut.set_exception(RuntimeError("job closed"))
        rt.pending.clear()

    # ── presence helpers ──────────────────────────────────────

    def touch_agent(self, job_id: str, *, client_id: str = "", tunnel_url: str = "", local_port: int = 0) -> None:
        rt = self._runtimes.get(job_id)
        if rt is None:
            return
        rt.agent_last_seen = datetime.now(timezone.utc).isoformat()
        if client_id:
            rt.agent_client_id = client_id
        if tunnel_url:
            rt.tunnel_url = tunnel_url
        if local_port:
            rt.local_port = local_port

    def touch_executor(self, job_id: str) -> None:
        rt = self._runtimes.get(job_id)
        if rt is None:
            return
        rt.executor_last_seen = datetime.now(timezone.utc).isoformat()

    def _is_fresh(self, iso_ts: Optional[str], max_age: float) -> bool:
        if not iso_ts:
            return False
        try:
            dt = datetime.fromisoformat(iso_ts.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return (datetime.now(timezone.utc) - dt).total_seconds() <= max_age
        except Exception:
            return False

    def status(self, job_id: str) -> Dict[str, Any]:
        rt = self._runtimes.get(job_id)
        if rt is None:
            return {
                "registered": False,
                "target_online": False,
                "executor_online": False,
            }
        target_online = self._is_fresh(rt.agent_last_seen, self.AGENT_STALE_SECONDS)
        executor_online = self._is_fresh(rt.executor_last_seen, self.EXECUTOR_STALE_SECONDS)
        return {
            "registered": True,
            "job_id": job_id,
            "session_id": rt.session_id,
            "target_online": target_online,
            "executor_online": executor_online,
            "peer_matched": target_online and executor_online,
            "agent_client_id": rt.agent_client_id,
            "agent_last_seen": rt.agent_last_seen,
            "executor_last_seen": rt.executor_last_seen,
            "tunnel_url": rt.tunnel_url,
            "local_port": rt.local_port,
            "queue_depth": rt.queue.qsize(),
            "pending_requests": len(rt.pending),
        }

    # ── RPC: MCP tool → CLI agent ──────────────────────────────

    async def call_tool(
        self,
        job_id: str,
        api_key: str,
        tool: str,
        arguments: Dict[str, Any],
        timeout: float = DEFAULT_TOOL_TIMEOUT,
    ) -> Dict[str, Any]:
        """Enqueue a tool-request for the CLI agent and await its response."""
        rt = self.require(job_id, api_key)
        self.touch_executor(job_id)

        if not self._is_fresh(rt.agent_last_seen, self.AGENT_STALE_SECONDS):
            return {
                "success": False,
                "error": "target_offline",
                "message": (
                    "The target agent (Client 1) is not connected. "
                    "Ask Client 1 to run the Kernal agent CLI and confirm the job is active, "
                    "then retry."
                ),
            }

        request_id = uuid.uuid4().hex
        loop = asyncio.get_running_loop()
        fut: asyncio.Future = loop.create_future()
        rt.pending[request_id] = fut

        request_payload = {
            "request_id": request_id,
            "tool": tool,
            "arguments": arguments,
            "ts": datetime.now(timezone.utc).isoformat(),
        }
        await rt.queue.put(request_payload)

        try:
            result = await asyncio.wait_for(fut, timeout=timeout)
            return result
        except asyncio.TimeoutError:
            # Remove the pending future so a late response doesn't leak
            rt.pending.pop(request_id, None)
            return {
                "success": False,
                "error": "tool_timeout",
                "message": f"Tool '{tool}' timed out after {timeout}s waiting for the target agent",
            }
        finally:
            rt.pending.pop(request_id, None)

    # ── CLI agent interface ───────────────────────────────────

    async def agent_pull(
        self,
        job_id: str,
        api_key: str,
        *,
        max_wait: float = 15.0,
        max_batch: int = 8,
    ) -> Dict[str, Any]:
        """Long-poll: return up to `max_batch` pending tool-requests; wait up to `max_wait` sec."""
        rt = self.require(job_id, api_key)

        requests_out = []

        # Immediately drain anything already queued
        try:
            while len(requests_out) < max_batch:
                item = rt.queue.get_nowait()
                requests_out.append(item)
        except asyncio.QueueEmpty:
            pass

        if requests_out:
            return {"requests": requests_out, "waited": False}

        # Otherwise wait up to max_wait seconds for one to appear
        try:
            item = await asyncio.wait_for(rt.queue.get(), timeout=max_wait)
            requests_out.append(item)
            try:
                while len(requests_out) < max_batch:
                    item = rt.queue.get_nowait()
                    requests_out.append(item)
            except asyncio.QueueEmpty:
                pass
            return {"requests": requests_out, "waited": True}
        except asyncio.TimeoutError:
            return {"requests": [], "waited": True}

    def agent_respond(
        self,
        job_id: str,
        api_key: str,
        request_id: str,
        result: Dict[str, Any],
    ) -> Dict[str, Any]:
        rt = self.require(job_id, api_key)
        fut = rt.pending.get(request_id)
        if fut is None:
            return {"ok": False, "error": "unknown_request_id"}
        if fut.done():
            return {"ok": False, "error": "future_already_resolved"}
        fut.set_result(result)
        return {"ok": True}


# Singleton
job_rpc = JobRPC()
