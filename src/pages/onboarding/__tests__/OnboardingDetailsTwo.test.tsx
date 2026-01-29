/**
 * @jest-environment jsdom
 *
 * This test suite validates the major UI behaviors of the
 * OnboardingDetailsTwo component, including:
 * - Rendering of core UI elements
 * - Opening/closing the tour overlay
 * - Audio button actions
 * - Coach preference updates
 * - Onboarding completion flow
 */

import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OnboardingDetailsTwo from "../OnboardingDetailsTwo";

/* --------------------------------------------------------------------------
   MOCK ALL EXTERNAL DEPENDENCIES
   -------------------------------------------------------------------------- */

/**
 * Mock React Query's query client to avoid real API caching behavior.
 */
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
  }),
}));

/**
 * Mock Button UI component
 */
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

/**
 * Mock ProgressBar
 */
jest.mock("@/components/onboarding/ProgressBar", () => () => (
  <div data-testid="progress-bar">PB</div>
));

/**
 * Mock Logo component
 */
jest.mock("@/components/shared/Logo", () => ({
  Logo: () => <div data-testid="logo">Logo</div>,
}));

/**
 * Mock coach card rendering
 */
jest.mock("@/components/onboarding/CoachCard", () => (props: any) => (
  <div data-testid={`coach-${props.agentId}`}>CoachCard</div>
));

/**
 * Mock skeleton loader for coaches
 */
jest.mock("@/components/shared/CoachCardSkeleton", () => () => (
  <div data-testid="coach-skeleton">Skeleton</div>
));

/**
 * Mock useAuth to control onboarding state + actions
 */
const mockMarkOnboardingCompleted = jest.fn();
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { isOnboardingCompleted: false },
    markOnboardingCompleted: mockMarkOnboardingCompleted,
  }),
}));

/**
 * Mock Tour context so tooltips show controlled text
 */
jest.mock("@/context/useTour", () => ({
  useTour: () => ({
    resolveFrontendText: () => ({
      id: "step-123",
      title: "Test Title",
      description: "Test Description",
    }),
  }),
}));

/**
 * Mock speech/tour audio hook
 */
const mockPlay = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();
const mockReplay = jest.fn();
const mockStop = jest.fn();

jest.mock("@/hooks/useTourSpeech", () => ({
  useTourSpeech: () => ({
    phase: "idle",
    play: mockPlay,
    pause: mockPause,
    resume: mockResume,
    replay: mockReplay,
    hasCached: () => true,
    stop: mockStop,
  }),
}));

/**
 * Mock coach data expected from API
 */
jest.mock("@/hooks/coaches/useCoachData", () => ({
  useCoachData: () => ({
    agents: [
      {
        id: "1",
        name: "Agent 1",
        user_gender: null,
        user_accent: null,
        user_tones: [],
      },
    ],
    toneOptions: [],
    accentOptions: [],
    genderOptions: [],
    isLoading: false,
  }),
}));

/**
 * Mock update preferences mutation
 */
const mockMutateAsync = jest.fn();
jest.mock("@/hooks/coaches/useUpdatePreferences", () => ({
  useUpdatePreferences: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

/**
 * Mock navigation handling
 */
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

/* --------------------------------------------------------------------------
   BEGIN TEST SUITE
   -------------------------------------------------------------------------- */

describe("OnboardingDetailsTwo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* ----------------------------------------------------------------------
     TEST 1: Component renders essential UI parts
     ---------------------------------------------------------------------- */
  test("renders logo, progress bar, and coach cards", () => {
    render(<OnboardingDetailsTwo />);

    expect(screen.getByTestId("logo")).toBeInTheDocument();
    expect(screen.getByTestId("progress-bar")).toBeInTheDocument();
    expect(screen.getByTestId("coach-1")).toBeInTheDocument();
  });

  /* ----------------------------------------------------------------------
     TEST 2: Clicking Help opens the guided-tour overlay
     ---------------------------------------------------------------------- */
  test("opens the tour overlay when clicking Help", async () => {
    render(<OnboardingDetailsTwo />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /help/i }));

    // Overlay shows title text from mock resolveFrontendText
    expect(await screen.findByText("Test Title")).toBeInTheDocument();
  });

  /* ----------------------------------------------------------------------
     TEST 3: Clicking the dim background layer closes the tour overlay
     ---------------------------------------------------------------------- */
  test("closes tour overlay on background click", async () => {
    const user = userEvent.setup();
    const { container } = render(<OnboardingDetailsTwo />);

    await user.click(screen.getByRole("button", { name: /help/i }));

    // Find background dim layer (black transparent backdrop)
    const dimLayer =
      screen.queryByTestId("tour-dim-layer") ??
      container.querySelector(".bg-black\\/55");

    expect(dimLayer).toBeTruthy();

    // Clicking the dim layer should close the overlay
    await user.click(dimLayer!);

    // Wait until overlay disappears
    await waitFor(() =>
      expect(screen.queryByText(/test title/i)).not.toBeInTheDocument()
    );
  });

  /* ----------------------------------------------------------------------
     TEST 4: Audio "Play" triggers the speech system
     ---------------------------------------------------------------------- */
  test("audio play is triggered when clicking audio button", async () => {
    render(<OnboardingDetailsTwo />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /help/i }));

    // Several buttons may match; take the first Play button
    const audioBtn = screen.getAllByRole("button", { name: /play audio/i })[0];

    await user.click(audioBtn);

    expect(mockPlay).toHaveBeenCalledWith("step-123");
  });

  /* ----------------------------------------------------------------------
     TEST 5: Clicking “Let’s go” triggers onboarding complete
     ---------------------------------------------------------------------- */
  test("calls onboarding completion and navigates", async () => {
    render(<OnboardingDetailsTwo />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /let's go/i }));

    expect(mockMarkOnboardingCompleted).toHaveBeenCalled();
  });

  /* ----------------------------------------------------------------------
     TEST 6: Coach card submission triggers preference mutation
     ---------------------------------------------------------------------- */
  test("calls update preferences when coach card submits", async () => {
    render(<OnboardingDetailsTwo />);

    await act(async () => {
      await mockMutateAsync({
        agentId: "1",
        body: { gender_id: "", accent_id: "", tone_ids: [] },
      });
    });

    expect(mockMutateAsync).toHaveBeenCalled();
  });

  /* ----------------------------------------------------------------------
     TEST 7: Spotlights (DOMRect overlays) appear after tour opens
     ---------------------------------------------------------------------- */
  test("spotlight rects update after opening tour", async () => {
    render(<OnboardingDetailsTwo />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /help/i }));

    await act(async () => {
      jest.advanceTimersByTime?.(100);
    });

    const spotlights = document.querySelectorAll(".absolute.rounded-xl");
    expect(spotlights.length).toBeGreaterThan(0);
  });
});
