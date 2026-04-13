/**
 * @jest-environment jsdom
 */

// Mock storage before importing axios module
const mockGetToken = jest.fn<Promise<string | null>, []>();
const mockGetRefreshToken = jest.fn<Promise<string | null>, []>();
const mockSetToken = jest.fn<Promise<void>, [string]>();
const mockClearAuth = jest.fn<Promise<void>, []>();

jest.mock("@/lib/storage", () => ({
  getToken: (...args: unknown[]) => mockGetToken(...(args as [])),
  getRefreshToken: (...args: unknown[]) => mockGetRefreshToken(...(args as [])),
  setToken: (...args: unknown[]) => mockSetToken(...(args as [string])),
  clearAuth: (...args: unknown[]) => mockClearAuth(...(args as [])),
}));

import { api, syncAuthToken } from "../axios";

describe("axios.ts — API instance and helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete api.defaults.headers.common["access-token"];
  });

  describe("syncAuthToken", () => {
    test("sets access-token header when token is provided", () => {
      syncAuthToken("my-token");
      expect(api.defaults.headers.common["access-token"]).toBe("my-token");
    });

    test("removes access-token header when token is null", () => {
      api.defaults.headers.common["access-token"] = "existing";
      syncAuthToken(null);
      expect(api.defaults.headers.common["access-token"]).toBeUndefined();
    });
  });

  describe("api instance configuration", () => {
    test("has withCredentials enabled", () => {
      expect(api.defaults.withCredentials).toBe(true);
    });

    test("has baseURL configured", () => {
      // Falls back to localhost:3000 if env var not set
      expect(api.defaults.baseURL).toBeDefined();
      expect(typeof api.defaults.baseURL).toBe("string");
    });

    test("has request interceptors attached", () => {
      // At minimum, our token injection interceptor
      expect(api.interceptors.request.handlers.length).toBeGreaterThanOrEqual(1);
    });

    test("has response interceptors attached", () => {
      // At minimum, our 401 interceptor
      expect(api.interceptors.response.handlers.length).toBeGreaterThanOrEqual(1);
    });
  });
});
