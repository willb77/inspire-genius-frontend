import { applyPartialToMessages } from "@/lib/chat/applyPartial";
import type { ChatMessage } from "@/types/chat";

const processing = (text?: string): ChatMessage =>
  ({
    id: "pending-1",
    kind: "processing",
    sender: "assistant",
    time: "10:00",
    ts: 1,
    isProcessing: true,
    type: "processing",
    text,
  }) as unknown as ChatMessage;

const userMsg = (text: string): ChatMessage =>
  ({
    id: "u-1",
    kind: "text",
    sender: "user",
    time: "10:00",
    ts: 0,
    text,
  }) as unknown as ChatMessage;

/** ChatMessage is a discriminated union; only some members carry `text`. */
const textOf = (m: ChatMessage): string | undefined =>
  "text" in m ? m.text : undefined;

describe("applyPartialToMessages", () => {
  it("writes the partial answer into the in-flight bubble", () => {
    const before = [userMsg("hello"), processing("Meridian is thinking...")];
    const after = applyPartialToMessages(before, "Here is the first part");

    expect(after).not.toBe(before);
    expect(textOf(after[1])).toBe("Here is the first part");
  });

  it("keeps the bubble in the processing state while text grows", () => {
    // The in-progress affordance must remain, and the settle handler
    // finds this bubble by kind === "processing".
    const after = applyPartialToMessages([processing()], "partial");
    expect(after[0].kind).toBe("processing");
  });

  it("targets the newest in-flight bubble when several exist", () => {
    const older = { ...processing("old"), id: "pending-old" } as ChatMessage;
    const newer = { ...processing("new"), id: "pending-new" } as ChatMessage;
    const after = applyPartialToMessages([older, newer], "fresh text");

    expect(textOf(after[0])).toBe("old");
    expect(textOf(after[1])).toBe("fresh text");
  });

  it("is a no-op for empty content so an un-promoted backend changes nothing", () => {
    // A frontend merge deploys to dev AND staging-b while the backend
    // only moves by tag, so this path runs against a backend that never
    // writes partial content.
    const before = [processing("Meridian is thinking...")];
    expect(applyPartialToMessages(before, "")).toBe(before);
  });

  it("returns the same reference when the text is unchanged", () => {
    // Guards against a re-render on every 2s poll.
    const before = [processing("same")];
    expect(applyPartialToMessages(before, "same")).toBe(before);
  });

  it("is a no-op when the turn has already settled", () => {
    const before = [userMsg("hello")];
    expect(applyPartialToMessages(before, "late arrival")).toBe(before);
  });

  it("does not disturb other messages", () => {
    const before = [userMsg("hello"), processing()];
    const after = applyPartialToMessages(before, "answer");
    expect(after[0]).toBe(before[0]);
  });
});
