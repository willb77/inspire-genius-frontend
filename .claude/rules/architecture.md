# Architecture Rules — Inspire Genius Frontend

## Data Flow
- Pattern: Service → Hook → Component
- Services (`src/services/`): Raw axios calls, return promises
- Hooks (`src/hooks/`): Wrap services in React Query mutations/queries
- Components: Consume hooks, never call services directly

## API Layer
- All HTTP goes through the singleton axios instance in `src/lib/axios.ts`
- Token injection and 401 refresh are handled by interceptors — do not manually add auth headers
- API responses follow `BaseApiResponse<T>` envelope from `src/types/api.ts`

## Auth
- `AuthContext` manages the full auth lifecycle
- Use `useAuth()` hook to access auth state and actions
- `hasRole(role)` and `isAtLeast(role)` helpers for role-based checks
- Role-based access enforced by `ProtectedRoute` component
- Six roles: `user`, `manager`, `company-admin`, `practitioner`, `distributor`, `super-admin`
- Sensitive data stored via encrypted storage (`src/lib/secureStorage.ts`)

## Routing
- All routes defined in `src/routes.tsx` using React Router v6 `useRoutes`
- Route constants in `src/constants/routes.ts` — always use `ROUTES.*` constants
- Role-specific route groups: `/manager/*`, `/company-admin/*`, `/practitioner/*`, `/distributor/*`, `/super-admin/*`
- User pages use `/home`, `/dashboard`, `/coaches`, `/documents`, etc.

## Layouts
- `AppShell` — unified 3-column layout (sidebar | main | right panel) used by ALL roles
- Sidebar shows nav sections based on logged-in user's role
- Role-specific layouts (`ManagerLayout`, `CompanyAdminLayout`, `PractitionerLayout`, `DistributorLayout`, `SuperAdminLayout`, `UserLayout`) are thin wrappers around `AppShell`
- Nav items defined per role in `src/constants/navigation.ts` (`NAV_ITEMS_BY_ROLE`)
