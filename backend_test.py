import requests
import sys
from datetime import datetime

class MCPTunnelAPITester:
    def __init__(self, base_url="https://greeting-app-3852.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response.content:
                    try:
                        json_response = response.json()
                        print(f"Response: {json_response}")
                        return True, json_response
                    except:
                        print(f"Response (text): {response.text}")
                        return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")

            return success, response.json() if success and response.content else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_endpoint(self):
        """Test health endpoint - should return health status with config flags"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        
        if success:
            # Verify expected fields in health response
            expected_fields = ['status', 'supabase_connected', 'database_url_set', 
                             'supabase_url_set', 'supabase_anon_key_set', 'message']
            for field in expected_fields:
                if field not in response:
                    print(f"❌ Missing field in health response: {field}")
                    return False
            
            # Check that supabase_connected is False (expected with placeholder credentials)
            if response.get('supabase_connected') == True:
                print(f"❌ Expected supabase_connected to be False with placeholder credentials")
                return False
                
            print(f"✅ Health response contains all expected fields")
            print(f"Status: {response.get('status')}")
            print(f"Message: {response.get('message')}")
            return True
        return False

    def test_root_endpoint(self):
        """Test root endpoint - should return root message"""
        success, response = self.run_test(
            "Root Message",
            "GET",
            "api/",
            200
        )
        
        if success and isinstance(response, dict) and 'message' in response:
            print(f"✅ Root endpoint returned message: {response['message']}")
            return True
        return False

    def test_mcp_clients_post(self):
        """Test POST /api/mcp/clients - should return 503 when DB not available"""
        success, response = self.run_test(
            "Register MCP Client (Expected 503)",
            "POST",
            "api/mcp/clients",
            503,
            data={"name": "test-client", "description": "test description"}
        )
        return success

    def test_mcp_clients_get(self):
        """Test GET /api/mcp/clients - should return 503 when DB not available"""
        success, response = self.run_test(
            "List MCP Clients (Expected 503)",
            "GET",
            "api/mcp/clients",
            503
        )
        return success

def main():
    print("🚀 Starting MCP Tunnel API Tests")
    print("=" * 50)
    
    # Setup
    tester = MCPTunnelAPITester()

    # Run tests
    test_results = []
    
    # Test health endpoint
    test_results.append(("Health Check", tester.test_health_endpoint()))
    
    # Test root endpoint
    test_results.append(("Root Message", tester.test_root_endpoint()))
    
    # Test MCP client endpoints (should fail with 503)
    test_results.append(("POST MCP Clients", tester.test_mcp_clients_post()))
    test_results.append(("GET MCP Clients", tester.test_mcp_clients_get()))

    # Print results summary
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 50)
    
    for test_name, passed in test_results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    print(f"\nOverall: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())