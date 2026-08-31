/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";

import MessageAttachments from "@/components/user/chat/MessageAttachments";
import type { ChatAttachment } from "@/types/chat";

// Honor defaultValue + {{filename}} interpolation so assertions are meaningful.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string; filename?: string }) =>
      (opts?.defaultValue ?? _key).replace("{{filename}}", opts?.filename ?? ""),
  }),
}));

const docAttachment: ChatAttachment = {
  kind: "document",
  filename: "prism-summary.docx",
  url: "https://s3.example/users/u1/generated/abc/prism-summary.docx?sig=xyz",
  format: "docx",
  content_type:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  size_bytes: 39235,
  expires_in: 3600,
};

describe("MessageAttachments", () => {
  it("renders a download link to the presigned URL", () => {
    render(<MessageAttachments attachments={[docAttachment]} />);
    const link = screen.getByTestId("message-attachment-download");
    expect(link).toHaveAttribute("href", docAttachment.url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("download", docAttachment.filename);
  });

  it("shows the filename, format, and size", () => {
    render(<MessageAttachments attachments={[docAttachment]} />);
    expect(screen.getByText(/prism-summary\.docx/)).toBeInTheDocument();
    expect(screen.getByText(/DOCX/)).toBeInTheDocument();
    // 39235 bytes / 1024 = 38.3 → rounds to 38 KB
    expect(screen.getByText(/38 KB/)).toBeInTheDocument();
  });

  it("renders nothing when there are no attachments", () => {
    const { container } = render(<MessageAttachments attachments={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when attachments is undefined", () => {
    const { container } = render(<MessageAttachments />);
    expect(container).toBeEmptyDOMElement();
  });

  it("skips attachments missing a url", () => {
    const bad = { ...docAttachment, url: "" };
    const { container } = render(<MessageAttachments attachments={[bad]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one link per attachment", () => {
    render(
      <MessageAttachments
        attachments={[
          docAttachment,
          { ...docAttachment, filename: "deck.pptx", format: "pptx" },
        ]}
      />,
    );
    expect(screen.getAllByTestId("message-attachment-download")).toHaveLength(2);
  });
});
