# VibeCon — Product Requirements Document

## Original Problem Statement
Build a React single-page application called "VibeCon" — a frontend-only SPA where users find an expert solver, browse available jobs, accept a job, see MCP config + prompt + chat with the job poster, submit a solution, and get approved with reward points credited.

- No backend, no API calls — all data mocked
- React Router v6 patterns (implemented with react-router-dom v7 which is API-compatible)
- useState / useEffect only
- Plain CSS with design tokens (no Tailwind, no component libraries)
- Inter font (300/400/500/600/700)

## Architecture
- React 18 CRA, plain CSS design system in `/app/frontend/src/App.css`
- Routes: `/` → FindExpert, `/jobs` → JobsListing, `/jobs/:jobId` → JobDetails
- Components: `Card`, `Button`, `ChatUI`
- Mock data: `src/data/mockData.js` (mockJobs, sampleConfig, mockMCPConfig, initialChatMessages)
- Sticky black header with logo + nav (active/inactive states via `NavLink`)

## User Persona
Two personas served in the UX narrative:
1. **Job Poster** — posts a problem + reward; converses with Solver in chat
2. **Solver (Expert)** — browses jobs, accepts one, runs an MCP workflow, submits a solution, earns reward points

## Core Requirements (static)
- Design tokens per spec (page bg `#f7f7f8`, accent `#09090b`, dark code bg `#0a0a0a`, etc.)
- Header: 56px, sticky, black, logo w/ white dot, nav links
- FindExpert: EXPERT SOLVER pill, hero heading, dark code block (macOS traffic-light dots), CTA
- JobsListing: heading + count badge, auto-fill 300px grid, hover accent bar + translateY
- JobDetails 4 states: Default → Accepted → Submitted → Approved (auto 3s)
- ChatUI: poster left (gray), solver right (black), Send button + Enter, autoscroll
- Responsive collapse at 768px

## Implemented (2026-02)
- [x] App.js routing + Header with NavLink active states
- [x] App.css full design system (tokens, header, buttons, cards, code block w/ traffic lights, chat bubbles, loading-dot keyframes, responsive)
- [x] mockData.js (5 jobs, sampleConfig, mockMCPConfig, 2 initial chat messages)
- [x] Card, Button, ChatUI components
- [x] FindExpert page (/)
- [x] JobsListing page (/jobs)
- [x] JobDetails page (/jobs/:jobId) with all 4 states + jobId interpolation in prompt and links
- [x] data-testid on all interactive/critical elements
- [x] Verified end-to-end by testing agent (iteration 1: 27/27 tests passed, 100%)
- [x] **P2: Dark-mode toggle** — `[data-theme="dark"]` variables, Sun/Moon lucide icons, localStorage persistence (`vibecon-theme`), pref-color-scheme fallback, `--bg-inset` token for contrast elements
- [x] **P2: Chat typing indicator** — bouncing-dots bubble + "Job Poster / typing…" meta; auto-reply from poster after ~1.8s picked from 5 canned strings
- [x] **P2: Route fade transition** — `.page-fade` keyframe animation on `<main>` keyed by `location.pathname` (260ms opacity + translateY), respects `prefers-reduced-motion`
- [x] Verified iteration 2: 20/20 tests passed, 0 console errors

## Backlog
### P1
- Persist accepted/submitted state per job in localStorage so refresh preserves progress
- Search / filter bar on Jobs listing (by reward range or keyword)
- Empty-state polish when a jobId is not found

### P2
- Leaderboard of solvers by reward points
- Toast notifications on Submit / Approved transitions
- Keyboard shortcuts (e.g., `g j` → jobs)

## Notes
- No third-party integrations. No env variables required beyond the template defaults.
- MONGO_URL / DB_NAME unused (no backend logic added).
