/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";

import PrismMapFigure from "@/components/prism/PrismMapFigure";
import type { PrismMap } from "@/types/chat/data-types";

const MAP: PrismMap = {
  format: "svg",
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><title>PRISM Brain Map</title><text>Gold ↔ Blue · 91.5</text></svg>',
  table:
    "| Colour | Score | Band | Behaviours |\n|---|---|---|---|\n| **Blue** | 92 | overdone-strength range | Supporting 92 · Co-Ordinating 92 |",
  description:
    "PRISM Brain Map. Gold 52; Green 91.5; Red 34; Blue 92.",
  assessed_at: "2026-06-24T01:47:40Z",
};

describe("PrismMapFigure", () => {
  it("renders the map as an image, not injected markup", () => {
    // An <img> cannot execute script under any circumstance; injecting the
    // SVG into the DOM could, if the generator ever changed.
    const { container } = render(<PrismMapFigure map={MAP} />);
    const img = screen.getByRole("img");
    expect(img.tagName).toBe("IMG");
    expect(container.querySelector("svg")).toBeNull();
  });

  it("encodes the SVG as a data URI that survives non-Latin1 characters", () => {
    // btoa() would throw on "↔" and "·" — the map contains both.
    render(<PrismMapFigure map={MAP} />);
    const src = screen.getByRole("img").getAttribute("src") ?? "";
    expect(src.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(src.split(",")[1])).toBe(MAP.svg);
  });

  it("gives screen readers the numbers, not just 'image'", () => {
    render(<PrismMapFigure map={MAP} />);
    expect(screen.getByRole("img")).toHaveAttribute("alt", MAP.description);
  });

  it("shows the assessment date", () => {
    render(<PrismMapFigure map={MAP} />);
    expect(screen.getByText(/2026-06-24/)).toBeInTheDocument();
  });

  it("reveals the numeric table on request", () => {
    render(<PrismMapFigure map={MAP} />);
    expect(screen.queryByTestId("prism-map-table")).toBeNull();
    fireEvent.click(screen.getByTestId("prism-map-toggle-table"));
    const table = screen.getByTestId("prism-map-table");
    expect(table).toHaveTextContent("Supporting 92");
    expect(table).toHaveTextContent("overdone-strength range");
  });

  it("renders nothing when the payload carries no svg", () => {
    const { container } = render(
      <PrismMapFigure map={{ ...MAP, svg: "" }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
