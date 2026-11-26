/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AssessmentsSettings from "@/components/shared/settings/AssessmentsSettings";
import { createAssessment, getMyProfile } from "@/services/profile/profile";
import { useAuth } from "@/context/useAuth";
import { ROLES } from "@/constants/routes";

jest.mock("@/services/profile/profile", () => ({
  createAssessment: jest.fn(),
  // F-W7-1: the card and the dialogs read what is on file.
  getMyProfile: jest.fn().mockResolvedValue({ user_id: "u", facts: [], loaded_frameworks: [], assessments: [] }),
  listAssessments: jest.fn().mockResolvedValue({ items: [], total: 0, limit: 200, offset: 0 }),
  previewImportAssessment: jest.fn(),
  confirmImportAssessment: jest.fn(),
  importAssessment: jest.fn(),
  // A4: nothing waiting.
  listPendingImports: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/context/useAuth");

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function asRole(role: string): void {
  mockUseAuth.mockReturnValue({ user: { role } } as unknown as ReturnType<typeof useAuth>);
}

function renderWithClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <AssessmentsSettings />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  asRole(ROLES.USER);
  (createAssessment as jest.Mock).mockResolvedValue({ id: "a-1" });
  (getMyProfile as jest.Mock).mockResolvedValue({ user_id: "u", facts: [], loaded_frameworks: [], assessments: [] });
});

const ALL_ROLES = [
  ROLES.USER,
  ROLES.MANAGER,
  ROLES.COMPANY_ADMIN,
  ROLES.PRACTITIONER,
  ROLES.DISTRIBUTOR,
  ROLES.SUPER_ADMIN,
];

// ── A1: the card for every role; the PRISM-replace row stays with the user role ──

test.each(ALL_ROLES)("the card and its add buttons render for %s", (role) => {
  asRole(role);
  renderWithClient();
  expect(screen.getByTestId("assessments-settings")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /add cliftonstrengths top five/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /upload a report/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /add disc result/i })).toBeInTheDocument();
});

test.each(ALL_ROLES)("the Replace PRISM data row shows only to the user role (%s)", (role) => {
  asRole(role);
  renderWithClient();
  const row = screen.queryByTestId("prism-data-settings");
  if (role === ROLES.USER) expect(row).toBeInTheDocument();
  else expect(row).not.toBeInTheDocument();
});

test("no signed-in role (still loading) hides the PRISM row", () => {
  mockUseAuth.mockReturnValue({ user: null } as unknown as ReturnType<typeof useAuth>);
  renderWithClient();
  expect(screen.queryByTestId("prism-data-settings")).not.toBeInTheDocument();
});

// ── The manual payloads match the backend's ScoreIn / TypingIn (A1-F4) ──

test("DISC posts rows with a category, which the backend requires", async () => {
  renderWithClient();
  fireEvent.click(screen.getByRole("button", { name: /add disc result/i }));
  await screen.findByTestId("disc-dialog");
  for (const [k, v] of [["D", "70"], ["I", "50"], ["S", "40"], ["C", "30"]]) {
    fireEvent.change(screen.getByLabelText(new RegExp(`^${k} \\(0–100\\)`, "i")), { target: { value: v } });
  }
  fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
  await waitFor(() => expect(createAssessment).toHaveBeenCalledTimes(1));
  const payload = (createAssessment as jest.Mock).mock.calls[0][0];
  expect(payload).toMatchObject({
    framework: "DISC",
    source: "user_input",
    raw_payload: { D: 70, I: 50, S: 40, C: 30 },
  });
  expect(payload.parsed_scores).toEqual([
    { category: "DISC", dimension: "D", score_numeric: 70 },
    { category: "DISC", dimension: "I", score_numeric: 50 },
    { category: "DISC", dimension: "S", score_numeric: 40 },
    { category: "DISC", dimension: "C", score_numeric: 30 },
  ]);
  for (const row of payload.parsed_scores) expect(row).not.toHaveProperty("score");
});

test("Big Five posts BIG_FIVE with full OCEAN names under BigFive", async () => {
  renderWithClient();
  fireEvent.click(screen.getByRole("button", { name: /add big five result/i }));
  const dialog = await screen.findByTestId("bigfive-dialog");
  const inputs = within(dialog).getAllByRole("spinbutton");
  inputs.forEach((el, i) => fireEvent.change(el, { target: { value: String(10 + i) } }));
  fireEvent.click(within(dialog).getByRole("button", { name: /^save$/i }));
  await waitFor(() => expect(createAssessment).toHaveBeenCalledTimes(1));
  const payload = (createAssessment as jest.Mock).mock.calls[0][0];
  expect(payload.framework).toBe("BIG_FIVE");
  expect(payload.parsed_scores).toEqual([
    { category: "BigFive", dimension: "Openness", score_numeric: 10 },
    { category: "BigFive", dimension: "Conscientiousness", score_numeric: 11 },
    { category: "BigFive", dimension: "Extraversion", score_numeric: 12 },
    { category: "BigFive", dimension: "Agreeableness", score_numeric: 13 },
    { category: "BigFive", dimension: "Neuroticism", score_numeric: 14 },
  ]);
});

