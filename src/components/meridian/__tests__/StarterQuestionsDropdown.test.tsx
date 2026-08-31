/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, within } from "@testing-library/react";

// Radix DropdownMenu — render inline, as in HistoryDropdown.test.tsx /
// DocumentsDropdown.test.tsx. Radix's pointer machinery does not work under
// jsdom, so the menu content is rendered directly instead.
jest.mock("@/components/ui/dropdown-menu", () => {
  jest.requireActual("react");
  return {
    __esModule: true,
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    DropdownMenuTrigger: ({
      children,
      asChild,
    }: {
      children: React.ReactNode;
      asChild?: boolean;
    }) => (asChild ? <>{children}</> : <button>{children}</button>),
    DropdownMenuContent: ({
      children,
      ...rest
    }: {
      children: React.ReactNode;
    } & Record<string, unknown>) => <div {...rest}>{children}</div>,
  };
});

import StarterQuestionsDropdown from "../StarterQuestionsDropdown";
import { MERIDIAN_STARTER_GROUPS } from "@/constants/meridianStarterQuestions";

const GROUPS = [
  { category: "Getting started", questions: ["What is a brain map?", "Where do I begin?"] },
  { category: "Goals", questions: ["Help me set a goal."] },
];

describe("StarterQuestionsDropdown", () => {
  it("renders every question, grouped by category", () => {
    render(<StarterQuestionsDropdown onSelect={jest.fn()} groups={GROUPS} />);
    const menu = screen.getByTestId("meridian-starter-questions-menu");
    expect(within(menu).getByText("Getting started")).toBeInTheDocument();
    expect(within(menu).getByText("Goals")).toBeInTheDocument();
    for (const q of ["What is a brain map?", "Where do I begin?", "Help me set a goal."]) {
      expect(within(menu).getByText(q)).toBeInTheDocument();
    }
  });

  it("passes the chosen question to onSelect verbatim", () => {
    const onSelect = jest.fn();
    render(<StarterQuestionsDropdown onSelect={onSelect} groups={GROUPS} />);
    fireEvent.click(screen.getByText("Help me set a goal."));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("Help me set a goal.");
  });

  it("defaults to the shared HomeV2 library, so the two surfaces cannot drift", () => {
    render(<StarterQuestionsDropdown onSelect={jest.fn()} />);
    const menu = screen.getByTestId("meridian-starter-questions-menu");
    // Spot-check the first category and its first question rather than the
    // whole library — this asserts the wiring, not the copy.
    const firstGroup = MERIDIAN_STARTER_GROUPS[0];
    expect(within(menu).getByText(firstGroup.category)).toBeInTheDocument();
    expect(within(menu).getByText(firstGroup.questions[0])).toBeInTheDocument();
  });

  it("disables the trigger while a turn is in flight", () => {
    render(<StarterQuestionsDropdown onSelect={jest.fn()} groups={GROUPS} disabled />);
    expect(screen.getByTestId("meridian-starter-questions-trigger")).toBeDisabled();
  });

  it("renders nothing when there are no groups", () => {
    const { container } = render(
      <StarterQuestionsDropdown onSelect={jest.fn()} groups={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
