#!/usr/bin/env python3
"""
Backend API Testing for MCP Tunnel
Tests all workspace file operations, health, setup SQL, and session endpoints.
"""

import requests
import json
import sys
import os
from pathlib import Path

# Get backend URL from frontend .env
def get_backend_url():
    frontend_env = Path("/app/frontend/.env")
    if frontend_env.exists():
        with open(frontend_env) as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip()
    return "http://localhost:8001"

BASE_URL = get_backend_url()
API_URL = f"{BASE_URL}/api"

print(f"Testing MCP Tunnel Backend at: {API_URL}")
print("=" * 60)

def test_endpoint(method, endpoint, data=None, params=None, expected_status=200):
    """Test an API endpoint and return response."""
    url = f"{API_URL}{endpoint}"
    try:
        if method.upper() == "GET":
            response = requests.get(url, params=params, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, timeout=10)
        elif method.upper() == "DELETE":
            response = requests.delete(url, params=params, timeout=10)
        else:
            print(f"❌ Unsupported method: {method}")
            return None
            
        print(f"{method.upper()} {endpoint}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == expected_status:
            print("✅ Status OK")
        else:
            print(f"❌ Expected {expected_status}, got {response.status_code}")
            
        try:
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2)[:500]}...")
        except:
            print(f"Response: {response.text[:200]}...")
            
        print("-" * 40)
        return response
    except Exception as e:
        print(f"❌ Request failed: {e}")
        print("-" * 40)
        return None

