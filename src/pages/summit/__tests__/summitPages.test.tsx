import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SummitDashboard from "@/pages/summit/SummitDashboard";
import SummitDiscovery from "@/pages/summit/SummitDiscovery";
import SummitPrism from "@/pages/summit/SummitPrism";
import SummitGoals from "@/pages/summit/SummitGoals";
import SummitCoaches from "@/pages/summit/SummitCoaches";
import SummitProgress from "@/pages/summit/SummitProgress";
import SummitDocuments from "@/pages/summit/SummitDocuments";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("Summit surface pages", () => {
  it("renders the Dashboard with journey + goals", () => {
    renderWithRouter(<SummitDashboard />);
    expect(screen.getByText(/wired to make messy systems run/i)).toBeInTheDocument();
    expect(screen.getByText(/Goals built on how you think/i)).toBeInTheDocument();
  });

  it("renders Discovery with the five categories + WHY ladder", () => {
    renderWithRouter(<SummitDiscovery />);
    expect(screen.getByText(/Discovery, not a questionnaire/i)).toBeInTheDocument();
    expect(screen.getByText(/Current Job Situation/i)).toBeInTheDocument();
    expect(screen.getAllByText(/the WHY ladder/i).length).toBeGreaterThan(0);
  });

  it("renders the PRISM lens with all four principles", () => {
    renderWithRouter(<SummitPrism />);
    expect(screen.getByText(/Underlying vs Adapted vs Consistent/i)).toBeInTheDocument();
    expect(screen.getAllByText(/neuroplasticity/i).length).toBeGreaterThan(0);
  });

  it("renders Goals with formalized goal cards", () => {
    renderWithRouter(<SummitGoals />);
    expect(screen.getByText(/Lead the ops-reporting redesign end to end/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Why it matters:/i).length).toBeGreaterThan(0);
  });

  it("renders Coaches with the three coaching roles", () => {
    renderWithRouter(<SummitCoaches />);
    expect(screen.getByText(/Job Mentor/i)).toBeInTheDocument();
    expect(screen.getByText(/Career Coach/i)).toBeInTheDocument();
    expect(screen.getByText(/PRISM Coach/i)).toBeInTheDocument();
  });

  it("renders Progress with the living plan", () => {
    renderWithRouter(<SummitProgress />);
    expect(screen.getByText(/Your living goal plan/i)).toBeInTheDocument();
  });

  it("renders the Documents writer with all six document types", () => {
    renderWithRouter(<SummitDocuments />);
    for (const name of ["Résumé", "CV", "Professional Bio", "Job History", "Wikipedia Article", "LinkedIn Profile"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    // Build button present
    expect(screen.getByRole("button", { name: /build/i })).toBeInTheDocument();
  });
});
