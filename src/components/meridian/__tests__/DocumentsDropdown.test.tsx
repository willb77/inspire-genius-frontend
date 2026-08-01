/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock the documents hook so the component renders without React Query.
const mockUseListDocuments = jest.fn();
jest.mock("@/hooks/documents/useListDocuments", () => ({
  useListDocuments: (...args: unknown[]) => mockUseListDocuments(...args),
}));

// Radix DropdownMenu hides its content in a portal that jsdom doesn't
// render reliably (relies on PointerEvent / hasPointerCapture). Replace
// the primitives with inline shells so we can assert against the content.
jest.mock("@/components/ui/dropdown-menu", () => {
  // Force jest to load the real React inside the factory before the
  // closure resolves (the test file's React import is hoisted by Babel).
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
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="dd-content">{children}</div>
    ),
    DropdownMenuItem: ({
      children,
      onClick,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
    }) => (
      <div role="menuitem" onClick={onClick}>
        {children}
      </div>
    ),
    DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuPortal: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    DropdownMenuCheckboxItem: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuShortcut: ({ children }: { children: React.ReactNode }) => (
      <span>{children}</span>
    ),
    DropdownMenuRadioGroup: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuRadioItem: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuSub: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuSubTrigger: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuSubContent: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

import DocumentsDropdown from "../DocumentsDropdown";

function renderDropdown(
  props: Partial<React.ComponentProps<typeof DocumentsDropdown>> = {},
) {
  const defaults = {
    selectedIds: [] as string[],
    onChange: jest.fn(),
    autoAttachedId: null as string | null,
  };
  return render(
    <MemoryRouter>
      <DocumentsDropdown {...defaults} {...props} />
    </MemoryRouter>,
  );
}

function openDropdown() {
  // Under the test-only DropdownMenu mock the content is always
  // rendered inline — opening is a no-op. Kept for symmetry with the
  // production component (Radix DropdownMenu requires a trigger click).
  const trigger = screen.getByRole("button", { name: /select documents/i });
  fireEvent.click(trigger);
}

describe("DocumentsDropdown (T4)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the empty state when no documents are returned", () => {
    mockUseListDocuments.mockReturnValue({
      data: { date_groups: [] },
      isLoading: false,
      isError: false,
    });
    renderDropdown();
    openDropdown();
    // The list is in a portal; getByText scans the whole document.
    expect(screen.getByText(/no documents uploaded yet/i)).toBeInTheDocument();
    // Empty state offers a route to the Documents page.
    const link = screen.getByRole("link", { name: /upload documents/i });
    expect(link).toHaveAttribute("href", "/documents");
  });

  it("renders a loading skeleton while documents are fetching", () => {
    mockUseListDocuments.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    renderDropdown();
    openDropdown();
    expect(screen.getByTestId("documents-dropdown-loading")).toBeInTheDocument();
  });

  it("renders an error state when the fetch fails", () => {
    mockUseListDocuments.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    renderDropdown();
    openDropdown();
    expect(screen.getByText(/couldn't load documents/i)).toBeInTheDocument();
  });

  it("calls onChange with the toggled id when a checkbox is clicked", () => {
    mockUseListDocuments.mockReturnValue({
      data: {
        date_groups: [
          {
            date_label: "Today",
            date: "2026-06-12",
            files: [
              { id: "doc-a", filename: "Annual Review.pdf", file_type: "pdf" },
              { id: "doc-b", filename: "Notes.docx", file_type: "docx" },
            ],
          },
        ],
      },
      isLoading: false,
      isError: false,
    });
    const onChange = jest.fn();
    renderDropdown({ onChange });
    openDropdown();

    // Toggle doc-a on.
    const rowA = screen.getByTestId("documents-dropdown-row-doc-a");
    const checkboxA = within(rowA).getByRole("checkbox", {
      name: /select annual review\.pdf/i,
    });
    fireEvent.click(checkboxA);
    expect(onChange).toHaveBeenCalledWith(["doc-a"]);
  });

  it("renders an Auto-attached badge on the autoAttachedId row", () => {
    mockUseListDocuments.mockReturnValue({
      data: {
        date_groups: [
          {
            date_label: "Today",
            date: "2026-06-12",
            files: [
              { id: "prism-doc", filename: "PRISM Profile.pdf", file_type: "pdf" },
              { id: "other", filename: "Other.pdf", file_type: "pdf" },
            ],
          },
        ],
      },
      isLoading: false,
      isError: false,
    });
    renderDropdown({ autoAttachedId: "prism-doc" });
    openDropdown();
    // Badge is only present on the PRISM doc, not on the unrelated row.
    expect(
      screen.getByTestId("documents-dropdown-badge-prism-doc"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("documents-dropdown-badge-other"),
    ).not.toBeInTheDocument();
  });

  it("renders a hover title on the filename span so long names are reachable", () => {
    const longName =
      "WAB 2nd PRISM Rpt- William Brown (self assessment 2026-05-30).csv";
    mockUseListDocuments.mockReturnValue({
      data: {
        date_groups: [
          {
            date_label: "Today",
            date: "2026-06-12",
            files: [{ id: "doc-1", filename: longName, file_type: "csv" }],
          },
        ],
      },
      isLoading: false,
      isError: false,
    });
    renderDropdown();
    openDropdown();
    // The filename element exists with the full name in its title attribute,
    // even when the rendered text is clipped by `truncate`.
    const span = screen.getByText(longName);
    expect(span).toHaveAttribute("title", longName);
  });

  it("reflects the selected count in the trigger label", () => {
    mockUseListDocuments.mockReturnValue({
      data: { date_groups: [] },
      isLoading: false,
      isError: false,
    });
    renderDropdown({ selectedIds: ["a", "b", "c"] });
    expect(
      screen.getByRole("button", { name: /select documents/i }),
    ).toHaveTextContent("Documents (3 selected)");
  });

  // 2026-07-31 — upload folded into this dropdown. It was a separate header
  // button beside it, which read as two unrelated features when attaching an
  // existing file and adding a new one are two halves of the same job.
  describe("upload action", () => {
    it("renders an upload action and calls onUpload when clicked", () => {
      mockUseListDocuments.mockReturnValue({
        data: { date_groups: [] },
        isLoading: false,
        isError: false,
      });
      const onUpload = jest.fn();
      renderDropdown({ onUpload });
      openDropdown();
      fireEvent.click(screen.getByTestId("documents-dropdown-upload"));
      expect(onUpload).toHaveBeenCalledTimes(1);
    });

    it("omits the upload action when no handler is supplied", () => {
      // The prop is optional so the component still stands alone anywhere no
      // upload modal is mounted — offering a button that cannot work is worse
      // than not offering one.
      mockUseListDocuments.mockReturnValue({
        data: { date_groups: [] },
        isLoading: false,
        isError: false,
      });
      renderDropdown();
      openDropdown();
      expect(screen.queryByTestId("documents-dropdown-upload")).toBeNull();
    });

    it("drops the navigate-away link from the empty state when uploading is possible", () => {
      // Two upload affordances is one too many, and the link is the worse of
      // the two: it abandons the conversation for /documents.
      mockUseListDocuments.mockReturnValue({
        data: { date_groups: [] },
        isLoading: false,
        isError: false,
      });
      renderDropdown({ onUpload: jest.fn() });
      openDropdown();
      expect(screen.queryByRole("link", { name: /upload documents/i })).toBeNull();
    });

    it("keeps the link as the fallback when no handler is supplied", () => {
      mockUseListDocuments.mockReturnValue({
        data: { date_groups: [] },
        isLoading: false,
        isError: false,
      });
      renderDropdown();
      openDropdown();
      expect(
        screen.getByRole("link", { name: /upload documents/i }),
      ).toBeInTheDocument();
    });
  });
});
