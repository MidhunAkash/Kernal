from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from supabase import create_client, Client

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase config
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')
DATABASE_URL = os.environ.get('DATABASE_URL', '')

# Supabase client (REST API over HTTPS)
supabase: Optional[Client] = None

app = FastAPI()
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

class HealthResponse(BaseModel):
    status: str
    supabase_connected: bool
    database_url_set: bool
    supabase_url_set: bool
    supabase_anon_key_set: bool
    table_ready: bool
    message: str

# ---------- Lifecycle ----------

@app.on_event("startup")
async def startup():
    global supabase
    if SUPABASE_URL and SUPABASE_ANON_KEY:
        try:
            supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            logger.info("Supabase client created (REST API)")
            # Try to create table via RPC or just test connection
            await ensure_table()
        except Exception as e:
            logger.error(f"Failed to create Supabase client: {e}")
    else:
        logger.warning("Supabase URL or ANON_KEY not set — skipping client init")

async def ensure_table():
    """Create mcp_clients table if it doesn't exist using Supabase SQL."""
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
            """
        }).execute()
        logger.info("mcp_clients table ensured via RPC")
    except Exception as e:
        logger.warning(f"RPC exec_sql not available (expected): {e}")
        logger.info("Table must be created manually or via Supabase dashboard. Trying direct insert to test...")
        # Table might already exist — we'll find out on first query
        try:
            supabase.table('mcp_clients').select('id').limit(1).execute()
            logger.info("mcp_clients table exists and is accessible")
        except Exception as e2:
            logger.warning(f"mcp_clients table not found: {e2}")
            logger.info("Please create the table via Supabase SQL Editor")

# ---------- Routes ----------

@api_router.get("/health", response_model=HealthResponse)
async def health_check():
    connected = False
    table_ready = False
    message = "Supabase not configured"

    if supabase:
        try:
            # Test connection by querying
            result = supabase.table('mcp_clients').select('id').limit(1).execute()
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
    """Returns the SQL needed to create the mcp_clients table."""
    return {
        "instruction": "Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)",
        "sql": """
CREATE TABLE IF NOT EXISTS mcp_clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'registered',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE mcp_clients;

-- Enable RLS (required for anon key access)
ALTER TABLE mcp_clients ENABLE ROW LEVEL SECURITY;

-- Allow anon read/write for POC (restrict in production)
CREATE POLICY "Allow anon full access" ON mcp_clients
    FOR ALL USING (true) WITH CHECK (true);
"""
    }

# ---------- App wiring ----------

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
