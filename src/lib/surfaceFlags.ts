/**
 * Surface feature flags — additive, non-destructive UI swaps.
 *
 * Mirrors the localStorage toggle pattern used by `agentApi` (agent_engine_enabled)
 * and `axios` (monolith_enabled). The new user surfaces (the HomeV2 dashboard, and
 * the forthcoming Meridian V2 coaching page) render ONLY when this flag is ON, so
 * the original pages remain the default and can be restored instantly by clearing
 * the flag — no redeploy.
 *
 * Precedence: explicit localStorage value > build-time env default > OFF.
 *
 *   Enable:   localStorage.setItem('new_user_surfaces', 'true');  window.location.reload()
 *   Disable:  localStorage.removeItem('new_user_surfaces');       window.location.reload()
 *
 * A parallel `/home/classic` route always renders the original Home regardless of
 * this flag, as a permanent escape hatch.
 *
 * Named `isNewUserSurfacesEnabled` (not `use*`) because it is a plain predicate,
 * not a React hook — it can be called anywhere, including inside route resolvers.
 */

const FLAG_KEY = "new_user_surfaces";

function envDefault(): boolean {
  try {
    return import.meta.env.VITE_NEW_USER_SURFACES === "true";
  } catch {
    return false;
  }
}

/** True when the new user surfaces (HomeV2, Meridian V2) should render. Default: OFF. */
export function isNewUserSurfacesEnabled(): boolean {
  try {
    const val = localStorage.getItem(FLAG_KEY);
    if (val === null) return envDefault();
    return val === "true";
  } catch {
    return envDefault();
  }
}

/** Explicitly set the flag (persists to localStorage). Caller reloads to apply. */
export function setNewUserSurfaces(enabled: boolean): void {
  try {
    localStorage.setItem(FLAG_KEY, enabled ? "true" : "false");
  } catch {
    /* ignore — private-mode / sandboxed storage */
  }
}

/** Clear the override so the env default (OFF) applies again. Caller reloads to apply. */
export function clearNewUserSurfaces(): void {
  try {
    localStorage.removeItem(FLAG_KEY);
  } catch {
    /* ignore */
  }
}
