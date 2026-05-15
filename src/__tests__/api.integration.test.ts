/**
 * API Integration Tests
 *
 * Tests the axios instance configuration, request interceptor token injection,
 * response interceptor error handling, and token refresh flow.
 */

// We need to test the real axios module, so we must NOT mock @/lib/axios here.
// Instead we mock the dependencies that axios.ts imports.

const mockGetToken = jest.fn();
const mockGetRefreshToken = jest.fn();
const mockSetToken = jest.fn();
const mockClearAuth = jest.fn();

jest.mock("@/lib/storage", () => ({
  getToken: (...args: unknown[]) => mockGetToken(...args),
  getRefreshToken: (...args: unknown[]) => mockGetRefreshToken(...args),
  setToken: (...args: unknown[]) => mockSetToken(...args),
  clearAuth: (...args: unknown[]) => mockClearAuth(...args),
}));

// Mock crypto to avoid SubtleCrypto errors in jsdom
jest.mock("@/lib/crypto", () => ({
  encryptString: jest.fn((val: string) => Promise.resolve(`enc:${val}`)),
  decryptString: jest.fn((val: string) =>
    Promise.resolve(val.startsWith("enc:") ? val.slice(4) : val)
  ),
}));

import axios from "axios";
import { api, syncAuthToken } from "@/lib/axios";

