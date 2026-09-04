/**
 * @jest-environment jsdom
 *
 * LumenNav — one row: the Lumen tools, then "Back to Inspire Genius".
 *
 * New on 2026-08-06, with the change it covers. The nav had no tests, which is
 * why removing a whole cross-vertical switcher broke nothing — the absence of a
 * failure was the absence of coverage, not evidence the change was safe.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Registry + entitlements. The nav no longer reads either, and these mocks are
// deliberately GENEROUS — entitled to everything — so that if a switcher is
// ever reinstated these tests fail loudly rather than passing because the
// fixture happened to be empty.
jest.mock("@/verticals/core", () => ({
  useEnabledVerticals: () => ({
    data: ["lumen", "job-fit", "grant", "direction-setting", "knowledge-continuity"],
  }),
  listEntitledVerticals: () => [
    { key: "job-fit", title: "Job Fit", homePath: "/vertical/job-fit/matches" },
    { key: "grant", title: "GRANT", homePath: "/vertical/grant/dashboard" },
    { key: "direction-setting", title: "Direction Setting", homePath: "/vertical/direction-setting/journey" },
  ],
}));

import { LumenNav } from "../LumenNav";

function renderNav() {
  return render(
    <MemoryRouter initialEntries={["/vertical/lumen/dashboard"]}>
      <LumenNav />
    </MemoryRouter>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe("LumenNav", () => {
  it("renders the Lumen tools", () => {
    renderNav();
    for (const label of ["Dashboard", "My Self-Portrait", "Prep Me"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  // Removed 2026-08-06 (request). The page and route are untouched and the
  // Lumen Dashboard still links to it — only the nav entry went.
  it("no longer offers Coaching in the nav", () => {
    renderNav();
    expect(screen.queryByRole("link", { name: "Coaching" })).toBeNull();
  });

  // The whole second row went: "Back to Inspire Genius" plus an "or switch to …"
  // list of every other entitled vertical. The mocks above ARE entitled to
  // three of them, so a reinstated switcher would render and fail here.
  it("has no cross-vertical switcher", () => {
    renderNav();
    expect(screen.queryByText(/or switch to/i)).toBeNull();
    for (const title of ["Job Fit", "GRANT", "Direction Setting"]) {
      expect(screen.queryByRole("button", { name: title })).toBeNull();
    }
  });

  it("keeps Back to Inspire Genius, in the same row as the tools", () => {
    renderNav();
    const back = screen.getByTestId("lumen-back-to-ig");
    expect(back).toBeInTheDocument();
    // Same <nav> as the tools — the point of the change was one row, not two.
    expect(back.closest("nav")).toBe(
      screen.getByRole("link", { name: "Dashboard" }).closest("nav"),
    );
  });

  it("Back to Inspire Genius goes home", () => {
    renderNav();
    fireEvent.click(screen.getByTestId("lumen-back-to-ig"));
    expect(mockNavigate).toHaveBeenCalledWith("/home");
  });
});
