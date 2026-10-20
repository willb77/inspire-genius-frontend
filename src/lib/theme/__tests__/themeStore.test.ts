import {
  getThemeChoice,
  readThemesPreviewFlag,
  reloadThemeChoice,
  setThemeChoice,
  subscribeThemeChoice,
  THEME_KEY,
  TILE_KEY,
} from "../themeStore";

describe("themeStore", () => {
  beforeEach(() => {
    localStorage.clear();
    reloadThemeChoice();
  });

  it("defaults to today's look", () => {
    expect(getThemeChoice()).toEqual({ theme: "classic", tile: "" });
  });

  it("saves a choice on this device and notifies listeners", () => {
    const listener = jest.fn();
    const off = subscribeThemeChoice(listener);
    setThemeChoice({ theme: "sepia", tile: "#FEF3C7" });
    expect(getThemeChoice()).toEqual({ theme: "sepia", tile: "#FEF3C7" });
    expect(localStorage.getItem(THEME_KEY)).toBe("sepia");
    expect(localStorage.getItem(TILE_KEY)).toBe("#FEF3C7");
    expect(listener).toHaveBeenCalledTimes(1);
    off();
  });

  it("does not notify when nothing changed", () => {
    const listener = jest.fn();
    const off = subscribeThemeChoice(listener);
    setThemeChoice({ theme: "classic" });
    expect(listener).not.toHaveBeenCalled();
    off();
  });

  it("ignores an unknown theme or tile", () => {
    setThemeChoice({ theme: "nope" as never, tile: "#123456" });
    expect(getThemeChoice()).toEqual({ theme: "classic", tile: "" });
  });

  it("falls back to the default when storage was hand-edited", () => {
    localStorage.setItem(THEME_KEY, "<script>");
    localStorage.setItem(TILE_KEY, "url(javascript:x)");
    reloadThemeChoice();
    expect(getThemeChoice()).toEqual({ theme: "classic", tile: "" });
  });

  it("reads the preview flag", () => {
    expect(readThemesPreviewFlag()).toBeNull();
    localStorage.setItem("ig_themes_preview", "true");
    expect(readThemesPreviewFlag()).toBe("true");
  });
});