test("MBTI posts one typing object with type_system", async () => {
  renderWithClient();
  fireEvent.click(screen.getByRole("button", { name: /add mbti type/i }));
  await screen.findByTestId("mbti-dialog");
  fireEvent.change(screen.getByLabelText(/type \(e\.g\. intj\)/i), { target: { value: "intj" } });
  fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
  await waitFor(() => expect(createAssessment).toHaveBeenCalledTimes(1));
  const payload = (createAssessment as jest.Mock).mock.calls[0][0];
  expect(payload.typing).toEqual({ type_system: "MBTI", type_code: "INTJ", clarity: 50 });
});

// ── CliftonStrengths top five ──

async function openClifton() {
  renderWithClient();
  fireEvent.click(screen.getByRole("button", { name: /add cliftonstrengths top five/i }));
  return screen.findByTestId("clifton-dialog");
}

function pick(rank: number, theme: string) {
  fireEvent.change(screen.getByLabelText(`Theme ${rank}`), { target: { value: theme } });
}

test("Clifton refuses fewer than five themes", async () => {
  await openClifton();
  pick(1, "Achiever");
  pick(2, "Learner");
  fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/choose all five/i);
  expect(createAssessment).not.toHaveBeenCalled();
});

test("Clifton refuses the same theme twice", async () => {
  await openClifton();
  ["Achiever", "Learner", "Input", "Achiever", "Strategic"].forEach((t, i) => pick(i + 1, t));
  fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/only once/i);
  expect(createAssessment).not.toHaveBeenCalled();
});

test("Clifton posts five ranked theme rows", async () => {
  await openClifton();
  ["Strategic", "Learner", "Input", "Ideation", "Woo"].forEach((t, i) => pick(i + 1, t));
  fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
  await waitFor(() => expect(createAssessment).toHaveBeenCalledTimes(1));
  const payload = (createAssessment as jest.Mock).mock.calls[0][0];
  expect(payload).toMatchObject({ framework: "CLIFTON", source: "user_input" });
  expect(payload.raw_payload).toBeUndefined();
  expect(payload.parsed_scores).toEqual(
    ["Strategic", "Learner", "Input", "Ideation", "Woo"].map((t, i) => ({
      category: "Themes",
      dimension: t,
      score_text: t,
      score_type: "Rank",
      rank: i + 1,
    })),
  );
});

test("Clifton save failure says so", async () => {
  const { toast } = jest.requireMock("sonner") as { toast: { error: jest.Mock } };
  (createAssessment as jest.Mock).mockRejectedValueOnce(new Error("boom"));
  await openClifton();
  ["Strategic", "Learner", "Input", "Ideation", "Woo"].forEach((t, i) => pick(i + 1, t));
  fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/failed to add your cliftonstrengths/i)));
});

// ── F-W7-1: the card shows what is on file; each Add dialog says when it supersedes ──

const ON_FILE_PROFILE = {
  user_id: "u",
  facts: [],
  loaded_frameworks: ["CLIFTON"],
  assessments: [
    {
      framework: "CLIFTON",
      assessed_at: "2026-11-25T15:41:00Z",
      source: "user_input",
      top_scores: [{ category: "Themes", dimension: "Achiever", rank: 1 }],
    },
  ],
};

test.each(ALL_ROLES)("the card lists what is on file for %s", async (role) => {
  asRole(role);
  (getMyProfile as jest.Mock).mockResolvedValueOnce(ON_FILE_PROFILE);
  renderWithClient();
  const section = screen.getByTestId("assessments-on-file");
  expect(await within(section).findByTestId("on-file-CLIFTON")).toHaveTextContent("Achiever");
});

test.each([
  [/add cliftonstrengths top five/i, true],
  [/add disc result/i, false],
  [/add big five result/i, false],
  [/add mbti type/i, false],
])("the %s dialog says it supersedes only when that framework is on file", async (button, expected) => {
  (getMyProfile as jest.Mock).mockResolvedValue(ON_FILE_PROFILE);
  renderWithClient();
  await screen.findByTestId("on-file-CLIFTON");
  fireEvent.click(screen.getByRole("button", { name: button }));
  const dialog = await screen.findByRole("dialog");
  if (expected) {
    expect(await within(dialog).findByTestId("supersede-notice")).toHaveTextContent(/CliftonStrengths/);
  } else {
    expect(within(dialog).queryByTestId("supersede-notice")).not.toBeInTheDocument();
  }
});

test.each([
  ["DISC", /add disc result/i],
  ["BIG_FIVE", /add big five result/i],
  ["MBTI", /add mbti type/i],
])("the %s dialog says it supersedes when %s is on file", async (fw, button) => {
  (getMyProfile as jest.Mock).mockResolvedValue({
    ...ON_FILE_PROFILE,
    assessments: [{ framework: fw, assessed_at: "2026-10-01T00:00:00Z", source: "user_input", top_scores: [] }],
  });
  renderWithClient();
  await screen.findByTestId(`on-file-${fw}`);
  fireEvent.click(screen.getByRole("button", { name: button }));
  const dialog = await screen.findByRole("dialog");
  expect(await within(dialog).findByTestId("supersede-notice")).toBeInTheDocument();
});
