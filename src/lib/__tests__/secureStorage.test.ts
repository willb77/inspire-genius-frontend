/**
 * @jest-environment jsdom
 */

import { secureSetItem, secureGetItem, secureRemoveItem } from "../secureStorage";

// jsdom does not provide crypto.subtle, so secureStorage should fall back to plain JSON

describe("secureStorage — encrypt/decrypt with fallback", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("secureSetItem stores JSON when crypto.subtle is unavailable", async () => {
    await secureSetItem("test-key", { hello: "world" });
    const raw = localStorage.getItem("test-key");
    expect(raw).not.toBeNull();
    // Without crypto.subtle, it should be plain JSON
    expect(JSON.parse(raw!)).toEqual({ hello: "world" });
  });

  test("secureGetItem retrieves stored value", async () => {
    await secureSetItem("test-key", "some-value");
    const val = await secureGetItem<string>("test-key");
    expect(val).toBe("some-value");
  });

  test("secureGetItem returns null for missing key", async () => {
    const val = await secureGetItem("nonexistent");
    expect(val).toBeNull();
  });

  test("secureRemoveItem removes the key", async () => {
    await secureSetItem("test-key", "value");
    await secureRemoveItem("test-key");
    expect(localStorage.getItem("test-key")).toBeNull();
  });

  test("round-trip with complex object", async () => {
    const obj = { user: "test@example.com", roles: ["admin", "user"], count: 42 };
    await secureSetItem("complex", obj);
    const result = await secureGetItem<typeof obj>("complex");
    expect(result).toEqual(obj);
  });

  test("handles boolean values", async () => {
    await secureSetItem("flag", true);
    const val = await secureGetItem<boolean>("flag");
    expect(val).toBe(true);
  });

  test("handles null value gracefully", async () => {
    await secureSetItem("null-key", null);
    const val = await secureGetItem("null-key");
    expect(val).toBeNull();
  });
});
