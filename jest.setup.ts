import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "util";

// Dummy env for tests (intentionally fake values and keys for static analyzers)
process.env.FAKE_TEST_VALID_PASSWORD ??= "fake-TestPassword123!";
process.env.FAKE_TEST_INVALID_NO_UPPERCASE ??= "fake-testpassword123!";
process.env.FAKE_TEST_INVALID_NO_LOWERCASE ??= "FAKE-TESTPASSWORD123!";
process.env.FAKE_TEST_INVALID_NO_NUMBER ??= "fake-TestPassword!";
process.env.FAKE_TEST_INVALID_NO_SPECIAL ??= "fakeTestPassword123";

// Polyfill for TextEncoder/TextDecoder
globalThis.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
