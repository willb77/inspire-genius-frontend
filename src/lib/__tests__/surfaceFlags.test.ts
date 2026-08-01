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

// Home is the one surface that defaults ON (2026-08-01). It shares the flag key
// with the Wave-1 surfaces, so these tests pin BOTH halves of the contract:
// an absent value diverges, an explicit value does not.
describe("isNewHomeEnabled", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to ON when nothing is set — HomeV2 is the default home page", () => {
    expect(isNewHomeEnabled()).toBe(true);
  });

  it("diverges from the Wave-1 surfaces only when the flag is absent", () => {
    expect(isNewHomeEnabled()).toBe(true);
    expect(isNewUserSurfacesEnabled()).toBe(false);
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
