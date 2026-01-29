import "@testing-library/jest-dom";
import dotenv from "dotenv";

// Suppress dotenv console messages during tests
const originalConsoleLog = console.log;
console.log = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('[dotenv')) {
    return;
  }
  originalConsoleLog(...args);
};

// Load environment variables from .env file
dotenv.config({ path: ".env" });

// Restore console.log after dotenv loads
console.log = originalConsoleLog;

// Set defaults as fallback if .env is not found
process.env.TEST_VALID_PASSWORD = process.env.TEST_VALID_PASSWORD || "Test-Password123!";
process.env.TEST_INVALID_NO_UPPERCASE = process.env.TEST_INVALID_NO_UPPERCASE || "test-password123!";
process.env.TEST_INVALID_NO_LOWERCASE = process.env.TEST_INVALID_NO_LOWERCASE || "TEST-PASSWORD123!";
process.env.TEST_INVALID_NO_NUMBER = process.env.TEST_INVALID_NO_NUMBER || "Test-Password!";
process.env.TEST_INVALID_NO_SPECIAL = process.env.TEST_INVALID_NO_SPECIAL || "TestPassword123";

// Polyfill for TextEncoder/TextDecoder
global.TextEncoder = require("util").TextEncoder;
global.TextDecoder = require("util").TextDecoder;
