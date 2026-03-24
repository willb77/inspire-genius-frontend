# Change Log — Inspire Genius Frontend

All notable changes to this project are documented in this file.

---

## [2026-03-24] — Fix PRISM Flow, Documents, Feedback, Analytics, Help Pages

### Changed — PRISM (User)
- `src/pages/user/PrismAssessment.tsx` / `src/constants/navigation.ts` — "Request Survey" button now navigates to the assessment form page (`/prism-assessment`) instead of calling the API directly; menu item renamed from "Request Survey" to "Request Assessment"

### Fixed — Documents (User)
- Documents service now uses robust `BaseApiResponse` envelope unwrapping to correctly extract the document list; stale cache cleared on mount
- Upload fixed by removing the manually-set `Content-Type: multipart/form-data` header (was breaking multipart boundary); React Query cache invalidated on successful upload so the list refreshes automatically

### Fixed — Feedback (User / Super-Admin)
- Feedback page wired to real `/v1/feedback` and `/v1/feedback/stats` APIs with pagination support and rating filters
- All hardcoded mock data removed

### Added — Analytics (User)
- Placeholder banner added to Analytics page indicating no real backend endpoint is available yet

### Added — Help & Support (User)
- Voice Help card added to Help & Support page with a placeholder link for a future voice agent URL

---

## [2026-03-24] — Fix User, Manager, Company Admin Dashboards — Data Loading, Missing Routes, PRISM

### Fixed — User Dashboard
- Sidebar now shows "User Pages" nav section when super-admin visits via Role Views
- Stat tiles wired to real audit stats API (replaced hardcoded dummy data)
- PRISM services fixed to unwrap `resp.data` correctly (fixes behavioral report status and survey request)
- Coach list now handles both flat array and nested response shapes (fixes coaches not loading)
- Documents service unwraps `BaseApiResponse` envelope (fixes documents not populating)
- Quick Actions "Set New Goal" button now routes to `/coaches` instead of chat

### Fixed — Manager Dashboard
- Created 7 missing pages (Candidates, Interviews, JobDna, Training, CareerManagement, TeamBuilding, Leadership) with Coming Soon placeholders — sidebar links no longer reset to main screen
- Added "Sample data" placeholder banner to Dashboard, Team, Hiring, and Analytics pages

### Fixed — Company Admin Dashboard
- Created Training and Leadership pages (missing routes were causing sidebar resets)
- Rebuilt blank Organization page with org chart placeholder and department table
- Added content to blank Settings page (org profile, security, notifications, billing sections)
- Dashboard stat tiles are now clickable; "Add User" button shows toast notification
- Added placeholder data banner to all Company Admin pages

---

## [2026-03-24] — Add Cross-Role Navigation for Super-Admin

### Added
- `SidebarScaffold` — new optional `navSections` prop supporting grouped navigation sections
- Super-admin sidebar now has two named sections: **"Administration"** (existing admin tools) and **"Role Views"** (links to User Home, Manager, Company Admin, Practitioner, and Distributor dashboards)

### Changed
- `AppShell` — detects super-admin role from `AuthContext` and overrides the sidebar role accordingly, so the full super-admin navigation is always displayed regardless of which page the super-admin is visiting
- `UserLayout` — detects super-admin role and shows admin sections instead of user-only nav items
- When a super-admin navigates to any role's page (e.g., `/home`, `/manager/dashboard`), the sidebar continues to show the full super-admin navigation rather than that role's nav

---

## [2026-03-24] — Wire PRISM "Request Survey" Button to Real API

### Changed
- `src/pages/user/Home.tsx` — "Request Survey" button on the Home dashboard now calls the PRISM initiate API via `usePrismInitiate` hook instead of navigating to `/prism-assessment`
- Button displays "Requesting..." loading state while the API call is in flight
- Button is disabled when an assessment is already in progress (`assessmentInProgress`) or when the mutation is pending
- Fixed TypeScript operator precedence error in surname fallback logic

---

## [2026-03-23] — Phase 7: UI Polish & Accessibility [WS-B 7.B1-7.B4]

### Added — Visual Polish (7.B1)
- `LoadingFallback` — Skeleton-based page loading with card grid and content placeholders
- `SkeletonCard` — Reusable animated card skeleton
- `EmptyState` — Centered empty state with icon, title, message, optional action
- `ErrorState` — Error display with retry button

