import { render, screen, fireEvent } from "@testing-library/react";
import Pagination from "../Pagination";

jest.mock("react-paginate", () => {
  return {
    __esModule: true,
    default: ({
      pageCount,
      forcePage,
      onPageChange,
      previousLabel,
      nextLabel,
    }: {
      pageCount: number;
      forcePage: number;
      onPageChange: (sel: { selected: number }) => void;
      previousLabel: string;
      nextLabel: string;
    }) => (
      <div data-testid="paginate">
        <button onClick={() => onPageChange({ selected: Math.max(0, forcePage - 1) })}>
          {previousLabel}
        </button>
        <span data-testid="page-info">
          Page {forcePage + 1} of {pageCount}
        </span>
        <button onClick={() => onPageChange({ selected: Math.min(pageCount - 1, forcePage + 1) })}>
          {nextLabel}
        </button>
      </div>
    ),
  };
});

describe("Pagination", () => {
  it("renders the pagination component", () => {
    render(<Pagination pageCount={5} page={1} onPageChange={jest.fn()} />);
    expect(screen.getByTestId("paginate")).toBeInTheDocument();
  });

  it("displays current page info", () => {
    render(<Pagination pageCount={10} page={3} onPageChange={jest.fn()} />);
    expect(screen.getByTestId("page-info")).toHaveTextContent("Page 3 of 10");
  });

  it("calls onPageChange with 1-based page number on next", () => {
    const onPageChange = jest.fn();
    render(<Pagination pageCount={5} page={2} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByText(">"));
    // forcePage is 1 (page-1), next would be 2, so selected=2 → onPageChange(3)
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("calls onPageChange with 1-based page on previous", () => {
    const onPageChange = jest.fn();
    render(<Pagination pageCount={5} page={3} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByText("<"));
    // forcePage is 2, prev is 1, so selected=1 → onPageChange(2)
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
