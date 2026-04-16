import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Create an API client bound to an arbitrary base URL.
 * Used by /clone to talk to a public tunnel backend instead of localhost.
 */
export function createApiClient(baseUrl) {
  const base = `${baseUrl.replace(/\/+$/, "")}/api`;
  return {
    health: () => axios.get(`${base}/health`).then((r) => r.data),
    mcpConnections: () => axios.get(`${base}/mcp/connections`).then((r) => r.data),
    mcpConfig: (id, publicBaseUrl) => {
      const params = publicBaseUrl ? { public_base_url: publicBaseUrl } : {};
      return axios.get(`${base}/mcp/clients/${id}/config`, { params }).then((r) => r.data);
    },
    listJobs: () => axios.get(`${base}/jobs`).then((r) => r.data),
    getJob: (id) => axios.get(`${base}/jobs/${id}`).then((r) => r.data),
    getJobStatus: (id) => axios.get(`${base}/jobs/${id}/status`).then((r) => r.data),
    workspaceList: (path = ".") => axios.get(`${base}/workspace/list`, { params: { path } }).then((r) => r.data),
  };
}

export const api = {
  // Health
  health: () => axios.get(`${API}/health`).then((r) => r.data),

  // Setup SQL
  setupSql: () => axios.get(`${API}/setup-sql`).then((r) => r.data),

  // MCP Client Registration (new flow)
  mcpAdd: (name, role, target_client_id) =>
    axios.post(`${API}/mcp/add`, { name, role, target_client_id }).then((r) => r.data),
  mcpConnections: () => axios.get(`${API}/mcp/connections`).then((r) => r.data),
  mcpConfig: (id) => axios.get(`${API}/mcp/clients/${id}/config`).then((r) => r.data),
  mcpDelete: (id) => axios.delete(`${API}/mcp/connections/${id}`).then((r) => r.data),
  mcpHeartbeat: (apiKey, clientId) =>
    axios.post(`${API}/mcp/heartbeat`, { client_id: clientId }, { headers: { "x-api-key": apiKey } }).then((r) => r.data),

  // Legacy MCP Clients
  listClients: () => axios.get(`${API}/mcp/clients`).then((r) => r.data),
  registerClient: (name, description) =>
    axios.post(`${API}/mcp/clients`, { name, description }).then((r) => r.data),
  removeClient: (id) => axios.delete(`${API}/mcp/clients/${id}`).then((r) => r.data),

  // Sessions
  listSessions: () => axios.get(`${API}/sessions`).then((r) => r.data),
  createSession: (name, created_by) =>
    axios.post(`${API}/sessions`, { name, created_by }).then((r) => r.data),
  getSession: (id) => axios.get(`${API}/sessions/${id}`).then((r) => r.data),
  deleteSession: (id) => axios.delete(`${API}/sessions/${id}`).then((r) => r.data),
  activateSession: (id) =>
    axios.post(`${API}/sessions/${id}/activate`).then((r) => r.data),
  deactivateSession: (id) =>
    axios.post(`${API}/sessions/${id}/deactivate`).then((r) => r.data),
  activeSessions: () => axios.get(`${API}/sessions/active/list`).then((r) => r.data),

  // Tools
  listTools: () => axios.get(`${API}/tools`).then((r) => r.data),
  callTool: (tool, args) =>
    axios.post(`${API}/tools/call`, { tool, arguments: args }).then((r) => r.data),

  // Workspace
  workspaceList: (path = ".") =>
    axios.get(`${API}/workspace/list`, { params: { path } }).then((r) => r.data),
  workspaceRead: (path) =>
    axios.get(`${API}/workspace/read`, { params: { path } }).then((r) => r.data),
  workspaceWrite: (path, content) =>
    axios.post(`${API}/workspace/write`, { path, content }).then((r) => r.data),

  // Jobs / console setup
  createJob: (payload) => axios.post(`${API}/jobs`, payload).then((r) => r.data),
  listJobs: () => axios.get(`${API}/jobs`).then((r) => r.data),
  getJob: (id) => axios.get(`${API}/jobs/${id}`).then((r) => r.data),
  getJobStatus: (id) => axios.get(`${API}/jobs/${id}/status`).then((r) => r.data),

  // Simple one-shot job flow (Client 1 side)
  createSimpleJob: (payload) =>
    axios.post(`${API}/jobs/simple`, payload).then((r) => r.data),
  getJobPublic: (id, apiKey) =>
    axios
      .get(`${API}/jobs/${id}/public`, { params: { api_key: apiKey } })
      .then((r) => r.data),
  getJobRuntime: (id, apiKey) =>
    axios
      .get(`${API}/jobs/${id}/runtime`, { params: { api_key: apiKey } })
      .then((r) => r.data),
  closeJob: (id, apiKey) =>
    axios
      .post(`${API}/jobs/${id}/close`, {}, { headers: { "x-api-key": apiKey } })
      .then((r) => r.data),

  // Tunnel lifecycle
  tunnelStart: (local_url) => axios.post(`${API}/tunnel/start`, { local_url }).then((r) => r.data),
  tunnelStop: () => axios.post(`${API}/tunnel/stop`).then((r) => r.data),
  tunnelStatus: () => axios.get(`${API}/tunnel/status`).then((r) => r.data),
  tunnelLogs: (tail = 80) => axios.get(`${API}/tunnel/logs`, { params: { tail } }).then((r) => r.data),

  // Events
  listEvents: (session_id, limit = 50) =>
    axios
      .get(`${API}/events`, { params: { session_id, limit } })
      .then((r) => r.data),
};