def main():
    print("🔍 TESTING MCP TUNNEL BACKEND")
    print()
    
    # 1. Health Check
    print("1️⃣ HEALTH CHECK")
    health_resp = test_endpoint("GET", "/health")
    if health_resp and health_resp.status_code == 200:
        health_data = health_resp.json()
        print(f"✅ Health check passed")
        print(f"   Supabase connected: {health_data.get('supabase_connected')}")
        print(f"   Table ready: {health_data.get('table_ready')}")
    else:
        print("❌ Health check failed")
    print()
    
    # 2. Setup SQL
    print("2️⃣ SETUP SQL ENDPOINT")
    setup_resp = test_endpoint("GET", "/setup-sql")
    if setup_resp and setup_resp.status_code == 200:
        setup_data = setup_resp.json()
        sql = setup_data.get('sql', '')
        if 'mcp_clients' in sql and 'mcp_sessions' in sql and 'mcp_file_events' in sql:
            print("✅ Setup SQL contains all 3 required tables")
        else:
            print("❌ Setup SQL missing required tables")
    else:
        print("❌ Setup SQL endpoint failed")
    print()
    
    # 3. Tools List
    print("3️⃣ MCP TOOLS LIST")
    tools_resp = test_endpoint("GET", "/tools")
    if tools_resp and tools_resp.status_code == 200:
        tools_data = tools_resp.json()
        tools = tools_data.get('tools', {})
        expected_tools = [
            'read_file', 'write_file', 'edit_file', 'list_directory',
            'create_directory', 'delete_file', 'move_file', 'get_file_info', 'search_files'
        ]
        found_tools = list(tools.keys())
        if len(found_tools) >= 9 and all(tool in found_tools for tool in expected_tools):
            print(f"✅ All 9 MCP tools found: {found_tools}")
        else:
            print(f"❌ Missing tools. Found: {found_tools}")
    else:
        print("❌ Tools list endpoint failed")
    print()
    
    # 4. Workspace Operations
    print("4️⃣ WORKSPACE FILE OPERATIONS")
    
    # 4a. List workspace
    print("📁 List workspace directory")
    list_resp = test_endpoint("GET", "/workspace/list")
    if list_resp and list_resp.status_code == 200:
        print("✅ Workspace list successful")
    else:
        print("❌ Workspace list failed")
    
    # 4b. Read existing file
    print("📖 Read README.md")
    read_resp = test_endpoint("GET", "/workspace/read", params={"path": "README.md"})
    if read_resp and read_resp.status_code == 200:
        read_data = read_resp.json()
        if read_data.get('success') and 'content' in read_data:
            print("✅ File read successful")
        else:
            print("❌ File read failed - no content")
    else:
        print("❌ File read endpoint failed")
    
    # 4c. Create directory
    print("📁 Create test directory")
    mkdir_resp = test_endpoint("POST", "/workspace/mkdir", data={"path": "test"})
    if mkdir_resp and mkdir_resp.status_code == 200:
        mkdir_data = mkdir_resp.json()
        if mkdir_data.get('success'):
            print("✅ Directory creation successful")
        else:
            print("❌ Directory creation failed")
    else:
        print("❌ Directory creation endpoint failed")
    
    # 4d. Write file
    print("✍️ Write test file")
    write_resp = test_endpoint("POST", "/workspace/write", 
                              data={"path": "test/hello.txt", "content": "Hello World"})
    if write_resp and write_resp.status_code == 200:
        write_data = write_resp.json()
        if write_data.get('success'):
            print("✅ File write successful")
        else:
            print("❌ File write failed")
    else:
        print("❌ File write endpoint failed")
    
    # 4e. Edit file
    print("✏️ Edit test file")
    edit_resp = test_endpoint("POST", "/workspace/edit", 
                             data={"path": "test/hello.txt", "old_text": "Hello", "new_text": "Hi"})
    if edit_resp and edit_resp.status_code == 200:
        edit_data = edit_resp.json()
        if edit_data.get('success'):
            print("✅ File edit successful")
        else:
            print("❌ File edit failed")
    else:
        print("❌ File edit endpoint failed")
    
    # 4f. Get file info
    print("ℹ️ Get file info")
    info_resp = test_endpoint("GET", "/workspace/info", params={"path": "test/hello.txt"})
    if info_resp and info_resp.status_code == 200:
        info_data = info_resp.json()
        if info_data.get('success') and 'size' in info_data:
            print("✅ File info successful")
        else:
            print("❌ File info failed")
    else:
        print("❌ File info endpoint failed")
    
    # 4g. Search files
    print("🔍 Search for txt files")
    search_resp = test_endpoint("GET", "/workspace/search", params={"pattern": "*.txt"})
    if search_resp and search_resp.status_code == 200:
        search_data = search_resp.json()
        if search_data.get('success') and 'matches' in search_data:
            print(f"✅ File search successful - found {search_data.get('count', 0)} matches")
        else:
            print("❌ File search failed")
    else:
        print("❌ File search endpoint failed")
    
    # 4h. Create subdirectory
    print("📁 Create subdirectory")
    subdir_resp = test_endpoint("POST", "/workspace/mkdir", data={"path": "test/subdir"})
    if subdir_resp and subdir_resp.status_code == 200:
        print("✅ Subdirectory creation successful")
    else:
        print("❌ Subdirectory creation failed")
    
    # 4i. Move file
    print("📦 Move file")
    move_resp = test_endpoint("POST", "/workspace/move", 
                             data={"source": "test/hello.txt", "destination": "test/moved.txt"})
    if move_resp and move_resp.status_code == 200:
        move_data = move_resp.json()
        if move_data.get('success'):
            print("✅ File move successful")
        else:
            print("❌ File move failed")
    else:
        print("❌ File move endpoint failed")
    
    # 4j. Delete subdirectory
    print("🗑️ Delete subdirectory")
    delete_resp = test_endpoint("DELETE", "/workspace/delete", params={"path": "test/subdir"})
    if delete_resp and delete_resp.status_code == 200:
        delete_data = delete_resp.json()
        if delete_data.get('success'):
            print("✅ Directory deletion successful")
        else:
            print("❌ Directory deletion failed")
    else:
        print("❌ Directory deletion endpoint failed")
    
    # 4k. Test path traversal protection
    print("🛡️ Test path traversal protection")
    traversal_resp = test_endpoint("GET", "/workspace/read", params={"path": "../../etc/passwd"})
    if traversal_resp and traversal_resp.status_code == 200:
        traversal_data = traversal_resp.json()
        if not traversal_data.get('success') and 'error' in traversal_data:
            print("✅ Path traversal blocked successfully")
        else:
            print("❌ Path traversal not blocked!")
    else:
        print("❌ Path traversal test endpoint failed")
    
    print()
    
    # 5. Generic Tool Call
    print("5️⃣ GENERIC TOOL DISPATCHER")
    tool_call_resp = test_endpoint("POST", "/tools/call", 
                                  data={"tool": "list_directory", "arguments": {"path": "."}})
    if tool_call_resp and tool_call_resp.status_code == 200:
        tool_data = tool_call_resp.json()
        if 'result' in tool_data and tool_data['result'].get('success'):
            print("✅ Generic tool call successful")
        else:
            print("❌ Generic tool call failed")
    else:
        print("❌ Generic tool call endpoint failed")
    print()
    
    # 6. Active Sessions
    print("6️⃣ ACTIVE SESSIONS")
    active_resp = test_endpoint("GET", "/sessions/active/list")
    if active_resp and active_resp.status_code == 200:
        active_data = active_resp.json()
        if 'active_sessions' in active_data and 'client_id' in active_data:
            print(f"✅ Active sessions endpoint working")
            print(f"   Client ID: {active_data.get('client_id')}")
            print(f"   Active sessions: {active_data.get('active_sessions')}")
        else:
            print("❌ Active sessions response missing required fields")
    else:
        print("❌ Active sessions endpoint failed")
    print()
    
    # 7. Session Management (may fail if Supabase tables don't exist)
    print("7️⃣ SESSION MANAGEMENT (may fail without Supabase tables)")
    
    # 7a. Create session
    print("➕ Create session")
    create_session_resp = test_endpoint("POST", "/sessions", 
                                       data={"name": "test-session", "created_by": "test-client"})
    session_id = None
    if create_session_resp:
        if create_session_resp.status_code == 200:
            session_data = create_session_resp.json()
            session_id = session_data.get('id')
            print(f"✅ Session created successfully: {session_id}")
        elif create_session_resp.status_code == 500:
            print("⚠️ Session creation failed (expected - Supabase tables may not exist)")
        else:
            print(f"❌ Session creation failed with status {create_session_resp.status_code}")
    
    # 7b. List sessions
    print("📋 List sessions")
    list_sessions_resp = test_endpoint("GET", "/sessions")
    if list_sessions_resp:
        if list_sessions_resp.status_code == 200:
            print("✅ Session list successful")
        elif list_sessions_resp.status_code == 500:
            print("⚠️ Session list failed (expected - Supabase tables may not exist)")
        else:
            print(f"❌ Session list failed with status {list_sessions_resp.status_code}")
    
    print()
    
    # 8. Events endpoint (may fail if Supabase tables don't exist)
    print("8️⃣ EVENTS ENDPOINT (may fail without Supabase tables)")
    events_resp = test_endpoint("GET", "/events")
    if events_resp:
        if events_resp.status_code == 200:
            print("✅ Events endpoint successful")
        elif events_resp.status_code == 500:
            print("⚠️ Events endpoint failed (expected - Supabase tables may not exist)")
        else:
            print(f"❌ Events endpoint failed with status {events_resp.status_code}")
    
    print()
    print("🏁 TESTING COMPLETE")
    print("=" * 60)
    print("NOTE: Session and event endpoint failures are expected if Supabase tables haven't been created yet.")
    print("Use the setup SQL from /api/setup-sql to create the required tables in Supabase.")

if __name__ == "__main__":
    main()