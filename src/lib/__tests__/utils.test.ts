/**
 * @jest-environment jsdom
 */

import { cn } from "../utils";

describe("cn() — class merging utility", () => {
  test("merges multiple class strings", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  test("handles undefined and null values", () => {
    expect(cn("px-2", undefined, null, "py-1")).toBe("px-2 py-1");
  });

  test("handles empty string", () => {
    expect(cn("", "px-2")).toBe("px-2");
  });

  test("handles boolean conditionals", () => {
    const isActive = true;
    expect(cn("base", isActive && "active")).toBe("base active");
    expect(cn("base", false && "active")).toBe("base");
  });

  test("deduplicates Tailwind classes via twMerge", () => {
    // twMerge should resolve conflicting utilities
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  test("handles no arguments", () => {
    expect(cn()).toBe("");
  });

  test("handles arrays (clsx feature)", () => {
    expect(cn(["px-2", "py-1"])).toBe("px-2 py-1");
  });
});
