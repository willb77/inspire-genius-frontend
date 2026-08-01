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

/**
 * True when `/home` should render HomeV2. **Default: ON** (2026-08-01) — HomeV2
 * is the default My Workspace home page.
 *
 * Deliberately separate from `isNewUserSurfacesEnabled`. The two read the SAME
 * localStorage key, so an explicit user choice (the on-page toggle, or a manual
 * override) still governs both — they differ only in what an *absent* value
 * means.
 *
 * Why not just default `new_user_surfaces` ON? Because it ALSO gates Dashboard,
 * Coaches, Help, Documents, Profile, Analytics, Feedback-History,
 * PRISM-Assessment and Settings-Privacy — nine surfaces nobody asked to move.
 *
 * **Scope of this function, stated precisely:** `ci-deploy.yml` already writes
 * `VITE_NEW_USER_SURFACES=true`, so on dev and staging-b `envDefault()` is
 * already `true` and Home was already V2 there — this function changes NOTHING
 * on those two hosts. What it changes is everywhere the env var is absent
 * (local `npm run dev`, and any future environment that doesn't set it): Home
 * is V2 there too, while the other nine stay opt-in. In other words it moves
 * "HomeV2 is the default" out of CI configuration and into the code, where it
 * can't be lost by editing a workflow file.
 *
 * `/home/classic` remains the permanent escape hatch regardless of this value.
 */
export function isNewHomeEnabled(): boolean {
  try {
    const val = localStorage.getItem(FLAG_KEY);
    if (val === null) return true;
    return val === "true";
  } catch {
    return true;
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
