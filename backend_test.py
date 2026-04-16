#!/usr/bin/env python3
"""
Comprehensive Backend Testing for MCP Tunnel
Tests all backend endpoints with Supabase tables now created
"""

import requests
import json
import time
import uuid
from typing import Dict, Any, Optional

# Backend URL from frontend/.env
BACKEND_URL = "https://supabase-mcp-4.preview.emergentagent.com/api"

class MCPTunnelTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.test_session_id = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str, response_data: Any = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        print(f"   Details: {details}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        print()
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'response': response_data if not success else None
        })
    
    def test_health_check(self):
        """Test 1: Health check endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/health")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                supabase_connected = data.get('supabase_connected', False)
                table_ready = data.get('table_ready', False)
                
                if supabase_connected and table_ready:
                    self.log_test(
                        "Health Check", 
                        True, 
                        f"Health endpoint working. supabase_connected={supabase_connected}, table_ready={table_ready}"
                    )
                else:
                    self.log_test(
                        "Health Check", 
                        False, 
                        f"Health endpoint returned supabase_connected={supabase_connected}, table_ready={table_ready} (expected both true)",
                        data
                    )
            else:
                self.log_test(
                    "Health Check", 
                    False, 
                    f"Health endpoint returned status {response.status_code}",
                    response.text
                )
                
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
    
    def test_session_management(self):
        """Test 2: Session management endpoints"""
        
        # 2a. List sessions (should have at least 1 "test-tunnel" session)
        try:
            response = self.session.get(f"{BACKEND_URL}/sessions")
            
            if response.status_code == 200:
                sessions = response.json()
                test_tunnel_exists = any(s.get('name') == 'test-tunnel' for s in sessions)
                
                if test_tunnel_exists:
                    self.log_test(
                        "List Sessions", 
                        True, 
                        f"Found {len(sessions)} sessions including 'test-tunnel'"
                    )
                else:
                    self.log_test(
                        "List Sessions", 
                        False, 
                        f"Found {len(sessions)} sessions but no 'test-tunnel' session",
                        sessions
                    )
            else:
                self.log_test(
                    "List Sessions", 
                    False, 
                    f"List sessions returned status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("List Sessions", False, f"Exception: {str(e)}")
        
        # 2b. Create a new session
        try:
            session_data = {
                "name": "e2e-test",
                "created_by": "test-agent"
            }
            
            response = self.session.post(f"{BACKEND_URL}/sessions", json=session_data)
            
            if response.status_code in [200, 201]:
                created_session = response.json()
                self.test_session_id = created_session.get('id')
                
                if self.test_session_id:
                    self.log_test(
                        "Create Session", 
                        True, 
                        f"Created session with ID: {self.test_session_id}"
                    )
                else:
                    self.log_test(
                        "Create Session", 
                        False, 
                        "Session created but no ID returned",
                        created_session
                    )
            else:
                self.log_test(
                    "Create Session", 
                    False, 
                    f"Create session returned status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Create Session", False, f"Exception: {str(e)}")
        
        # 2c. Get the created session
        if self.test_session_id:
            try:
                response = self.session.get(f"{BACKEND_URL}/sessions/{self.test_session_id}")
                
                if response.status_code == 200:
                    session = response.json()
                    if session.get('name') == 'e2e-test':
                        self.log_test(
                            "Get Session by ID", 
                            True, 
                            f"Retrieved session: {session.get('name')}"
                        )
                    else:
                        self.log_test(
                            "Get Session by ID", 
                            False, 
                            f"Retrieved session but name mismatch: {session.get('name')}",
                            session
                        )
                else:
                    self.log_test(
                        "Get Session by ID", 
                        False, 
                        f"Get session returned status {response.status_code}",
                        response.text
                    )
            except Exception as e:
                self.log_test("Get Session by ID", False, f"Exception: {str(e)}")
        
        # 2d. Get active sessions list
        try:
            response = self.session.get(f"{BACKEND_URL}/sessions/active/list")
            
            if response.status_code == 200:
                active_data = response.json()
                client_id = active_data.get('client_id')
                active_sessions = active_data.get('active_sessions', [])
                
                if client_id:
                    self.log_test(
                        "Get Active Sessions", 
                        True, 
                        f"Active sessions endpoint working. Client ID: {client_id}, Active sessions: {len(active_sessions)}"
                    )
                else:
                    self.log_test(
                        "Get Active Sessions", 
                        False, 
                        "Active sessions endpoint returned no client_id",
                        active_data
                    )
            else:
                self.log_test(
                    "Get Active Sessions", 
                    False, 
                    f"Get active sessions returned status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Get Active Sessions", False, f"Exception: {str(e)}")
        
        # 2e. Activate the new session
        if self.test_session_id:
            try:
                response = self.session.post(f"{BACKEND_URL}/sessions/{self.test_session_id}/activate")
                
                if response.status_code in [200, 201]:
                    self.log_test(
                        "Activate Session", 
                        True, 
                        f"Session {self.test_session_id} activated successfully"
                    )
                else:
                    self.log_test(
                        "Activate Session", 
                        False, 
                        f"Activate session returned status {response.status_code}",
                        response.text
                    )
            except Exception as e:
                self.log_test("Activate Session", False, f"Exception: {str(e)}")
        
        # 2f. Deactivate the session
        if self.test_session_id:
            try:
                response = self.session.post(f"{BACKEND_URL}/sessions/{self.test_session_id}/deactivate")
                
                if response.status_code in [200, 201]:
                    self.log_test(
                        "Deactivate Session", 
                        True, 
                        f"Session {self.test_session_id} deactivated successfully"
                    )
                else:
                    self.log_test(
                        "Deactivate Session", 
                        False, 
                        f"Deactivate session returned status {response.status_code}",
                        response.text
                    )
            except Exception as e:
                self.log_test("Deactivate Session", False, f"Exception: {str(e)}")
    
    def test_mcp_file_tools(self):
        """Test 3: MCP File Tools"""
        
        # 3a. List all tool schemas
        try:
            response = self.session.get(f"{BACKEND_URL}/tools")
            
            if response.status_code == 200:
                data = response.json()
                tools = data.get('tools', {})
                
                expected_tools = [
                    'read_file', 'write_file', 'edit_file', 'list_directory', 
                    'create_directory', 'delete_file', 'move_file', 'get_file_info', 'search_files'
                ]
                
                if len(tools) == 9 and all(tool in tools for tool in expected_tools):
                    tool_names = list(tools.keys())
                    self.log_test(
                        "List Tool Schemas", 
                        True, 
                        f"All 9 expected tools found: {', '.join(tool_names)}"
                    )
                else:
                    missing = [tool for tool in expected_tools if tool not in tools]
                    self.log_test(
                        "List Tool Schemas", 
                        False, 
                        f"Missing tools: {missing}. Found: {list(tools.keys())}",
                        data
                    )
            else:
                self.log_test(
                    "List Tool Schemas", 
                    False, 
                    f"List tools returned status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("List Tool Schemas", False, f"Exception: {str(e)}")
        
        # 3b. Test list_directory
        try:
            tool_call = {
                "tool": "list_directory",
                "arguments": {"path": "."}
            }
            
            response = self.session.post(f"{BACKEND_URL}/tools/call", json=tool_call)
            
            if response.status_code == 200:
                result = response.json()
                tool_result = result.get('result', {})
                if tool_result.get('success') and 'entries' in tool_result:
                    entries = tool_result['entries']
                    self.log_test(
                        "Tool: list_directory", 
                        True, 
                        f"Listed {len(entries)} workspace files"
                    )
                else:
                    self.log_test(
                        "Tool: list_directory", 
                        False, 
                        "Tool call succeeded but unexpected result format",
                        result
                    )
            else:
                self.log_test(
                    "Tool: list_directory", 
                    False, 
                    f"Tool call returned status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Tool: list_directory", False, f"Exception: {str(e)}")
        
        # 3c. Test write_file
        try:
            tool_call = {
                "tool": "write_file",
                "arguments": {
                    "path": "agent-test.txt",
                    "content": "test content"
                }
            }
            
            response = self.session.post(f"{BACKEND_URL}/tools/call", json=tool_call)
            
            if response.status_code == 200:
                result = response.json()
                tool_result = result.get('result', {})
                if tool_result.get('success'):
                    self.log_test(
                        "Tool: write_file", 
                        True, 
                        "Successfully wrote agent-test.txt"
                    )
                else:
                    self.log_test(
                        "Tool: write_file", 
                        False, 
                        f"Tool call failed: {tool_result.get('error', 'Unknown error')}",
                        result
                    )
            else:
                self.log_test(
                    "Tool: write_file", 
                    False, 
                    f"Tool call returned status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Tool: write_file", False, f"Exception: {str(e)}")
        
        # 3d. Test read_file
        try:
            tool_call = {
                "tool": "read_file",
                "arguments": {"path": "agent-test.txt"}
            }
            
            response = self.session.post(f"{BACKEND_URL}/tools/call", json=tool_call)
            
            if response.status_code == 200:
                result = response.json()
                tool_result = result.get('result', {})
                if tool_result.get('success') and tool_result.get('content') == 'test content':
                    self.log_test(
                        "Tool: read_file", 
                        True, 
                        "Successfully read agent-test.txt with correct content"
                    )
                else:
                    self.log_test(
                        "Tool: read_file", 
                        False, 
                        f"Tool call failed or content mismatch: {tool_result.get('error', 'Unknown error')}",
                        result
                    )
            else:
                self.log_test(
                    "Tool: read_file", 
                    False, 
                    f"Tool call returned status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Tool: read_file", False, f"Exception: {str(e)}")
        
        # 3e. Test edit_file
        try:
            tool_call = {
                "tool": "edit_file",
                "arguments": {
                    "path": "agent-test.txt",
                    "old_text": "test",
                    "new_text": "verified"
                }
            }
            
            response = self.session.post(f"{BACKEND_URL}/tools/call", json=tool_call)
            
            if response.status_code == 200:
                result = response.json()
                tool_result = result.get('result', {})
                if tool_result.get('success'):
                    self.log_test(
                        "Tool: edit_file", 
                        True, 
                        "Successfully edited agent-test.txt"
                    )
                else:
                    self.log_test(
                        "Tool: edit_file", 
                        False, 
                        f"Tool call failed: {tool_result.get('error', 'Unknown error')}",
                        result
                    )
            else:
                self.log_test(
                    "Tool: edit_file", 
                    False, 
                    f"Tool call returned status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Tool: edit_file", False, f"Exception: {str(e)}")
        
        # 3f. Test get_file_info
        try:
            tool_call = {
                "tool": "get_file_info",
                "arguments": {"path": "agent-test.txt"}
            }
            
            response = self.session.post(f"{BACKEND_URL}/tools/call", json=tool_call)
            
            if response.status_code == 200:
                result = response.json()
                tool_result = result.get('result', {})
                if tool_result.get('success') and 'size' in tool_result:
                    file_info = tool_result
                    self.log_test(
                        "Tool: get_file_info", 
                        True, 
                        f"Got file info: size={file_info.get('size')}, type={file_info.get('type')}"
                    )
                else:
                    self.log_test(
                        "Tool: get_file_info", 
                        False, 
                        f"Tool call failed: {tool_result.get('error', 'Unknown error')}",
                        result
                    )
            else:
                self.log_test(
                    "Tool: get_file_info", 
                    False, 
                    f"Tool call returned status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Tool: get_file_info", False, f"Exception: {str(e)}")
        
        # 3g. Test search_files
        try:
            tool_call = {
                "tool": "search_files",
                "arguments": {"pattern": "*.txt"}
            }
            
            response = self.session.post(f"{BACKEND_URL}/tools/call", json=tool_call)
            
            if response.status_code == 200:
                result = response.json()
                tool_result = result.get('result', {})
                if tool_result.get('success') and 'matches' in tool_result:
                    matches = tool_result['matches']
                    txt_files = [f['path'] for f in matches if f['path'].endswith('.txt')]
                    if 'agent-test.txt' in txt_files:
                        self.log_test(
                            "Tool: search_files", 
                            True, 
                            f"Found {len(txt_files)} .txt files including agent-test.txt"
                        )
                    else:
                        self.log_test(
                            "Tool: search_files", 
                            False, 
                            f"Found {len(txt_files)} .txt files but not agent-test.txt",
                            matches
                        )
                else:
                    self.log_test(
                        "Tool: search_files", 
                        False, 
                        f"Tool call failed: {tool_result.get('error', 'Unknown error')}",
                        result
                    )
            else:
                self.log_test(
                    "Tool: search_files", 
                    False, 
                    f"Tool call returned status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Tool: search_files", False, f"Exception: {str(e)}")
    
    def test_events_audit_log(self):
        """Test 4: Events audit log"""
        
        # 4a. Get all events
        try:
            response = self.session.get(f"{BACKEND_URL}/events")
            
            if response.status_code == 200:
                events = response.json()
                self.log_test(
                    "Get All Events", 
                    True, 
                    f"Retrieved {len(events)} persisted events from audit log"
                )
            else:
                self.log_test(
                    "Get All Events", 
                    False, 
                    f"Get events returned status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Get All Events", False, f"Exception: {str(e)}")
        
        # 4b. Get events filtered by session_id
        try:
            session_id = "9dd8fbc3-01fa-4d2a-8ef2-1574bed0964c"
            response = self.session.get(f"{BACKEND_URL}/events?session_id={session_id}")
            
            if response.status_code == 200:
                events = response.json()
                self.log_test(
                    "Get Events by Session ID", 
                    True, 
                    f"Retrieved {len(events)} events for session {session_id}"
                )
            else:
                self.log_test(
                    "Get Events by Session ID", 
                    False, 
                    f"Get events by session returned status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Get Events by Session ID", False, f"Exception: {str(e)}")
    
    def test_setup_sql(self):
        """Test 5: Setup SQL endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/setup-sql")
            
            if response.status_code == 200:
                sql_content = response.text
                
                # Check for corrected SQL pattern (DROP POLICY IF EXISTS)
                if "DROP POLICY IF EXISTS" in sql_content:
                    self.log_test(
                        "Setup SQL", 
                        True, 
                        "Setup SQL endpoint returns corrected SQL with 'DROP POLICY IF EXISTS' pattern"
                    )
                else:
                    self.log_test(
                        "Setup SQL", 
                        False, 
                        "Setup SQL missing 'DROP POLICY IF EXISTS' pattern",
                        sql_content[:500] + "..." if len(sql_content) > 500 else sql_content
                    )
            else:
                self.log_test(
                    "Setup SQL", 
                    False, 
                    f"Setup SQL returned status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_test("Setup SQL", False, f"Exception: {str(e)}")
    
    def cleanup_test_session(self):
        """Clean up: Delete the test session"""
        if self.test_session_id:
            try:
                response = self.session.delete(f"{BACKEND_URL}/sessions/{self.test_session_id}")
                
                if response.status_code in [200, 204]:
                    self.log_test(
                        "Delete Test Session", 
                        True, 
                        f"Successfully deleted test session {self.test_session_id}"
                    )
                else:
                    self.log_test(
                        "Delete Test Session", 
                        False, 
                        f"Delete session returned status {response.status_code}",
                        response.text
                    )
            except Exception as e:
                self.log_test("Delete Test Session", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 80)
        print("MCP TUNNEL BACKEND COMPREHENSIVE TESTING")
        print("=" * 80)
        print(f"Testing backend at: {BACKEND_URL}")
        print()
        
        # Run all test suites
        self.test_health_check()
        self.test_session_management()
        self.test_mcp_file_tools()
        self.test_events_audit_log()
        self.test_setup_sql()
        self.cleanup_test_session()
        
        # Summary
        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print()
        
        if total - passed > 0:
            print("FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"❌ {result['test']}: {result['details']}")
            print()
        
        print(f"Overall Success Rate: {passed}/{total} ({(passed/total)*100:.1f}%)")
        
        return passed == total

if __name__ == "__main__":
    tester = MCPTunnelTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 ALL TESTS PASSED! Backend is fully operational.")
    else:
        print("\n⚠️  Some tests failed. Check details above.")