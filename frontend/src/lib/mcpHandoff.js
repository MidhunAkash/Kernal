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
 * Minimal prompt the other client can paste into an MCP-capable agent
 * to clone this workspace using the direct /mcp endpoint.
 */
export function buildWorkspaceClonePrompt({ publicBackendUrl, previewUrl }) {
  const base = (publicBackendUrl || "").replace(/\/+$/, "");
  const mcpUrl = `${base}/mcp`;
  const lines = [
    "# Clone the Kernal workspace via MCP",
    "",
    "## MCP connection",
    `Connect your MCP client to: ${mcpUrl}`,
    "",
    "Add the following to your .vscode/mcp.json (or equivalent):",
    "```json",
    JSON.stringify(buildVscodeMcpConfig(publicBackendUrl), null, 2),
    "```",
    "",
    "## Instructions",
    "1. Connect to the MCP server above.",
    "2. Call `workspace_list_directory` (path='.') to see the full project tree.",
    "3. Read each file using `workspace_read_file` and recreate it locally, preserving paths exactly.",
    "4. Do NOT modify the remote workspace — only read.",
  ];

  if (previewUrl) {
    lines.push(`5. Validate the clone against the preview at: ${previewUrl}`);
  }

  lines.push("");
  lines.push("## Available tools");
  lines.push(
    "workspace_read_file, workspace_write_file, workspace_edit_file, " +
    "workspace_list_directory, workspace_create_directory, workspace_delete_file, " +
    "workspace_move_file, workspace_get_file_info, workspace_search_files"
  );

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
