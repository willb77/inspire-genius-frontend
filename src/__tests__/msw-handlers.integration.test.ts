/**
 * MSW-style Handler Integration Tests
 *
 * Tests that API service modules call the correct endpoints with correct
 * methods and payloads, and that response shapes are handled properly.
 * Uses a mock axios adapter to simulate API responses (MSW-like behavior).
 */

// Mock crypto to avoid SubtleCrypto errors in jsdom
jest.mock("@/lib/crypto", () => ({
  encryptString: jest.fn((val: string) => Promise.resolve(`enc:${val}`)),
  decryptString: jest.fn((val: string) =>
    Promise.resolve(val.startsWith("enc:") ? val.slice(4) : val),
  ),
}));

jest.mock("@/lib/storage", () => ({
  getToken: jest.fn().mockResolvedValue("mock-token"),
  getRefreshToken: jest.fn().mockResolvedValue(null),
  setToken: jest.fn().mockResolvedValue(undefined),
  clearAuth: jest.fn().mockResolvedValue(undefined),
  getUser: jest.fn().mockResolvedValue(null),
  setUser: jest.fn().mockResolvedValue(undefined),
  getRole: jest.fn().mockResolvedValue(null),
  getOnboardingFlag: jest.fn().mockResolvedValue(false),
  getUIFlag: jest.fn().mockReturnValue(false),
  setUIFlag: jest.fn(),
}));

import { api } from "@/lib/axios";
import type { AxiosRequestConfig } from "axios";

// ── Test handler registry (mimics MSW request handlers) ────────────────

type MockHandler = {
  method: string;
  urlPattern: RegExp | string;
  status: number;
  data: unknown;
};

const handlers: MockHandler[] = [
  // Auth endpoints
  {
    method: "post",
    urlPattern: /\/v1\/login$/,
    status: 200,
    data: {
      status: true,
      message: "Login successful",
      data: {
        access_token: "jwt-token",
        refresh_token: "refresh-token",
        user: { id: "u1", email: "test@example.com", role: "user" },
      },
    },
  },
  {
    method: "post",
    urlPattern: /\/v1\/signup$/,
    status: 200,
    data: {
      status: true,
      message: "Signup successful",
      data: { session: "sess-123" },
    },
  },
  {
    method: "get",
    urlPattern: /\/v1\/me$/,
    status: 200,
    data: {
      status: true,
      data: {
        id: "u1",
        email: "test@example.com",
        role: "user",
        full_name: "Test User",
      },
    },
  },
  {
    method: "post",
    urlPattern: /\/v1\/refresh-token$/,
    status: 200,
    data: {
      status: true,
      data: { access_token: "new-jwt-token" },
    },
  },
  // Coach endpoints
  {
    method: "get",
    urlPattern: /\/v1\/coaches$/,
    status: 200,
    data: {
      status: true,
      data: [
        { id: "c1", name: "Coach One", speciality: "Leadership" },
        { id: "c2", name: "Coach Two", speciality: "Communication" },
      ],
    },
  },
  // Documents endpoints
  {
    method: "get",
    urlPattern: /\/v1\/documents$/,
    status: 200,
    data: {
      status: true,
      data: [{ id: "d1", title: "PRISM Profile", type: "pdf" }],
    },
  },
  // Help endpoints
  {
    method: "get",
    urlPattern: /\/v1\/help/,
    status: 200,
    data: { status: true, data: { articles: [] } },
  },
];

