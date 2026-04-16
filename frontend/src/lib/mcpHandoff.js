/**
 * Shared MCP handoff helpers — used by both /console and /clone pages.
 */

// ── clipboard ───────────────────────────────────────────

export function copyText(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  return fallbackCopy(text);
}

function fallbackCopy(text) {
  return new Promise((resolve) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
    } catch {}
    document.body.removeChild(ta);
    resolve();
  });
}

// ── formatting ──────────────────────────────────────────

export function formatDate(value) {
  if (!value) return "just now";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

// ── config builders ─────────────────────────────────────

export function buildSimpleConfig({ mainServerUrl, apiKey, jobId }) {
  return { mainServerUrl, apiKey, jobId };
}

export function buildConfigUrl({ publicBackendUrl, targetClientId }) {
  const base = publicBackendUrl.replace(/\/+$/, "");
  return `${base}/api/mcp/clients/${targetClientId}/config?public_base_url=${encodeURIComponent(base)}`;
}

/**
 * VS Code mcp.json snippet the other client needs to connect directly to this workspace.
 */
export function buildVscodeMcpConfig(publicBackendUrl) {
  const base = (publicBackendUrl || "").replace(/\/+$/, "");
  return {
    servers: {
      "kernal-workspace": {
        type: "http",
        url: `${base}/mcp`,
      },
    },
  };
}

/**
 * Standard mcpServers format for non-VS-Code clients (Cursor, Windsurf, Claude Desktop, etc.)
 */
export function buildMcpServersConfig(publicBackendUrl) {
  const base = (publicBackendUrl || "").replace(/\/+$/, "");
  return {
    mcpServers: {
      "kernal-workspace": {
        url: `${base}/mcp`,
      },
    },
  };
}

/**
 * Minimal prompt the other client can paste into an MCP-capable agent
 * to clone this workspace using the direct /mcp endpoint.
 * Includes connection setup instructions with status check workflow.
 */
export function buildWorkspaceClonePrompt({ publicBackendUrl, previewUrl }) {
  const base = (publicBackendUrl || "").replace(/\/+$/, "");
  const mcpUrl = `${base}/mcp`;
  const lines = [
    "# Connect to the Kernal workspace via MCP",
    "",
    "## Step 1 — Add MCP server",
    "",
    "Add one of these configs depending on your client:",
    "",
    "**VS Code** (.vscode/mcp.json):",
    "```json",
    JSON.stringify(buildVscodeMcpConfig(publicBackendUrl), null, 2),
    "```",
    "",
    "**Other clients** (Cursor, Windsurf, Claude Desktop — mcpServers format):",
    "```json",
    JSON.stringify(buildMcpServersConfig(publicBackendUrl), null, 2),
    "```",
    "",
    "## Step 2 — Check connection (REQUIRED FIRST STEP)",
    "",
    "Before using any file tools, call:",
    "```",
    "workspace_status_check(job_id=\"none\")",
    "```",
    "",
    "Read the `instructions` array in the response. It will tell you:",
    "- If the connection is healthy → proceed to use tools",
    "- If the tunnel needs to be trusted → open the URL it gives you in a browser",
    `  (${base}) and click \"Continue\" on the Microsoft Dev Tunnels trust page`,
    "- If the backend is down → instructions on how to restart it",
    "",
    "**If the tunnel is not trusted**, open this URL in your browser first:",
    `${base}`,
    "",
    "Then call workspace_status_check again. Once it returns `\"connection\": \"ok\"`,",
    "you can use all tools.",
    "",
    "## Step 3 — Use workspace tools",
    "",
    "Available tools after connection is verified:",
    "- `workspace_list_directory(path)` — list files/folders",
    "- `workspace_read_file(path)` — read file contents",
    "- `workspace_write_file(path, content)` — create/overwrite a file",
    "- `workspace_edit_file(path, old_text, new_text)` — search-and-replace",
    "- `workspace_create_directory(path)` — create directory",
    "- `workspace_delete_file(path)` — delete file/folder",
    "- `workspace_move_file(source, destination)` — move/rename",
    "- `workspace_get_file_info(path)` — file metadata",
    "- `workspace_search_files(pattern, path)` — glob search",
    "- `workspace_status_check(job_id)` — check connection & peer status",
    "",
    "Start with `workspace_status_check`, then `workspace_list_directory(\".\")` to see the project tree.",
  ];

  if (previewUrl) {
    lines.push("");
    lines.push(`## Preview`);
    lines.push(`Validate your work against the live preview: ${previewUrl}`);
  }

  return lines.join("\n");
}

// ── prompt builders ─────────────────────────────────────

export function buildExecutorPrompt({ job, config }) {
  return [
    "Use this MCP job to connect as Client B (expert executor).",
    `Problem: ${job.title}`,
    job.context ? `Context: ${job.context}` : null,
    `Tunnel URL: ${job.tunnel_url}`,
    "",
    "Paste or save this config:",
    JSON.stringify(config, null, 2),
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildClonePrompt({ job, simpleConfig, fullMcpConfig, configUrl, previewUrl }) {
  const lines = [
    "# Clone this project via MCP",
    "",
    `**Problem:** ${job.title}`,
  ];

  if (job.context) {
    lines.push(`**Context:** ${job.context}`);
  }

  lines.push("");
  lines.push("## Instructions");
  lines.push("1. Connect to the MCP server using the configuration below.");
  lines.push("2. Use the MCP tools to read the project files from the remote workspace.");
  lines.push("3. Recreate every file in your current project, preserving paths and content exactly.");
  lines.push("4. Keep all writes scoped to the current project — do not modify the remote workspace.");

  if (previewUrl) {
    lines.push(`5. Use the preview URL to validate that the cloned app matches the source: ${previewUrl}`);
  }

  lines.push("");
  lines.push("## Simple config (3 fields)");
  lines.push("```json");
  lines.push(JSON.stringify(simpleConfig, null, 2));
  lines.push("```");

  if (fullMcpConfig) {
    lines.push("");
    lines.push("## Full MCP server config");
    lines.push("```json");
    lines.push(JSON.stringify(fullMcpConfig, null, 2));
    lines.push("```");
  }

  if (configUrl) {
    lines.push("");
    lines.push("## Config URL");
    lines.push(`Fetch the live config from: ${configUrl}`);
  }

  lines.push("");
  lines.push("## Available MCP tools");
  lines.push("read_file, write_file, edit_file, list_directory, create_directory, delete_file, move_file, get_file_info, search_files");

  lines.push("");
  lines.push("Start by running `list_directory` with path `.` to see the project structure, then read and clone each file.");

  return lines.join("\n");
}
