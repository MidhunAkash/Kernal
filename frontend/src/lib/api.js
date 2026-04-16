import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = {
  // Health
  health: () => axios.get(`${API}/health`).then((r) => r.data),

  // Setup SQL
  setupSql: () => axios.get(`${API}/setup-sql`).then((r) => r.data),

  // MCP Clients
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

  // Events
  listEvents: (session_id, limit = 50) =>
    axios
      .get(`${API}/events`, { params: { session_id, limit } })
      .then((r) => r.data),
};