describe("API Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue(null);
    mockGetRefreshToken.mockResolvedValue(null);
    mockSetToken.mockResolvedValue(undefined);
    mockClearAuth.mockResolvedValue(undefined);
  });

  // ── 1. Axios instance configuration ─────────────────────────────────

  describe("Axios instance configuration", () => {
    it("has a baseURL configured", () => {
      // Default is http://localhost:3000 (from VITE_API_BASE_URL or fallback)
      expect(api.defaults.baseURL).toBeDefined();
      expect(typeof api.defaults.baseURL).toBe("string");
    });

    it("has withCredentials enabled", () => {
      expect(api.defaults.withCredentials).toBe(true);
    });

    it("has request interceptors registered", () => {
      // axios interceptor managers have a `handlers` array
      const handlers = (api.interceptors.request as any).handlers;
      expect(Array.isArray(handlers)).toBe(true);
      expect(handlers.length).toBeGreaterThan(0);
    });

    it("has response interceptors registered", () => {
      const handlers = (api.interceptors.response as any).handlers;
      expect(Array.isArray(handlers)).toBe(true);
      expect(handlers.length).toBeGreaterThan(0);
    });
  });

  // ── 2. Request interceptor adds auth header ─────────────────────────

  describe("Request interceptor", () => {
    it("injects access-token header when token is available", async () => {
      mockGetToken.mockResolvedValue("test-jwt-token");

      // Create a mock adapter to intercept the actual request config
      let capturedConfig: any = null;
      const originalAdapter = api.defaults.adapter;
      api.defaults.adapter = async (config) => {
        capturedConfig = config;
        return { data: {}, status: 200, statusText: "OK", headers: {}, config };
      };

      try {
        await api.get("/test-endpoint");
        expect(capturedConfig).not.toBeNull();
        // The interceptor should have set access-token
        const tokenHeader =
          capturedConfig.headers?.get?.("access-token") ??
          capturedConfig.headers?.["access-token"];
        expect(tokenHeader).toBe("test-jwt-token");
      } finally {
        api.defaults.adapter = originalAdapter;
      }
    });

    it("does not inject access-token header when no token exists", async () => {
      mockGetToken.mockResolvedValue(null);

      let capturedConfig: any = null;
      const originalAdapter = api.defaults.adapter;
      api.defaults.adapter = async (config) => {
        capturedConfig = config;
        return { data: {}, status: 200, statusText: "OK", headers: {}, config };
      };

      try {
        // Clear any default header from previous tests
        delete api.defaults.headers.common["access-token"];
        await api.get("/test-no-token");
        expect(capturedConfig).not.toBeNull();
        // Should NOT have access-token in request headers (or it should be null/undefined)
        const tokenHeader =
          capturedConfig.headers?.get?.("access-token") ??
          capturedConfig.headers?.["access-token"];
        // When no token, the header should not be set by the interceptor
        expect(tokenHeader).toBeFalsy();
      } finally {
        api.defaults.adapter = originalAdapter;
      }
    });
  });

  // ── 3. syncAuthToken helper ─────────────────────────────────────────

  describe("syncAuthToken", () => {
    it("sets access-token default header when token provided", () => {
      syncAuthToken("new-token");
      expect(api.defaults.headers.common["access-token"]).toBe("new-token");
    });

    it("removes access-token default header when null", () => {
      api.defaults.headers.common["access-token"] = "old-token";
      syncAuthToken(null);
      expect(api.defaults.headers.common["access-token"]).toBeUndefined();
    });
  });

  // ── 4. Error handling patterns ──────────────────────────────────────

  describe("Error handling", () => {
    let originalAdapter: any;

    beforeEach(() => {
      originalAdapter = api.defaults.adapter;
    });

    afterEach(() => {
      api.defaults.adapter = originalAdapter;
    });

    it("rejects with error for 400 response", async () => {
      api.defaults.adapter = async (config) => {
        const error = new axios.AxiosError(
          "Bad Request",
          "ERR_BAD_REQUEST",
          config as any,
          {},
          { status: 400, data: { error: "Bad request" }, statusText: "Bad Request", headers: {}, config: config as any },
        );
        throw error;
      };

      await expect(api.get("/bad-request")).rejects.toThrow();
    });

    it("rejects with error for 403 response", async () => {
      api.defaults.adapter = async (config) => {
        const error = new axios.AxiosError(
          "Forbidden",
          "ERR_BAD_REQUEST",
          config as any,
          {},
          { status: 403, data: { error: "Forbidden" }, statusText: "Forbidden", headers: {}, config: config as any },
        );
        throw error;
      };

      await expect(api.get("/forbidden")).rejects.toThrow();
    });

    it("rejects with error for 404 response", async () => {
      api.defaults.adapter = async (config) => {
        const error = new axios.AxiosError(
          "Not Found",
          "ERR_BAD_REQUEST",
          config as any,
          {},
          { status: 404, data: { error: "Not found" }, statusText: "Not Found", headers: {}, config: config as any },
        );
        throw error;
      };

      await expect(api.get("/not-found")).rejects.toThrow();
    });

    it("rejects with error for 500 response", async () => {
      api.defaults.adapter = async (config) => {
        const error = new axios.AxiosError(
          "Internal Server Error",
          "ERR_BAD_RESPONSE",
          config as any,
          {},
          { status: 500, data: { error: "Server error" }, statusText: "Internal Server Error", headers: {}, config: config as any },
        );
        throw error;
      };

      await expect(api.get("/server-error")).rejects.toThrow();
    });

    it("attempts token refresh on 401 when refresh token is available", async () => {
      mockGetRefreshToken.mockResolvedValue("refresh-token-123");

      // Mock the axios.post for refresh (the module uses raw axios.post, not api.post)
      const postSpy = jest.spyOn(axios, "post").mockResolvedValue({
        data: { data: { access_token: "new-access-token" } },
      });

      let callCount = 0;
      api.defaults.adapter = async (config) => {
        callCount++;
        if (callCount === 1) {
          // First call: 401 error
          const error = new axios.AxiosError(
            "Unauthorized",
            "ERR_BAD_RESPONSE",
            config as any,
            {},
            { status: 401, data: {}, statusText: "Unauthorized", headers: {}, config: config as any },
          );
          throw error;
        }
        // Second call (retry): success
        return { data: { ok: true }, status: 200, statusText: "OK", headers: {}, config };
      };

      const result = await api.get("/protected-endpoint");
      expect(result.data).toEqual({ ok: true });
      expect(postSpy).toHaveBeenCalledWith(
        expect.stringContaining("/v1/refresh-token"),
        expect.objectContaining({ refresh_token: "refresh-token-123" }),
        expect.any(Object),
      );

      postSpy.mockRestore();
    });

    it("clears auth on 401 when no refresh token is available", async () => {
      mockGetRefreshToken.mockResolvedValue(null);

      api.defaults.adapter = async (config) => {
        const error = new axios.AxiosError(
          "Unauthorized",
          "ERR_BAD_RESPONSE",
          config as any,
          {},
          { status: 401, data: {}, statusText: "Unauthorized", headers: {}, config: config as any },
        );
        throw error;
      };

      await expect(api.get("/protected-no-refresh")).rejects.toThrow();
      // clearAuth should have been called to wipe tokens
      expect(mockClearAuth).toHaveBeenCalled();
    });
  });
});
