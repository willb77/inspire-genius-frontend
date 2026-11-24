/**
 * Home's profile tiles with the About-you panel ON (request, 2026-11-23):
 * the survey tile's two states, the four "View …" pills and what each opens,
 * the Behavioral Scores pill, and that every pill appears only when there is
 * something behind it.
 */
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("@/hooks/switches/useHomeAboutYouPanelEnabled", () => ({
  useHomeAboutYouPanelEnabled: () => true,
  useHomeAboutYouPanelStatus: () => "on",
}));
jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { name: "Test Person" } }),
}));
const mockLatestPrism = jest.fn();
jest.mock("@/hooks/documents/useLatestPrism", () => ({
  useLatestPrism: () => mockLatestPrism(),
}));
jest.mock("@/verticals/core", () => ({
  useEnabledVerticals: () => ({ data: [] }),
  useVerticalAccess: () => ({ hasAccess: false, isLoading: false }),
}));
const mockMyProfile = jest.fn();
jest.mock("@/hooks/profile/useProfile", () => ({
  useMyProfile: () => mockMyProfile(),
  profileKeys: { me: () => ["profile", "me"] },
}));
jest.mock("@/hooks/agents/useAgentConversation", () => ({
  useAgentConversation: () => ({ data: undefined, isLoading: false }),
}));
const mockSurveyStatus = jest.fn();
jest.mock("@/hooks/prism/usePrismRequest", () => ({
  useLatestPrismStatus: () => mockSurveyStatus(),
}));
jest.mock("@/components/prism/PrismSelfMapContent", () => ({
  PrismSelfMapContent: () => <div data-testid="map-content" />,
}));
jest.mock("@/components/prism/ReplacePrismDataButton", () => ({
  ReplacePrismDataDialog: ({ open }: { open: boolean }) =>
    open ? <div>replace dialog open</div> : null,
}));
jest.mock("@/components/dashboard/v2/AddPersonalDocModal", () => ({
  AddPersonalDocModal: ({ target }: { target: { name: string; docKind: string } | null }) =>
    target ? <div>personal modal open: {target.name} ({target.docKind})</div> : null,
}));

const mockMyReport = jest.fn();
const mockPdfUrl = jest.fn();
jest.mock("@/hooks/prism/usePrismReportDownload", () => ({
  useMyPrismReport: () => mockMyReport(),
  useMyPrismReportDownloadUrl: () => ({ mutateAsync: mockPdfUrl }),
}));
const mockMaterial = jest.fn();
jest.mock("@/hooks/documents/useProfileMaterial", () => ({
  useProfileMaterial: () => mockMaterial(),
}));
const mockGetDownloadUrl = jest.fn();
jest.mock("@/services/documents/documentService", () => ({
  getDownloadUrl: (id: string) => mockGetDownloadUrl(id),
}));

import HomeV2 from "@/pages/user/HomeV2";

const PANEL = "home-about-you-panel";

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <HomeV2 />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const SCORES = { data: { file_name: "p.csv" }, isLoading: false, isError: false, error: null, refetch: jest.fn() };
const NO_SCORES = { data: null, isLoading: false, isError: false, error: null, refetch: jest.fn() };
const RESUME = { id: "r1", kind: "resume", label: "Resume", fileName: "cv.pdf", contentType: "application/pdf", uploadedAt: "" };
const BIO = { id: "b1", kind: "bio", label: "Bio", fileName: "bio.pdf", contentType: "application/pdf", uploadedAt: "" };
const INFO = { id: "i1", kind: "personal", label: "Additional Info", fileName: "extra.pdf", contentType: "application/pdf", uploadedAt: "" };

beforeEach(() => {
  jest.clearAllMocks();
  mockLatestPrism.mockReturnValue(NO_SCORES);
  mockMyProfile.mockReturnValue({ data: { personal_docs: [] }, isError: false, refetch: jest.fn() });
  mockSurveyStatus.mockReturnValue({ latest: null, isLoading: false, isError: false });
  mockMyReport.mockReturnValue({ data: undefined });
  mockMaterial.mockReturnValue({ data: [], isLoading: false });
  mockPdfUrl.mockResolvedValue({ url: "https://files.example/report.pdf" });
  mockGetDownloadUrl.mockResolvedValue("https://files.example/doc.pdf");
});

const panel = () => screen.getByTestId(PANEL);

