/**
 * A failed check must not render as an empty checklist item.
 *
 * On 2026-08-19 a user with a PRISM report on file was shown PRISM as
 * unticked with an "Add" button. `hasReport` is `!prismError &&
 * !!file_name`, so ANY error on GET /v1/documents/latest-prism produced
 * exactly the same row as having nothing — and the row then invited him to
 * re-upload a report the platform already held. The server was fine; the UI
 * could not tell "you have none" from "I could not find out".
 *
 * These tests pin the third state so the two cannot collapse back together.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import {
  WelcomeBackTile,
  type WelcomeBackPersonalInfo,
} from "@/components/dashboard/v2/WelcomeBackTile";

function renderTile(
  personalInfo: WelcomeBackPersonalInfo[],
  onRetry?: () => void,
) {
  render(
    <MemoryRouter>
      <WelcomeBackTile
        lastActions={[]}
        onResumeConversation={jest.fn()}
        hasReport={false}
        personalInfo={personalInfo}
        onAddPersonalInfo={jest.fn()}
        onRetryPersonalInfo={onRetry}
        quickActions={[]}
        videos={[]}
      />
    </MemoryRouter>,
  );
}

async function openPanel() {
  await userEvent.click(screen.getByTestId("homev2-personal-info-dropdown"));
  return screen.getByTestId("homev2-personal-info-dropdown-panel");
}

describe("checklist unknown state", () => {
  it('renders an unknown item distinctly from a missing one', async () => {
    renderTile([
      { name: "Prism Rpt .csv", done: false, status: "unknown" },
      { name: "Resume", done: false, status: "missing" },
    ]);
    const panel = await openPanel();

    // The unknown row says so, and offers Retry rather than Add.
    expect(within(panel).getByText(/couldn't check/i)).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: /retry checking prism/i }),
    ).toBeInTheDocument();

    // The genuinely-missing row is untouched.
    expect(
      within(panel).getByRole("button", { name: /add resume/i }),
    ).toBeInTheDocument();
  });

  it("does not count an unknown item as done", async () => {
    renderTile([
      { name: "Prism Rpt .csv", done: false, status: "unknown" },
      { name: "Resume", done: true, status: "done" },
    ]);
    expect(screen.getByTestId("homev2-personal-info-dropdown")).toHaveTextContent(
      "1 of 2",
    );
  });

  it("marks the trigger when any item could not be checked", async () => {
    renderTile([{ name: "Prism Rpt .csv", done: false, status: "unknown" }]);
    expect(
      screen.getByTestId("homev2-personal-info-dropdown-unknown-marker"),
    ).toBeInTheDocument();
  });

  it("shows no warning marker when every item is known", async () => {
    renderTile([
      { name: "Prism Rpt .csv", done: true },
      { name: "Resume", done: false },
    ]);
    expect(
      screen.queryByTestId("homev2-personal-info-dropdown-unknown-marker"),
    ).not.toBeInTheDocument();
  });

  it("retries the underlying queries rather than offering an upload", async () => {
    const onRetry = jest.fn();
    renderTile([{ name: "Prism Rpt .csv", done: false, status: "unknown" }], onRetry);
    const panel = await openPanel();
    await userEvent.click(
      within(panel).getByRole("button", { name: /retry checking prism/i }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("keeps working for callers that pass only the legacy boolean", async () => {
    renderTile([
      { name: "Prism Rpt .csv", done: true },
      { name: "Resume", done: false },
    ]);
    const panel = await openPanel();
    expect(within(panel).queryByText(/couldn't check/i)).not.toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: /add resume/i }),
    ).toBeInTheDocument();
  });
});
