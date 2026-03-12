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
- Role-based access enforced by `ProtectedRoute` component
- Two roles: `"user"` and `"super-admin"` (from `ROLES` constant)
- Sensitive data stored via encrypted storage (`src/lib/secureStorage.ts`)

## Routing
- All routes defined in `src/routes.tsx` using React Router v6 `useRoutes`
- Route constants in `src/constants/routes.ts` — always use `ROUTES.*` constants
- Super admin pages wrap content in `<SuperAdminLayout>`
- User pages wrap content in `<UserLayout>`

## Layouts
- `SuperAdminLayout` — sidebar with nav items, wraps all `/super-admin/*` pages
- `UserLayout` — sidebar with nav items, wraps all user pages
- Both use `SidebarScaffold` as the underlying layout component
- Nav items defined as `NavItemDef[]` array in each layout file
