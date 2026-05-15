import { render, screen } from "@testing-library/react";
import SearchBar from "../SearchBar";

describe("SearchBar", () => {
  it("renders with default placeholder", () => {
    render(<SearchBar />);
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("renders with custom placeholder", () => {
    render(<SearchBar placeholder="Find users..." />);
    expect(screen.getByPlaceholderText("Find users...")).toBeInTheDocument();
  });

  it("has an accessible label", () => {
    render(<SearchBar />);
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
  });

  it("is disabled (search is currently disabled in source)", () => {
    render(<SearchBar />);
    expect(screen.getByLabelText("Search")).toBeDisabled();
  });
});
