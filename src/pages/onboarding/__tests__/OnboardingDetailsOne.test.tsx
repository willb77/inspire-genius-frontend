/**
 * @jest-environment jsdom
 *
 * This test suite verifies the form behavior of OnboardingDetailsOne.
 * It mocks all external hooks/components so we test only the form logic,
 * validation, submission payload, DOB restrictions, and mutation flow.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OnboardingDetailsOne from "../OnboardingDetailsOne";

/* ---------------------------- Mock Dependencies --------------------------- */

/**
 * The organisation self-declaration block, added to this page 2026-08-26.
 *
 * Mocked rather than rendered, following this file's stated approach: it is a
 * React Query-backed component, so rendering it here would require a
 * QueryClientProvider around all five renders and would make a form-logic
 * suite depend on a network shape it does not care about.
 *
 * It is additive on the page — it neither blocks the form nor gates
 * completion — so stubbing it cannot mask a regression in what this file
 * actually tests. Its own behaviour belongs in its own test.
 */
jest.mock("@/components/org/DeclareOrganisation", () => ({
  DeclareOrganisation: () => <div data-testid="declare-organisation" />,
}));

/**
 * Mock useCreateProfileMutation so we can intercept mutate()
 * and verify payload + behavior without calling real API.
 */
jest.mock("@/hooks/onboarding/useCreateProfile", () => ({
  useCreateProfileMutation: jest.fn(),
}));

/**
 * Mock useAuth so we can check whether markFullName() is called.
 */
jest.mock("@/context/useAuth", () => ({ useAuth: jest.fn() }));

/**
 * Mock navigation since form uses navigate() after success.
 */
jest.mock("react-router-dom", () => ({ useNavigate: jest.fn() }));

/**
 * Mock Logo (irrelevant to testing form behavior)
 */
jest.mock("@/components/shared/Logo", () => ({
  Logo: () => <div data-testid="logo" />,
}));

/**
 * Mock ProgressBar
 */
jest.mock("@/components/onboarding/ProgressBar", () => (props: any) => (
  <div data-testid="progress">Progress {props.current}/{props.total}</div>
));

/**
 * Mock DatePicker so input behaves like a normal input.
 */
jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({ value, onChange, placeholder }: any) => (
    <input
      data-testid="date-picker"
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        // simulate react-hook-form style event
        onChange({ target: { value: e.target.value } });
      }}
    />
  ),
}));

/**
 * Mock form components used by react-hook-form.
 * We manually simulate register(), setValue(), watch(), etc.
 */
jest.mock("@/components/ui/form", () => {
  const { FormProvider, useFormContext } = require("react-hook-form");

  return {
    // Form wrapper passes methods through FormProvider
    Form: ({ children, ...methods }: any) => (
      <FormProvider {...methods}>{children}</FormProvider>
    ),

    /**
     * Manually implement FormField to work with react-hook-form behavior.
     * Ensures onChange, watch(), and value updates behave as expected.
     */
    FormField: ({ name, rules, render }: any) => {
      const { register, setValue, watch } = useFormContext();

      const reg = register(name, rules);
      const currentValue = watch(name);

      const field = {
        name,
        value: currentValue ?? "",
        onChange: (e: any) => {
          const value = e?.target?.value ?? e;
          setValue(name, value);
          if (reg.onChange) reg.onChange(e);
        },
        onBlur: reg.onBlur,
        ref: reg.ref,
      };

      return render({ field });
    },

    FormControl: ({ children }: any) => <>{children}</>,
    FormItem: ({ children }: any) => <>{children}</>,
    FormMessage: () => <div data-testid="form-message" />,
  };
});

/**
 * Mock basic UI inputs
 */
