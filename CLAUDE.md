# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Inspire Genius is an AI coaching platform frontend. The app code lives entirely in `inspire-genius-frontend/`. There is a Python `venv/` at the repo root (not related to the frontend).

## Commands

All commands run from `inspire-genius-frontend/`:

```bash
cd inspire-genius-frontend

npm run dev          # Start Vite dev server
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint
npm run test         # Jest in watch mode
npm run test:ci      # Jest single run (CI)
npm run test:coverage # Jest with coverage report

# Run a single test file:
npx jest src/components/alex/__tests__/AlexChatPanel.test.tsx
```

## Architecture

**Stack:** React 19 + TypeScript + Vite 7 + Tailwind CSS 4 + shadcn/ui (new-york style, slate base)

**Data flow pattern:** Service → Hook → Component
- **Services** (`src/services/`): Axios calls organized by domain (auth, coaches, documents, help, onboarding, super-admin, alex/chat, user)
- **Hooks** (`src/hooks/`): React Query mutations/queries wrapping services. Server state managed via TanStack React Query.
- **Pages** (`src/pages/`): Route-level components organized by role (auth, onboarding, user, super-admin, legal)

**Global state:** React Context only (no Redux/Zustand)
- `AuthContext` — auth lifecycle, token management, role-based navigation
- `TourContext` — guided tour with audio narration
- `SidebarContext` — sidebar UI state

**Routing** (`src/routes.tsx`):
- Public routes: `/login`, `/signup`, `/otp`, `/forgot`, `/reset-password`, `/accept-invitation`, `/social-login`, `/terms`, `/privacy`
- Protected user routes: `/home`, `/dashboard`, `/coaches`, `/documents`, `/settings`, `/help`, `/onboarding/*`
- Protected super-admin routes: `/super-admin/*`
- `ProtectedRoute` component enforces auth, role checks, and onboarding completion

**Two user roles:** `user` and `super-admin` (defined in `src/constants/routes.ts` as `ROLES` enum)

**API layer** (`src/lib/axios.ts`):
- Singleton axios instance, base URL from `VITE_API_BASE_URL` env var (default `http://localhost:3000`)
- Request interceptor injects `access-token` from encrypted storage
- Response interceptor handles 401 with single-flight token refresh, auto-retry, or logout

**Auth storage** (`src/lib/secureStorage.ts`, `src/lib/storage.ts`):
- Sensitive data (tokens) stored via encrypted storage wrapper
- Storage keys centralized in `STORAGE_KEYS` enum

**UI components** (`src/components/ui/`): shadcn/ui library. Add new components via `npx shadcn@latest add <component>`. Path alias `@/` maps to `src/`.

**Testing:** Jest + jsdom + React Testing Library. Tests colocated in `__tests__/` directories next to their source files. CSS modules mocked via `identity-obj-proxy`.

## Key Conventions

- Route constants in `src/constants/routes.ts` (`ROUTES`, `ROLES`, `STORAGE_KEYS`, `NEXT_STEPS`)
- Forms use React Hook Form + Zod validation
- Notifications via Sonner toast (`<Toaster>` in App.tsx)
- Icons from `lucide-react`
- Path alias: `@/` → `src/` (configured in Vite, tsconfig, and jest)
- After making notable changes, update `change_log.md` and `IG_project_log.html`
- After every user prompt, append it to the session_prompts section in `IG_project_log.html`

## Project Documentation

- `change_log.md` — chronological record of all project changes
- `database_schema.md` — frontend data models and API entity schemas
- `IG_project_log.html` — standalone HTML dashboard with all docs + session prompt history
- `.claude/rules/` — development rules (code-style, architecture, workflow)
- Project Log page available at `/super-admin/project-log` in the app
