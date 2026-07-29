/**
 * @jest-environment jsdom
 */

/* ---- Module mocks (before imports) ---- */

jest.mock("@/components/user/chat/AssistantMarkdown", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => <div>{text}</div>,
}));
jest.mock("@/components/user/chat/MessageAttachments", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/user/chat/MessageFeedback", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/observability/ObservabilityPanel", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn() } }));

// Radix's DropdownMenu opens on pointerdown, which jsdom does not synthesize.
// The repo convention (see DocumentsDropdown.test.tsx) is to render the content
// inline in tests; `onSelect` still fires on click, which is what we assert.
jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onSelect,
    ...rest
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  } & Record<string, unknown>) => (
    <button type="button" onClick={() => onSelect?.()} {...rest}>
      {children}
    </button>
  ),
}));

/* ---- Imports (after mocks) ---- */

import { createRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ChatWindowChatTab from "../ChatWindowChatTab";
import type { ChatMessage } from "@/types/chat";

const ASSISTANT: ChatMessage = {
  id: "m1",
  kind: "text",
  sender: "assistant",
  text: "Here is the plan.",
  time: "09:00 AM",
  ts: 1785315600000,
};

const USER: ChatMessage = {
  id: "m0",
  kind: "text",
  sender: "user",
  text: "What should I do?",
  time: "08:59 AM",
  ts: 1785315540000,
};

function renderTab(props: Partial<React.ComponentProps<typeof ChatWindowChatTab>> = {}) {
  return render(
    <ChatWindowChatTab
      renderMessages={[USER, ASSISTANT]}
      bottomRef={createRef<HTMLDivElement>()}
      onCopy={jest.fn()}
      onShowAudioPlayer={jest.fn()}
      genericMessages="thinking"
      {...props}
    />,
  );
}

describe("ChatWindowChatTab — per-turn export", () => {
  it("renders no export link when the page supplies no handler", () => {
    renderTab();
    expect(screen.queryByTestId("turn-export-trigger")).toBeNull();
  });

  it("renders one export link per turn when a handler is supplied", () => {
    renderTab({ onExportMessage: jest.fn() });
    expect(screen.getAllByTestId("turn-export-trigger")).toHaveLength(2);
  });

  it("exports the assistant turn as Word with that message", () => {
    const onExportMessage = jest.fn();
    renderTab({ onExportMessage });
    // Index 1 = the assistant turn (messages render in order).
    fireEvent.click(screen.getAllByTestId("turn-export-word")[1]);
    expect(onExportMessage).toHaveBeenCalledTimes(1);
    expect(onExportMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: "m1" }),
      "word",
    );
  });

  it("exports as PDF from the same menu", () => {
    const onExportMessage = jest.fn();
    renderTab({ onExportMessage });
    fireEvent.click(screen.getAllByTestId("turn-export-pdf")[1]);
    expect(onExportMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: "m1" }),
      "pdf",
    );
  });

  it("each turn's menu exports ITS OWN message, not the last one", () => {
    const onExportMessage = jest.fn();
    renderTab({ onExportMessage });
    fireEvent.click(screen.getAllByTestId("turn-export-word")[0]);
    expect(onExportMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: "m0" }),
      "word",
    );
  });

  it("offers no export on a message with no text", () => {
    const onExportMessage = jest.fn();
    renderTab({
      renderMessages: [{ ...ASSISTANT, text: "" }],
      onExportMessage,
    });
    expect(screen.queryByTestId("turn-export-trigger")).toBeNull();
  });
});
