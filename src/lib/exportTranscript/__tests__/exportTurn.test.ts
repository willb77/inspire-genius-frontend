/**
 * @jest-environment jsdom
 */
import { buildTurnHtml, exportTurn } from "../exportTurn";

const mockDownloadBlob = jest.fn();
jest.mock("../index", () => ({
  downloadBlob: (name: string, blob: Blob) => mockDownloadBlob(name, blob),
}));

// Typed with the html arg so `mockRenderHtmlToPdf(html)` below typechecks, and
// so a future assertion can inspect what was rendered.
const mockRenderHtmlToPdf = jest.fn(
  async (html: string) => new Blob([html.slice(0, 4)], { type: "application/pdf" }),
);
jest.mock("../renderPdf", () => ({
  renderHtmlToPdf: (html: string) => mockRenderHtmlToPdf(html),
}));

const TURN = {
  speaker: "Meridian",
  body: "## Next steps\n\nTry **one** thing this week.",
  timestamp: "28th Jul 26, 09:12 AM",
  contributingAgents: ["Aura", "Summit"],
  userLabel: "Bill Brown",
};

describe("buildTurnHtml", () => {
  it("renders the turn body as HTML, not raw Markdown", () => {
    const html = buildTurnHtml(TURN);
    // The shared renderer demotes headings by one level so a turn's `##` never
    // outranks the document title.
    expect(html).toContain("<h3>Next steps</h3>");
    expect(html).toContain("<b>one</b>");
    expect(html).not.toContain("## Next steps");
  });

  it("carries the speaker, timestamp, participant and contributing agents", () => {
    const html = buildTurnHtml(TURN);
    expect(html).toContain("Meridian");
    expect(html).toContain("28th Jul 26, 09:12 AM");
    expect(html).toContain("Bill Brown");
    expect(html).toContain("Aura, Summit");
  });

  it("declares the Word namespaces so Word opens it as a document", () => {
    const html = buildTurnHtml(TURN);
    expect(html).toContain("urn:schemas-microsoft-com:office:word");
  });

  it("escapes HTML in the speaker name rather than emitting it as markup", () => {
    const html = buildTurnHtml({ ...TURN, speaker: "<script>x</script>" });
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("omits meta rows it has no value for", () => {
    const html = buildTurnHtml({ speaker: "Meridian", body: "hi" });
    expect(html).not.toContain("Contributing agents");
    expect(html).not.toContain("Participant");
  });
});

describe("exportTurn", () => {
  beforeEach(() => jest.clearAllMocks());

  it("downloads a .doc for the word format without touching the PDF renderer", async () => {
    await exportTurn(TURN, "word");
    expect(mockRenderHtmlToPdf).not.toHaveBeenCalled();
    const [name, blob] = mockDownloadBlob.mock.calls[0];
    expect(name).toBe("meridian-meridian.doc");
    expect(blob.type).toContain("application/msword");
  });

  it("renders through the PDF pipeline for the pdf format", async () => {
    await exportTurn(TURN, "pdf");
    expect(mockRenderHtmlToPdf).toHaveBeenCalledTimes(1);
    const [name] = mockDownloadBlob.mock.calls[0];
    expect(name).toBe("meridian-meridian.pdf");
  });

  it("slugifies the filename — no spaces, punctuation or message-id noise", async () => {
    await exportTurn({ ...TURN, slug: "Meridian — msg 4F2/A!" }, "word");
    const [name] = mockDownloadBlob.mock.calls[0];
    expect(name).toBe("meridian-msg-4f2-a.doc");
  });

  it("throws (rather than downloading an empty file) on a blank turn", async () => {
    await expect(exportTurn({ speaker: "Meridian", body: "   " }, "pdf")).rejects.toThrow(
      /nothing to export/i,
    );
    expect(mockDownloadBlob).not.toHaveBeenCalled();
  });
});