jest.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock("@/components/ui/textarea", () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

jest.mock("@/components/ui/button", () => ({
  Button: (props: any) => <button {...props} />,
}));

/* ------------------------ Import mocks after mocking ----------------------- */

import { useCreateProfileMutation } from "@/hooks/onboarding/useCreateProfile";
import { useAuth } from "@/context/useAuth";
import { useNavigate } from "react-router-dom";

/* ---------------------------- Test Suite Setup ---------------------------- */

describe("OnboardingDetailsOne", () => {
  const mockMutate = jest.fn();
  const mockMarkFullName = jest.fn();
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useAuth return values
    (useAuth as jest.Mock).mockReturnValue({
      markFullName: mockMarkFullName,
    });

    // Mock navigation handler
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);

    // Default mock mutation behavior
    (useCreateProfileMutation as jest.Mock).mockReturnValue({
      mutate: (payload: any, opts?: any) => {
        mockMutate(payload, opts);
        // Immediately simulate success callback
        return Promise.resolve(opts?.onSuccess ? opts.onSuccess() : undefined);
      },
      isPending: false,
    });
  });

  /* ------------------------------------------------------------------------
     TEST 1: Submitting valid form should:
     - Format date correctly
     - Include trimmed fields
     - Send proper payload
     - Trigger markFullName()
     - Navigate to next step
  ------------------------------------------------------------------------- */
  test("submits valid form, formats date and calls markFullName + navigate", async () => {
    const user = userEvent.setup();

    render(<OnboardingDetailsOne />);

    // Fill form
    await user.type(screen.getByPlaceholderText(/Enter your first name/i), "John");
    await user.type(screen.getByPlaceholderText(/Enter your last name/i), "Doe");
    await user.type(screen.getByPlaceholderText(/Select your date of birth/i), "1 Jan 2000");
    await user.type(screen.getByPlaceholderText(/e.g I am student preparing for exams/i), " Hello ");

    await user.click(screen.getByRole("button", { name: /next/i }));

    // Wait until mutate() is called
    await waitFor(() => expect(mockMutate).toHaveBeenCalled());

    // Validate payload
    const [payload] = mockMutate.mock.calls[0];
    expect(payload).toMatchObject({
      first_name: "John",
      last_name: "Doe",
      date_of_birth: "2000-01-01",
      additional_info: " Hello ",
    });

    // Validate side effects
    expect(mockMarkFullName).toHaveBeenCalledWith("John Doe");
    expect(mockNavigate).toHaveBeenCalledWith(expect.any(String), { replace: true });
  });

  /* ------------------------------------------------------------------------
     TEST 2: Required field validation should prevent submission.
  ------------------------------------------------------------------------- */
  test("does not submit when required fields missing", async () => {
    const user = userEvent.setup();

    render(<OnboardingDetailsOne />);

    // Missing first name
    await user.type(screen.getByPlaceholderText(/Enter your last name/i), "Doe");
    await user.type(screen.getByPlaceholderText(/Select your date of birth/i), "1 Jan 2000");

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(mockMutate).not.toHaveBeenCalled();
  });

  /* ------------------------------------------------------------------------
     TEST 3: Whitespace-only additional_info should be removed (set undefined)
  ------------------------------------------------------------------------- */
  test("about with whitespace only becomes undefined (not sent)", async () => {
    const user = userEvent.setup();

    const captured = jest.fn((opts?: any) => opts?.onSuccess && opts.onSuccess());
    (useCreateProfileMutation as jest.Mock).mockReturnValue({
      mutate: captured,
      isPending: false,
    });

    render(<OnboardingDetailsOne />);

    // Fill everything valid
    await user.type(screen.getByPlaceholderText(/Enter your first name/i), "Sam");
    await user.type(screen.getByPlaceholderText(/Enter your last name/i), "Green");
    await user.type(screen.getByPlaceholderText(/Select your date of birth/i), "1 Jan 1990");
    await user.type(screen.getByPlaceholderText(/e.g I am student preparing for exams/i), "    ");

    await user.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => expect(captured).toHaveBeenCalled());

    const [payload] = captured.mock.calls[0];
    expect(payload.additional_info).toBeUndefined();
  });

  /* ------------------------------------------------------------------------
     TEST 4: Button should be disabled when mutation is in progress.
  ------------------------------------------------------------------------- */
  test("button disabled when mutation is pending", () => {
    (useCreateProfileMutation as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
      isPending: true,
    });

    render(<OnboardingDetailsOne />);

    const btn = screen.getByRole("button", { name: /next/i });
    expect(btn).toBeDisabled();
  });

  /* ------------------------------------------------------------------------
     TEST 5: DOB validation — user must be at least 13 years old.
  ------------------------------------------------------------------------- */
  test("does not submit when DOB makes user younger than 13", async () => {
    const user = userEvent.setup();

    render(<OnboardingDetailsOne />);

    // Fill valid names
    await user.type(screen.getByPlaceholderText(/Enter your first name/i), "Young");
    await user.type(screen.getByPlaceholderText(/Enter your last name/i), "User");

    // Set DOB to today's date → Always under 13
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString("en-GB", { month: "short" });
    const year = today.getFullYear();

    await user.type(
      screen.getByPlaceholderText(/Select your date of birth/i),
      `${day} ${month} ${year}`
    );

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(mockMutate).not.toHaveBeenCalled();
  });
});
