import { render, screen } from "@testing-library/react";
import PrismBigFiveChart from "../PrismBigFiveChart";
import type { BigFiveItem } from "@/types/prism/api-types";

const mockData: BigFiveItem[] = [
  { item_id: 1, item_title: "Openness", item_score: 78 },
  { item_id: 2, item_title: "Conscientiousness", item_score: 65 },
  { item_id: 3, item_title: "Extraversion", item_score: 42 },
];

describe("PrismBigFiveChart", () => {
  it("renders nothing when data is empty", () => {
    const { container } = render(<PrismBigFiveChart data={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the heading", () => {
    render(<PrismBigFiveChart data={mockData} />);
    expect(screen.getByText("Big Five Personality")).toBeInTheDocument();
  });

  it("renders all items with titles and scores", () => {
    render(<PrismBigFiveChart data={mockData} />);
    expect(screen.getByText("Openness")).toBeInTheDocument();
    expect(screen.getByText("78")).toBeInTheDocument();
    expect(screen.getByText("Conscientiousness")).toBeInTheDocument();
    expect(screen.getByText("65")).toBeInTheDocument();
    expect(screen.getByText("Extraversion")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});
