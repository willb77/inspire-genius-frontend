import { render, screen } from "@testing-library/react";
import PrismMentalToughness from "../PrismMentalToughness";
import type { MentalToughnessItem } from "@/types/prism/api-types";

const mockData: MentalToughnessItem[] = [
  { item_id: 1, item_title: "Confidence", item_desc: "Belief in own ability", item_score: 85 },
  { item_id: 2, item_title: "Challenge", item_desc: "Thrives under pressure", item_score: 60 },
];

describe("PrismMentalToughness", () => {
  it("renders nothing when data is empty", () => {
    const { container } = render(<PrismMentalToughness data={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the heading", () => {
    render(<PrismMentalToughness data={mockData} />);
    expect(screen.getByText("Mental Toughness")).toBeInTheDocument();
  });

  it("renders items with titles, descriptions, and scores", () => {
    render(<PrismMentalToughness data={mockData} />);
    expect(screen.getByText("Confidence")).toBeInTheDocument();
    expect(screen.getByText("Belief in own ability")).toBeInTheDocument();
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getByText("Challenge")).toBeInTheDocument();
    expect(screen.getByText("Thrives under pressure")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
  });
});
