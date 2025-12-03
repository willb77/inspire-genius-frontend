import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import {
  FirstNameField,
  LastNameField,
  EmailField,
  PasswordField,
  SocialAuthSection,
} from "./AuthFields";

// ------------ MOCKS ------------

// Mock toast
jest.mock("sonner", () => ({
  toast: { error: jest.fn() },
}));

// Mock the social login mutation hook
const mutateMock = jest.fn();

jest.mock("@/hooks/auth", () => ({
  useSocialAuthLoginUrlMutation: () => ({
    mutate: mutateMock,
    isPending: false,
  }),
}));

// Mock window.location
delete (window as any).location;
window.location = { href: "" } as any;

// Mock sessionStorage
const mockSetItem = jest.fn();
const mockGetItem = jest.fn();
const mockRemoveItem = jest.fn();
const mockClear = jest.fn();

Object.defineProperty(window, 'sessionStorage', {
  value: {
    setItem: mockSetItem,
    getItem: mockGetItem,
    removeItem: mockRemoveItem,
    clear: mockClear,
  },
  writable: true,
});

// ------------ TESTS ------------

describe("Auth Field Components", () => {
  test("FirstNameField renders label and input", () => {
    render(<FirstNameField value="Abhi" onChange={() => {}} />);

    expect(screen.getByLabelText("First Name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Abhi")).toBeInTheDocument();
  });

  test("LastNameField triggers onChange", () => {
    const onChange = jest.fn();
    render(<LastNameField value="" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Last Name"), {
      target: { value: "Kurne" },
    });

    expect(onChange).toHaveBeenCalledWith("Kurne");
  });

  test("EmailField renders placeholder", () => {
    render(<EmailField value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
  });

  test("PasswordField toggles visibility", () => {
    render(<PasswordField value="" onChange={() => {}} />);

    const iconButton = screen.getByRole("button"); // rightIcon makes a button

    fireEvent.click(iconButton);

    expect(screen.getByPlaceholderText("••••••••")).toHaveAttribute(
      "type",
      "text"
    );
  });
});

// ------------ SOCIAL AUTH ------------

describe("SocialAuthSection", () => {
  beforeEach(() => {
    mutateMock.mockReset();
    mockSetItem.mockClear();
  });

  test("renders Google button", () => {
    render(<SocialAuthSection />);

    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();
  });

  test("clicking Google triggers mutate", () => {
    render(<SocialAuthSection />);

    fireEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    );

    expect(mutateMock).toHaveBeenCalledWith(
      { provider: "Google" },
      expect.any(Object)
    );
  });

  test("stores provider in sessionStorage", () => {
    render(<SocialAuthSection />);

    fireEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    );

    expect(mockSetItem).toHaveBeenCalledWith(
      "auth:provider",
      "Google"
    );
  });
});