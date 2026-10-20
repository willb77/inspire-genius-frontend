/**
 * @jest-environment node
 *
 * The pages a palette theme applies to must not carry the old fixed colours.
 *
 * THEMED_PATHS says "this page has been moved onto the --ig-* tokens", and the
 * applier trusts it. A fixed brand colour added back to one of these files
 * would not change under a theme: on Dark it would be navy text on a near-black
 * card, readable by nobody and reported by nothing. This guard pins the
 * converted files to the tokens.
 *
 * When a page is converted, add its files here AND its route to THEMED_PATHS.
 */
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "..");

const CONVERTED = [
  "pages/user/HomeV2.tsx",
  "components/dashboard/v2/WelcomeBackTile.tsx",
  "components/dashboard/v2/PrismDataMenu.tsx",
  "components/dashboard/v2/ProfileDocViewerDialog.tsx",
  "components/dashboard/v2/BehavioralMapDialog.tsx",
  "components/dashboard/v2/AddPersonalDocModal.tsx",
  "components/shared/layout/SidebarScaffold.tsx",
  "components/shared/UserTopHeader.tsx",
];

/** A colour utility with a literal colour in it: `text-[#0B1B33]`, `border-[rgba(…)]`, `bg-white`. */
const FIXED = /\b(?:bg|text|border|ring|fill|stroke)-(?:\[(?:#[0-9a-fA-F]{3,8}|rgba?\()|white\b|black\b|(?:gray|slate|zinc|neutral|stone)-\d{2,3}\b)/g;

/** Fixed colours that are deliberately not themed. */
const ALLOWED = new Set([
  "bg-black", // the video player letterbox in WelcomeBackTile
]);

describe("converted pages use theme tokens, not fixed colours", () => {
  it.each(CONVERTED)("%s", (rel) => {
    const code = fs.readFileSync(path.join(SRC, rel), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    const found = (code.match(FIXED) ?? []).filter((m) => !ALLOWED.has(m));
    expect(found).toEqual([]);
  });
});
