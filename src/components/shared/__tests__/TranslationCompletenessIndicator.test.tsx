import { render, screen } from "@testing-library/react";
import { TranslationCompletenessIndicator } from "../TranslationCompletenessIndicator";

jest.mock("@/lib/translationCompleteness", () => ({
  LANGUAGES_METADATA: {
    en: { native: "English", status: "complete" },
    es: { native: "Espanol", status: "complete" },
    it: { native: "Italiano", status: "partial", note: "Partial" },
  },
  TRANSLATION_STATUS_COLORS: {
    complete: "text-green-600",
    partial: "text-yellow-600",
    incomplete: "text-gray-600",
  },
  getCompletionStats: () => ({
    total: 3,
    complete: 2,
    partial: 1,
    incomplete: 0,
  }),
}));

describe("TranslationCompletenessIndicator", () => {
  it("renders the title", () => {
    render(<TranslationCompletenessIndicator />);
    expect(screen.getByText("Translation Status")).toBeInTheDocument();
  });

  it("shows completion stats", () => {
    render(<TranslationCompletenessIndicator />);
    expect(screen.getByText("2")).toBeInTheDocument(); // complete
    expect(screen.getByText("1")).toBeInTheDocument(); // partial
    expect(screen.getByText("0")).toBeInTheDocument(); // incomplete
  });

  it("shows overall completion percentage", () => {
    render(<TranslationCompletenessIndicator />);
    expect(screen.getByText("67%")).toBeInTheDocument();
  });

  it("renders language entries", () => {
    render(<TranslationCompletenessIndicator />);
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("Italiano")).toBeInTheDocument();
  });

  it("shows contribute notice", () => {
    render(<TranslationCompletenessIndicator />);
    expect(screen.getByText("Help Translate")).toBeInTheDocument();
  });
});
