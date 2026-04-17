# Kernal / HumEx — MCP Tunnel Fix PRD

## Problem Statement (verbatim)
> this is our current project "https://github.com/MidhunAkash/Kernal/tree/new-changes"
> and we had a best working tools from "https://github.com/MidhunAkash/Kernal/tree/kernal-mcp"
> and please load the both the projects and analytse the tool desccriptions and ops from
> the kernal-mcp and read it and fix the current in new-changes branch which is or main branch.
>
> User follow-up: the tunnel should be able to connect to other person's emergent / ai coding
> agent but right now it is not working but in previous versions it was working like a charm.
> Likely the place where the issue came was when we merged the frontend (done by other dev)
> with this tunnel logic and some mess ups started to happen which made it not connect

## Architecture Summary
- FastAPI backend (`/app/backend/server.py`) hosting REST API + FastMCP Streamable-HTTP sub-app
- MCP sub-app mounted at `/api/mcp` and `/mcp`; uses Server-Sent Events (SSE) streaming
- `mcp_server.py` exposes 26 tools: workspace_*, job_*, create_job, connect_to_job,
  poll_until_tunnel_ready, close_job, get_current_user, etc.
- CLI agent (`humex_agent.py`) runs on Client 1's machine, opens Cloudflare tunnel,
  polls host for remote tool calls originating from Client 2's AI coding agent
- React frontend hits `/api/jobs/*`, `/api/tunnel/*`, `/api/mcp/clients/*`, etc.

## Root Cause of "tunnel not connecting"
A `HumExAPIKeyMiddleware` was introduced in the `new-changes` branch to populate a
ContextVar from `?key=knl_xxx` / `X-HumEx-Key`. It was implemented with
`starlette.middleware.base.BaseHTTPMiddleware`, which **buffers the entire response
body before streaming it downstream**. This is a known Starlette limitation.

Because the MCP sub-app is mounted under the same FastAPI app, every MCP request
(including SSE responses for `initialize`, `tools/list`, and tool calls) was being
routed through this buffering middleware. Result:
- Client 2's AI agent never received the streamed SSE chunks → MCP session never
  completed → tunnel appeared "not connected"
- In the old `kernal-mcp` branch this middleware did not exist, so the tunnel
  worked "like a charm"

## Fix Applied
Rewrote `HumExAPIKeyMiddleware` in `/app/backend/server.py` as a **pure ASGI
middleware** (no `BaseHTTPMiddleware` inheritance). It parses `?key=` from the raw
query string and `x-humex-key` from raw headers, sets `current_user_ctx`, and
passes the ASGI scope/receive/send through to the inner app unchanged — so
streaming SSE responses flow without buffering.

Also removed the now-unused `from starlette.middleware.base import BaseHTTPMiddleware`
import.

### What's been implemented (2026-01)
- [x] Diagnosed tunnel-disconnect regression introduced during the frontend merge
- [x] Confirmed `tunnel_manager.py`, `realtime_handler.py`, `job_rpc.py`,
      `mcp_tools.py`, and the CLI agent are functionally identical between branches
      (only branding differences)
- [x] Replaced BaseHTTPMiddleware with pure ASGI middleware (preserves user-context
      feature AND streaming)
- [x] Verified MCP Streamable-HTTP: initialize → tools/list returns 26 tools via
      SSE through the middleware, backend stable, all endpoints return 200

### P0 Backlog (to pick up next)
- [ ] Configure Supabase URL + ANON_KEY in `/app/backend/.env` (currently missing,
      so Supabase-dependent features run in degraded mode: no user-binding, no
      `poster_uid`, no `solver_uid`, no reward points)
- [ ] Install `cloudflared` on the environment running the CLI agent so the
      Quick Tunnel URL (`https://*.trycloudflare.com`) actually publishes
- [ ] End-to-end tunnel test with a real Client-1 CLI agent + Client-2 MCP client

### P1 Backlog
- [ ] Cache `_resolve_user_from_api_key` results (currently hits Supabase on every
      request that carries `?key=` — acceptable now, will hurt at scale)
- [ ] Add a fast-path in middleware that skips Supabase lookup for health checks
      and static asset routes
- [ ] Rate-limit `/api/users/me` and API-key endpoints

### P2 Backlog
- [ ] Frontend: reconcile `DashboardClient1.jsx` / `DashboardClient2.jsx` against
      legacy `JobsListing.js` (two implementations coexist)
- [ ] Consolidate `PostJobPage.jsx` (legacy) vs `humex/PostJob.jsx` (new)

## User Personas
- **Client 1 (Target User)** — has the broken app locally, runs the HumEx CLI agent,
  shares `executor_link` with an expert
- **Client 2 (Expert / AI Agent)** — plugs the MCP URL into Cursor / Claude / VSCode
  to file-op into Client 1's workspace and view their live app via the tunnel
