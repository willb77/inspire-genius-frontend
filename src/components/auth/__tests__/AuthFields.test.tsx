/**
 * This test suite verifies:
 * - Rendering and interaction behavior of individual auth input fields
 * - Social authentication UI behavior
 * - That providers are stored in sessionStorage
 * - Correct mutate function calls for social login
 */

import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import {
  FirstNameField,
  LastNameField,
  EmailField,
  PasswordField,
  SocialAuthSection,
} from "../AuthFields";

// MOCK SETUP

// Mock toast.error from sonner so real notifications are not triggered
jest.mock("sonner", () => ({
  toast: { error: jest.fn() },
}));

// Mock social authentication mutation hook
const mutateMock = jest.fn();

jest.mock("@/hooks/auth", () => ({
  useSocialAuthLoginUrlMutation: () => ({
    mutate: mutateMock,
    isPending: false,
  }),
}));

// Mock window.location so redirects do not break tests
delete (window as any).location;
window.location = { href: "" } as any;

// Mock sessionStorage safely
const mockSetItem = jest.fn();
const mockGetItem = jest.fn();
const mockRemoveItem = jest.fn();
const mockClear = jest.fn();

Object.defineProperty(window, "sessionStorage", {
  value: {
    setItem: mockSetItem,
    getItem: mockGetItem,
    removeItem: mockRemoveItem,
    clear: mockClear,
  },
  writable: true,
});

// FIELD TESTS

describe("Auth Field Components", () => {
  test("FirstNameField renders label and input", () => {
    // Renders input field and ensures value appears correctly
    render(<FirstNameField value="TestingFirstName" onChange={() => {}} />);

    expect(screen.getByLabelText("First Name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("TestingFirstName")).toBeInTheDocument();
  });

  test("LastNameField triggers onChange", () => {
    // Verifies typing triggers callback with updated value
    const onChange = jest.fn();
    render(<LastNameField value="" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Last Name"), {
      target: { value: "TestingLastName" },
    });

    expect(onChange).toHaveBeenCalledWith("TestingLastName");
  });

  test("EmailField renders placeholder", () => {
    // Ensures placeholder text is shown properly
    render(<EmailField value="" onChange={() => {}} />);

    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
  });

  test("PasswordField toggles visibility", () => {
    // Clicking icon toggles password visibility from "password" → "text"
    render(<PasswordField value="" onChange={() => {}} />);

    const iconButton = screen.getByRole("button");
    fireEvent.click(iconButton);

    expect(screen.getByPlaceholderText("••••••••")).toHaveAttribute(
      "type",
      "text"
    );
  });
});

// SOCIAL AUTH SECTION TESTS

describe("SocialAuthSection", () => {
  beforeEach(() => {
    mutateMock.mockReset();
    mockSetItem.mockClear();
  });

  test("renders Google button", () => {
    // Ensures the Google auth button appears
    render(<SocialAuthSection />);

    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();
  });

  test("clicking Google triggers mutate", () => {
    // Verifies clicking the button triggers social auth mutation
    render(<SocialAuthSection />);

    fireEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    );

    expect(mutateMock).toHaveBeenCalledWith(
      { provider: "Google" },
      expect.any(Object) // mutation options
    );
  });

  test("stores provider in sessionStorage", () => {
    // Ensures provider name is saved before redirecting
    render(<SocialAuthSection />);

    fireEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    );

    expect(mockSetItem).toHaveBeenCalledWith("auth:provider", "Google");
  });
});
