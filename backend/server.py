from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import json
import asyncio
import logging
import secrets
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from supabase import create_client, Client

from mcp_tools import (
    ensure_workspace, dispatch_tool, TOOL_SCHEMAS, WORKSPACE_ROOT,
)
from realtime_handler import realtime_handler
from tunnel_manager import tunnel_manager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase config
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')
DATABASE_URL = os.environ.get('DATABASE_URL', '')

# Supabase client (REST API over HTTPS)
supabase: Optional[Client] = None

# MCP Streamable HTTP — import + initialise session manager
from mcp_server import mcp as _mcp_instance            # noqa: E402
_mcp_http_app = _mcp_instance.streamable_http_app()     # creates session_manager
_mcp_session_mgr = _mcp_instance.session_manager


@asynccontextmanager
async def lifespan(application: FastAPI):
    # ---- startup ----
    global supabase
    ensure_workspace()
    if SUPABASE_URL and SUPABASE_ANON_KEY:
        try:
            supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            logger.info("Supabase client created (REST API)")
            await ensure_table()
        except Exception as e:
            logger.error(f"Failed to create Supabase client: {e}")
    else:
        logger.warning("Supabase URL or ANON_KEY not set — skipping client init")
    realtime_handler.log_event_cb = _log_event_to_db
    ok = await realtime_handler.initialize()
    if ok:
        logger.info("Realtime handler initialized — ready to join sessions")
    else:
        logger.warning("Realtime handler could not start")

    # Start MCP session manager task group
    async with _mcp_session_mgr.run():
        logger.info("MCP Streamable-HTTP session manager started")
        yield
    # ---- shutdown ----
    await realtime_handler.shutdown()
    logger.info("App shutdown complete")


app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ---------- Models ----------

