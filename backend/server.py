from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import asyncpg
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase config
DATABASE_URL = os.environ.get('DATABASE_URL', '')
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')

# Global connection pool
pool: Optional[asyncpg.Pool] = None

app = FastAPI()
api_router = APIRouter(prefix="/api")

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
    message: str

# ---------- DB Setup ----------

async def get_pool() -> Optional[asyncpg.Pool]:
    global pool
    if pool is None and DATABASE_URL:
        try:
            pool = await asyncpg.create_pool(
                DATABASE_URL,
                min_size=1,
                max_size=5,
                statement_cache_size=0,  # Required for Supabase pgbouncer
            )
            logger.info("PostgreSQL connection pool created")
        except Exception as e:
            logger.error(f"Failed to create PostgreSQL pool: {e}")
    return pool

async def init_tables():
    """Create mcp_clients table if it doesn't exist."""
    p = await get_pool()
    if not p:
        logger.warning("No database pool available — skipping table init")
        return
    async with p.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS mcp_clients (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                status TEXT DEFAULT 'registered',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        logger.info("mcp_clients table ready")

# ---------- Lifecycle ----------

@app.on_event("startup")
async def startup():
    await init_tables()

@app.on_event("shutdown")
async def shutdown():
    global pool
    if pool:
        await pool.close()

# ---------- Routes ----------

@api_router.get("/health", response_model=HealthResponse)
async def health_check():
    connected = False
    message = "Supabase not configured"
    p = await get_pool()
    if p:
        try:
            async with p.acquire() as conn:
                result = await conn.fetchval("SELECT 1")
                connected = result == 1
                message = "Connected to Supabase PostgreSQL" if connected else "Query failed"
        except Exception as e:
            message = f"Connection error: {str(e)}"
    return HealthResponse(
        status="ok" if connected else "degraded",
        supabase_connected=connected,
        database_url_set=bool(DATABASE_URL and "YOUR-PASSWORD" not in DATABASE_URL),
        supabase_url_set=bool(SUPABASE_URL and "YOUR-ANON-KEY" not in SUPABASE_URL),
        supabase_anon_key_set=bool(SUPABASE_ANON_KEY and "YOUR-ANON-KEY" not in SUPABASE_ANON_KEY),
        message=message,
    )

@api_router.post("/mcp/clients", response_model=MCPClient)
async def register_mcp_client(input: MCPClientCreate):
    p = await get_pool()
    if not p:
        raise HTTPException(status_code=503, detail="Database not available")
    client_obj = MCPClient(name=input.name, description=input.description)
    async with p.acquire() as conn:
        await conn.execute(
            """INSERT INTO mcp_clients (id, name, description, status, created_at)
               VALUES ($1, $2, $3, $4, $5)""",
            client_obj.id,
            client_obj.name,
            client_obj.description,
            client_obj.status,
            client_obj.created_at,
        )
    return client_obj

@api_router.get("/mcp/clients", response_model=List[MCPClient])
async def list_mcp_clients():
    p = await get_pool()
    if not p:
        raise HTTPException(status_code=503, detail="Database not available")
    async with p.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name, description, status, created_at::text as created_at FROM mcp_clients ORDER BY created_at DESC"
        )
    return [MCPClient(**dict(r)) for r in rows]

@api_router.delete("/mcp/clients/{client_id}")
async def remove_mcp_client(client_id: str):
    p = await get_pool()
    if not p:
        raise HTTPException(status_code=503, detail="Database not available")
    async with p.acquire() as conn:
        result = await conn.execute("DELETE FROM mcp_clients WHERE id = $1", client_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Client not found")
    return {"status": "deleted", "id": client_id}

@api_router.get("/")
async def root():
    return {"message": "MCP Supabase Tunnel — API running"}

# ---------- App wiring ----------

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
