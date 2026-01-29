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
      tsconfig: {
        module: "ESNext",
        target: "ES2020"
      }      },
    ],
  },
};

export default config;
