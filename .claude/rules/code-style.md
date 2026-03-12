# Code Style Rules — Inspire Genius Frontend

## TypeScript
- Strict TypeScript; avoid `any` — use proper types from `src/types/`
- Use `type` for object shapes, `interface` only when extending is needed
- Prefer named exports for pages/components, default exports for page-level components

## React
- Functional components only (no class components)
- Use React Hook Form + Zod for all forms
- Use TanStack React Query for all server state (no useState for API data)
- Context only for truly global state (auth, tour, sidebar) — not for feature state

## Styling
- Tailwind CSS utility classes only — no CSS modules or styled-components
- Use `cn()` from `@/lib/utils` for conditional class merging
- shadcn/ui components from `@/components/ui/` — add new ones via `npx shadcn@latest add`
- Icons from `lucide-react` exclusively

## File Organization
- Pages in `src/pages/{auth,onboarding,user,super-admin,legal}/`
- Colocate tests in `__tests__/` next to source files
- Services in `src/services/` organized by domain
- Hooks in `src/hooks/` organized by domain
- Types in `src/types/` organized by domain
- Path alias `@/` maps to `src/`