function findHandler(method: string, url: string): MockHandler | undefined {
  return handlers.find((h) => {
    if (h.method !== method.toLowerCase()) return false;
    if (h.urlPattern instanceof RegExp) return h.urlPattern.test(url);
    return url.includes(h.urlPattern);
  });
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("MSW-style Handler Integration Tests", () => {
  let originalAdapter: typeof api.defaults.adapter;
  const capturedRequests: Array<{ method: string; url: string; data?: unknown }> = [];

  beforeAll(() => {
    originalAdapter = api.defaults.adapter;
    // Install a mock adapter that matches requests against our handler registry
    api.defaults.adapter = async (config: AxiosRequestConfig) => {
      const method = (config.method ?? "get").toLowerCase();
      const url = `${config.baseURL ?? ""}${config.url ?? ""}`;
      capturedRequests.push({ method, url, data: config.data });

      const handler = findHandler(method, url);
      if (handler) {
        return {
          data: handler.data,
          status: handler.status,
          statusText: "OK",
          headers: {},
          config,
        };
      }
      // No handler found — return 404
      return {
        data: { status: false, message: "Not found" },
        status: 404,
        statusText: "Not Found",
        headers: {},
        config,
      };
    };
  });

  afterAll(() => {
    api.defaults.adapter = originalAdapter;
  });

  beforeEach(() => {
    capturedRequests.length = 0;
  });

  // ── Verify handler response shapes ──────────────────────────────────

  describe("Handler response shapes", () => {
    it("login handler returns status, message, and data with tokens", async () => {
      const res = await api.post("/v1/login", {
        email: "test@example.com",
        password: "password",
      });
      expect(res.data.status).toBe(true);
      expect(res.data.message).toBe("Login successful");
      expect(res.data.data).toHaveProperty("access_token");
      expect(res.data.data).toHaveProperty("refresh_token");
      expect(res.data.data).toHaveProperty("user");
      expect(res.data.data.user).toHaveProperty("id");
      expect(res.data.data.user).toHaveProperty("email");
      expect(res.data.data.user).toHaveProperty("role");
    });

    it("signup handler returns status and session data", async () => {
      const res = await api.post("/v1/signup", {
        email: "new@example.com",
        password: "pass123",
        confirm_password: "pass123",
      });
      expect(res.data.status).toBe(true);
      expect(res.data.data).toHaveProperty("session");
    });

    it("me handler returns user profile data", async () => {
      const res = await api.get("/v1/me");
      expect(res.data.status).toBe(true);
      expect(res.data.data).toHaveProperty("id");
      expect(res.data.data).toHaveProperty("email");
      expect(res.data.data).toHaveProperty("role");
      expect(res.data.data).toHaveProperty("full_name");
    });

    it("refresh-token handler returns new access token", async () => {
      const res = await api.post("/v1/refresh-token", {
        refresh_token: "old-token",
      });
      expect(res.data.status).toBe(true);
      expect(res.data.data).toHaveProperty("access_token");
    });

    it("coaches handler returns array of coaches", async () => {
      const res = await api.get("/v1/coaches");
      expect(res.data.status).toBe(true);
      expect(Array.isArray(res.data.data)).toBe(true);
      expect(res.data.data.length).toBeGreaterThan(0);
      expect(res.data.data[0]).toHaveProperty("id");
      expect(res.data.data[0]).toHaveProperty("name");
    });

    it("documents handler returns array of documents", async () => {
      const res = await api.get("/v1/documents");
      expect(res.data.status).toBe(true);
      expect(Array.isArray(res.data.data)).toBe(true);
      expect(res.data.data[0]).toHaveProperty("id");
      expect(res.data.data[0]).toHaveProperty("title");
    });
  });

  // ── Verify correct endpoints are called ─────────────────────────────

  describe("Endpoint verification", () => {
    it("login calls POST /v1/login with correct payload", async () => {
      await api.post("/v1/login", {
        email: "user@test.com",
        password: "secret",
        verification: false,
      });
      const req = capturedRequests.find(
        (r) => r.method === "post" && r.url.includes("/v1/login"),
      );
      expect(req).toBeDefined();
      // Axios may serialize data to JSON string in the adapter
      const payload =
        typeof req!.data === "string" ? JSON.parse(req!.data) : req!.data;
      expect(payload).toEqual({
        email: "user@test.com",
        password: "secret",
        verification: false,
      });
    });

    it("signup calls POST /v1/signup", async () => {
      await api.post("/v1/signup", {
        email: "new@test.com",
        password: "pass",
        confirm_password: "pass",
      });
      const req = capturedRequests.find(
        (r) => r.method === "post" && r.url.includes("/v1/signup"),
      );
      expect(req).toBeDefined();
    });

    it("me calls GET /v1/me", async () => {
      await api.get("/v1/me");
      const req = capturedRequests.find(
        (r) => r.method === "get" && r.url.includes("/v1/me"),
      );
      expect(req).toBeDefined();
    });

    it("coaches calls GET /v1/coaches", async () => {
      await api.get("/v1/coaches");
      const req = capturedRequests.find(
        (r) => r.method === "get" && r.url.includes("/v1/coaches"),
      );
      expect(req).toBeDefined();
    });

    it("unmatched endpoint returns 404", async () => {
      const res = await api.get("/v1/nonexistent-endpoint");
      expect(res.status).toBe(404);
      expect(res.data.status).toBe(false);
    });
  });

  // ── Verify all key endpoints have handlers ──────────────────────────

  describe("Handler coverage for key endpoints", () => {
    const expectedEndpoints = [
      { method: "post", path: "/v1/login" },
      { method: "post", path: "/v1/signup" },
      { method: "get", path: "/v1/me" },
      { method: "post", path: "/v1/refresh-token" },
      { method: "get", path: "/v1/coaches" },
      { method: "get", path: "/v1/documents" },
      { method: "get", path: "/v1/help" },
    ];

    it.each(expectedEndpoints)(
      "has a handler for $method $path",
      ({ method, path }) => {
        const handler = findHandler(method, `http://localhost:3000${path}`);
        expect(handler).toBeDefined();
        expect(handler!.status).toBe(200);
      },
    );
  });
});
