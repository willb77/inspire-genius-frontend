import {
  TEAM_ROLES,
  TEAM_FORM_DEFAULTS,
  TEAM_FORM_RULES,
} from "../teamForm.constants";

import * as emailValidator from "../validateEmail";

describe("teamForm.constants", () => {
  describe("TEAM_ROLES", () => {
    test("contains all expected roles", () => {
      expect(TEAM_ROLES).toEqual([
        "Admin",
        "Manager",
        "Employee",
        "Human Resource",
        "Lead",
      ]);
    });

    test("roles array is not empty", () => {
      expect(TEAM_ROLES.length).toBeGreaterThan(0);
    });
  });

  describe("TEAM_FORM_DEFAULTS", () => {
    test("has correct default values", () => {
      expect(TEAM_FORM_DEFAULTS).toEqual({
        name: "",
        email: "",
        role: "",
        status: "Active",
      });
    });

    test("default status is Active", () => {
      expect(TEAM_FORM_DEFAULTS.status).toBe("Active");
    });
  });

  describe("TEAM_FORM_RULES", () => {
    test("name field is required", () => {
      expect(TEAM_FORM_RULES.name).toEqual({
        required: "Name is required",
      });
    });

    test("role field is required", () => {
      expect(TEAM_FORM_RULES.role).toEqual({
        required: "Role is required",
      });
    });

    test("email field has required rule", () => {
      expect(TEAM_FORM_RULES.email.required).toBe(
        "Email is required",
      );
    });

    test("email validation calls validateEmail", () => {
      const spy = jest.spyOn(emailValidator, "validateEmail");

      TEAM_FORM_RULES.email.validate("test@test.com");

      expect(spy).toHaveBeenCalledWith(
        "test@test.com",
        "Enter a valid email",
      );

      spy.mockRestore();
    });

    test("status field has no validation rules", () => {
      expect(TEAM_FORM_RULES.status).toEqual({});
    });
  });
});
