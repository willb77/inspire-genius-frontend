/**
 * TDS O-W7R2-a: a date-only result is stored as midnight UTC, and was shown as
 * the day before in any zone west of UTC ("Nov 25" read as "Nov 24" in EST).
 * The formatter takes the zone from the runtime, so these tests pin it by
 * spying on `toLocaleDateString` and checking the options it receives, plus one
 * rendered check against a fixed zone that is independent of the machine's.
 */

import { formatAssessedDate } from "@/components/shared/settings/onFileHelpers";

afterEach(() => {
  jest.restoreAllMocks();
});

test("a midnight-UTC value is formatted in UTC, so it keeps its calendar day", () => {
  const spy = jest.spyOn(Date.prototype, "toLocaleDateString");
  formatAssessedDate("2026-11-25T00:00:00Z", "en-US");
  expect(spy).toHaveBeenCalledWith("en-US", expect.objectContaining({ timeZone: "UTC" }));
  expect(formatAssessedDate("2026-11-25T00:00:00Z", "en-US")).toBe("Nov 25, 2026");
});

test("a midnight-UTC value read as New York local would be the day before (the bug)", () => {
  // The control: what the old code produced in EST, proving the case is real.
  expect(
    new Date("2026-11-25T00:00:00Z").toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "America/New_York",
    }),
  ).toBe("Nov 24, 2026");
});

test("a value with a real time keeps the local zone (no timeZone override)", () => {
  const spy = jest.spyOn(Date.prototype, "toLocaleDateString");
  formatAssessedDate("2026-11-25T15:42:10Z", "en-US");
  const opts = spy.mock.calls[0][1] as Intl.DateTimeFormatOptions;
  expect(opts.timeZone).toBeUndefined();
});

test("a value on the hour (15:00 UTC) is a real time, not a date", () => {
  const spy = jest.spyOn(Date.prototype, "toLocaleDateString");
  formatAssessedDate("2026-11-25T15:00:00Z", "en-US");
  const opts = spy.mock.calls[0][1] as Intl.DateTimeFormatOptions;
  expect(opts.timeZone).toBeUndefined();
});

test("a value one millisecond past midnight UTC is a real time, not a date", () => {
  const spy = jest.spyOn(Date.prototype, "toLocaleDateString");
  formatAssessedDate("2026-11-25T00:00:00.001Z", "en-US");
  const opts = spy.mock.calls[0][1] as Intl.DateTimeFormatOptions;
  expect(opts.timeZone).toBeUndefined();
});

test("an unparseable value is returned as it came", () => {
  expect(formatAssessedDate("not a date", "en-US")).toBe("not a date");
});
