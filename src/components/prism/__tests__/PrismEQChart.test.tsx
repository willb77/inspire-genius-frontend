import { render, screen } from "@testing-library/react";
import PrismEQChart from "../PrismEQChart";
import type { EQItem } from "@/types/prism/api-types";

const mockData: EQItem[] = [
  { item_id: 1, item_title: "Self-Awareness", item_score: 80 },
  { item_id: 2, item_title: "Empathy", item_score: 72 },
];

describe("PrismEQChart", () => {
  it("renders nothing when data is empty", () => {
    const { container } = render(<PrismEQChart data={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the heading", () => {
    render(<PrismEQChart data={mockData} />);
    expect(screen.getByText("Emotional Intelligence")).toBeInTheDocument();
  });

  it("renders all items with titles and scores", () => {
    render(<PrismEQChart data={mockData} />);
    expect(screen.getByText("Self-Awareness")).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.getByText("Empathy")).toBeInTheDocument();
    expect(screen.getByText("72")).toBeInTheDocument();
  });
});
