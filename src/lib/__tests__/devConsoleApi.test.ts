import { devConsoleApi, isDevConsoleConfigured } from "@/lib/devConsoleApi";

describe("devConsoleApi", () => {
  it("has the shared token and 401 interceptors attached", () => {
    // attachInterceptors adds exactly one request and one response handler.
    const req = (devConsoleApi.interceptors.request as unknown as { handlers: unknown[] }).handlers;
    const res = (devConsoleApi.interceptors.response as unknown as { handlers: unknown[] }).handlers;
    expect(req.filter(Boolean).length).toBe(1);
    expect(res.filter(Boolean).length).toBe(1);
  });

  it("is not configured when VITE_DEV_CONSOLE_URL is unset — the probe never fires", () => {
    expect(process.env.VITE_DEV_CONSOLE_URL).toBeUndefined();
    expect(isDevConsoleConfigured()).toBe(false);
  });

  it("is configured once a base URL is present", () => {
    const prev = devConsoleApi.defaults.baseURL;
    devConsoleApi.defaults.baseURL = "https://console.example.test";
    try {
      expect(isDevConsoleConfigured()).toBe(true);
    } finally {
      devConsoleApi.defaults.baseURL = prev;
    }
  });
});
