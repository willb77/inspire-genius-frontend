import {
  isNewHomeEnabled,
  isNewUserSurfacesEnabled,
  setNewUserSurfaces,
  clearNewUserSurfaces,
} from "@/lib/surfaceFlags";

describe("surfaceFlags", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Default flipped ON 2026-08-06 with the removal of the Classic/New toggle.
  // Deployed environments were already ON via VITE_NEW_USER_SURFACES; this makes
  // the code agree with them instead of relying on CI to set it.
  it("defaults to ON when no flag is stored", () => {
    expect(isNewUserSurfacesEnabled()).toBe(true);
  });

  it("returns true when explicitly enabled", () => {
    setNewUserSurfaces(true);
    expect(isNewUserSurfacesEnabled()).toBe(true);
  });

  it("returns false when explicitly disabled, overriding any default", () => {
    setNewUserSurfaces(false);
    expect(isNewUserSurfacesEnabled()).toBe(false);
  });

  it("clears the override so the default (ON) applies again", () => {
    setNewUserSurfaces(false);
    expect(isNewUserSurfacesEnabled()).toBe(false);
    clearNewUserSurfaces();
    expect(isNewUserSurfacesEnabled()).toBe(true);
  });
});

// isNewHomeEnabled no longer diverges from isNewUserSurfacesEnabled: both
// default ON as of 2026-08-06, and the former is now an alias kept so the
// 2026-08-01 "HomeV2 is default" decision stays greppable. These pin that they
// agree in every case — a future edit that makes only one of them default OFF
// would resurrect a split nobody wants.
describe("isNewHomeEnabled", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to ON when nothing is set — HomeV2 is the default home page", () => {
    expect(isNewHomeEnabled()).toBe(true);
  });

  it("agrees with the Wave-1 surfaces when the flag is absent", () => {
    expect(isNewHomeEnabled()).toBe(true);
    expect(isNewUserSurfacesEnabled()).toBe(true);
  });

  it("honours an explicit opt-out — the on-page toggle must still work", () => {
    setNewUserSurfaces(false);
    expect(isNewHomeEnabled()).toBe(false);
  });

  it("honours an explicit opt-in", () => {
    setNewUserSurfaces(true);
    expect(isNewHomeEnabled()).toBe(true);
  });

  it("returns to the ON default once the override is cleared", () => {
    setNewUserSurfaces(false);
    expect(isNewHomeEnabled()).toBe(false);
    clearNewUserSurfaces();
    expect(isNewHomeEnabled()).toBe(true);
  });
});
