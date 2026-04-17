"""Supabase Realtime handler — Client A (target) side of the MCP tunnel.

Connects to Supabase Realtime channels per session and processes
tool-request broadcasts from Client B (executor).
"""

import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Callable, Awaitable

from supabase import acreate_client, AsyncClient
from mcp_tools import dispatch_tool

logger = logging.getLogger(__name__)


class RealtimeHandler:
    """Manages Supabase Realtime channels for MCP sessions."""

    # Staleness threshold in seconds
    STALE_SECONDS = 60

    def __init__(self):
        self.client: Optional[AsyncClient] = None
        self.channels: Dict[str, Any] = {}          # channel_name -> channel
        self.active: bool = False
        self.client_id: str = f"client-a-{uuid.uuid4().hex[:8]}"
        self._url: str = ""
        self._key: str = ""
        # Optional callback: async fn(session_id, event_type, data)
        self.log_event_cb: Optional[Callable[..., Awaitable]] = None
        # Job-aware peer presence: { session_id: { client_id: {role, job_id, last_seen} } }
        self._peer_presence: Dict[str, Dict[str, Dict[str, Any]]] = {}

    # ── lifecycle ──────────────────────────────────────────────

    async def initialize(self) -> bool:
        # Read env vars lazily (after load_dotenv in server.py)
        self._url = os.environ.get("SUPABASE_URL", "")
        self._key = os.environ.get("SUPABASE_ANON_KEY", "")
        if not self._url or not self._key:
            logger.warning("Supabase credentials not set — Realtime disabled")
            return False
        try:
            self.client = await acreate_client(self._url, self._key)
            self.active = True
            logger.info(f"Realtime handler ready  client_id={self.client_id}")
            return True
        except Exception as e:
            logger.error(f"Realtime init failed: {e}")
            return False

    async def shutdown(self):
        for sid in list(self.channels):
            await self.leave_session(sid.replace("mcp-session-", ""))
        self.active = False
        logger.info("Realtime handler shut down")

    # ── session channels ──────────────────────────────────────

    async def join_session(self, session_id: str) -> bool:
        if not self.client:
            return False
        channel_name = f"mcp-session-{session_id}"
        if channel_name in self.channels:
            logger.info(f"Already on {channel_name}")
            return True

        try:
            channel = self.client.channel(channel_name)

            async def _handle_tool_request_async(payload):
                """Receive tool-request from Client B, execute, respond."""
                data = payload.get("payload", payload) if isinstance(payload, dict) else payload
                logger.info(f"tool-request received: {data}")

                from_client = data.get("from_client", "")
                if from_client == self.client_id:
                    return  # ignore echo

                request_id = data.get("request_id", uuid.uuid4().hex)
                tool_name = data.get("tool", "")
                arguments = data.get("arguments", {})

                result = dispatch_tool(tool_name, arguments)

                response = {
                    "session_id": session_id,
                    "request_id": request_id,
                    "tool": tool_name,
                    "arguments": arguments,
                    "result": result,
                    "status": "success" if result.get("success") else "error",
                    "from_client": self.client_id,
                    "ts": datetime.now(timezone.utc).isoformat(),
                }

                try:
                    await channel.send_broadcast("tool-response", response)
                    logger.info(f"tool-response sent for {tool_name}")
                except Exception as exc:
                    logger.error(f"Failed to send response: {exc}")

                # persist
                if self.log_event_cb:
                    try:
                        await self.log_event_cb(session_id, "tool-request", data)
                        await self.log_event_cb(session_id, "tool-response", response)
                    except Exception:
                        pass

            def _handle_tool_request(payload):
                """Sync wrapper that schedules the async handler as a task."""
                asyncio.ensure_future(_handle_tool_request_async(payload))

            channel.on_broadcast("tool-request", _handle_tool_request)

            # Subscribe without async callback (avoids coroutine-not-awaited warnings)
            await channel.subscribe()
            # Allow time for WebSocket handshake and join confirmation
            await asyncio.sleep(3)
            logger.info(f"Subscribed to {channel_name}")

            # Announce presence
            try:
                await channel.send_broadcast("client-joined", {
                    "client_id": self.client_id,
                    "role": "target",
                    "ts": datetime.now(timezone.utc).isoformat(),
                })
            except Exception:
                pass

            # Register self (host/target) in peer presence
            if session_id not in self._peer_presence:
                self._peer_presence[session_id] = {}
            self._peer_presence[session_id][self.client_id] = {
                "role": "target",
                "job_id": None,
                "last_seen": datetime.now(timezone.utc).isoformat(),
            }

            # Listen for job-aware peer announcements
            def _handle_peer_announce(payload):
                data = payload.get("payload", payload) if isinstance(payload, dict) else payload
                cid = data.get("client_id", "")
                if cid == self.client_id:
                    return  # ignore echo
                if session_id not in self._peer_presence:
                    self._peer_presence[session_id] = {}
                self._peer_presence[session_id][cid] = {
                    "role": data.get("role", "executor"),
                    "job_id": data.get("job_id"),
                    "last_seen": datetime.now(timezone.utc).isoformat(),
                }
                logger.info(f"Peer announced: {cid} role={data.get('role')} job={data.get('job_id')} on session {session_id}")

            channel.on_broadcast("peer-announce", _handle_peer_announce)

            # Listen for peer-left cleanup
            def _handle_peer_left(payload):
                data = payload.get("payload", payload) if isinstance(payload, dict) else payload
                cid = data.get("client_id", "")
                if session_id in self._peer_presence:
                    self._peer_presence[session_id].pop(cid, None)
                logger.info(f"Peer left: {cid} on session {session_id}")

            channel.on_broadcast("client-left", _handle_peer_left)

            self.channels[channel_name] = channel
            return True
        except Exception as e:
            logger.error(f"Failed to join {channel_name}: {e}")
            return False

    async def leave_session(self, session_id: str):
        channel_name = f"mcp-session-{session_id}"
        ch = self.channels.pop(channel_name, None)
        if ch:
            try:
                await ch.send_broadcast("client-left", {
                    "client_id": self.client_id,
                    "ts": datetime.now(timezone.utc).isoformat(),
                })
                await ch.unsubscribe()
            except Exception as e:
                logger.warning(f"Error leaving {channel_name}: {e}")
        # Clean up presence
        self._peer_presence.pop(session_id, None)

    # ── job-aware presence helpers ─────────────────────────────

    def announce_job(self, session_id: str, job_id: str):
        """Mark the host target as associated with a specific job."""
        if session_id in self._peer_presence and self.client_id in self._peer_presence[session_id]:
            self._peer_presence[session_id][self.client_id]["job_id"] = job_id
            self._peer_presence[session_id][self.client_id]["last_seen"] = datetime.now(timezone.utc).isoformat()

    def get_job_peers(self, session_id: str, job_id: str) -> dict:
        """Return all peers on a session that advertise the given job_id.

        Returns:
            {
                "target_online": bool,
                "executor_online": bool,
                "peer_matched": bool,
                "peers": [{ client_id, role, job_id, last_seen, stale }],
            }
        """
        now = datetime.now(timezone.utc)
        session_peers = self._peer_presence.get(session_id, {})
        matched_peers = []
        target_online = False
        executor_online = False

        for cid, info in session_peers.items():
            peer_job = info.get("job_id")
            if peer_job != job_id:
                continue
            last_seen_str = info.get("last_seen", "")
            stale = False
            if last_seen_str:
                try:
                    last_seen_dt = datetime.fromisoformat(last_seen_str.replace("Z", "+00:00"))
                    if last_seen_dt.tzinfo is None:
                        last_seen_dt = last_seen_dt.replace(tzinfo=timezone.utc)
                    stale = (now - last_seen_dt).total_seconds() > self.STALE_SECONDS
                except (ValueError, TypeError):
                    stale = True

            role = info.get("role", "unknown")
            if role == "target" and not stale:
                target_online = True
            elif role == "executor" and not stale:
                executor_online = True

            matched_peers.append({
                "client_id": cid,
                "role": role,
                "job_id": peer_job,
                "last_seen": last_seen_str,
                "stale": stale,
            })

        return {
            "target_online": target_online,
            "executor_online": executor_online,
            "peer_matched": target_online and executor_online,
            "peers": matched_peers,
        }

    def get_session_presence(self, session_id: str) -> dict:
        """Return raw presence data for a session."""
        return dict(self._peer_presence.get(session_id, {}))

    def list_active_sessions(self):
        return [
            ch_name.replace("mcp-session-", "")
            for ch_name in self.channels
        ]


# Singleton
realtime_handler = RealtimeHandler()
