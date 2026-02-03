import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "util";

// Dummy env for tests (intentionally fake values and keys for static analyzers)
process.env.FAKE_TEST_VALID_PASSWORD ??= "fake-TestPassword123!";
process.env.FAKE_TEST_INVALID_NO_UPPERCASE ??= "fake-testpassword123!";
process.env.FAKE_TEST_INVALID_NO_LOWERCASE ??= "FAKE-TESTPASSWORD123!";
process.env.FAKE_TEST_INVALID_NO_NUMBER ??= "fake-TestPassword!";
process.env.FAKE_TEST_INVALID_NO_SPECIAL ??= "fakeTestPassword123";
process.env.FAKE_TEST_MISMATCH_PASSWORD ??= "fake-WrongPassword";

process.env.FAKE_TEST_CHANGE_PASSWORD_CURRENT ??= "fake-oldPassword123";
process.env.FAKE_TEST_CHANGE_PASSWORD_NEW ??= "fake-newPassword456";
process.env.FAKE_TEST_CHANGE_PASSWORD_WRONG_CURRENT ??= "fake-wrongPassword";
process.env.FAKE_TEST_CHANGE_PASSWORD_DIFFERENT_CONFIRM ??= "fake-differentPassword789";

process.env.FAKE_TEST_CHANGE_PASSWORD_CURRENT_SHORT ??= "fake-old123";
process.env.FAKE_TEST_CHANGE_PASSWORD_NEW_SHORT ??= "fake-new123";
process.env.FAKE_TEST_CHANGE_PASSWORD_WRONG_SHORT ??= "fake-wrong";

process.env.FAKE_TEST_CHANGE_PASSWORD_CURRENT_TINY ??= "fake-old";
process.env.FAKE_TEST_CHANGE_PASSWORD_NEW_TINY ??= "fake-new";

process.env.FAKE_TEST_SIGNUP_PASSWORD ??= "fake-Password1!";
process.env.FAKE_TEST_SIGNUP_MISMATCH_PASSWORD ??= "fake-WrongPassword";
process.env.FAKE_TEST_SIGNUP_WEAK_PASSWORD ??= "fake-abc";

process.env.FAKE_TEST_BASIC_PASSWORD ??= "fake-pass123";
process.env.FAKE_TEST_MFA_PASSWORD ??= "fake-mypassword";
process.env.FAKE_TEST_OTP_SHORT_PASSWORD ??= "fake-1234";
process.env.FAKE_TEST_OTP_PASS_PASSWORD ??= "fake-pass";
process.env.FAKE_OTP ??= "123456";

// Polyfill for TextEncoder/TextDecoder
globalThis.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
