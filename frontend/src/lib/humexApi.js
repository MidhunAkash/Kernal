import axios from "axios";
import { supabase } from "./supabase";

const API = process.env.REACT_APP_BACKEND_URL;

/* ─────────── Normalisation ─────────── */

function normalizeJob(job) {
  if (!job || !job.id) return null;
  return {
    id: job.id,
    displayId: `JOB-${String(job.id).slice(0, 8).toUpperCase()}`,
    clientName: job.target_name || "Client 1",
    jobName: job.title || "(untitled)",
    problemStatement: job.context || "No problem context provided.",
    tunnel_url: job.tunnel_url || "",
    status: job.status || "open",
    session_id: job.session_id || "",
    target_client_id: job.target_client_id || "",
    api_key: job.console_config?.apiKey || "",
    mcp_endpoint: `${API}/api/mcp`,
    created_at: job.created_at || "",
    // Lifecycle / rewards
    poster_uid: job.poster_uid || null,
    solver_uid: job.solver_uid || null,
    reward_points: Number(job.reward_points ?? 100),
    submission: job.submission || "",
    submitted_at: job.submitted_at || null,
    approved_at: job.approved_at || null,
  };
}

/* ─────────── Calls ─────────── */

export async function listJobs() {
  const { data } = await axios.get(`${API}/api/jobs`);
  return (data?.jobs || []).map(normalizeJob).filter(Boolean);
}

export async function getJob(jobId) {
  const { data } = await axios.get(`${API}/api/jobs/${jobId}`);
  return normalizeJob(data?.job || {});
}

/**
 * Expand a list of job IDs (usually from `users.jobs_created`)
 * into fully-hydrated job objects. The backend route joins
 * `mcp_clients` so we get `target_name` + `api_key` too.
 * Missing / deleted jobs are silently dropped.
 */
export async function getJobsByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const results = await Promise.all(
    ids.map((id) =>
      axios
        .get(`${API}/api/jobs/${id}`)
        .then((r) => normalizeJob(r.data?.job || {}))
        .catch(() => null)
    )
  );
  return results.filter(Boolean);
}

export async function getRuntime(jobId, apiKey) {
  const { data } = await axios.get(`${API}/api/jobs/${jobId}/runtime`, {
    params: { api_key: apiKey },
  });
  return data || {};
}

export async function heartbeatExecutor(jobId, sessionId, apiKey, clientId) {
  const { data } = await axios.post(
    `${API}/api/mcp/heartbeat`,
    {
      client_id: clientId,
      job_id: jobId,
      session_id: sessionId,
      role: "executor",
    },
    { headers: { "x-api-key": apiKey } }
  );
  return data;
}


export async function getMcpServerInfo() {
  const [healthRes, toolsRes] = await Promise.allSettled([
    axios.get(`${API}/api/health`),
    axios.get(`${API}/api/tools`),
  ]);
  const health = healthRes.status === "fulfilled" ? healthRes.value.data : null;
  const toolsData = toolsRes.status === "fulfilled" ? toolsRes.value.data : null;
  const tools = toolsData?.tools || {};
  return {
    mcpUrl: `${API}/api/mcp`,
    backendUrl: API,
    connected: !!health && health.status === "ok",
    supabaseConnected: !!health?.supabase_connected,
    tableReady: !!health?.table_ready,
    toolNames: Object.keys(tools),
    tools,
  };
}

/* ─────────── User-scoped: "Accepted Jobs" (solver-side) ─────────── */

/**
 * Fetch all jobs this user has accepted as a solver, across every lifecycle
 * status (accepted / submitted / approved / rejected / closed). Hits Supabase
 * directly (anon client) because the `mcp_jobs` table has RLS open for anon.
 */
export async function getAcceptedJobs(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("mcp_jobs")
    .select("*")
    .eq("solver_uid", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("getAcceptedJobs error:", error.message);
    return [];
  }
  return (data || []).map(normalizeJob).filter(Boolean);
}

/* ─────────── User-scoped: "Posted Jobs" ─────────── */

export async function getMyJobIds(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("users")
    .select("jobs_created")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.warn("getMyJobIds error:", error.message);
    return [];
  }
  return Array.isArray(data?.jobs_created) ? data.jobs_created : [];
}

export async function appendMyJobId(userId, jobId) {
  if (!userId || !jobId) return false;
  const current = await getMyJobIds(userId);
  if (current.includes(jobId)) return true;
  const updated = [...current, jobId];
  const { error } = await supabase
    .from("users")
    .update({ jobs_created: updated })
    .eq("id", userId);
  if (error) {
    console.warn("appendMyJobId error:", error.message);
    return false;
  }
  return true;
}

export async function createJobSimple({
  title,
  context = "",
  targetName = "",
  posterUid = null,
  rewardPoints = 100,
}) {
  const { data } = await axios.post(`${API}/api/jobs/simple`, {
    title,
    context,
    target_name: targetName,
    poster_uid: posterUid,
    reward_points: rewardPoints,
  });
  return data; // { job_id, api_key, executor_link, mcp_config, ... }
}

export async function postJobForUser(userId, payload) {
  const created = await createJobSimple({ ...payload, posterUid: userId });
  if (userId && created?.job_id) {
    await appendMyJobId(userId, created.job_id);
  }
  return created;
}

/* ─────────── Job lifecycle (accept → submit → approve / reject) ─────────── */

export async function acceptJob(jobId, userId) {
  const { data } = await axios.post(`${API}/api/jobs/${jobId}/accept`, {
    user_id: userId,
  });
  return data;
}

export async function submitJob(jobId, userId, submission) {
  const { data } = await axios.post(`${API}/api/jobs/${jobId}/submit`, {
    user_id: userId,
    submission,
  });
  return data;
}

export async function approveJob(jobId, userId) {
  const { data } = await axios.post(`${API}/api/jobs/${jobId}/approve`, {
    user_id: userId,
  });
  return data;
}

export async function rejectJob(jobId, userId) {
  const { data } = await axios.post(`${API}/api/jobs/${jobId}/reject`, {
    user_id: userId,
  });
  return data;
}

export async function getUserPoints(userId) {
  if (!userId) return 0;
  const { data, error } = await supabase
    .from("users")
    .select("points")
    .eq("id", userId)
    .maybeSingle();
  if (error) return 0;
  return Number(data?.points || 0);
}

/* ─────────── User API keys (knl_xxx) ─────────── */

export async function listApiKeys(uid) {
  if (!uid) return [];
  const { data } = await axios.get(`${API}/api/api-keys`, { params: { uid } });
  return data?.keys || [];
}

export async function createApiKey(uid, name = "default_key") {
  const { data } = await axios.post(`${API}/api/api-keys`, { uid, name });
  return data; // { api_key, name }
}

export async function deleteApiKey(uid, apiKey) {
  const { data } = await axios.delete(`${API}/api/api-keys`, {
    data: { uid, api_key: apiKey },
  });
  return data;
}

export function buildPersonalizedMcpConfig(mcpUrl, apiKey) {
  // MCP URL with the user's HumEx key as a query param so the backend
  // middleware resolves who is calling. Cursor / Claude Desktop send
  // the full URL on every request, so the key rides along automatically.
  const url =
    mcpUrl + (mcpUrl.includes("?") ? "&" : "?") + "key=" + encodeURIComponent(apiKey);
  return {
    mcpServers: {
      "humex-workspace": { url },
    },
  };
}
