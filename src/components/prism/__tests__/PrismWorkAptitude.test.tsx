import { render, screen } from "@testing-library/react";
import PrismWorkAptitude from "../PrismWorkAptitude";
import type { WorkAptitude } from "@/types/prism/api-types";

const mockData: WorkAptitude[] = [
  {
    apt_id: 1,
    apt_title: "Analytical Thinking",
    apt_desc: "Full description",
    apt_desc_short: "Logical problem solving",
    score: 75,
    occupation_score: 60,
  },
  {
    apt_id: 2,
    apt_title: "Creativity",
    apt_desc: "Full description",
    apt_desc_short: "Novel idea generation",
    score: 88,
    occupation_score: 0,
  },
];

describe("PrismWorkAptitude", () => {
  it("renders nothing when data is empty", () => {
    const { container } = render(<PrismWorkAptitude data={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the heading", () => {
    render(<PrismWorkAptitude data={mockData} />);
    expect(screen.getByText("Work Aptitude")).toBeInTheDocument();
  });

  it("renders items with titles and short descriptions", () => {
    render(<PrismWorkAptitude data={mockData} />);
    expect(screen.getByText("Analytical Thinking")).toBeInTheDocument();
    expect(screen.getByText("Logical problem solving")).toBeInTheDocument();
    expect(screen.getByText("Creativity")).toBeInTheDocument();
    expect(screen.getByText("Novel idea generation")).toBeInTheDocument();
  });

  it("shows occupation score comparison when occupation_score > 0", () => {
    render(<PrismWorkAptitude data={mockData} />);
    expect(screen.getByText("You: 75")).toBeInTheDocument();
    expect(screen.getByText("Occupation: 60")).toBeInTheDocument();
  });

  it("does not show occupation comparison when occupation_score is 0", () => {
    render(<PrismWorkAptitude data={mockData} />);
    // Creativity has occupation_score 0, so no comparison row
    expect(screen.queryByText("Occupation: 0")).not.toBeInTheDocument();
  });
});
