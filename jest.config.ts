import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  preset: "ts-jest/presets/default-esm", // ESM + TS support
  testEnvironment: "jsdom",

  extensionsToTreatAsEsm: [".ts", ".tsx"],

  moduleNameMapper: {
    // Image/asset imports → string stub (must precede the @/ alias so aliased
    // image paths like "@/assets/…/logo.jpeg" don't resolve to the real binary).
    "\\.(jpg|jpeg|png|gif|webp|avif|svg)$": "<rootDir>/src/test/fileMock.ts",
    "^@/(.*)$": "<rootDir>/src/$1", // Vite alias
    "^@inspiresgenius/dag-builder$": "<rootDir>/src/packages/dag-builder/index.ts",
    "\\.(css|scss|sass)$": "identity-obj-proxy",
  },

  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/e2e/"],

  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.test.json",
        diagnostics: {
          // TS1343 (import.meta not allowed) blocks emit without warnOnly.
          // The AST transformer below rewrites import.meta.env → process.env
          // so these diagnostics are harmless. Suppress them entirely.
          warnOnly: true,
          ignoreDiagnostics: ["TS1343", "TS2339"],
        },
        astTransformers: {
          before: ["./jest.vite-env-transform.ts"],
        },
      },
    ],
  },
};

export default config;
