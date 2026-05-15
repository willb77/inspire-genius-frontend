# Workflow Rules — Inspire Genius Frontend

## Development
- Dev server: `npm run dev` from `inspire-genius-frontend/`
- Build: `npm run build` (runs tsc then vite build)
- Lint: `npm run lint`
- Tests: `npm run test` (watch mode), `npm run test:ci` (single run)

## Deployment
- CI/CD via GitHub Actions (`.github/workflows/ci-deploy.yml`)
- Deploys only from `development` branch
- Pipeline: build → unit tests → deploy to AWS S3 + CloudFront invalidation
- Environment variables injected at build time via GitHub Secrets

## Adding a New Role-Specific Page
1. Create page component in `src/pages/{role}/` (e.g., `src/pages/manager/`, `src/pages/practitioner/`)
2. Wrap with the role's layout (e.g., `<ManagerLayout>`, `<PractitionerLayout>`) — thin wrapper around `AppShell`
3. Add route constant to `ROUTES.{ROLE}` in `src/constants/routes.ts`
4. Add route entry in `src/routes.tsx`
5. Add nav item to `NAV_ITEMS_BY_ROLE[role]` in `src/constants/navigation.ts`

## The 6 Roles
- `user` — end user / employee
- `manager` — team lead with direct-report visibility
- `company-admin` — organization-level admin
- `practitioner` — PRISM-accredited coach
- `distributor` — regional PRISM credit wholesaler
- `super-admin` — platform owner

## Documentation Updates
- Update `change_log.md` when making notable changes
- Update `database_schema.md` when data models change
- Update `CLAUDE.md` when architecture or commands change
- Keep `.claude/rules/` files current with convention changes
