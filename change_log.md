# Change Log — Inspire Genius Frontend

All notable changes to this project are documented in this file.

---

## [2026-03-11] — Project Documentation & Admin Project Log Page

### Added
- `change_log.md` — this file; tracks all project changes
- `database_schema.md` — documents frontend data models and API entity schemas
- `CLAUDE.md` — Claude Code guidance file for AI-assisted development
- `.claude/rules/` — rule files for code style, architecture, and workflow
  - `code-style.md` — TypeScript/React/Tailwind conventions
  - `architecture.md` — data flow and structural rules
  - `workflow.md` — development workflow and deployment rules
- `src/pages/super-admin/ProjectLog.tsx` — new super admin page rendering project documentation
- `IG_project_log.html` — standalone HTML export of all project documentation
- Added "Project Log" entry to super admin sidebar navigation
- Added `/super-admin/project-log` route

---

## [2026-03-13] — RLHF Feedback System + Super Admin Enhancements

### Added
- **RLHF Feedback Widget** (`src/components/user/chat/MessageFeedback.tsx`) — star rating + correction text on assistant messages in coach chat
- **RLHF Training Dashboard** (`src/pages/super-admin/RlhfTraining.tsx`) — metric cards, rating distribution chart, feedback table with detail modal
- **System Prompt Builder** (`src/pages/super-admin/PromptBuilder.tsx`) — two-panel wizard with live preview, version history, coach selector
- **Audit Log Viewer** (`src/pages/super-admin/AuditLog.tsx`) — metric cards, filterable event table with pagination
- **Magic Link Auth** (`src/pages/auth/MagicLinkLogin.tsx`, `MagicLinkVerify.tsx`) — passwordless authentication flow
- **Expanded Roles** — added `admin`, `company-admin`, `manager-admin` roles with permission matrix
- **Feedback data layer** — types, service (`/v1/feedback`), React Query hooks
- **Audit data layer** — separate axios instance (`auditAxios.ts`), types, service, hooks (fire-and-forget pattern)
- **Magic Auth data layer** — separate axios instance (`magicAuthAxios.ts`), types, service, hooks
- **Prompt Builder data layer** — types, service (`/v1/prompts`), React Query hooks
- Role permission matrix (`src/types/roles.ts`) with `hasAccess()` utility
- Role selector in `UserFormModal` for all CRUD operations
- Three new super admin nav items: RLHF Training, Prompt Builder, Audit Log
- "Sign in with magic link" button on Login page
- Audit event logging integrated into: login, logout, user invite/update/delete, feedback submission, prompt save/update

### Changed
- `ProtectedRoute` now uses `hasAccess()` permission matrix instead of hardcoded super-admin check
- `ROLES` constant expanded from 2 to 5 roles
- `ChatWindowChatTab` accepts `coachId`/`conversationId` props for feedback widget
- `ChatWindowProps` type extended with `coachId` prop

### New Routes
- `/super-admin/rlhf-training`, `/super-admin/prompt-builder`, `/super-admin/audit-log`
- `/magic-login`, `/magic-verify`

### New Environment Variables
- `VITE_AUDIT_SERVICE_URL` — Audit Service base URL (default: `http://localhost:8008`)
- `VITE_AUDIT_API_KEY` — Audit Service API key
- `VITE_MAGIC_AUTH_URL` — Magic Auth Service base URL (default: `http://localhost:8001`)

---

## [2026-03-13] — Project Log Enhancement: TOC, Section IDs & Content Sync

### Added
- Table of Contents (TOC) with quick navigation links and source-file path badges
- HTML section IDs on every panel for deep-linking (`id="section-*"`)
- Path badges on each section header identifying source subfolder (e.g., `[root/change_log.md]`, `[.claude/rules/architecture.md]`)
- Missing schema entities: LoginDataPayload, ProfileData, HistoryItem, IssueType, Dashboard Analytics
- Missing CLAUDE.md sections: Key Conventions, Project Documentation, Commands

### Changed
- `IG_project_log.html` — merged all `.md` and `.claude/rules/` file content into single dashboard with full content sync
- `activateTab()` JavaScript function for TOC link navigation

---

## [2026-03-12] — Home Page Redesign

### Changed
- `src/pages/user/Home.tsx` — complete redesign of the user home page inspired by the Manager Dashboard design:
  - Blue gradient hero banner with personalized welcome message and quick-link navigation buttons
  - Four stat cards (AI Coaches, Conversations, Documents, PRISM Profile) in a responsive grid
  - Redesigned About PRISM section with play overlay on video poster
  - Redesigned Ask Alex section with cleaner layout
  - Improved Explore Coaches grid with icons and hover states
  - Uses auth context for personalized greeting (user's first name)

---

## Template for Future Entries

```
## [YYYY-MM-DD] — Short Title

### Added
- New features

### Changed
- Modifications to existing features

### Fixed
- Bug fixes

### Removed
- Removed features or files
```
