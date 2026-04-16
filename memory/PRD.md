# MCP Supabase Tunnel — PRD

## Problem Statement
MCP tunnel using Supabase Realtime for two-user collaboration. Client A (target/this app) receives file operation commands from Client B (executor) via Supabase Realtime broadcast channels. File operations are sandboxed to a workspace directory.

## Architecture
- **Backend**: FastAPI + supabase-py (REST API + async Realtime)
- **Frontend**: React (dark UI with tabbed layout)
- **Database**: Supabase PostgreSQL (3 tables: mcp_clients, mcp_sessions, mcp_file_events)
- **Realtime**: Supabase Realtime Broadcast channels per session
- **Workspace**: `/app/workspace` — sandboxed directory for MCP file operations

## What's Been Implemented
- **MCP File Tools** (9 tools): read_file, write_file, edit_file, list_directory, create_directory, delete_file, move_file, get_file_info, search_files
- **Realtime Handler**: Async Supabase client connects to session channels, processes tool-request broadcasts from Client B, sends tool-response back
- **Session Management**: CRUD for sessions, activate/deactivate Realtime listener per session
- **Workspace REST API**: Direct REST endpoints for all file operations + generic `/api/tools/call` dispatcher
- **File Events Audit Log**: Persists tool-request/tool-response events to Supabase
- **Frontend**: 4-tab UI (Dashboard, Sessions, Console, Events)
  - Dashboard: Connection status, Client A ID, setup SQL
  - Sessions: Create/list/activate/deactivate/delete sessions
  - Console: Client B simulator — connect to channel, send tool requests, see responses
  - Events: Persisted file events log from DB

## Backend Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Connection status |
| GET | /api/setup-sql | SQL for all tables |
| GET | /api/tools | List MCP tool schemas |
| POST | /api/tools/call | Generic tool dispatcher |
| GET | /api/workspace/list | List directory |
| GET | /api/workspace/read | Read file |
| POST | /api/workspace/write | Write file |
| POST | /api/workspace/edit | Edit file |
| DELETE | /api/workspace/delete | Delete file/dir |
| POST | /api/workspace/mkdir | Create directory |
| POST | /api/workspace/move | Move file |
| GET | /api/workspace/info | File metadata |
| GET | /api/workspace/search | Search files |
| POST | /api/sessions | Create session |
| GET | /api/sessions | List sessions |
| GET | /api/sessions/active/list | Active Realtime sessions |
| GET | /api/sessions/{id} | Get session |
| DELETE | /api/sessions/{id} | Delete session |
| POST | /api/sessions/{id}/activate | Start Realtime listener |
| POST | /api/sessions/{id}/deactivate | Stop Realtime listener |
| GET | /api/events | File events audit log |

## Setup Required
1. Run the SQL from `/api/setup-sql` in Supabase Dashboard > SQL Editor to create tables
2. Once tables exist, session management and events will work
3. File operations work independently of Supabase tables

## Realtime Flow
1. User creates session → backend stores in Supabase
2. User activates session → backend joins Realtime channel as Client A
3. Client B (frontend Console tab) connects to same channel
4. Client B sends tool-request via broadcast
5. Client A receives, executes tool on workspace filesystem, broadcasts tool-response
6. Events persisted to mcp_file_events table
