import * as fs from "fs"
import * as path from "path"
import i18next from "i18next"
import { pseudolocalize, installPseudoLocale, PSEUDO_LNG } from "../i18nPseudo"

describe("pseudolocalize", () => {
  it("brackets, accents and pads about 40 percent", () => {
    const out = pseudolocalize("Settings")
    expect(out.startsWith("[!! ")).toBe(true)
    expect(out.endsWith(" !!]")).toBe(true)
    expect(out).toContain("Ŝéťťíñģš")
    const tildes = (out.match(/~/g) ?? []).length
    expect(tildes).toBe(Math.ceil(8 * 0.4))
  })

  it("preserves {{placeholders}} and HTML tags byte-for-byte", () => {
    const out = pseudolocalize("Hello {{name}}, you have {{ count }} <b>new</b> items")
    expect(out).toContain("{{name}}")
    expect(out).toContain("{{ count }}")
    expect(out).toContain("<b>")
    expect(out).toContain("</b>")
    expect(out).not.toContain("Hello")
  })
})

describe("en-XA wiring", () => {
  it("is applied to translations through a real i18next instance and leaves other languages alone", async () => {
    const inst = i18next.createInstance()
    await inst.init({
      lng: "en",
      fallbackLng: "en",
      supportedLngs: ["en", "es"],
      ns: ["common"],
      defaultNS: "common",
      resources: {
        en: { common: { greet: "Hello {{name}}" } },
        es: { common: { greet: "Hola {{name}}" } },
      },
      interpolation: { escapeValue: false },
    })
    installPseudoLocale(inst, ["common"])
    expect(inst.t("greet", { name: "Ann" })).toBe("Hello Ann")
    await inst.changeLanguage(PSEUDO_LNG)
    expect(inst.language).toBe(PSEUDO_LNG)
    const out = inst.t("greet", { name: "Ann" })
    expect(out.startsWith("[!! ")).toBe(true)
    expect(out).not.toContain("Hello")
    await inst.changeLanguage("es")
    expect(inst.t("greet", { name: "Ann" })).toBe("Hola Ann")
  })

  it("is not listed in production supportedLngs or the LanguageSwitcher", () => {
    const src = (p: string) => fs.readFileSync(path.resolve(__dirname, "../..", p), "utf8")
    const i18nSrc = src("lib/i18n.ts")
    const supported = /supportedLngs:\s*\[([^\]]*)\]/.exec(i18nSrc)?.[1] ?? ""
    expect(supported).not.toMatch(/en-XA/)
    expect(supported.length).toBeGreaterThan(0)
    expect(src("components/LanguageSwitcher.tsx")).not.toMatch(/en-XA/)
    // The only reference in i18n.ts sits behind the DEV guard.
    expect(i18nSrc).toMatch(/if \(import\.meta\.env\.DEV\) \{[\s\S]*i18nPseudo/)
  })
})
