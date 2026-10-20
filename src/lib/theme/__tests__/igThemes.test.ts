import {
  applyIgTheme,
  clearIgTheme,
  IG_TILES,
  isIgThemeId,
  isIgTile,
  isThemedPath,
  themesAllowed,
  tileTokens,
} from "../igThemes";

describe("themesAllowed — the Phase A allowlist", () => {
  it("lets a super-admin in", () => {
    expect(themesAllowed("super-admin", null)).toBe(true);
  });
  it("lets a device that opted into the preview in", () => {
    expect(themesAllowed("user", "true")).toBe(true);
  });
  it.each([
    ["user", null],
    ["manager", "false"],
    ["practitioner", "1"],
    ["company-admin", "TRUE"],
    [undefined, null],
    ["", "yes"],
  ])("keeps %s (preview=%s) out", (role, flag) => {
    expect(themesAllowed(role, flag)).toBe(false);
  });
});

describe("isThemedPath", () => {
  it.each(["/home", "/home/"])("treats %s as converted", (p) => expect(isThemedPath(p)).toBe(true));
  it.each(["/", "/home/classic", "/dashboard", "/manager/home", "/homework"])("leaves %s light", (p) =>
    expect(isThemedPath(p)).toBe(false),
  );
});

describe("stored values are matched against fixed lists", () => {
  it("accepts known themes only", () => {
    expect(isIgThemeId("dark")).toBe(true);
    expect(isIgThemeId("evil")).toBe(false);
    expect(isIgThemeId(null)).toBe(false);
  });
  it("accepts listed tiles only, never an arbitrary colour or CSS", () => {
    expect(isIgTile("#FFFFFF")).toBe(true);
    expect(isIgTile("")).toBe(true);
    expect(isIgTile("#ABCDEF")).toBe(false);
    expect(isIgTile("red; background: url(x)")).toBe(false);
  });
});

describe("tileTokens", () => {
  it("puts dark text on a light tile", () => {
    expect(tileTokens("#FEF3C7").ink).toBe("#0B1B33");
  });
  it("puts light text on a dark tile", () => {
    expect(tileTokens("#111111").ink).toBe("#F9FAFB");
    expect(tileTokens("#1F2937").ink).toBe("#F9FAFB");
  });
  it("covers every listed tile", () => {
    for (const t of IG_TILES.filter((x) => x.id)) expect(tileTokens(t.id).bg).toBe(t.id);
  });
});

describe("applyIgTheme", () => {
  let root: HTMLElement;
  beforeEach(() => {
    root = document.createElement("html");
  });

  it("does nothing for a user outside the allowlist", () => {
    applyIgTheme(root, { allowed: false, pathname: "/home", theme: "dark", tile: "#111111" });
    expect(root.dataset.igTheme).toBeUndefined();
    expect(root.dataset.igOverlay).toBeUndefined();
    expect(root.dataset.igTile).toBeUndefined();
  });

  it("applies a palette theme on a converted page", () => {
    applyIgTheme(root, { allowed: true, pathname: "/home", theme: "dark", tile: "" });
    expect(root.dataset.igTheme).toBe("dark");
  });

  it("keeps an unconverted page light", () => {
    applyIgTheme(root, { allowed: true, pathname: "/dashboard", theme: "dark", tile: "#111111" });
    expect(root.dataset.igTheme).toBeUndefined();
    expect(root.dataset.igTile).toBeUndefined();
    expect(root.style.getPropertyValue("--ig-tile-bg")).toBe("");
  });

  it("applies an overlay theme on every page", () => {
    applyIgTheme(root, { allowed: true, pathname: "/dashboard", theme: "gray", tile: "" });
    expect(root.dataset.igOverlay).toBe("gray");
    expect(root.dataset.igTheme).toBeUndefined();
  });

  it("uses today's palette under an overlay on a converted page", () => {
    applyIgTheme(root, { allowed: true, pathname: "/home", theme: "amber", tile: "" });
    expect(root.dataset.igOverlay).toBe("amber");
    expect(root.dataset.igTheme).toBe("classic");
  });

  it("writes the tile tokens on a converted page", () => {
    applyIgTheme(root, { allowed: true, pathname: "/home", theme: "classic", tile: "#FEF3C7" });
    expect(root.dataset.igTile).toBe("1");
    expect(root.style.getPropertyValue("--ig-tile-bg")).toBe("#FEF3C7");
    expect(root.style.getPropertyValue("--ig-tile-ink")).toBe("#0B1B33");
  });

  it("refuses an unlisted tile", () => {
    applyIgTheme(root, { allowed: true, pathname: "/home", theme: "classic", tile: "#123456" });
    expect(root.dataset.igTile).toBeUndefined();
    expect(root.style.getPropertyValue("--ig-tile-bg")).toBe("");
  });

  it("clears the previous theme when the user leaves the allowlist", () => {
    applyIgTheme(root, { allowed: true, pathname: "/home", theme: "dark", tile: "#111111" });
    applyIgTheme(root, { allowed: false, pathname: "/home", theme: "dark", tile: "#111111" });
    expect(root.dataset.igTheme).toBeUndefined();
    expect(root.style.getPropertyValue("--ig-tile-bg")).toBe("");
  });

  it("clearIgTheme removes everything it set", () => {
    applyIgTheme(root, { allowed: true, pathname: "/home", theme: "amber", tile: "#111111" });
    clearIgTheme(root);
    expect(root.dataset.igTheme).toBeUndefined();
    expect(root.dataset.igOverlay).toBeUndefined();
    expect(root.dataset.igTile).toBeUndefined();
    expect(root.getAttribute("style") ?? "").toBe("");
  });
});
