/**
 * @jest-environment jsdom
 */

// Mock crypto module used by storage.ts
jest.mock("@/lib/crypto", () => ({
  encryptString: jest.fn((val: string) => Promise.resolve(`enc:${val}`)),
  decryptString: jest.fn((val: string) =>
    Promise.resolve(val.startsWith("enc:") ? val.slice(4) : val)
  ),
}));

jest.mock("@/constants/routes", () => ({
  STORAGE_KEYS: {
    USER_TOKEN: "auth_token",
    USER_EMAIL: "user_email",
    USER_OBJ: "auth_user_obj",
    USER_REFRESH_TOKEN: "auth_refresh_token",
    USER_ROLE: "auth_role",
    USER_ONBOARDING: "auth_onboarding_done",
    USER_PASSWORD: "user_password",
    USER_SESSION: "auth_session",
    USER_NEXT_STEP: "auth_next_step",
    UI_SIDEBAR_OPEN: "ui_sidebar_open",
    UI_ALEX_FLOATING_OPEN: "ui_alex_floating_open",
  },
}));

import {
  getToken,
  setToken,
  removeToken,
  getRefreshToken,
  setRefreshToken,
  getEmail,
  setEmail,
  removeEmail,
  getPassword,
  setPassword,
  removePassword,
  getRole,
  setRole,
  getOnboardingFlag,
  setOnboardingFlag,
  getSession,
  setSession,
  getNextStep,
  setNextStep,
  removeNextStep,
  clearAuth,
  getUser,
  setUser,
  getUIFlag,
  setUIFlag,
} from "../storage";

describe("storage.ts — encrypted localStorage wrappers", () => {
  beforeEach(() => {
    localStorage.clear();
    // The storage module has an internal cache (Map). We need to re-import to clear it
    // but since we can't easily, we'll just test the localStorage round-trip via mocks.
  });

  test("setToken + getToken round-trip", async () => {
    await setToken("my-access-token");
    const val = await getToken();
    expect(val).toBe("my-access-token");
  });

  test("removeToken clears the token", async () => {
    await setToken("my-access-token");
    await removeToken();
    // After remove, localStorage key is gone. getToken should return null
    // but the cache may still have the null entry from removeEncrypted.
    const val = await getToken();
    expect(val).toBeNull();
  });

  test("setRefreshToken + getRefreshToken round-trip", async () => {
    await setRefreshToken("my-refresh-token");
    const val = await getRefreshToken();
    expect(val).toBe("my-refresh-token");
  });

  test("setEmail + getEmail round-trip", async () => {
    await setEmail("test@example.com");
    const val = await getEmail();
    expect(val).toBe("test@example.com");
  });

  test("removeEmail clears the email", async () => {
    await setEmail("test@example.com");
    await removeEmail();
    const val = await getEmail();
    expect(val).toBeNull();
  });

  test("setPassword + getPassword round-trip", async () => {
    await setPassword("secret123");
    const val = await getPassword();
    expect(val).toBe("secret123");
  });

  test("removePassword clears the password", async () => {
    await setPassword("secret123");
    await removePassword();
    const val = await getPassword();
    expect(val).toBeNull();
  });

  test("setRole + getRole round-trip", async () => {
    await setRole("super-admin");
    const val = await getRole();
    expect(val).toBe("super-admin");
  });

  test("setOnboardingFlag + getOnboardingFlag", async () => {
    await setOnboardingFlag(true);
    const val = await getOnboardingFlag();
    expect(val).toBe(true);

    await setOnboardingFlag(false);
    const val2 = await getOnboardingFlag();
    expect(val2).toBe(false);
  });

  test("setSession + getSession round-trip", async () => {
    await setSession("session-abc");
    const val = await getSession();
    expect(val).toBe("session-abc");
  });

  test("setNextStep + getNextStep + removeNextStep", async () => {
    await setNextStep("verify_email");
    const val = await getNextStep();
    expect(val).toBe("verify_email");

    await removeNextStep();
    const val2 = await getNextStep();
    expect(val2).toBeNull();
  });

  test("setUser + getUser round-trip", async () => {
    const userObj = { email: "test@example.com", role: "user" as const };
    await setUser(userObj);
    const stored = await getUser();
    expect(stored).toEqual(userObj);
  });

  test("clearAuth removes all auth keys", async () => {
    await setToken("tok");
    await setRefreshToken("ref");
    await setEmail("e@test.com");
    await setPassword("pass");
    await setRole("user");
    await setOnboardingFlag(true);
    await setSession("sess");
    await setNextStep("step");

    await clearAuth();

    expect(await getToken()).toBeNull();
    expect(await getRefreshToken()).toBeNull();
    expect(await getEmail()).toBeNull();
    expect(await getPassword()).toBeNull();
    expect(await getRole()).toBeNull();
    expect(await getSession()).toBeNull();
    expect(await getNextStep()).toBeNull();
  });

  test("getUIFlag + setUIFlag (plain localStorage)", () => {
    setUIFlag("test_flag", true);
    expect(getUIFlag("test_flag")).toBe(true);

    setUIFlag("test_flag", false);
    expect(getUIFlag("test_flag")).toBe(false);
  });
});
