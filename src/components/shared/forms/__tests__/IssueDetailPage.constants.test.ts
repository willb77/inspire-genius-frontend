import {
  ISSUE_DETAIL_DEFAULTS,
  ISSUE_STATUSES,
  ISSUE_DETAIL_RULES,
  getStatusColor,
  getPriorityColor,
} from "../IssueDetailPage.constants";

describe("IssueDetailPage.constants", () => {
  /* --------------------------------
     DEFAULT VALUES
  --------------------------------- */
  it("should have correct default form values", () => {
    expect(ISSUE_DETAIL_DEFAULTS).toEqual({
      comment: "",
      status: "",
    });
  });

  it("should contain valid issue statuses", () => {
    expect(ISSUE_STATUSES).toEqual([
      "open",
      "in-progress",
      "resolved",
      "closed",
    ]);
  });

  /* --------------------------------
     COMMENT VALIDATION RULES
  --------------------------------- */
  it("should require comment", () => {
    expect(ISSUE_DETAIL_RULES.comment.required).toBe(
      "Comment is required"
    );
  });

  it("should validate minimum comment length", () => {
    expect(ISSUE_DETAIL_RULES.comment.minLength.value).toBe(5);
  });

  it("should validate maximum comment length", () => {
    expect(ISSUE_DETAIL_RULES.comment.maxLength.value).toBe(300);
  });

  it("should reject invalid comment characters", () => {
    const pattern = ISSUE_DETAIL_RULES.comment.pattern.value;
    expect(pattern.test("Valid comment 123")).toBe(true);
    expect(pattern.test("Invalid 💥")).toBe(false);
  });

  /* --------------------------------
     STATUS VALIDATION
  --------------------------------- */
  it("should allow empty status", () => {
    const validate = ISSUE_DETAIL_RULES.status.validate;
    expect(validate("")).toBe(true);
  });

  it("should allow valid status", () => {
    const validate = ISSUE_DETAIL_RULES.status.validate;
    expect(validate("open")).toBe(true);
    expect(validate("resolved")).toBe(true);
  });

  it("should reject invalid status", () => {
    const validate = ISSUE_DETAIL_RULES.status.validate;
    expect(validate("invalid-status")).toBe(
      "Invalid status selected"
    );
  });

  /* --------------------------------
     STATUS COLOR MAPPING
  --------------------------------- */
  it("should return correct color for status", () => {
    expect(getStatusColor("open")).toContain("yellow");
    expect(getStatusColor("in-progress")).toContain("blue");
    expect(getStatusColor("resolved")).toContain("green");
    expect(getStatusColor("closed")).toContain("green");
  });

  it("should return default color for unknown status", () => {
    expect(getStatusColor("unknown")).toContain("gray");
  });

  /* --------------------------------
     PRIORITY COLOR MAPPING
  --------------------------------- */
  it("should return correct color for priority", () => {
    expect(getPriorityColor("critical")).toContain("red");
    expect(getPriorityColor("high")).toContain("orange");
    expect(getPriorityColor("medium")).toContain("yellow");
    expect(getPriorityColor("low")).toContain("green");
  });

  it("should return default color for unknown priority", () => {
    expect(getPriorityColor("unknown")).toContain("gray");
  });
});
