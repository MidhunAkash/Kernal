export const mockJobs = [
  {
    id: 'JOB-001',
    clientName: 'John',
    jobName: 'Fix Authentication Bug',
    problemStatement:
      'Our OAuth callback is throwing a 500 error intermittently after users approve the consent screen. Users are being redirected back to an error page roughly 1 out of every 5 logins. We need a reliable reproduction and a clean fix that handles expired state tokens gracefully without breaking existing sessions.',
    rewardPoints: 500,
  },
  {
    id: 'JOB-002',
    clientName: 'Sarah',
    jobName: 'Optimize Database Queries',
    problemStatement:
      'Several dashboard endpoints are running slow queries taking more than 5 seconds in production. We suspect missing indexes and N+1 query patterns across the reporting module. Profile the top 5 slowest queries, propose indexes, and refactor the ORM calls to bring p95 latency under 500ms.',
    rewardPoints: 750,
  },
  {
    id: 'JOB-003',
    clientName: 'Michael',
    jobName: 'Implement Payment Integration',
    problemStatement:
      'Integrate Stripe webhooks for subscription lifecycle events (created, updated, cancelled, invoice.paid, invoice.payment_failed). Ensure idempotency using event IDs, persist state transitions, and trigger the correct email notifications. Include retry-safe handlers and signed-signature verification.',
    rewardPoints: 1000,
  },
  {
    id: 'JOB-004',
    clientName: 'Emma',
    jobName: 'Add Email Notifications',
    problemStatement:
      'Wire up SendGrid for transactional emails: welcome email, password reset, and weekly digest. Create reusable template helpers, configure dynamic templates on SendGrid, and add a simple queue so we never block the request thread while sending email.',
    rewardPoints: 400,
  },
  {
    id: 'JOB-005',
    clientName: 'David',
    jobName: 'Fix Memory Leak',
    problemStatement:
      'Our Node.js worker process memory grows steadily from 200MB to over 2GB over 24 hours until it crashes. Heap snapshots point to retained listeners and cached response objects. Identify the retainers, fix the leak, and add a basic memory regression test we can run in CI.',
    rewardPoints: 800,
  },
];

export const sampleConfig = {
  expert: {
    type: 'senior_full_stack',
    capabilities: ['debug', 'refactor', 'review', 'ship'],
    tools: ['human_mcp', 'terminal', 'editor'],
  },
  mcp: {
    version: '1.0.4',
    protocol: 'stdio',
    permissions: ['read', 'write', 'update'],
  },
  settings: {
    timeout: 30000,
    retries: 3,
    verbose: true,
  },
};

export const mockMCPConfig = {
  mcpServers: {
    humanMCP: {
      command: 'npx',
      args: ['-y', '@vibecon/human-mcp@latest'],
      env: {
        VIBECON_TOKEN: '***',
        WORKSPACE: '/workspace/job',
      },
    },
  },
  tools: {
    allowed: ['read', 'write', 'update'],
    restricted: ['delete', 'exec', 'network'],
  },
  context: {
    workspace: '/workspace/job',
    outputDir: '/workspace/job/.kernel',
  },
};

export const initialChatMessages = [
  {
    id: 1,
    sender: 'poster',
    name: 'Job Poster',
    message:
      'Hey! Thanks for picking this up. The OAuth callback fails about 1 in 5 times after approval — let me know if you need more context or a sample trace.',
    timestamp: '10:32 AM',
  },
  {
    id: 2,
    sender: 'solver',
    name: 'Solver',
    message:
      'Got it. Pulling the repo now and reproducing locally. I will share findings in about 15 minutes.',
    timestamp: '10:34 AM',
  },
];
