import {
  isNewUserSurfacesEnabled,
  setNewUserSurfaces,
  clearNewUserSurfaces,
} from "@/lib/surfaceFlags";

describe("surfaceFlags", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to OFF when no flag and no env override is set", () => {
    expect(isNewUserSurfacesEnabled()).toBe(false);
  });

  it("returns true when explicitly enabled", () => {
    setNewUserSurfaces(true);
    expect(isNewUserSurfacesEnabled()).toBe(true);
  });

  it("returns false when explicitly disabled, overriding any default", () => {
    setNewUserSurfaces(false);
    expect(isNewUserSurfacesEnabled()).toBe(false);
  });

  it("clears the override so the default (OFF) applies again", () => {
    setNewUserSurfaces(true);
    expect(isNewUserSurfacesEnabled()).toBe(true);
    clearNewUserSurfaces();
    expect(isNewUserSurfacesEnabled()).toBe(false);
  });
});
