export const mockJobs = [
  {
    id: "JOB-001",
    clientName: "John",
    jobName: "Fix Authentication Bug",
    problemStatement:
      "Users are getting a 500 error on the OAuth callback after signing in with Google. The session cookie is set but the redirect fails intermittently. Need to identify the root cause in the callback handler and patch without breaking existing auth flows.",
    rewardPoints: 500,
  },
  {
    id: "JOB-002",
    clientName: "Sarah",
    jobName: "Optimize Database Queries",
    problemStatement:
      "The reporting dashboard has queries that take over 5 seconds on production data. Add proper indexes, rewrite N+1 fetches, and ensure response times are under 500ms without changing the API contract.",
    rewardPoints: 750,
  },
  {
    id: "JOB-003",
    clientName: "Michael",
    jobName: "Implement Payment Integration",
    problemStatement:
      "Integrate Stripe checkout and webhooks for subscription billing. Support monthly/yearly plans, handle failed payments, and emit internal events on subscription state changes.",
    rewardPoints: 1000,
  },
  {
    id: "JOB-004",
    clientName: "Emma",
    jobName: "Add Email Notifications",
    problemStatement:
      "Wire up transactional emails via SendGrid for signup confirmation, password reset, and weekly digest. Use templated emails with dynamic content and proper unsubscribe links.",
    rewardPoints: 400,
  },
  {
    id: "JOB-005",
    clientName: "David",
    jobName: "Fix Memory Leak",
    problemStatement:
      "Our Node.js worker process memory grows unbounded over 24 hours until it crashes. Profile the heap, identify retained references, and patch the leak without regressions to throughput.",
    rewardPoints: 800,
  },
];

export const sampleConfig = {
  expert: {
    type: "senior-engineer",
    capabilities: ["debugging", "architecture", "code-review"],
    tools: ["read", "write", "update"],
  },
  mcp: {
    version: "1.0.0",
    protocol: "human-mcp",
    permissions: ["workspace:read", "workspace:write"],
  },
  settings: {
    timeout: 3600,
    retries: 3,
    verbose: true,
  },
};

export const mockMCPConfig = {
  mcpServers: {
    humanMCP: {
      command: "npx",
      args: ["-y", "@kernel/human-mcp@latest"],
      env: {
        KERNEL_TOKEN: "${KERNEL_TOKEN}",
      },
    },
  },
  tools: {
    allowed: ["read", "write", "update"],
    restricted: ["delete", "execute"],
  },
  context: {
    workspace: "/workspace/current-job",
    outputDir: "/workspace/output",
  },
};

export const initialChatMessages = [
  {
    id: 1,
    sender: "poster",
    name: "Job Poster",
    message:
      "Hey, thanks for picking this up. Let me know if you need more context on the repo structure.",
    timestamp: "10:24 AM",
  },
  {
    id: 2,
    sender: "solver",
    name: "Solver",
    message:
      "On it. I'll reproduce the issue locally first and share a diagnosis shortly.",
    timestamp: "10:26 AM",
  },
];
