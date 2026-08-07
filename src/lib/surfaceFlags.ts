/**
 * Surface feature flags — the new user surfaces are now the DEFAULT.
 *
 * History: these surfaces (HomeV2, Meridian V2, and the Wave-1 swaps —
 * Dashboard, Coaches, Help, Documents, PRISM Assessment, Analytics,
 * Feedback History) shipped opt-in behind `new_user_surfaces`, OFF by default,
 * so the originals stayed primary and could be restored without a redeploy.
 *
 * 2026-08-06: the toggle was removed and the default flipped ON, on request.
 * This is not the behaviour change it looks like — `ci-deploy.yml` has been
 * writing `VITE_NEW_USER_SURFACES=true` for some time, so `envDefault()` was
 * ALREADY `true` on dev and staging-b (verified in the shipped bundle: the
 * function compiles to `return !0`). What actually changes:
 *
 *   - local `npm run dev` and any environment without the env var now get the
 *     new surfaces too, instead of silently diverging from the deployed app;
 *   - a user who had explicitly switched to Classic via the on-page toggle is
 *     moved back to the new surfaces, because that toggle no longer exists;
 *   - "new is the default" lives in the code rather than in a workflow file,
 *     where it could be lost by editing CI.
 *
 * Precedence: explicit localStorage value > ON.
 *
 * `/<path>/classic` routes remain the permanent escape hatch — /home/classic,
 * /dashboard/classic and the rest still render the original pages regardless of
 * this flag. Removing the toggle removed the *switch*, not the destination.
 *
 * Named `isNewUserSurfacesEnabled` (not `use*`) because it is a plain predicate,
 * not a React hook — it can be called anywhere, including inside route resolvers.
 */

const FLAG_KEY = "new_user_surfaces";

/**
 * True when the new user surfaces should render. **Default: ON.**
 *
 * A stored `"false"` is still honoured: the key can be set from the console, and
 * silently ignoring it would leave no way back short of a redeploy now that the
 * toggle is gone.
 */
export function isNewUserSurfacesEnabled(): boolean {
  try {
    const val = localStorage.getItem(FLAG_KEY);
    if (val === null) return true;
    return val === "true";
  } catch {
    // Private mode / sandboxed storage — fall back to the default rather than
    // to the classic pages, which no user can now reach a toggle to escape.
    return true;
  }
}

/**
 * `/home` specifically. Kept as its own export purely so existing callers and
 * tests do not have to change; it is now identical to
 * {@link isNewUserSurfacesEnabled}, since both default ON.
 *
 * @deprecated Prefer {@link isNewUserSurfacesEnabled}. This alias exists to keep
 * the 2026-08-01 "HomeV2 is default" decision greppable.
 */
export function isNewHomeEnabled(): boolean {
  return isNewUserSurfacesEnabled();
}

/** Explicitly set the flag (persists to localStorage). Caller reloads to apply. */
export function setNewUserSurfaces(enabled: boolean): void {
  try {
    localStorage.setItem(FLAG_KEY, enabled ? "true" : "false");
  } catch {
    /* ignore — private-mode / sandboxed storage */
  }
}

/** Clear the override so the default (ON) applies again. Caller reloads to apply. */
export function clearNewUserSurfaces(): void {
  try {
    localStorage.removeItem(FLAG_KEY);
  } catch {
    /* ignore */
  }
}
