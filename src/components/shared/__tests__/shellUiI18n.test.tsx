/**
 * @jest-environment jsdom
 *
 * I18N wave E, package E1: the app shell (layouts, layout, shared, dashboard,
 * loading) is extracted into the English-only `shellUi` namespace.
 *
 * jest.setup.ts mocks react-i18next for every other suite (it resolves from the
 * English file and IGNORES defaultValue). This one uses the REAL library to ask
 * the question the mock cannot: does the real instance paint the same English,
 * with and without the namespace loaded, and is every key the code asks for
 * actually in the file?
 */
import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import ErrorState from "../ErrorState";
import EmptyState from "../EmptyState";
import DestructiveConfirmModal from "../forms/DestructiveConfirmModal";
import CostDashboard from "@/components/dashboard/CostDashboard";

jest.mock("react-i18next", () => jest.requireActual("react-i18next"));
jest.mock("recharts", () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return new Proxy({}, { get: () => Stub });
});

const ROOT = path.resolve(__dirname, "../../../..");
const SRC = path.join(ROOT, "src");
const EN = JSON.parse(fs.readFileSync(path.join(ROOT, "public/locales/en/shellUi.json"), "utf8")) as Record<string, unknown>;

function flat(o: Record<string, unknown>, p = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v && typeof v === "object") Object.assign(out, flat(v as Record<string, unknown>, `${p}${k}.`));
    else out[`${p}${k}`] = String(v);
  }
  return out;
}
const FLAT = flat(EN);

async function makeInstance(withResources: boolean, lng = "en", extra?: Record<string, unknown>): Promise<I18n> {
  const inst = i18next.createInstance();
  await inst.use(initReactI18next).init({
    lng,
    fallbackLng: "en",
    ns: ["shellUi"],
    defaultNS: "common",
    resources: withResources ? { en: { shellUi: EN }, ...(extra ? { [lng]: { shellUi: extra } } : {}) } : { en: {} },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return inst;
}

const wrap = (inst: I18n, ui: React.ReactElement) => render(<I18nextProvider i18n={inst}>{ui}</I18nextProvider>);

describe("shellUi registration", () => {
  it("is in the ns array of src/lib/i18n.ts", () => {
    const src = fs.readFileSync(path.join(SRC, "lib/i18n.ts"), "utf8");
    const m = src.match(/\bns:\s*\[([^\]]*)\]/);
    expect(m).not.toBeNull();
    expect([...(m as RegExpMatchArray)[1].matchAll(/['"]([\w]+)['"]/g)].map((x) => x[1])).toContain("shellUi");
  });

  it("has its pending-translation debt file, and is translated in es, fr, it and pt only (pl and cs still owed)", () => {
    const pending = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/i18n/pending/shellUi.json"), "utf8"));
    expect(pending).toMatchObject({ namespace: "shellUi", wave: "E" });
    const others = fs
      .readdirSync(path.join(ROOT, "public/locales"))
      .filter((l) => l !== "en" && fs.existsSync(path.join(ROOT, "public/locales", l, "shellUi.json")));
    expect(others.sort()).toEqual(["es", "fr", "it", "pt"]);
  });
});

describe("every key the shell asks for is in the English file", () => {
  const DIRS = ["layouts", "components/layout", "components/shared", "components/dashboard", "components/loading-inspires-genius"];
  function files(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) return d.name === "__tests__" ? [] : files(p);
      return /\.(tsx?)$/.test(d.name) ? [p] : [];
    });
  }
  const used: Array<{ file: string; key: string }> = [];
  for (const d of DIRS) {
    for (const f of files(path.join(SRC, d))) {
      const text = fs.readFileSync(f, "utf8");
      if (!/useTranslation\(\s*"shellUi"\s*\)/.test(text)) continue;
      for (const m of text.matchAll(/\bt[r]?\(\s*"([A-Za-z0-9_.]+)"\s*,\s*\{\s*defaultValue/g)) {
        used.push({ file: path.relative(SRC, f), key: m[1] });
      }
    }
  }

  it("finds a real number of call sites (a control: an empty scan would pass)", () => {
    expect(used.length).toBeGreaterThan(250);
  });

  it("each literal key resolves in public/locales/en/shellUi.json", () => {
    const missing = used.filter((u) => !(u.key in FLAT)).map((u) => `${u.file}: ${u.key}`);
    expect(missing).toEqual([]);
  });

  it("the keys built at run time (row, status, mode and trait names) all exist", () => {
    for (const k of ["summary", "current_role", "industry", "years_experience", "primary_goals", "primary_constraints"]) {
      expect(FLAT).toHaveProperty([`personalData.rows.${k}.label`]);
      expect(FLAT).toHaveProperty([`personalData.rows.${k}.placeholder`]);
    }
    for (const k of ["pending", "invitation_sent", "accepted", "expired", "cancelled"]) expect(FLAT).toHaveProperty([`userForm.invitationStatus.${k}`]);
    for (const k of ["day", "month", "range"]) expect(FLAT).toHaveProperty([`quickActions.mode.${k}`]);
    for (const k of ["O", "C", "E", "A", "N"]) expect(FLAT).toHaveProperty([`assessments.bigFive.${k}`]);
  });
});

describe("the shell under the real i18n instance", () => {
  it("English: ErrorState and EmptyState default words are unchanged", async () => {
    const inst = await makeInstance(true);
    wrap(inst, <ErrorState onRetry={() => undefined} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("We couldn't load this content. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
    wrap(inst, <EmptyState />);
    expect(screen.getByText("No data yet")).toBeInTheDocument();
    expect(screen.getByText("There's nothing to show here right now.")).toBeInTheDocument();
  });

  it("English before the namespace has loaded: the default value paints, never a raw key", async () => {
    const inst = await makeInstance(false);
    wrap(inst, <ErrorState onRetry={() => undefined} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/errorState\./);
  });

  it("a translation, when present, replaces the English; a caller-supplied title still wins", async () => {
    const inst = await makeInstance(true, "es", { errorState: { title: "Algo salió mal" } });
    wrap(inst, <ErrorState />);
    expect(screen.getByText("Algo salió mal")).toBeInTheDocument();
    wrap(inst, <ErrorState title="Custom title" />);
    expect(screen.getByText("Custom title")).toBeInTheDocument();
  });

  it("English: the typed-confirmation label reads 'To confirm, type [the hint]: PHRASE' with and without a hint", async () => {
    const inst = await makeInstance(true);
    const props = { open: true, onOpenChange: () => undefined, title: "Delete", description: "Body", confirmPhrase: "PHRASE", onConfirm: () => undefined };
    const { unmount } = wrap(inst, <DestructiveConfirmModal {...props} confirmHint="user's email" />);
    expect(screen.getByText(/To confirm, type/).textContent).toBe("To confirm, type the user's email: PHRASE");
    unmount();
    wrap(inst, <DestructiveConfirmModal {...props} />);
    expect(screen.getByText(/To confirm, type/).textContent).toBe("To confirm, type: PHRASE");
  });

  it("English: the cost dashboard heading is '<Level> Cost Overview' for every level", async () => {
    const inst = await makeInstance(true);
    for (const [level, title] of [
      ["platform", "Platform Cost Overview"],
      ["company", "Company Cost Overview"],
      ["team", "Team Cost Overview"],
      ["user", "User Cost Overview"],
    ] as const) {
      const { unmount } = wrap(inst, <CostDashboard level={level} kpis={[]} />);
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      unmount();
    }
  });
});