### Added — Accessibility (7.B2)
- `SkipToContent` — Skip navigation link (sr-only, visible on focus)
- `focus-visible` outline (2px solid #3B5BFF) added to global CSS
- AppShell: `id="main-content"`, `role="main"`, `tabIndex={-1}` on main element
- AppHeader: `role="banner"`
- AppSidebar: `role="navigation"`, `aria-label`, mobile backdrop `aria-hidden`
- RightPanel: `role="complementary"`, `aria-label`
- DataCard: `role="region"`, `aria-label={title}`

### Changed — Responsive (7.B3)
- Sidebar nav buttons: `min-h-[44px]` on mobile for touch targets (WCAG 2.5.5)

### Tests
- EmptyState (3 tests), ErrorState (3 tests), SkipToContent (1 test)

---

## [2026-03-23] — Phase 7 Final Launch Sweep [WS-A 7.A1-7.A3]

### Fixed (Launch Blockers)
- **CRITICAL:** `src/services/auth.service.ts:19` — URL parameter injection: `resendVerificationApi` now encodes email with `encodeURIComponent()`. Emails with `+`, `&`, `=`, `#` characters were corrupting the query string.
- **HIGH:** `vite.config.ts:109` — Source maps changed from `true` to `"hidden"`. Production JS no longer includes `//# sourceMappingURL` comments, preventing source code exposure. Maps still generated for Sentry.
- **MEDIUM:** `src/hooks/useChatWindowAudio.ts` — `pendingStoreRef` timeout now cleared on component unmount.
- **MEDIUM:** Removed 5 `console.log` statements leaking auth/state data to browser console in production: `useAuthRedirectForAuthPages.ts:12`, `AuthContext.tsx:403`, `CoachChat.tsx:500`, `ExportChatModal.tsx:91-92`, `storage.ts:116`.

### Full Bug Catalog (26 total)
- **Fixed:** 7 (1 Critical, 2 High, 4 Medium) — all launch blockers resolved
- **Accepted for launch:** 19 (10 Medium/Low mock-data pages, 8 Low missing-zodResolver forms, 1 dead route constant)

### Final Test Results
- 139/139 test suites, 1319/1319 tests pass
- 0 TypeScript errors, build passes (4.1s)
- Zero Critical bugs, Zero High bugs remaining

---

## [2026-03-23] — High Availability, DR, Blue-Green, Security [WS-D 6.D1-6.D4]

### Added — Auto-Scaling (6.D1)
- `infrastructure/cloudformation/autoscaling-stack.yml` — ECS auto-scaling: target tracking (CPU 60%), step scale-up (>70% → +2 tasks), step scale-down (<30% → -1 task), min 2 / max 10 tasks, max-capacity cost alert

### Added — Disaster Recovery (6.D2)
- `infrastructure/scripts/dr-failover.sh` — Failover (promote replica, update Route53, verify health), failback (restore primary, recreate replica), status, drill (full failover+failback with RTO measurement)
- `docs/dr-runbook.md` — Step-by-step recovery procedure, RTO<1hr RPO<15min targets, post-incident checklist, quarterly drill schedule

### Added — Blue-Green Deployment (6.D3)
- `infrastructure/scripts/blue-green-deploy.sh` — Zero-downtime deploy: register green task def, update ECS service, 10-attempt health check (3 consecutive passes required), auto-rollback on failure, SNS notifications
- `docs/blue-green-procedure.md` — Pre-deployment checklist, automated/manual steps, rollback procedure, monitoring guide

### Added — Security Hardening (6.D4)
- `infrastructure/cloudformation/waf-stack.yml` — WAF v2: rate limiting (2000 req/5min/IP), AWS Managed Rules (Common, Known Bad Inputs, IP Reputation), geo-restriction (US/CA/GB/AU/IN), rate-limit alarm
- `infrastructure/cloudformation/vpc-security-stack.yml` — VPC flow logs (14-day retention), rejected traffic alarm (>1000/5min), AWS Config with 5 compliance rules (no inline IAM, no root keys, RDS encrypted, no public S3, encrypted EBS)

---

## [2026-03-23] — Phase 6 Security Sweep & Bug Triage [WS-A 6.A1-6.A3]

### Fixed
- `src/services/auth.service.ts:19` — URL parameter injection: `resendVerificationApi` now uses `encodeURIComponent(email)` to prevent query string corruption with special characters
- `src/lib/crypto.ts` — Dev-mode warning when `VITE_CRYPTO_KEY` is unset; extracted `resolveSecret`/`resolveSalt` helpers to centralize fallback logic
- `src/hooks/useChatWindowAudio.ts:138` — Memory leak: `pendingStoreRef` timeout now cleared on component unmount, preventing setState on unmounted component

### Security Audit Findings
- **URL injection (fixed):** `resendVerificationApi` interpolated email without encoding
- **Crypto weakness (warned):** `VITE_CRYPTO_KEY` falls back to empty string — encryption uses empty passphrase
- **Plaintext fallback (reported):** `secureStorage.ts` silently stores tokens as plain JSON on encryption failure
- **Source maps (reported):** `vite.config.ts` enables source maps in production builds
- **Console logging (reported):** 5 files log auth/state data to browser console in production
- **CSRF (acceptable):** Custom `access-token` header provides adequate protection against form-based CSRF
- **XSS (clean):** Single `dangerouslySetInnerHTML` usage is safe (injects CSS vars from config, not user input)

### Verified
- **6.A1:** 139/139 suites, 1319/1319 tests. Build passes. 0 TS errors.
- **6.A2:** Timer/interval cleanup verified across codebase. Token refresh single-flight locking confirmed in axios.ts.
- **6.A3:** No XSS, SQL injection, or auth bypass vulnerabilities found. Division-by-zero guards all safe.

---

## [2026-03-22] — CDN Optimization, API Caching & Asset Pipeline [WS-D 5.D1-5.D3]

### Added — CDN Optimization (5.D1)
- `infrastructure/cloudformation/cdn-optimization-stack.yml` — CloudFront distribution with 3 cache behaviors:
  - `/assets/*` — static assets, max-age=31536000 (1 year), immutable, custom cache policy optimized for >90% hit rate
  - `/v1/*` — API pass-through, no caching, all headers forwarded, CORS response headers policy
  - Default (`/*`) — HTML pages, max-age=0 must-revalidate for SPA, stale-while-revalidate=60
- `infrastructure/cloudfront-functions/spa-rewrite.js` — CloudFront Function (viewer-request) rewrites non-file URIs to /index.html, preserves /assets/, /icons/, /images/, manifest.json, sw.js, robots.txt
- Origin Access Control for S3 bucket (sigv4 signing)
- Response headers policy: HSTS (1yr, includeSubDomains, preload), X-Content-Type-Options: nosniff, X-Frame-Options: DENY, X-XSS-Protection, Referrer-Policy

### Added — API Response Caching (5.D2)
- `inspire-genius-backend/prism_inspire/core/cache.py` — Redis/ElastiCache cache utility:
  - `get_cache(key)` / `set_cache(key, value, ttl)` / `invalidate(key)` / `invalidate_pattern(pattern)`
  - `@cached(ttl, key_prefix)` decorator for automatic cache-through (sync + async variants)
  - TTL presets: REALTIME=300 (5min), HISTORICAL=3600 (1hr), COST_DASHBOARD=900 (15min)
  - `invalidate_on_write(patterns)` helper for write-through invalidation
  - Falls back to in-memory dict cache when REDIS_URL not set (development)
  - JSON serialization for complex objects, MD5 key hashing
- `inspire-genius-backend/prism_inspire/middleware/cache.py` — CacheMiddleware for FastAPI:
  - `/v1/analytics/*` → private, max-age=300
  - `/v1/dashboard/*` → private, max-age=900
  - `/v1/costs/*` → private, max-age=900
  - `/health*` → no-cache, no-store, must-revalidate
  - All other `/v1/*` → no-store (writes)
  - Non-GET methods always get no-store

### Added — Asset Pipeline (5.D3)
- `inspire-genius-frontend/vite.config.ts` — Code splitting via `build.rollupOptions.output.manualChunks`:
  - `vendor` — react, react-dom, react-router-dom
  - `ui` — @radix-ui/*, lucide-react, framer-motion
  - `query` — @tanstack/react-query
  - `charts` — recharts
- Asset fingerprinting confirmed: `build.assetsDir = 'assets'` (Vite default [hash] in filenames)
- `infrastructure/scripts/optimize-images.sh` — Converts PNG/JPG to WebP using cwebp or sharp-cli, preserves originals, reports size savings
- `inspire-genius-frontend/.gitlab-ci.yml` — Deploy stage enhanced:
  - Verifies gzip/brotli compression enabled on CloudFront distribution
  - Logs JS/CSS asset sizes in deploy output for build audit trail

---

## [2026-03-22] — Phase 5 Bug Triage [WS-A 5.A1-5.A3]

### Fixed
- `src/components/feedback/CorrectionModal.tsx` — Added missing `zodResolver(correctionSchema)` to `useForm`. Blank correction submissions could bypass Zod validation entirely.

### Verified
- **5.A1:** 139/139 suites, 1319/1319 tests. Build passes. 0 TS errors.
- **5.A1 RLHF regression:** Core chain intact (MessageFeedback → useFeedback → POST /v1/feedback). Star rating + correction text submission functional.
- **5.A2 Analytics:** All division/percentage guards verified safe — no division-by-zero possible in PRISMThermometer, BMLProgressBar, scoring.ts, RlhfFeedbackTable.
- **5.A3 Performance:** Build 3.5s, test suite 12.9s, bundle stable at ~1,941 KB JS.

### Reported (Open)
- P3: FeedbackButtons/CorrectionModal not wired into chat UI (dead code)
- P3: FeedbackHistory, RlhfReviewQueue, RlhfTraining export all use hardcoded mock data
- P3: CostDashboard/PRISMThermometer/QuickActions still unused by any page
- P3: ROUTES.COMPANY_ADMIN.PRISM_OVERVIEW dead config

---

## [2026-03-22] — Database Scaling & Storage [WS-D 4.D1-4.D3]

### Added — Feedback Data Storage (4.D1)
- `inspire-genius-backend/ai/models/feedback.py` — Feedback, FeedbackCorrection, TrainingExport ORM models with JSONB metadata, optimized composite indexes
- `inspire-genius-backend/prism_inspire/alembic/versions/d4e5f6a7b8c9_feedback_tables.py` — Migration creating 3 tables + 8 indexes + 3 enums
- `inspire-genius-backend/prism_inspire/db/session.py` — Read replica support via READ_REPLICA_URL env var, `@with_read_db` decorator for aggregation queries, connection pooling (pool_size=10, max_overflow=20, pool_recycle=1800)

### Added — Backup Enhancement (4.D2)
- `infrastructure/scripts/backup.sh` — Daily snapshots, PITR enable (35-day retention), cross-region DR replication (us-west-2), test-restore with 1-hour target verification, backup monitoring
- `infrastructure/cloudformation/backup-stack.yml` — CloudWatch alarms for backup age (>25h), replication lag (>60s), low storage (<5GB)

### Added — Storage Optimization (4.D3)
- `infrastructure/scripts/archive-feedback.sh` — Archives feedback >90 days to S3 as JSONL, soft-deletes from primary DB, supports --dry-run
- `infrastructure/cloudformation/s3-lifecycle-stack.yml` — Archive bucket (Standard→IA@30d→Glacier@90d→Deep Archive@365d→delete@7y), training exports bucket (IA@30d→Glacier@180d→delete@3y), storage growth alarms (100GB warning, 500GB critical)

---

## [2026-03-22] — Phase 4 Bug Triage & Fixes [WS-A 4.A1-4.A2]

### Fixed
- `src/components/ProtectedRoute.tsx` — Reduced boot delay from 5000ms to 300ms. Users were blocked by a 5-second loading screen on every protected route visit.
- `src/components/ErrorBoundary.tsx` — Safe error handling: `error as Error` → `instanceof Error` check with `String()` fallback for non-Error thrown values.

### Verified
- **4.A1 Bug Sweep:** 137/137 test suites, 1313/1313 tests pass. Build passes. 0 TypeScript errors.
- **4.A2 RLHF:** Feedback flow (star rating → API → storage) fully wired via MessageFeedback → useFeedback → feedback.service. RLHF Training page and Prompt Builder page both functional.
- **Dead sidebar links:** Resolved — navigation.ts consolidated, all sidebar items have matching routes.
- **PRISM integration:** 11 components, 6 hooks, service all structurally sound. Two P2/P3 issues reported (missing route ACL, dead config).
- **Job Blueprint:** Test harness + 20+ components compile and render.

### Reported (Open)
- P2: `/prism-assessment` route accessible by any authenticated role — missing ACL
- P3: `ROUTES.COMPANY_ADMIN.PRISM_OVERVIEW` constant has no route entry
- P3: `CostDashboard`, `PRISMThermometer`, `QuickActions` components unused by dashboard pages
- P3: Backend — 5 test collection errors (pydantic, google module, vector store deps)

---

## [2026-03-21] — API Monitoring, Centralized Logging & Error Tracking [WS-D 3.D1-3.D3]

### Added — API Monitoring Setup (3.D1)
- `inspire-genius-backend/prism_inspire/middleware/health.py` — Health check endpoints: `/health` (liveness), `/health/ready` (readiness with DB check), `/health/live` (k8s probe)
- `infrastructure/cloudformation/monitoring-stack.yml` — CloudWatch dashboard with request rate, error rate, latency P50/P95/P99 panels; SNS alerting (email); uptime alarm (1-min threshold), error spike alarm (>10 5xx/5min), high latency alarm (P95 > 2s)

### Added — Centralized Logging Infrastructure (3.D2)
- `inspire-genius-backend/prism_inspire/core/log_config.py` — Rewritten with `StructuredJsonFormatter` for CloudWatch-compatible JSON, `ContextVar`-based correlation IDs, human-readable format for dev
- `inspire-genius-backend/prism_inspire/middleware/observability.py` — Request logging middleware: generates/propagates `X-Correlation-ID`, logs method/path/status/duration/IP for every request
- CloudFormation log groups: 30-day (app/access), 90-day (error), 365-day (audit) retention
- Metric filters extract API5xxErrors, API4xxErrors, APIRequestCount, APILatencyMs from structured logs

### Added — Error Tracking Setup (3.D3)
- `inspire-genius-frontend/src/lib/sentry.ts` — Sentry init with DSN from env, 20% trace sampling, error replay, PII filtering
- `inspire-genius-frontend/src/components/ErrorBoundary.tsx` — Sentry ErrorBoundary with branded fallback UI (Try Again / Go Home)
- `inspire-genius-frontend/src/App.tsx` — Wrapped app in `<ErrorBoundary>`
- `inspire-genius-frontend/src/main.tsx` — `initSentry()` called before render
- `inspire-genius-backend/prism_inspire/main.py` — `sentry_sdk.init()` with 20% trace sampling, env-based DSN
- Frontend CI: Sentry source map upload via `sentry-cli` in deploy stage
- `vite.config.ts` — CSP connect-src updated to allow Sentry ingest domain
- Error budgets defined: < 0.1% API error rate, < 0.5% frontend JS errors

---

## [2026-03-20] — CI/CD Multi-Role Testing & Database Migration Automation [WS-D 2.6-2.7]

### Added — CI/CD Pipeline for Multi-Role Testing (2.6)
- `inspire-genius-frontend/.gitlab-ci.yml` — New `test` and `e2e` stages added to pipeline (build → test → sonar → e2e → deploy)
- `inspire-genius-frontend/e2e/smoke.spec.ts` — Playwright smoke tests: login, sidebar, logout for all 6 roles (user, manager, company-admin, practitioner, distributor, super-admin)
- `inspire-genius-frontend/e2e/helpers.ts` — Shared login helper and per-role credentials
- `inspire-genius-frontend/playwright.config.ts` — Playwright config with Chromium project, CI/local modes
- E2E test matrix: 6 parallel jobs (`e2e:user`, `e2e:manager`, etc.) each running `--grep="@role"` tagged tests
- SonarQube quality gate: `sonar.qualitygate.wait=true` with 300s timeout, `allow_failure: false` (blocks deploy on gate failure)
- Unit test stage produces coverage reports (lcov + cobertura) consumed by SonarQube

### Added — Database Migration Automation (2.7)
- `infrastructure/scripts/migrate.sh` — Migration runner with `--dry-run`, `--rollback [N]`, `--status`, `--check` commands
- `inspire-genius-backend/.gitlab-ci.yml` — Two new stages:
  - `migrate:dry-run` (pre-build) — Validates migration consistency, fails pipeline on schema conflicts
  - `migrate:apply` (post-build, pre-deploy) — Auto-applies pending Alembic migrations, saves rollback target
- Rollback target artifact persisted for 7 days per deployment

---

## [2026-03-19] — Test Stabilization: 11 Failing Suites Fixed [WS-A]

### Added
- `inspire-genius-frontend/jest.vite-env-transform.ts` — Custom ts-jest AST transformer that rewrites `import.meta.env.X` → `process.env.X` at compile time, fixing CJS/ESM incompatibility in Jest
- `inspire-genius-frontend/tsconfig.test.json` — Dedicated TypeScript config for Jest, extending tsconfig.app.json with test-friendly settings (esModuleInterop, relaxed strictness)

### Fixed
- `jest.config.ts` — Removed deprecated `globals.ts-jest` config, added AST transformer + diagnostic suppression for import.meta errors
- `src/services/agent/__tests__/agentService.test.ts` — Timezone-sensitive dates: `new Date("2024-01-01")` (UTC midnight) → `new Date(2024, 0, 1)` (local midnight)
- `src/pages/super-admin/__tests__/Dashboard.test.tsx` — Same UTC→local date fix in Calendar mock
- `src/pages/super-admin/LicenceDetailsPage.tsx` — `formatDate()` now appends `T00:00:00` to date-only strings to force local-time parsing instead of UTC
- `src/pages/super-admin/__tests__/LicenceDetailsPage.test.tsx` — Passes after source fix
- `src/pages/auth/__tests__/Login.test.tsx` — Added mock for `useRequestMagicLink`, `lucide-react`; updated tests for new magic-link-first login flow
- `src/pages/super-admin/__tests__/UserManagement.test.tsx` — Added mocks for `useRoles`, `useInactiveUserCount`, `usePurgeInactiveUsers`; wrapped renders in `QueryClientProvider`; updated assertions for new badge labels and action menu behavior
- `src/components/super-admin/__tests__/ManagementHeader.test.tsx` — Updated CSS selectors from `gap-6` to `gap-3` + `items-center` to match source

### Result
- **Before:** 114/125 suites pass, 1129/1137 tests pass
- **After:** 125/125 suites pass, 1226/1226 tests pass (+89 newly runnable tests)

---

## [2026-03-19] — Default Route Redirect for S3 Preview

### Changed
- `inspire-genius-frontend/src/routes.tsx` — Changed default route redirects from `/login` to `/preview-home` so the S3-hosted preview site shows the dashboard instead of the login page

---

## [2026-03-19] — PWA Manifest & Secrets Manager Migration [WS-D 1.6-1.7]

### Added — PWA Support (1.6)
- `inspire-genius-frontend/public/manifest.json` — PWA manifest with app name, theme color (#002060), and full icon set
- `inspire-genius-frontend/public/icons/` — PWA icon set (72–512px) generated from Logo-Dark.png
- `inspire-genius-frontend/public/offline.html` — Offline fallback page with branded UI and retry button
- `vite-plugin-pwa` configured in `vite.config.ts` — auto-updating service worker with Workbox, precaches app shell, caches Google Fonts
- `index.html` — Added manifest link, apple-touch-icon, theme-color meta, and apple-mobile-web-app tags
- Title corrected from "Inspires Genius" to "Inspire Genius"

### Added — Secrets Manager Migration (1.7)
- `inspire-genius-backend/prism_inspire/core/secrets.py` — Async/sync secrets utility with AWS Secrets Manager integration, in-memory TTL cache, and .env fallback for development
- `infrastructure/scripts/secrets-setup.sh` — Setup script to create secrets in AWS Secrets Manager (interactive or --from-env import), creates IAM read policy
- `docs/secrets-inventory.md` — Complete inventory of all secrets, their Secrets Manager names, which service uses them, and setup instructions
- `.gitlab-ci.yml` — Updated build stage to fetch VITE_STORAGE_SECRET from Secrets Manager (falls back to CI variable)

### Audit Findings
- Backblaze B2 credentials hardcoded as defaults in `prism_inspire/core/config.py` — flagged for remediation
- `VITE_STORAGE_SECRET` committed in frontend `.env` — should be CI-only

---

## [2026-03-15] — Fix Magic Link Authentication Flow — Dual Auth Mode Support

### Fixed
- Updated IG backend `auth.py` to accept both Cognito RS256 tokens and Magic Auth HS256 tokens (no `kid` header)
- Aligned Magic Auth Lambda `JWT_SECRET` with IG backend `SECRET_KEY`
- Backend now serves magic link authenticated users without requiring Cognito user attributes

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
