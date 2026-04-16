#!/usr/bin/env python3
"""
Backend Test Suite for MCP Tunnel - Client Registration & Config Endpoints
Testing the NEW client registration and config endpoints as per review request.
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Backend URL from frontend .env
BACKEND_URL = "https://full-stack-runner.preview.emergentagent.com/api"

class MCPTunnelTester:
    def __init__(self):
        self.session = requests.Session()
        self.client_a_id = None
        self.client_a_api_key = None
        self.client_b_id = None
        self.client_b_api_key = None
        self.session_id = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        if response_data and not success:
            print(f"    Response: {response_data}")
        print()
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response": response_data
        })
    
    def test_health_check(self):
        """Test health endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/health")
            if response.status_code == 200:
                data = response.json()
                if data.get("supabase_connected") and data.get("table_ready"):
                    self.log_test("Health Check", True, f"Status: {data.get('status')}, Supabase connected: {data.get('supabase_connected')}, Tables ready: {data.get('table_ready')}")
                else:
                    self.log_test("Health Check", False, f"Supabase or tables not ready", data)
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {e}")
    
    def test_add_client_a_target(self):
        """Test adding Client A (Target)"""
        try:
            payload = {
                "name": "Test Server",
                "role": "target"
            }
            response = self.session.post(f"{BACKEND_URL}/mcp/add", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "name", "role", "api_key", "session_id", "channel_name", "config"]
                
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    self.log_test("Add Client A (Target)", False, f"Missing fields: {missing_fields}", data)
                    return
                
                # Validate field values
                if data["role"] != "target":
                    self.log_test("Add Client A (Target)", False, f"Expected role 'target', got '{data['role']}'", data)
                    return
                
                if not data["api_key"].startswith("mcp_"):
                    self.log_test("Add Client A (Target)", False, f"API key should start with 'mcp_', got '{data['api_key']}'", data)
                    return
                
                if "config" not in data or "mcpServers" not in data["config"]:
                    self.log_test("Add Client A (Target)", False, "Config missing or invalid structure", data)
                    return
                
                # Check config structure
                config = data["config"]
                mcp_servers = config["mcpServers"]
                server_key = list(mcp_servers.keys())[0]
                server_config = mcp_servers[server_key]
                
                expected_config_fields = ["url", "transport", "apiKey", "sessionId", "channelName", "role", "supabase", "tools"]
                missing_config_fields = [field for field in expected_config_fields if field not in server_config]
                
                if missing_config_fields:
                    self.log_test("Add Client A (Target)", False, f"Config missing fields: {missing_config_fields}", data)
                    return
                
                if server_config["role"] != "target":
                    self.log_test("Add Client A (Target)", False, f"Config role should be 'target', got '{server_config['role']}'", data)
                    return
                
                # Store for later tests
                self.client_a_id = data["id"]
                self.client_a_api_key = data["api_key"]
                self.session_id = data["session_id"]
                
                self.log_test("Add Client A (Target)", True, f"Created target client with ID: {self.client_a_id}, API key: {self.client_a_api_key[:10]}..., Session: {self.session_id}")
                
            else:
                self.log_test("Add Client A (Target)", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Add Client A (Target)", False, f"Exception: {e}")
    
    def test_add_client_b_executor(self):
        """Test adding Client B (Executor)"""
        if not self.client_a_id:
            self.log_test("Add Client B (Executor)", False, "Client A ID not available - previous test failed")
            return
            
        try:
            payload = {
                "name": "Test Agent",
                "role": "executor",
                "target_client_id": self.client_a_id
            }
            response = self.session.post(f"{BACKEND_URL}/mcp/add", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "name", "role", "api_key", "session_id", "channel_name", "config"]
                
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    self.log_test("Add Client B (Executor)", False, f"Missing fields: {missing_fields}", data)
                    return
                
                # Validate field values
                if data["role"] != "executor":
                    self.log_test("Add Client B (Executor)", False, f"Expected role 'executor', got '{data['role']}'", data)
                    return
                
                if data["session_id"] != self.session_id:
                    self.log_test("Add Client B (Executor)", False, f"Expected same session_id as Client A ({self.session_id}), got '{data['session_id']}'", data)
                    return
                
                # Store for later tests
                self.client_b_id = data["id"]
                self.client_b_api_key = data["api_key"]
                
                self.log_test("Add Client B (Executor)", True, f"Created executor client with ID: {self.client_b_id}, same session: {data['session_id']}")
                
            else:
                self.log_test("Add Client B (Executor)", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Add Client B (Executor)", False, f"Exception: {e}")
    
    def test_get_connections(self):
        """Test GET /api/mcp/connections"""
        try:
            response = self.session.get(f"{BACKEND_URL}/mcp/connections")
            
            if response.status_code == 200:
                data = response.json()
                
                if "clients" not in data:
                    self.log_test("Get Connections", False, "Response missing 'clients' field", data)
                    return
                
                clients = data["clients"]
                if len(clients) < 2:
                    self.log_test("Get Connections", False, f"Expected at least 2 clients, got {len(clients)}", data)
                    return
                
                # Check if our clients are in the list
                client_ids = [client["id"] for client in clients]
                if self.client_a_id not in client_ids:
                    self.log_test("Get Connections", False, f"Client A ({self.client_a_id}) not found in connections", data)
                    return
                
                if self.client_b_id not in client_ids:
                    self.log_test("Get Connections", False, f"Client B ({self.client_b_id}) not found in connections", data)
                    return
                
                # Validate client structure
                for client in clients:
                    required_fields = ["id", "name", "role", "api_key", "session_id", "config", "realtime_active"]
                    missing_fields = [field for field in required_fields if field not in client]
                    if missing_fields:
                        self.log_test("Get Connections", False, f"Client {client.get('id', 'unknown')} missing fields: {missing_fields}", data)
                        return
                
                self.log_test("Get Connections", True, f"Found {len(clients)} clients including our target and executor")
                
            else:
                self.log_test("Get Connections", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Get Connections", False, f"Exception: {e}")
    
    def test_get_client_config(self):
        """Test GET /api/mcp/clients/<id>/config"""
        if not self.client_a_id:
            self.log_test("Get Client Config", False, "Client A ID not available - previous test failed")
            return
            
        try:
            response = self.session.get(f"{BACKEND_URL}/mcp/clients/{self.client_a_id}/config")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "name", "role", "api_key", "session_id", "config"]
                
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    self.log_test("Get Client Config", False, f"Missing fields: {missing_fields}", data)
                    return
                
                if data["id"] != self.client_a_id:
                    self.log_test("Get Client Config", False, f"Expected ID {self.client_a_id}, got {data['id']}", data)
                    return
                
                # Validate config structure
                config = data["config"]
                if "mcpServers" not in config:
                    self.log_test("Get Client Config", False, "Config missing mcpServers", data)
                    return
                
                self.log_test("Get Client Config", True, f"Retrieved config for client {self.client_a_id}")
                
            else:
                self.log_test("Get Client Config", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Get Client Config", False, f"Exception: {e}")
    
    def test_heartbeat(self):
        """Test POST /api/mcp/heartbeat with API key header"""
        if not self.client_a_api_key:
            self.log_test("Heartbeat", False, "Client A API key not available - previous test failed")
            return
            
        try:
            headers = {"x-api-key": self.client_a_api_key}
            response = self.session.post(f"{BACKEND_URL}/mcp/heartbeat", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                if "status" not in data or data["status"] != "ok":
                    self.log_test("Heartbeat", False, f"Expected status 'ok', got '{data.get('status')}'", data)
                    return
                
                if "ts" not in data:
                    self.log_test("Heartbeat", False, "Response missing timestamp", data)
                    return
                
                self.log_test("Heartbeat", True, f"Heartbeat successful with timestamp: {data['ts']}")
                
            else:
                self.log_test("Heartbeat", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Heartbeat", False, f"Exception: {e}")
    
    def test_delete_connection(self):
        """Test DELETE /api/mcp/connections/<id>"""
        if not self.client_b_id:
            self.log_test("Delete Connection", False, "Client B ID not available - previous test failed")
            return
            
        try:
            response = self.session.delete(f"{BACKEND_URL}/mcp/connections/{self.client_b_id}")
            
            if response.status_code == 200:
                data = response.json()
                
                if "status" not in data or data["status"] != "deleted":
                    self.log_test("Delete Connection", False, f"Expected status 'deleted', got '{data.get('status')}'", data)
                    return
                
                if data.get("id") != self.client_b_id:
                    self.log_test("Delete Connection", False, f"Expected deleted ID {self.client_b_id}, got {data.get('id')}", data)
                    return
                
                self.log_test("Delete Connection", True, f"Successfully deleted client {self.client_b_id}")
                
            else:
                self.log_test("Delete Connection", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Delete Connection", False, f"Exception: {e}")
    
    def test_validation_missing_target_client_id(self):
        """Test validation: executor without target_client_id should return 400"""
        try:
            payload = {
                "name": "Bad",
                "role": "executor"
                # Missing target_client_id
            }
            response = self.session.post(f"{BACKEND_URL}/mcp/add", json=payload)
            
            if response.status_code == 400:
                self.log_test("Validation - Missing target_client_id", True, "Correctly returned 400 for executor without target_client_id")
            else:
                self.log_test("Validation - Missing target_client_id", False, f"Expected HTTP 400, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Validation - Missing target_client_id", False, f"Exception: {e}")
    
    def test_validation_invalid_role(self):
        """Test validation: invalid role should return 400"""
        try:
            payload = {
                "name": "Bad",
                "role": "invalid"
            }
            response = self.session.post(f"{BACKEND_URL}/mcp/add", json=payload)
            
            if response.status_code == 400:
                self.log_test("Validation - Invalid role", True, "Correctly returned 400 for invalid role")
            else:
                self.log_test("Validation - Invalid role", False, f"Expected HTTP 400, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Validation - Invalid role", False, f"Exception: {e}")
    
    def test_existing_endpoints(self):
        """Test that existing endpoints still work"""
        # Test health endpoint
        try:
            response = self.session.get(f"{BACKEND_URL}/health")
            if response.status_code == 200:
                data = response.json()
                if data.get("supabase_connected") and data.get("table_ready"):
                    self.log_test("Existing - Health endpoint", True, "Health endpoint working correctly")
                else:
                    self.log_test("Existing - Health endpoint", False, "Health endpoint not showing proper status", data)
            else:
                self.log_test("Existing - Health endpoint", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Existing - Health endpoint", False, f"Exception: {e}")
        
        # Test tools endpoint
        try:
            response = self.session.get(f"{BACKEND_URL}/tools")
            if response.status_code == 200:
                data = response.json()
                if "tools" in data and len(data["tools"]) == 9:
                    self.log_test("Existing - Tools endpoint", True, f"Found {len(data['tools'])} tool schemas")
                else:
                    self.log_test("Existing - Tools endpoint", False, f"Expected 9 tools, got {len(data.get('tools', []))}", data)
            else:
                self.log_test("Existing - Tools endpoint", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Existing - Tools endpoint", False, f"Exception: {e}")
        
        # Test tools/call endpoint
        try:
            payload = {
                "tool": "list_directory",
                "arguments": {"path": "."}
            }
            response = self.session.post(f"{BACKEND_URL}/tools/call", json=payload)
            if response.status_code == 200:
                data = response.json()
                if "result" in data and "tool" in data:
                    self.log_test("Existing - Tools call endpoint", True, "Tools call endpoint working correctly")
                else:
                    self.log_test("Existing - Tools call endpoint", False, "Invalid response structure", data)
            else:
                self.log_test("Existing - Tools call endpoint", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Existing - Tools call endpoint", False, f"Exception: {e}")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting MCP Tunnel Backend Tests")
        print("=" * 60)
        print()
        
        # Test existing endpoints first
        self.test_existing_endpoints()
        
        # Test new MCP client registration endpoints
        self.test_health_check()
        self.test_add_client_a_target()
        self.test_add_client_b_executor()
        self.test_get_connections()
        self.test_get_client_config()
        self.test_heartbeat()
        self.test_delete_connection()
        
        # Test validation
        self.test_validation_missing_target_client_id()
        self.test_validation_invalid_role()
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        print()
        
        if total - passed > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
            print()
        
        return passed == total

if __name__ == "__main__":
    tester = MCPTunnelTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)