describe("Home profile tiles — empty profile", () => {
  it("offers no View pill when there is nothing to view", () => {
    wrap();
    for (const name of [/View Scores/, /View Report/, /View Resume/, /View Bio and Data/]) {
      expect(within(panel()).queryByRole("button", { name })).toBeNull();
    }
    expect(screen.queryByTestId("homev2-behavioral-scores")).toBeNull();
  });

  it("survey tile: a 'Request the Survey' pill that goes where the old header button went", () => {
    wrap();
    expect(within(panel()).getByText("Request your PRISM survey")).toBeInTheDocument();
    fireEvent.click(within(panel()).getByRole("button", { name: "Request the Survey" }));
    expect(mockNavigate).toHaveBeenCalledWith("/prism-assessment");
  });

  it("survey tile: a requested-but-unfinished survey keeps its status and View status", () => {
    mockSurveyStatus.mockReturnValue({ latest: { id: "x" }, isLoading: false, isError: false });
    wrap();
    expect(within(panel()).getByText("Request your PRISM survey")).toBeInTheDocument();
    expect(within(panel()).getByText(/Requested/)).toBeInTheDocument();
    expect(within(panel()).queryByText("Your Scores")).toBeNull();
    fireEvent.click(within(panel()).getByRole("button", { name: "View status" }));
    expect(mockNavigate).toHaveBeenCalledWith("/prism-assessment");
  });

  it("has no Request PRISM Survey pill when scores are not ready (the primary action already requests)", () => {
    wrap();
    expect(within(panel()).queryByRole("button", { name: "Request PRISM Survey" })).toBeNull();
    expect(within(panel()).getAllByRole("button", { name: /request the survey/i })).toHaveLength(1);
  });

  it("titles: PRISM Report, and 'Add a bio and personal data'", () => {
    wrap();
    expect(within(panel()).getByText("PRISM Report")).toBeInTheDocument();
    expect(within(panel()).queryByText("Upload a PRISM report you already have")).toBeNull();
    expect(within(panel()).getByText("Add a bio and personal data")).toBeInTheDocument();
    expect(within(panel()).queryByText("Add a bio")).toBeNull();
  });
});

