# Change Log — Inspire Genius Frontend

All notable changes to this project are documented in this file.

---

## [2026-03-14] — Replace MFA/OTP Login with Magic Link

### Changed
- `src/pages/auth/Login.tsx` — Magic link is now the primary login method. Users enter email → receive sign-in link via email → click to authenticate. Password login is available as a secondary option via "Sign in with password" button.
- `src/context/AuthContext.tsx` — MFA verification now sends a magic link instead of redirecting to the OTP page. Signup email verification also sends a magic link instead of OTP. Falls back to OTP if magic link request fails.

### How It Works
- **Login**: Enter email → "Send Sign-In Link" → check email → click magic link → `/magic-verify?token=xxx` → authenticated
- **Password fallback**: "Sign in with password" → traditional email+password login (still available)
- **Signup**: Create account → magic link sent for email verification → click link → verified
- **MFA**: When backend requires MFA, a magic link is sent automatically instead of showing OTP input
- Social login (Google) remains unchanged

---

## [2026-03-14] — Integration Evaluation & Migration Planning Documents

### Added
- `Integration_Evaluation_Report.docx` — ~20-page evaluation of how/when to integrate three architecture documents, covering effort, cost, scalability, maintainability, extensibility, pros/cons, risks, and recommendation
- `IG_Migration_Implementation_Plan.docx` — ~30-page detailed implementation plan for microservices transition with rollback strategies, phased timeline, bug fix allocation, dependency map, and cost estimates

---

## [2026-03-14] — Backend Purge Endpoint & Audit SQL Fix

### Added
- Backend: `DELETE /v1/user-management/users/purge/inactive` endpoint — hard-deletes all soft-deleted users (is_deleted=True, is_active=False) from the database and Cognito, with per-user error handling

### Fixed
- Backend: `audit_routes.py` — fixed SQL syntax error: changed `:details::jsonb` to `CAST(:details AS jsonb)` which was causing all audit log inserts to fail
- Frontend: `purgeInactiveUsers()` service function — now calls the new backend purge endpoint directly instead of fetching inactive users then deleting one-by-one (which failed because the delete endpoint returned "already deactivated" for soft-deleted users)

### Changed
- `src/services/super-admin/user-management/user-management.service.ts` — replaced client-side purge logic (getUsers + Promise.allSettled deleteUserByEmail) with single API call to `DELETE /v1/user-management/users/purge/inactive`
- Added `PurgeInactiveData` and `PurgeInactiveResponse` types for the new endpoint response shape

---

## [2026-03-13] — Purge Inactive Users Feature

### Added
- **Purge Inactive Users** button on User Management page — permanently deletes all deactivated users in bulk
- `purgeInactiveUsers` service function — fetches all inactive users then deletes each one, returning success/failure counts
- `getInactiveUserCount` service function — fetches count of inactive users for the confirmation modal
- `usePurgeInactiveUsers` React Query mutation hook with toast notifications and audit logging
- `useInactiveUserCount` React Query hook — lazy-loaded when purge modal opens
- Confirmation modal shows the count of inactive users before purging
- Audit event `users_purged` logged after successful purge operation

### Changed
- `ManagementHeader` `extraActions` now renders both the "Purge Inactive" button and the conditional "Delete Selected" button
- `UserX` icon imported from lucide-react for the purge button

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

## [2026-03-13] — Audit Service Resilience Fix

### Fixed
- Audit service now checks for `VITE_AUDIT_SERVICE_URL` configuration before making network requests
- `logAuditEvent` skips network call entirely when audit URL is not set (no more failed requests to `localhost:8008`)
- `getAuditLogs` and `getAuditStats` return empty placeholder data when audit service is unconfigured
- Added 5-second timeout to audit axios instance to prevent hanging requests
- Added `retry: false` to audit React Query hooks to avoid retrying against unavailable service
- Audit Log page now shows an informational banner when the audit service is not configured

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

## [2026-03-13] — Audit Logging Moved to Main Backend API

### Changed
- Audit service now uses the main backend API (`VITE_API_BASE_URL`) instead of a separate microservice (`VITE_AUDIT_SERVICE_URL`)
- `src/services/audit/audit.service.ts` — switched from `auditAxios` to the main `api` instance; endpoints changed from `/api/audit/*` to `/v1/audit/*`; removed `isAuditServiceConfigured` guard so audit is always active
- `src/lib/auditAxios.ts` — deprecated; now re-exports `api` from `@/lib/axios` for backward compatibility
- `src/hooks/audit/useAudit.ts` — removed `retry: false` (uses default React Query retry behavior now)
- `src/pages/super-admin/AuditLog.tsx` — removed unconfigured-service warning banner; expanded EVENT_TYPES filter list with page_view, coach_created/updated/deleted, document_uploaded/deleted, onboarding_completed, password_reset, settings_updated

### Added
- `src/hooks/audit/usePageViewAudit.ts` — hook that logs `page_view` audit events on route changes
- `src/layouts/SuperAdminLayout.tsx` — integrated `usePageViewAudit("admin")` for automatic super admin page view tracking
- Audit logging added to hooks that previously lacked it:
  - `useCoaches.ts` — coach create, update, deactivate
  - `useUploadDocuments.ts` — document upload
  - `useDeleteDocument.ts` / `useBulkDeleteDocuments.ts` — document delete
  - `useChangePassword.ts` — password change
  - `useResetPassword.ts` — password reset
  - `useAssignAgents.ts` — coach assignment to users

### Removed
- `VITE_AUDIT_SERVICE_URL` and `VITE_AUDIT_API_KEY` environment variables are no longer needed

---

## [2026-03-13] — Bulk Delete Fix in User Management

### Fixed
- `src/pages/super-admin/UserManagement.tsx` — rewrote `handleBulkDelete` to use `Promise.allSettled` instead of a sequential `for` loop with `mutateAsync`, which was failing because the mutation's `onSuccess`/`onError` callbacks fired individual toasts and the loop broke on the first error
- Bulk delete now calls `deleteUserByEmail` service directly (bypassing per-item mutation toasts), attempts all deletes in parallel, counts successes vs failures, shows a single summary toast, keeps failed emails selected, and invalidates the query cache once after all operations complete

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
