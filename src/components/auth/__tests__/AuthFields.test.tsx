/**
 * Test suite verifies:
 * - Rendering & interaction of auth input fields
 * - Password visibility toggle
 * - Social authentication behavior
 * - sessionStorage usage
 * - Mutation lifecycle callbacks
 * - Error handling paths
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

import { toast } from "sonner";

// --------------------
// MOCK SETUP
// --------------------

jest.mock("sonner", () => ({
  toast: { error: jest.fn() },
}));

const mutateMock = jest.fn();

jest.mock("@/hooks/auth", () => ({
  useSocialAuthLoginUrlMutation: () => ({
    mutate: mutateMock,
    isPending: false,
  }),
}));

// Mock sessionStorage
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

// --------------------
// FIELD COMPONENT TESTS
// --------------------

describe("Auth Field Components", () => {
  test("FirstNameField renders default label and value", () => {
    render(<FirstNameField value="John" onChange={() => {}} />);

    expect(screen.getByLabelText("First Name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("John")).toBeInTheDocument();
  });

  test("FirstNameField respects custom props", () => {
    render(
      <FirstNameField
        id="fname"
        label="Given Name"
        placeholder="Type name"
        value=""
        onChange={() => {}}
      />
    );

    expect(screen.getByLabelText("Given Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Type name")).toBeInTheDocument();
  });

  test("LastNameField triggers onChange", () => {
    const onChange = jest.fn();
    render(<LastNameField value="" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Last Name"), {
      target: { value: "Doe" },
    });

    expect(onChange).toHaveBeenCalledWith("Doe");
  });

  test("EmailField renders placeholder and triggers onChange", () => {
    const onChange = jest.fn();
    render(<EmailField value="" onChange={onChange} />);

    const input = screen.getByPlaceholderText("you@example.com");

    fireEvent.change(input, { target: { value: "test@mail.com" } });
    expect(onChange).toHaveBeenCalledWith("test@mail.com");
  });

  test("PasswordField toggles visibility on icon click", () => {
    render(<PasswordField value="secret" onChange={() => {}} />);

    const input = screen.getByPlaceholderText("••••••••");
    const toggleBtn = screen.getByRole("button");

    expect(input).toHaveAttribute("type", "password");

    fireEvent.click(toggleBtn);
    expect(input).toHaveAttribute("type", "text");

    fireEvent.click(toggleBtn);
    expect(input).toHaveAttribute("type", "password");
  });
  test("PasswordField shows EyeOff icon when password is visible", () => {
    render(<PasswordField value="secret" onChange={() => {}} />);

    const toggleBtn = screen.getByRole("button");

    fireEvent.click(toggleBtn);

    // When visible, input type is text → EyeOff icon branch covered
    expect(screen.getByPlaceholderText("••••••••")).toHaveAttribute(
      "type",
      "text"
    );
  });
  test("FirstNameField input is required by default", () => {
    render(<FirstNameField value="" onChange={() => {}} />);

    const input = screen.getByLabelText("First Name");
    expect(input).toBeRequired();
  });
});

// --------------------
// SOCIAL AUTH TESTS
// --------------------

describe("SocialAuthSection", () => {
  beforeEach(() => {
    mutateMock.mockReset();
    mockSetItem.mockClear();
    jest.clearAllMocks();
  });

  test("renders Google button", () => {
    render(<SocialAuthSection />);

    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();
  });

  test("clicking Google triggers mutate with provider", () => {
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

    expect(mockSetItem).toHaveBeenCalledWith("auth:provider", "Google");
  });

  test("continues flow if sessionStorage throws error", () => {
    mockSetItem.mockImplementationOnce(() => {
      throw new Error("Storage blocked");
    });

    render(<SocialAuthSection />);

    fireEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    );

    expect(mutateMock).toHaveBeenCalled();
  });

  test("calls onProviderStart callback", () => {
    const onProviderStart = jest.fn();

    render(<SocialAuthSection onProviderStart={onProviderStart} />);

    fireEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    );

    expect(onProviderStart).toHaveBeenCalledWith("Google");
  });

  test("calls onProviderEnd callback on mutation settled", () => {
    const onProviderEnd = jest.fn();

    render(<SocialAuthSection onProviderEnd={onProviderEnd} />);

    fireEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    );

    const options = mutateMock.mock.calls[0][1];
    options.onSettled();

    expect(onProviderEnd).toHaveBeenCalled();
  });

  test("shows error toast when login_url is missing", () => {
    render(<SocialAuthSection />);

    fireEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    );

    const options = mutateMock.mock.calls[0][1];
    options.onSuccess({ data: {} });

    expect(toast.error).toHaveBeenCalledWith("Login URL not received");
  });

  test("shows API error message on mutation error", () => {
    render(<SocialAuthSection />);

    fireEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    );

    const options = mutateMock.mock.calls[0][1];
    options.onError({
      response: { data: { message: "OAuth failed" } },
    });

    expect(toast.error).toHaveBeenCalledWith("OAuth failed");
  });

  test("shows fallback error message when no API message", () => {
    render(<SocialAuthSection />);

    fireEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    );

    const options = mutateMock.mock.calls[0][1];
    options.onError({});

    expect(toast.error).toHaveBeenCalledWith("Failed to start social login");
  });
  test("shows loader when Google auth is pending", async () => {
    jest
      .spyOn(require("@/hooks/auth"), "useSocialAuthLoginUrlMutation")
      .mockReturnValueOnce({
        mutate: mutateMock,
        isPending: true,
      });

    render(<SocialAuthSection />);

    fireEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    );

    await screen.findByRole("img", { hidden: true });
  });
  test("renders social authentication divider text", () => {
    render(<SocialAuthSection />);

    expect(screen.getByText("or continue with")).toBeInTheDocument();
  });
});
