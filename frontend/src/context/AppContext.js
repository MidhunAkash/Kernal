import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

/**
 * HumEx marketplace context.
 *
 * Real-backend data (jobs, MCP config, executor link, tunnel URL) lives in
 * `/api/jobs/*` and is fetched on demand. This context holds the marketplace
 * layer (accept / solution / approve / reject / chat / reward points) that the
 * MCP backend does not model — synced across browser tabs via the `storage`
 * event as in the original spec.
 */

const STORAGE_KEY = "humex_marketplace_v1";

const DEFAULT_STATE = {
  role: null, // "CLIENT_1" (Poster) | "CLIENT_2" (Solver) | null
  userName: "",
  // jobId -> per-job marketplace record
  // {
  //   jobId, apiKey, sessionId, targetClientId,
  //   title, context, rewardPoints, postedByName, createdAt,
  //   mcpConfig, prompt, executorLink, tunnelUrl, mcpEndpoint, agentCommand,
  //   acceptedBy: {name} | null,
  //   solution: string | null,
  //   marketStatus: "open" | "accepted" | "submitted" | "approved" | "rejected",
  //   chat: [{id, sender, name, message, timestamp}],
  //   backendStatus: string,
  // }
  marketplace: {},
};

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

const AppCtx = createContext(null);

export function AppProvider({ children }) {
  const [state, setState] = useState(loadInitial);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota exceeded — ignore */
    }
  }, [state]);

  // Cross-tab sync
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== STORAGE_KEY) return;
      if (!e.newValue) return;
      try {
        setState(JSON.parse(e.newValue));
      } catch {
        /* ignore malformed */
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  /* ─────────── actions ─────────── */

  const setRole = useCallback((role, userName) => {
    setState((s) => ({ ...s, role, userName: userName || s.userName }));
  }, []);

  const clearRole = useCallback(() => {
    setState((s) => ({ ...s, role: null }));
  }, []);

  const registerPostedJob = useCallback((result, extras = {}) => {
    setState((s) => ({
      ...s,
      marketplace: {
        ...s.marketplace,
        [result.job_id]: {
          jobId: result.job_id,
          apiKey: result.api_key,
          sessionId: result.session_id,
          targetClientId: result.target_client_id,
          title: result.title,
          context: result.context || "",
          mcpConfig: result.mcp_config,
          prompt: extras.prompt || "",
          executorLink: result.executor_link || "",
          tunnelUrl: result.tunnel_url || "",
          mcpEndpoint: result.mcp_endpoint || "",
          agentCommand: result.agent_command || "",
          postedByName: extras.postedByName || "",
          rewardPoints: Number(extras.rewardPoints) || 0,
          createdAt: result.created_at || new Date().toISOString(),
          acceptedBy: null,
          solution: null,
          marketStatus: "open",
          chat: [],
          backendStatus: result.status || "open",
        },
      },
    }));
  }, []);

  const updateMarket = useCallback((jobId, patch) => {
    setState((s) => {
      const prev = s.marketplace[jobId];
      if (!prev) return s;
      return {
        ...s,
        marketplace: { ...s.marketplace, [jobId]: { ...prev, ...patch } },
      };
    });
  }, []);

  const acceptJob = useCallback((jobId, solver) => {
    updateMarket(jobId, { acceptedBy: solver, marketStatus: "accepted" });
  }, [updateMarket]);

  const submitSolution = useCallback((jobId, solution) => {
    updateMarket(jobId, { solution, marketStatus: "submitted" });
  }, [updateMarket]);

  const approveSolution = useCallback((jobId) => {
    updateMarket(jobId, { marketStatus: "approved" });
  }, [updateMarket]);

  const rejectSolution = useCallback((jobId) => {
    updateMarket(jobId, { marketStatus: "rejected" });
  }, [updateMarket]);

  const sendMessage = useCallback((jobId, sender, name, message) => {
    setState((s) => {
      const prev = s.marketplace[jobId];
      if (!prev) return s;
      const now = new Date();
      const timestamp = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      const newMsg = { id: now.getTime() + Math.random(), sender, name, message, timestamp };
      return {
        ...s,
        marketplace: {
          ...s.marketplace,
          [jobId]: { ...prev, chat: [...(prev.chat || []), newMsg] },
        },
      };
    });
  }, []);

  const value = {
    state,
    role: state.role,
    userName: state.userName,
    marketplace: state.marketplace,
    setRole,
    clearRole,
    registerPostedJob,
    acceptJob,
    submitSolution,
    approveSolution,
    rejectSolution,
    sendMessage,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
