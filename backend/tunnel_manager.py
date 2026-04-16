"""Tunnel lifecycle manager — wraps cloudflared to expose a local server via public URL.

Tracks a single tunnel process at a time (enough for the host-side workflow).
Providers are abstracted so ngrok or others can be added later.
"""

import asyncio
import logging
import os
import re
import shutil
import signal
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, List

logger = logging.getLogger(__name__)

MAX_LOG_LINES = 200


@dataclass
class TunnelState:
    status: str = "stopped"          # stopped | starting | running | error
    provider: str = "cloudflared"
    local_url: str = ""
    public_url: str = ""
    error: str = ""
    pid: Optional[int] = None
    started_at: Optional[str] = None
    logs: List[str] = field(default_factory=list)


class TunnelManager:
    """Manages a single cloudflared quick-tunnel process."""

    def __init__(self):
        self._process: Optional[asyncio.subprocess.Process] = None
        self.state = TunnelState()
        self._reader_task: Optional[asyncio.Task] = None

    # ── public API ─────────────────────────────────────────

    def get_status(self) -> dict:
        return {
            "status": self.state.status,
            "provider": self.state.provider,
            "local_url": self.state.local_url,
            "public_url": self.state.public_url,
            "error": self.state.error,
            "pid": self.state.pid,
            "started_at": self.state.started_at,
            "installed": self._is_installed(),
        }

    def get_logs(self, tail: int = 80) -> List[str]:
        return self.state.logs[-tail:]

    async def start(self, local_url: str) -> dict:
        """Start a cloudflared quick-tunnel pointing at *local_url*.

        Returns the current status dict.  The public URL becomes available
        asynchronously once cloudflared finishes handshake (usually < 5 s).
        """
        if self.state.status == "running" and self._process and self._process.returncode is None:
            return {**self.get_status(), "message": "Tunnel already running"}

        if not self._is_installed():
            self.state.status = "error"
            self.state.error = "cloudflared binary not found. Install it: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
            return self.get_status()

        # Reset
        await self.stop()
        self.state = TunnelState(status="starting", local_url=local_url)
        self._append_log(f"Starting tunnel → {local_url}")

        try:
            cmd = [
                self._binary_path(),
                "tunnel",
                "--url", local_url,
                "--no-autoupdate",
            ]
            self._process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            self.state.pid = self._process.pid
            self.state.started_at = datetime.now(timezone.utc).isoformat()
            self._append_log(f"Process started  pid={self._process.pid}")

            # Read stderr in background (cloudflared writes tunnel URL there)
            self._reader_task = asyncio.ensure_future(self._read_output())

            # Wait up to 15 s for public URL to appear
            for _ in range(30):
                await asyncio.sleep(0.5)
                if self.state.public_url:
                    self.state.status = "running"
                    self._append_log(f"Tunnel ready → {self.state.public_url}")
                    return self.get_status()
                if self._process.returncode is not None:
                    self.state.status = "error"
                    self.state.error = "cloudflared exited before providing a URL"
                    return self.get_status()

            # Timed out but process still alive — might be slow
            if self._process.returncode is None:
                self.state.status = "running"
                self._append_log("Tunnel process alive but URL not yet detected")
            else:
                self.state.status = "error"
                self.state.error = "Timed out waiting for tunnel URL"

            return self.get_status()

        except FileNotFoundError:
            self.state.status = "error"
            self.state.error = "cloudflared binary not found on PATH"
            return self.get_status()
        except Exception as exc:
            self.state.status = "error"
            self.state.error = str(exc)
            self._append_log(f"Start failed: {exc}")
            return self.get_status()

    async def stop(self) -> dict:
        if self._reader_task and not self._reader_task.done():
            self._reader_task.cancel()
            self._reader_task = None

        if self._process and self._process.returncode is None:
            try:
                self._process.send_signal(signal.SIGTERM)
                try:
                    await asyncio.wait_for(self._process.wait(), timeout=5)
                except asyncio.TimeoutError:
                    self._process.kill()
                    await self._process.wait()
                self._append_log("Tunnel stopped")
            except ProcessLookupError:
                pass
            except Exception as exc:
                self._append_log(f"Error stopping tunnel: {exc}")

        self._process = None
        self.state.status = "stopped"
        self.state.public_url = ""
        self.state.pid = None
        self.state.error = ""
        return self.get_status()

    # ── internals ──────────────────────────────────────────

    def _is_installed(self) -> bool:
        return shutil.which("cloudflared") is not None

    def _binary_path(self) -> str:
        return shutil.which("cloudflared") or "cloudflared"

    def _append_log(self, line: str):
        ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
        entry = f"[{ts}] {line}"
        self.state.logs.append(entry)
        if len(self.state.logs) > MAX_LOG_LINES:
            self.state.logs = self.state.logs[-MAX_LOG_LINES:]
        logger.info(f"tunnel: {line}")

    async def _read_output(self):
        """Read cloudflared stderr looking for the public URL."""
        if not self._process or not self._process.stderr:
            return
        url_pattern = re.compile(r"https://[a-zA-Z0-9\-]+\.trycloudflare\.com")
        try:
            while True:
                raw = await self._process.stderr.readline()
                if not raw:
                    break
                line = raw.decode("utf-8", errors="replace").strip()
                if line:
                    self._append_log(line)
                    match = url_pattern.search(line)
                    if match and not self.state.public_url:
                        self.state.public_url = match.group(0)
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            self._append_log(f"Reader error: {exc}")


# Singleton
tunnel_manager = TunnelManager()
