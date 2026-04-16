# Kernel — Product Requirements Document

## Original Problem Statement
Build a React single-page application (originally "VibeCon", now renamed to **Kernel**) — a frontend-only SPA where users find an expert solver, browse available jobs, accept a job, see MCP config + prompt + chat with the job poster, submit a solution, and get approved with reward points credited. Login and register pages were added in iteration 3.

- No backend, no API calls — all data mocked (including auth)
- React Router v6 patterns (implemented with react-router-dom v7)
- useState / useEffect only
- Plain CSS with design tokens (no Tailwind, no component libraries)
- Inter font (300/400/500/600/700)

## Architecture
- React 18 CRA, plain CSS design system in `/app/frontend/src/App.css`
- Routes:
  - `/login` → LoginPage (public, redirects to `/` if authed)
  - `/register` → RegisterPage (public, redirects to `/` if authed)
  - `/` → FindExpert (protected)
  - `/jobs` → JobsListing (protected)
  - `/jobs/:jobId` → JobDetails (protected)
- Auth: **MOCKED client-side**. `localStorage.kernel-user` = `{email, name}`. No hashing, no JWT, no backend verification.
- Components: `Card`, `Button`, `ChatUI`
- Mock data: `src/data/mockData.js` (mockJobs, sampleConfig, mockMCPConfig, initialChatMessages)
- Header only rendered when authenticated; shows logo + nav + username + theme toggle + logout

## User Personas
1. **Job Poster** — posts a problem + reward; converses with Solver in chat
2. **Solver (Expert)** — signs up/logs in, browses jobs, accepts one, submits a solution, earns reward points

## Core Requirements (static)
- Design tokens: page bg `#f7f7f8` (light) / `#09090b` (dark), accent `#09090b`/`#fafafa`, `--bg-inset` for contrast elements, dark code bg `#0a0a0a`
- Header: 56px, sticky, uses `--header-bg`/`--header-fg`
- Auth pages: top-down dark gradient, bottom-right decorative square, huge heading, labeled inputs, full-width black submit
- FindExpert / JobsListing / JobDetails per original spec
- ChatUI: poster left (inset bg) / solver right (accent), Enter+Send, typing indicator + auto-reply
- Responsive collapse at 768px

## Implemented (2026-02)
- [x] **Iter 1 — MVP** (27/27 tests): App.js routing, App.css design system, mock data, Card/Button/ChatUI, FindExpert, JobsListing, JobDetails (4 states with 3s auto-approve)
- [x] **Iter 2 — P2 polish** (20/20 tests): Dark-mode toggle w/ localStorage persistence + Sun/Moon icons, chat typing indicator + auto-reply, route fade transition (`.page-fade` keyed by pathname)
- [x] **Iter 3 — Auth + Rename** (57/57 tests):
  - Rename VibeCon → Kernel everywhere (logo, URLs `tunnel.kernel.io` / `preview.kernel.io`, package `@kernel/human-mcp@latest`, env `KERNEL_TOKEN`, page title, theme storage key `kernel-theme`)
  - LoginPage (/login) matching Monolith.ai reference: KERNEL brand, "Access the Work-OS." heading, email+password, FORGOT? link (demo alert), full-width LOGIN button, Create Account link, gradient + decorative square
  - RegisterPage (/register): name + email + password + confirm, inline validation (email format, password ≥6 chars, confirm match), CREATE ACCOUNT button
  - Protected route wrapper redirecting unauth to /login
  - Logout button in header clears storage and returns to /login
  - Header hidden on auth pages; user display name shown when authed

## Backlog
### P1
- Persist per-job accepted/submitted state in localStorage (keyed by user + jobId)
- Search / filter bar on Jobs listing (reward range, keyword)
- Empty-state polish when a jobId is not found
- Real password-reset flow when a backend is added

### P2
- Solver leaderboard by total reward points
- Toast notifications on Submit / Approved transitions
- Keyboard shortcuts (`g j` → jobs, `⌘K` → command palette)
- Streak counter in header (daily/weekly solved jobs)

## Notes
- No third-party integrations required. Auth is fully mocked — if a real backend is added later, swap `onAuth` implementations and add JWT/session tokens via `integration_playbook_expert_v2`.
- MONGO_URL / DB_NAME unused.