describe("Home profile tiles — scores on file", () => {
  beforeEach(() => mockLatestPrism.mockReturnValue(SCORES));

  it("survey tile reads 'Your Scores' with View Scores, which opens the brain map", () => {
    wrap();
    expect(within(panel()).getByText("Your Scores")).toBeInTheDocument();
    expect(within(panel()).queryByRole("button", { name: "Request the Survey" })).toBeNull();
    expect(screen.queryByTestId("map-content")).toBeNull();
    fireEvent.click(within(panel()).getByRole("button", { name: "View Scores" }));
    expect(screen.getByTestId("map-content")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("adds a Request PRISM Survey pill that goes to the assessment, View Scores staying primary", () => {
    wrap();
    const pill = within(panel()).getByRole("button", { name: "Request PRISM Survey" });
    fireEvent.click(pill);
    expect(mockNavigate).toHaveBeenCalledWith("/prism-assessment");
    // View Scores is still there and still opens the map, not the assessment.
    mockNavigate.mockClear();
    fireEvent.click(within(panel()).getByRole("button", { name: "View Scores" }));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("the Behavioral Scores pill opens the same map", () => {
    wrap();
    fireEvent.click(screen.getByTestId("homev2-behavioral-scores"));
    expect(screen.getByTestId("map-content")).toBeInTheDocument();
  });

  it("View Report appears only when the report resolver says a PDF exists", () => {
    wrap();
    expect(within(panel()).queryByRole("button", { name: "View Report" })).toBeNull();
  });

  it("View Report shows the PRISM PDF, fetched at click time", async () => {
    mockMyReport.mockReturnValue({ data: { pdf_available: true } });
    wrap();
    expect(mockPdfUrl).not.toHaveBeenCalled();
    fireEvent.click(within(panel()).getByRole("button", { name: "View Report" }));
    expect(mockPdfUrl).toHaveBeenCalledWith({ kind: "pdf" });
    const frame = await screen.findByTestId("doc-viewer-pdf");
    expect(frame).toHaveAttribute("src", "https://files.example/report.pdf");
  });

  it("View Report says so when the PDF cannot be fetched", async () => {
    mockMyReport.mockReturnValue({ data: { pdf_available: true } });
    mockPdfUrl.mockRejectedValue(new Error("boom"));
    wrap();
    fireEvent.click(within(panel()).getByRole("button", { name: "View Report" }));
    expect(await screen.findByTestId("doc-viewer-error")).toBeInTheDocument();
  });

  it("Replace report still opens the score-importing dialog", () => {
    wrap();
    fireEvent.click(within(panel()).getByRole("button", { name: "Replace report" }));
    expect(screen.getByText("replace dialog open")).toBeInTheDocument();
  });
});

describe("Home profile tiles — résumé", () => {
  it("View Resume needs both the on-file fact and a document to open", () => {
    // personal_docs says a résumé exists, but no document row came back.
    mockMyProfile.mockReturnValue({ data: { personal_docs: ["resume"] }, isError: false, refetch: jest.fn() });
    wrap();
    expect(within(panel()).queryByRole("button", { name: "View Resume" })).toBeNull();
  });

  it("View Resume opens the uploaded résumé by its document id", async () => {
    mockMyProfile.mockReturnValue({ data: { personal_docs: ["resume"] }, isError: false, refetch: jest.fn() });
    mockMaterial.mockReturnValue({ data: [RESUME], isLoading: false });
    wrap();
    fireEvent.click(within(panel()).getByRole("button", { name: "View Resume" }));
    expect(mockGetDownloadUrl).toHaveBeenCalledWith("r1");
    expect(await screen.findByTestId("doc-viewer-pdf")).toHaveAttribute("src", "https://files.example/doc.pdf");
  });

  it("View Resume picks the résumé, not the bio, when both are on file", () => {
    mockMyProfile.mockReturnValue({ data: { personal_docs: ["resume", "bio"] }, isError: false, refetch: jest.fn() });
    mockMaterial.mockReturnValue({ data: [BIO, RESUME], isLoading: false });
    wrap();
    fireEvent.click(within(panel()).getByRole("button", { name: "View Resume" }));
    expect(mockGetDownloadUrl).toHaveBeenCalledTimes(1);
    expect(mockGetDownloadUrl).toHaveBeenCalledWith("r1");
  });

  it("Replace résumé still opens the tagged upload", () => {
    mockMyProfile.mockReturnValue({ data: { personal_docs: ["resume"] }, isError: false, refetch: jest.fn() });
    mockMaterial.mockReturnValue({ data: [RESUME], isLoading: false });
    wrap();
    fireEvent.click(within(panel()).getByRole("button", { name: "Replace résumé" }));
    expect(screen.getByText(/personal modal open: Résumé/)).toBeInTheDocument();
  });
});

describe("Home profile tiles — bio and personal data", () => {
  beforeEach(() =>
    mockMyProfile.mockReturnValue({ data: { personal_docs: ["bio"] }, isError: false, refetch: jest.fn() }),
  );

  it("View Bio and Data is absent with no bio or data documents", () => {
    wrap();
    expect(within(panel()).queryByRole("button", { name: "View Bio and Data" })).toBeNull();
  });

  it("one document opens straight away", async () => {
    mockMaterial.mockReturnValue({ data: [BIO], isLoading: false });
    wrap();
    fireEvent.click(within(panel()).getByRole("button", { name: "View Bio and Data" }));
    expect(mockGetDownloadUrl).toHaveBeenCalledWith("b1");
    expect(await screen.findByTestId("doc-viewer-pdf")).toBeInTheDocument();
  });

  it("several are listed first, bio and additional info, then each opens", async () => {
    mockMaterial.mockReturnValue({ data: [BIO, INFO, RESUME], isLoading: false });
    wrap();
    fireEvent.click(within(panel()).getByRole("button", { name: "View Bio and Data" }));
    const list = screen.getByTestId("profile-material-dialog");
    expect(within(list).getByTestId("profile-material-b1")).toHaveTextContent("Bio");
    expect(within(list).getByTestId("profile-material-i1")).toHaveTextContent("Additional info");
    // The résumé is not "bio and data".
    expect(within(list).queryByTestId("profile-material-r1")).toBeNull();
    fireEvent.click(within(list).getByTestId("profile-material-i1"));
    await waitFor(() => expect(mockGetDownloadUrl).toHaveBeenCalledWith("i1"));
    expect(await screen.findByTestId("doc-viewer-pdf")).toBeInTheDocument();
  });

  it("additional-info documents alone are enough to offer the pill", () => {
    mockMyProfile.mockReturnValue({ data: { personal_docs: ["personal"] }, isError: false, refetch: jest.fn() });
    mockMaterial.mockReturnValue({ data: [INFO], isLoading: false });
    wrap();
    expect(within(panel()).getByRole("button", { name: "View Bio and Data" })).toBeInTheDocument();
  });

  it("Update bio still opens the tagged upload", () => {
    mockMaterial.mockReturnValue({ data: [BIO], isLoading: false });
    wrap();
    fireEvent.click(within(panel()).getByRole("button", { name: "Update bio" }));
    expect(screen.getByText(/personal modal open: Bio/)).toBeInTheDocument();
  });
});

describe("Home profile tiles — Upload additional info", () => {
  it("shows with nothing on file and opens the upload for the 'personal' kind", () => {
    wrap();
    fireEvent.click(within(panel()).getByRole("button", { name: "Upload additional info" }));
    expect(screen.getByText(/personal modal open: Additional Info \(personal\)/)).toBeInTheDocument();
  });

  it("leaves Add bio and View Bio and Data as they were", () => {
    mockMyProfile.mockReturnValue({ data: { personal_docs: ["bio"] }, isError: false, refetch: jest.fn() });
    mockMaterial.mockReturnValue({ data: [BIO], isLoading: false });
    wrap();
    expect(within(panel()).getByRole("button", { name: "Update bio" })).toBeInTheDocument();
    expect(within(panel()).getByRole("button", { name: "View Bio and Data" })).toBeInTheDocument();
    expect(within(panel()).getByRole("button", { name: "Upload additional info" })).toBeInTheDocument();
  });
});
