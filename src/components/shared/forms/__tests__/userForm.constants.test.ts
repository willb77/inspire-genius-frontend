import {
  User_FORM_DEFAULTS,
  User_FORM_RULES,
  type UserFormValues,
} from "../userForm.constants";

describe("User Form Constants", () => {
  /* -------------------------------------------------
    DEFAULT VALUES
  ------------------------------------------------- */
  describe("User_FORM_DEFAULTS", () => {
    it("should contain correct default values", () => {
      expect(User_FORM_DEFAULTS).toEqual<UserFormValues>({
        first_name: "",
        last_name: "",
        email: "",
        role: "",
        status: "Active",
      });
    });
  });

  /* -------------------------------------------------
    REQUIRED FIELD RULES
  ------------------------------------------------- */
  describe("User_FORM_RULES required fields", () => {
    it("should require first_name", () => {
      expect(User_FORM_RULES.first_name.required).toBe(
        "First name is required"
      );
    });

    it("should require last_name", () => {
      expect(User_FORM_RULES.last_name.required).toBe(
        "Last name is required"
      );
    });

    it("should require role", () => {
      expect(User_FORM_RULES.role.required).toBe("Role is required");
    });

    it("should require email", () => {
      expect(User_FORM_RULES.email.required).toBe("Email is required");
    });
  });

  /* -------------------------------------------------
    EMAIL VALIDATION
  ------------------------------------------------- */
  describe("User_FORM_RULES.email.validate", () => {
    const validate = User_FORM_RULES.email.validate;

    it("returns true for empty value (handled by required rule)", () => {
      expect(validate("")).toBe(true);
    });

    it("fails when email contains spaces", () => {
      expect(validate("test user@gmail.com")).toBe("Enter a valid email");
    });

    it("fails when @ is missing", () => {
      expect(validate("testgmail.com")).toBe("Enter a valid email");
    });

    it("fails when email starts with @", () => {
      expect(validate("@gmail.com")).toBe("Enter a valid email");
    });

    it("fails when email has multiple @ symbols", () => {
      expect(validate("test@@gmail.com")).toBe("Enter a valid email");
    });

    it("fails when domain has no dot", () => {
      expect(validate("test@gmailcom")).toBe("Enter a valid email");
    });

    it("fails when domain starts with dot", () => {
      expect(validate("test@.com")).toBe("Enter a valid email");
    });

    it("fails when domain ends with dot", () => {
      expect(validate("test@gmail.")).toBe("Enter a valid email");
    });

    it("passes for valid email", () => {
      expect(validate("test@gmail.com")).toBe(true);
    });

    it("passes for subdomain email", () => {
      expect(validate("test@mail.company.com")).toBe(true);
    });
  });

  /* -------------------------------------------------
    STATUS RULE
  ------------------------------------------------- */
  describe("User_FORM_RULES.status", () => {
    it("should exist as an object", () => {
      expect(User_FORM_RULES.status).toBeDefined();
    });
  });
});
