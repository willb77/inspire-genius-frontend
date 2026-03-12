# Workflow Rules — Inspire Genius Frontend

## Development
- Dev server: `npm run dev` from `inspire-genius-frontend/`
- Build: `npm run build` (runs tsc then vite build)
- Lint: `npm run lint`
- Tests: `npm run test` (watch mode), `npm run test:ci` (single run)

## Deployment
- CI/CD via GitLab CI (`.gitlab-ci.yml`)
- Deploys only from `development` branch
- Pipeline: build → SonarQube scan → deploy to AWS S3 + CloudFront invalidation
- Environment variables injected at build time via CI variables

## Adding a New Super Admin Page
1. Create page component in `src/pages/super-admin/`
2. Wrap with `<SuperAdminLayout>`
3. Add route constant to `ROUTES.SUPER_ADMIN` in `src/constants/routes.ts`
4. Add route entry in `src/routes.tsx`
5. Add nav item to `NAV_ITEMS` in `src/layouts/SuperAdminLayout.tsx`

## Adding a New User Page
1. Create page component in `src/pages/user/`
2. Wrap with `<UserLayout>`
3. Add route constant to `ROUTES` in `src/constants/routes.ts`
4. Add route entry in `src/routes.tsx`
5. Add nav item in `src/layouts/UserLayout.tsx`

## Documentation Updates
- Update `change_log.md` when making notable changes
- Update `database_schema.md` when data models change
- Update `CLAUDE.md` when architecture or commands change
- Keep `.claude/rules/` files current with convention changes
