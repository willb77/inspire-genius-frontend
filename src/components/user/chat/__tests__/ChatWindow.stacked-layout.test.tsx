/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Heavy children are stubbed — this test is about the arrangement of the two
// cards in the stacked (V2) layout, not about what renders inside them.
jest.mock("@/components/user/chat/ChatWindowTopBanner", () => ({
  __esModule: true,
  default: () => <div data-testid="top-banner" />,
}));
jest.mock("@/components/user/chat/ChatWindowChatTab", () => ({
  __esModule: true,
  default: () => <div data-testid="chat-tab" />,
}));
jest.mock("@/components/user/chat/ChatWindowFloatingAudioPlayer", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/user/chat/ChatWindowInputBar", () => ({
  __esModule: true,
  default: (props: { expandable?: boolean }) => (
    <div data-testid="input-bar" data-expandable={String(!!props.expandable)} />
  ),
}));
jest.mock("@/components/user/chat/DocumentsSidePanel", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/user/chat/DocumentIframeModal", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/user/documents/UploadDocumentsModal", () => ({
  __esModule: true,
  default: () => null,
}));

import ChatWindow from "../ChatWindow";

function renderStacked() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ChatWindow stacked coachName="Meridian" coachId="meridian" messages={[]} />
    </QueryClientProvider>,
  );
}

describe("ChatWindow — stacked (V2) layout", () => {
  it("puts the Conversation card ABOVE the Compose Prompt card", () => {
    // 2026-08-05: the composer moved below the transcript. Asserting DOM order
    // rather than a class, so a future restyle can't quietly flip it back.
    renderStacked();
    const conversation = screen.getByTestId("v2-conversation-card");
    const compose = screen.getByTestId("v2-compose-card");

    const position = conversation.compareDocumentPosition(compose);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("asks the composer for an expandable text box", () => {
    renderStacked();
    expect(screen.getByTestId("input-bar")).toHaveAttribute(
      "data-expandable",
      "true",
    );
  });

  it("keeps the compose card from being squeezed by the conversation", () => {
    // `shrink-0` is what makes the slimmer card hold its height when the
    // transcript above it grows.
    renderStacked();
    expect(screen.getByTestId("v2-compose-card").className).toContain("shrink-0");
  });
});