class MCPClient(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    status: str = "registered"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MCPClientCreate(BaseModel):
    name: str
    description: str = ""

# --- Session models ---

class MCPSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    channel_name: str = ""
    status: str = "active"
    created_by: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MCPSessionCreate(BaseModel):
    name: str
    created_by: str = ""

# --- File event models ---

class MCPFileEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    event_type: str
    tool_name: str
    arguments: Dict[str, Any] = {}
    result: Dict[str, Any] = {}
    from_client: str = ""
    status: str = "pending"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# --- Workspace tool models ---

class WriteFileRequest(BaseModel):
    path: str
    content: str

class EditFileRequest(BaseModel):
    path: str
    old_text: str
    new_text: str

class CreateDirRequest(BaseModel):
    path: str

class MoveFileRequest(BaseModel):
    source: str
    destination: str

class ToolCallRequest(BaseModel):
    tool: str
    arguments: Dict[str, Any] = {}

# --- MCP Client Registration models ---

class MCPAddClientRequest(BaseModel):
    name: str
    role: str  # "target" or "executor"
    target_client_id: Optional[str] = None  # required for executor

class MCPRegisteredClient(BaseModel):
    id: str
    name: str
    role: str
    api_key: str
    session_id: str
    status: str
    created_at: str
    config: Dict[str, Any] = {}

class MCPHeartbeatRequest(BaseModel):
    client_id: Optional[str] = None
    job_id: Optional[str] = None
    role: Optional[str] = None
    session_id: Optional[str] = None

class MCPJob(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    context: str = ""
    tunnel_url: str
    target_client_id: str
    session_id: str
    status: str = "open"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MCPJobCreate(BaseModel):
    title: str
    context: str = ""
    tunnel_url: str
    target_client_id: str

class HealthResponse(BaseModel):
    status: str
    supabase_connected: bool
    database_url_set: bool
    supabase_url_set: bool
    supabase_anon_key_set: bool
    table_ready: bool
    message: str

# ---------- Lifecycle ----------

async def _log_event_to_db(session_id: str, event_type: str, data: dict):
    """Persist an event row to mcp_file_events (best-effort)."""
    if not supabase:
        return
    try:
        row = {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "event_type": event_type,
            "tool_name": data.get("tool", ""),
            "arguments": json.dumps(data.get("arguments", {})),
            "result": json.dumps(data.get("result", {})),
            "from_client": data.get("from_client", ""),
            "status": data.get("status", "logged"),
            "created_at": data.get("ts", datetime.now(timezone.utc).isoformat()),
        }
        supabase.table("mcp_file_events").insert(row).execute()
    except Exception as exc:
        logger.warning(f"Event log write skipped: {exc}")


# Startup / shutdown handled in lifespan() context manager above.

async def ensure_table():
    """Create the core MCP tables if they don't exist using Supabase SQL."""
    global supabase
    if not supabase:
        return
    try:
        # Use Supabase RPC to execute raw SQL for table creation
        supabase.rpc('exec_sql', {
            'query': """
                CREATE TABLE IF NOT EXISTS mcp_clients (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    status TEXT DEFAULT 'registered',
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS mcp_sessions (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    channel_name TEXT NOT NULL,
                    status TEXT DEFAULT 'active',
                    created_by TEXT DEFAULT '',
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS mcp_file_events (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    tool_name TEXT NOT NULL DEFAULT '',
                    arguments JSONB DEFAULT '{}',
                    result JSONB DEFAULT '{}',
                    from_client TEXT DEFAULT '',
                    status TEXT DEFAULT 'pending',
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS mcp_jobs (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    context TEXT DEFAULT '',
                    tunnel_url TEXT NOT NULL,
                    target_client_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    status TEXT DEFAULT 'open',
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """
        }).execute()
        logger.info("Core MCP tables ensured via RPC")
    except Exception as e:
        logger.warning(f"RPC exec_sql not available (expected): {e}")
        logger.info("Tables must be created manually or via Supabase dashboard. Checking direct access...")
        for table_name in ("mcp_clients", "mcp_sessions", "mcp_file_events", "mcp_jobs"):
            try:
                supabase.table(table_name).select('id').limit(1).execute()
                logger.info(f"{table_name} table exists and is accessible")
            except Exception as table_error:
                logger.warning(f"{table_name} table not found: {table_error}")
        logger.info("If any table is missing, run the SQL from /api/setup-sql in the Supabase SQL Editor")

# ---------- Routes ----------

@api_router.get("/health", response_model=HealthResponse)
async def health_check():
    connected = False
    table_ready = False
    message = "Supabase not configured"

    if supabase:
        try:
            # Test connection by querying
            supabase.table('mcp_clients').select('id').limit(1).execute()
            connected = True
            table_ready = True
            message = "Connected to Supabase — mcp_clients table ready"
        except Exception as e:
            err = str(e)
            if '42P01' in err or 'does not exist' in err.lower() or 'relation' in err.lower() or 'PGRST205' in err or 'could not find' in err.lower():
                connected = True
                table_ready = False
                message = "Connected to Supabase — but mcp_clients table not found. Create it in SQL Editor."
            else:
                message = f"Supabase error: {err[:120]}"
    else:
        message = "Supabase client not initialized — check SUPABASE_URL and SUPABASE_ANON_KEY"

    return HealthResponse(
        status="ok" if connected and table_ready else "degraded",
        supabase_connected=connected,
        database_url_set=bool(DATABASE_URL),
        supabase_url_set=bool(SUPABASE_URL),
        supabase_anon_key_set=bool(SUPABASE_ANON_KEY),
        table_ready=table_ready,
        message=message,
    )

@api_router.post("/mcp/clients", response_model=MCPClient)
async def register_mcp_client(input: MCPClientCreate):
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not available")
    client_obj = MCPClient(name=input.name, description=input.description)
    try:
        supabase.table('mcp_clients').insert({
            "id": client_obj.id,
            "name": client_obj.name,
            "description": client_obj.description,
            "status": client_obj.status,
            "created_at": client_obj.created_at,
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return client_obj

@api_router.get("/mcp/clients", response_model=List[MCPClient])
async def list_mcp_clients():
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not available")
    try:
        result = supabase.table('mcp_clients').select('*').order('created_at', desc=True).execute()
        return [MCPClient(**row) for row in result.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/mcp/clients/{client_id}")
async def remove_mcp_client(client_id: str):
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not available")
    try:
        result = supabase.table('mcp_clients').delete().eq('id', client_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Client not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "deleted", "id": client_id}

@api_router.get("/")
async def root():
    return {"message": "MCP Supabase Tunnel — API running"}

# ---------- SQL Helper Endpoint ----------

@api_router.get("/setup-sql")
async def get_setup_sql():
    """Returns the SQL needed to create all MCP tunnel tables."""
    return {
        "instruction": "Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)",
        "sql": """
-- ===================== MCP Clients =====================
CREATE TABLE IF NOT EXISTS mcp_clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'registered',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE mcp_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_mcp_clients" ON mcp_clients;
CREATE POLICY "anon_mcp_clients" ON mcp_clients FOR ALL USING (true) WITH CHECK (true);

-- ===================== MCP Sessions =====================
CREATE TABLE IF NOT EXISTS mcp_sessions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_by TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE mcp_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_mcp_sessions" ON mcp_sessions;
CREATE POLICY "anon_mcp_sessions" ON mcp_sessions FOR ALL USING (true) WITH CHECK (true);

-- ===================== MCP File Events =====================
CREATE TABLE IF NOT EXISTS mcp_file_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    tool_name TEXT NOT NULL DEFAULT '',
    arguments JSONB DEFAULT '{}',
    result JSONB DEFAULT '{}',
    from_client TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE mcp_file_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_mcp_file_events" ON mcp_file_events;
CREATE POLICY "anon_mcp_file_events" ON mcp_file_events FOR ALL USING (true) WITH CHECK (true);

-- ===================== MCP Jobs =====================
CREATE TABLE IF NOT EXISTS mcp_jobs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    context TEXT DEFAULT '',
    tunnel_url TEXT NOT NULL,
    target_client_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE mcp_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_mcp_jobs" ON mcp_jobs;
CREATE POLICY "anon_mcp_jobs" ON mcp_jobs FOR ALL USING (true) WITH CHECK (true);

-- ===================== Realtime Publication =====================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE mcp_clients;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE mcp_sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE mcp_file_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE mcp_jobs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
"""
    }


# ---------- Session Endpoints ----------

@api_router.post("/sessions", response_model=MCPSession)
async def create_session(body: MCPSessionCreate):
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not available")
    sess = MCPSession(
        name=body.name,
        channel_name=f"mcp-session-{uuid.uuid4().hex[:12]}",
        created_by=body.created_by,
    )
    # Use the session id as part of channel name for determinism
    sess.channel_name = f"mcp-session-{sess.id}"
    try:
        supabase.table("mcp_sessions").insert({
            "id": sess.id,
            "name": sess.name,
            "channel_name": sess.channel_name,
            "status": sess.status,
            "created_by": sess.created_by,
            "created_at": sess.created_at,
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return sess


@api_router.get("/sessions", response_model=List[MCPSession])
async def list_sessions():
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not available")
    try:
        result = supabase.table("mcp_sessions").select("*").order("created_at", desc=True).execute()
        return [MCPSession(**r) for r in result.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/sessions/active/list")
async def list_active_sessions():
    return {
        "active_sessions": realtime_handler.list_active_sessions(),
        "client_id": realtime_handler.client_id,
        "realtime_active": realtime_handler.active,
    }


@api_router.get("/sessions/{session_id}", response_model=MCPSession)
async def get_session(session_id: str):
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not available")
    try:
        result = supabase.table("mcp_sessions").select("*").eq("id", session_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Session not found")
        return MCPSession(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not available")
    # leave realtime first
    await realtime_handler.leave_session(session_id)
    try:
        supabase.table("mcp_sessions").delete().eq("id", session_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "deleted", "id": session_id}


# ---------- Realtime Activation ----------

@api_router.post("/sessions/{session_id}/activate")
async def activate_session(session_id: str):
    """Start the Realtime listener for this session (Client A joins channel)."""
    ok = await realtime_handler.join_session(session_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to activate realtime listener")
    return {
        "status": "activated",
        "session_id": session_id,
        "client_id": realtime_handler.client_id,
        "channel": f"mcp-session-{session_id}",
    }


@api_router.post("/sessions/{session_id}/deactivate")
async def deactivate_session(session_id: str):
    """Stop the Realtime listener for this session."""
    await realtime_handler.leave_session(session_id)
    return {"status": "deactivated", "session_id": session_id}


# ---------- MCP File Tool Endpoints (Direct REST) ----------

@api_router.get("/tools")
async def list_tools():
    """List all available MCP tools and their schemas."""
    return {"tools": TOOL_SCHEMAS}


@api_router.post("/tools/call")
async def call_tool(body: ToolCallRequest):
    """Execute an MCP tool directly via REST."""
    result = dispatch_tool(body.tool, body.arguments)
    return {"tool": body.tool, "arguments": body.arguments, "result": result}


@api_router.get("/workspace/list")
async def workspace_list(path: str = "."):
    return dispatch_tool("list_directory", {"path": path})


@api_router.get("/workspace/read")
async def workspace_read(path: str):
    return dispatch_tool("read_file", {"path": path})


@api_router.post("/workspace/write")
async def workspace_write(body: WriteFileRequest):
    return dispatch_tool("write_file", {"path": body.path, "content": body.content})


@api_router.post("/workspace/edit")
async def workspace_edit(body: EditFileRequest):
    return dispatch_tool("edit_file", {
        "path": body.path,
        "old_text": body.old_text,
        "new_text": body.new_text,
    })


@api_router.delete("/workspace/delete")
async def workspace_delete(path: str):
    return dispatch_tool("delete_file", {"path": path})


@api_router.post("/workspace/mkdir")
async def workspace_mkdir(body: CreateDirRequest):
    return dispatch_tool("create_directory", {"path": body.path})


@api_router.post("/workspace/move")
async def workspace_move(body: MoveFileRequest):
    return dispatch_tool("move_file", {"source": body.source, "destination": body.destination})


@api_router.get("/workspace/info")
async def workspace_info(path: str):
    return dispatch_tool("get_file_info", {"path": path})


@api_router.get("/workspace/search")
async def workspace_search(pattern: str, path: str = "."):
    return dispatch_tool("search_files", {"pattern": pattern, "path": path})


# ---------- File Events (Audit Log) ----------

@api_router.get("/events")
async def list_events(session_id: Optional[str] = None, limit: int = 50):
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not available")
    try:
        q = supabase.table("mcp_file_events").select("*").order("created_at", desc=True).limit(limit)
        if session_id:
            q = q.eq("session_id", session_id)
        result = q.execute()
        return {"events": result.data, "count": len(result.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------- MCP Client Registration & Config ----------

# In-memory heartbeat tracker: api_key -> last_seen_ts
_heartbeats: Dict[str, str] = {}

# In-memory peer presence registry: keyed by (session_id, job_id)
# Each entry: { client_id: { role, job_id, session_id, last_seen } }
_peer_registry: Dict[str, Dict[str, Dict[str, Any]]] = {}
BACKEND_URL = os.environ.get("APP_URL", "http://localhost:8001")


def _generate_api_key() -> str:
    return f"mcp_{secrets.token_urlsafe(32)}"


def _build_mcp_config(client_name: str, role: str, api_key: str, session_id: str) -> dict:
    """Build the MCP-compatible configuration JSON for a client."""
    channel_name = f"mcp-session-{session_id}"
    safe_name = client_name.lower().replace(" ", "-")

    config = {
        "mcpServers": {
            f"mcp-tunnel-{safe_name}": {
                "url": f"{BACKEND_URL}/api",
                "transport": "supabase-realtime",
                "apiKey": api_key,
                "sessionId": session_id,
                "channelName": channel_name,
                "role": role,
                "supabase": {
                    "url": SUPABASE_URL,
                    "anonKey": SUPABASE_ANON_KEY,
                },
            }
        }
    }

    if role == "target":
        config["mcpServers"][f"mcp-tunnel-{safe_name}"]["tools"] = list(TOOL_SCHEMAS.keys())
        config["mcpServers"][f"mcp-tunnel-{safe_name}"]["description"] = (
            "Target MCP server — receives and executes file operation tool calls from connected executors."
        )
    else:
        config["mcpServers"][f"mcp-tunnel-{safe_name}"]["description"] = (
            "Executor MCP client — sends tool calls to the target via Supabase Realtime broadcast."
        )

    return config


def _parse_client_meta(description: str) -> dict:
    """Parse JSON metadata stored in the description field."""
    try:
        return json.loads(description) if description else {}
    except (json.JSONDecodeError, TypeError):
        return {}


def _build_console_config(main_server_url: str, api_key: str, job_id: str) -> dict:
    return {
        "mainServerUrl": main_server_url,
        "apiKey": api_key,
        "jobId": job_id,
    }


def _get_target_client_or_raise(target_client_id: str):
    result = supabase.table("mcp_clients").select("*").eq("id", target_client_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Target client not found")

    row = result.data[0]
    meta = _parse_client_meta(row.get("description", ""))
    if meta.get("role") != "target":
        raise HTTPException(status_code=400, detail="target_client_id must belong to a target client")
    if not meta.get("session_id"):
        raise HTTPException(status_code=400, detail="Target client is missing a session")
    if not meta.get("api_key"):
        raise HTTPException(status_code=400, detail="Target client is missing an API key")

    return row, meta


def _build_job_payload(job_row: dict, target_row: dict, target_meta: dict, include_config: bool = False) -> dict:
    payload = {
        "id": job_row["id"],
        "title": job_row["title"],
        "context": job_row.get("context", ""),
        "tunnel_url": job_row.get("tunnel_url", ""),
        "target_client_id": job_row.get("target_client_id", ""),
        "target_name": target_row.get("name", ""),
        "session_id": job_row.get("session_id", ""),
        "status": job_row.get("status", "open"),
        "created_at": job_row.get("created_at", ""),
    }
    if include_config:
        payload["console_config"] = _build_console_config(
            BACKEND_URL,
            target_meta.get("api_key", ""),
            job_row["id"],
        )
    return payload


@api_router.post("/mcp/add")
async def add_mcp_client(body: MCPAddClientRequest):
    """Register a new MCP client (target or executor) with auto-generated API key."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not available")

    if body.role not in ("target", "executor"):
        raise HTTPException(status_code=400, detail="role must be 'target' or 'executor'")

    api_key = _generate_api_key()
    client_id = str(uuid.uuid4())
    session_id = ""

    if body.role == "target":
        # Create a new session for this target
        session_id = str(uuid.uuid4())
        try:
            supabase.table("mcp_sessions").insert({
                "id": session_id,
                "name": f"session-{body.name}",
                "channel_name": f"mcp-session-{session_id}",
                "status": "active",
                "created_by": client_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create session: {e}")

        # Auto-activate the Realtime listener for Client A
        asyncio.ensure_future(_auto_activate(session_id))

    elif body.role == "executor":
        if not body.target_client_id:
            raise HTTPException(status_code=400, detail="target_client_id required for executor role")
        # Look up the target's session
        try:
            target_row = supabase.table("mcp_clients").select("*").eq("id", body.target_client_id).execute()
            if not target_row.data:
                raise HTTPException(status_code=404, detail="Target client not found")
            target_meta = _parse_client_meta(target_row.data[0].get("description", ""))
            session_id = target_meta.get("session_id", "")
            if not session_id:
                raise HTTPException(status_code=400, detail="Target client has no session")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Build metadata
    meta = {
        "role": body.role,
        "api_key": api_key,
        "session_id": session_id,
        "target_client_id": body.target_client_id or "",
    }

    # Build config
    config = _build_mcp_config(body.name, body.role, api_key, session_id)

    # Store in DB
    try:
        supabase.table("mcp_clients").insert({
            "id": client_id,
            "name": body.name,
            "description": json.dumps(meta),
            "status": "registered",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "id": client_id,
        "name": body.name,
        "role": body.role,
        "api_key": api_key,
        "session_id": session_id,
        "channel_name": f"mcp-session-{session_id}",
        "status": "registered",
        "config": config,
    }


async def _auto_activate(session_id: str):
    """Auto-activate Realtime listener after a short delay."""
    await asyncio.sleep(1)
    try:
        ok = await realtime_handler.join_session(session_id)
        if ok:
            logger.info(f"Auto-activated Realtime for session {session_id}")
    except Exception as e:
        logger.error(f"Auto-activate failed for {session_id}: {e}")


@api_router.get("/mcp/clients/{client_id}/config")
async def get_client_config(client_id: str, public_base_url: Optional[str] = None):
    """Get MCP configuration JSON for a registered client.

    Pass ?public_base_url=https://... to override the server URL in
    the generated config (useful when handing off to a remote agent
    that cannot reach localhost).
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not available")
    try:
        result = supabase.table("mcp_clients").select("*").eq("id", client_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Client not found")
        row = result.data[0]
        meta = _parse_client_meta(row.get("description", ""))
        if not meta.get("role"):
            raise HTTPException(status_code=400, detail="Not an MCP-registered client")
        config = _build_mcp_config(row["name"], meta["role"], meta["api_key"], meta["session_id"])

        # Override the server URL when a public base is supplied
        if public_base_url:
            safe_url = public_base_url.rstrip("/")
            safe_name = row["name"].lower().replace(" ", "-")
            key = f"mcp-tunnel-{safe_name}"
            if key in config.get("mcpServers", {}):
                config["mcpServers"][key]["url"] = f"{safe_url}/api"

        return {
            "id": client_id,
            "name": row["name"],
            "role": meta["role"],
            "api_key": meta["api_key"],
            "session_id": meta["session_id"],
            "config": config,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/jobs")
async def create_job(body: MCPJobCreate):
    """Create a shareable expert job bound to a target client/session."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not available")

    try:
        target_row, target_meta = _get_target_client_or_raise(body.target_client_id)
        job = MCPJob(
            title=body.title,
            context=body.context,
            tunnel_url=body.tunnel_url,
            target_client_id=body.target_client_id,
            session_id=target_meta["session_id"],
        )

        supabase.table("mcp_jobs").insert({
            "id": job.id,
            "title": job.title,
            "context": job.context,
            "tunnel_url": job.tunnel_url,
            "target_client_id": job.target_client_id,
            "session_id": job.session_id,
            "status": job.status,
            "created_at": job.created_at,
        }).execute()

        return {
            "job": _build_job_payload(job.model_dump(), target_row, target_meta, include_config=True),
        }
    except HTTPException:
        raise
    except Exception as e:
        detail = str(e)
        if "mcp_jobs" in detail and ("could not find" in detail.lower() or "does not exist" in detail.lower()):
            detail = "mcp_jobs table not found. Run the SQL from /api/setup-sql first."
        raise HTTPException(status_code=500, detail=detail)


@api_router.get("/jobs")
async def list_jobs():
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not available")

    try:
        result = supabase.table("mcp_jobs").select("*").order("created_at", desc=True).execute()
        jobs = []
        for row in result.data:
            try:
                target_row, target_meta = _get_target_client_or_raise(row.get("target_client_id", ""))
                jobs.append(_build_job_payload(row, target_row, target_meta, include_config=False))
            except HTTPException:
                jobs.append({
                    "id": row["id"],
                    "title": row.get("title", ""),
                    "context": row.get("context", ""),
                    "tunnel_url": row.get("tunnel_url", ""),
                    "target_client_id": row.get("target_client_id", ""),
                    "target_name": "Unknown target",
                    "session_id": row.get("session_id", ""),
                    "status": row.get("status", "open"),
                    "created_at": row.get("created_at", ""),
                })
        return {"jobs": jobs, "count": len(jobs)}
    except Exception as e:
        detail = str(e)
        if "mcp_jobs" in detail and ("could not find" in detail.lower() or "does not exist" in detail.lower()):
            return {"jobs": [], "count": 0, "message": "mcp_jobs table not found yet"}
        raise HTTPException(status_code=500, detail=detail)


@api_router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not available")

    try:
        result = supabase.table("mcp_jobs").select("*").eq("id", job_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Job not found")

        row = result.data[0]
        target_row, target_meta = _get_target_client_or_raise(row.get("target_client_id", ""))
        return {
            "job": _build_job_payload(row, target_row, target_meta, include_config=True),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/jobs/{job_id}/status")
async def get_job_status(job_id: str):
    """Authoritative job peer-status endpoint.

    Resolves the job to its session_id, inspects the peer presence registries
    (both realtime_handler and in-memory heartbeat registry), and returns
    a compact status payload."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not available")

    try:
        result = supabase.table("mcp_jobs").select("*").eq("id", job_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Job not found")
        row = result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    session_id = row.get("session_id", "")
    job_status = row.get("status", "open")

    # 1. Check realtime_handler presence (primary source)
    rt_status = realtime_handler.get_job_peers(session_id, job_id)

    # 2. Check in-memory peer_registry (heartbeat-based)
    registry_key = f"{session_id}:{job_id}"
    hb_peers = _peer_registry.get(registry_key, {})
    now = datetime.now(timezone.utc)

    # Merge heartbeat peers that aren't already in realtime presence
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
    matched_client_ids = [
        p["client_id"] for p in all_peers
        if not p.get("stale", True)
    ]

    return {
        "job_id": job_id,
        "session_id": session_id,
        "job_status": job_status,
        "target_online": rt_status["target_online"],
        "executor_online": rt_status["executor_online"],
        "peer_matched": peer_matched,
        "matched_client_ids": matched_client_ids,
        "peers": all_peers,
    }


@api_router.post("/mcp/heartbeat")
async def mcp_heartbeat(
    body: MCPHeartbeatRequest = MCPHeartbeatRequest(),
    x_api_key: Optional[str] = Header(None),
):
    """Heartbeat endpoint — clients ping this to report they're alive.
    When job_id + session_id are provided, updates the peer presence registry."""
    key = x_api_key or ""
    ts = datetime.now(timezone.utc).isoformat()
    _heartbeats[key] = ts
    if body.client_id:
        _heartbeats[body.client_id] = ts

    # Update peer presence registry when job-aware fields are provided
    if body.session_id and body.job_id and body.client_id:
        registry_key = f"{body.session_id}:{body.job_id}"
        if registry_key not in _peer_registry:
            _peer_registry[registry_key] = {}
        _peer_registry[registry_key][body.client_id] = {
            "role": body.role or "unknown",
            "job_id": body.job_id,
            "session_id": body.session_id,
            "last_seen": ts,
        }

    return {"status": "ok", "ts": ts}


@api_router.get("/mcp/connections")
async def get_mcp_connections():
    """Get all MCP-registered clients with connection status and configs."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not available")
    try:
        result = supabase.table("mcp_clients").select("*").order("created_at", desc=True).execute()
        clients = []
        active_sessions = realtime_handler.list_active_sessions()

        for row in result.data:
            meta = _parse_client_meta(row.get("description", ""))
            if not meta.get("role"):
                continue  # skip legacy clients without role

            session_id = meta.get("session_id", "")
            is_active = session_id in active_sessions
            last_heartbeat = _heartbeats.get(meta.get("api_key", "")) or _heartbeats.get(row["id"])

            config = _build_mcp_config(row["name"], meta["role"], meta["api_key"], session_id)

            clients.append({
                "id": row["id"],
                "name": row["name"],
                "role": meta["role"],
                "api_key": meta["api_key"],
                "session_id": session_id,
                "channel_name": f"mcp-session-{session_id}",
                "status": "connected" if is_active else "disconnected",
                "realtime_active": is_active,
                "last_heartbeat": last_heartbeat,
                "target_client_id": meta.get("target_client_id", ""),
                "created_at": row.get("created_at", ""),
                "config": config,
            })

        return {"clients": clients, "server_client_id": realtime_handler.client_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/mcp/connections/{client_id}")
async def delete_mcp_connection(client_id: str):
    """Delete an MCP-registered client and optionally its session."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not available")
    try:
        row = supabase.table("mcp_clients").select("*").eq("id", client_id).execute()
        if row.data:
            meta = _parse_client_meta(row.data[0].get("description", ""))
            session_id = meta.get("session_id", "")
            if meta.get("role") == "target" and session_id:
                await realtime_handler.leave_session(session_id)
                try:
                    supabase.table("mcp_sessions").delete().eq("id", session_id).execute()
                except Exception:
                    pass
        supabase.table("mcp_clients").delete().eq("id", client_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "deleted", "id": client_id}


# ---------- Tunnel Lifecycle ----------

class TunnelStartRequest(BaseModel):
    local_url: str = "http://localhost:8001"


@api_router.post("/tunnel/start")
async def tunnel_start(body: TunnelStartRequest):
    """Start a cloudflared quick-tunnel pointing at the given local URL."""
    result = await tunnel_manager.start(body.local_url)
    return result


@api_router.post("/tunnel/stop")
async def tunnel_stop():
    """Stop the running tunnel."""
    result = await tunnel_manager.stop()
    return result


@api_router.get("/tunnel/status")
async def tunnel_status():
    """Get the current tunnel status."""
    return tunnel_manager.get_status()


@api_router.get("/tunnel/logs")
async def tunnel_logs(tail: int = 80):
    """Get recent tunnel process logs."""
    return {"logs": tunnel_manager.get_logs(tail)}


# ---------- App wiring ----------

app.include_router(api_router)

# Mount the MCP Streamable-HTTP sub-app (session manager started in lifespan)
# Internal route is /mcp, mount at root so final path = /mcp
app.mount("/", _mcp_http_app)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
