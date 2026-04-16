# MCP Supabase Tunnel — PRD

## Problem Statement
Minimal POC for an MCP (Model Context Protocol) tunnel using Supabase Realtime. Python backend setup to connect to Supabase PostgreSQL with basic MCP client registration.

## Architecture
- **Backend**: FastAPI + asyncpg (direct PostgreSQL to Supabase)
- **Frontend**: React (minimal dark UI)
- **Database**: Supabase PostgreSQL (external)
- **Realtime**: Supabase Realtime (stub ready, activates when credentials are set)

## What's Been Implemented (2026-04-16)
- `.env` configured with `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` placeholders
- `server.py` — asyncpg connection pool, auto-creates `mcp_clients` table on startup, graceful degradation when credentials missing
- API endpoints: `GET /api/health`, `POST /api/mcp/clients`, `GET /api/mcp/clients`, `DELETE /api/mcp/clients/{id}`
- Minimal dark-themed frontend showing connection status (green/red indicators), client registration form, client list
- All tests passing (100% backend, 100% frontend)

## User Personas
- Developer setting up MCP infrastructure with Supabase

## Core Requirements
- [x] Supabase .env setup
- [x] Python asyncpg connection to Supabase PostgreSQL
- [x] Health check showing connection status
- [x] MCP client registration (CRUD)
- [x] Minimal frontend dashboard

## Backlog (P0/P1/P2)
- **P0**: User adds real Supabase credentials (DATABASE_URL password, ANON_KEY)
- **P1**: Supabase Realtime subscription for mcp_clients table changes (live updates)
- **P1**: MCP tunnel logic — relay tool calls between connected clients
- **P2**: Client heartbeat/ping mechanism
- **P2**: Tool registration per client
- **P2**: Message history/audit log

## Next Tasks
1. User provides real Supabase credentials → connection goes green
2. Enable Supabase Realtime replication on mcp_clients table
3. Implement Realtime subscription in backend for live client status
4. Build MCP tunnel relay: Client A → Supabase channel → Client B
