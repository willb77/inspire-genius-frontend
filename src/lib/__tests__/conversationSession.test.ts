import {
  getCurrentConversationId,
  newConversation,
  __resetConversationSessionCacheForTests,
} from "../conversationSession";

// secureStorage uses localStorage under the hood — jsdom provides one.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("conversationSession", () => {
  beforeEach(() => {
    localStorage.clear();
    __resetConversationSessionCacheForTests();
  });

  it("generates and persists a UUID on first call", async () => {
    const id = await getCurrentConversationId();
    expect(id).toMatch(UUID_PATTERN);
    // Should be retrievable directly from storage
    expect(localStorage.getItem("ig_conversation_session_id")).toBeTruthy();
  });

  it("returns the same UUID on subsequent calls (stable within a thread)", async () => {
    const first = await getCurrentConversationId();
    __resetConversationSessionCacheForTests();
    const second = await getCurrentConversationId();
    expect(second).toBe(first);
  });

  it("rotates the UUID when newConversation() is called", async () => {
    const first = await getCurrentConversationId();
    const fresh = await newConversation();
    expect(fresh).not.toBe(first);
    expect(fresh).toMatch(UUID_PATTERN);
    // Subsequent get returns the new id
    __resetConversationSessionCacheForTests();
    const after = await getCurrentConversationId();
    expect(after).toBe(fresh);
  });

  it("does NOT reuse the literal 'alex-chat' bug value", async () => {
    const id = await getCurrentConversationId();
    expect(id).not.toBe("alex-chat");
  });
});
