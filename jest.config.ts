import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  preset: "ts-jest/presets/default-esm", // ESM + TS support
  testEnvironment: "jsdom",

  extensionsToTreatAsEsm: [".ts", ".tsx"],

  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1", // Vite alias
    "\\.(css|scss|sass)$": "identity-obj-proxy",
  },

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
