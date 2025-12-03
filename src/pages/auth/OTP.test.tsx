/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OTP from "./OTP";

jest.mock('@/components/auth/AuthLayout', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/auth/AuthHeader', () => ({
  __esModule: true,
  default: ({ title }: any) => <h1>{title}</h1>,
}));

jest.mock('@/components/shared/OtpInputField', () => ({
  __esModule: true,
  OtpInputField: ({ value, onChange }: any) => (
    <div>
      {[0,1,2,3,4,5].map((i) => (
        <input
          key={i}
          aria-label={`otp-${i}`}
          value={value[i] || ""}
          onChange={(e) => {
            const arr = value.split("");
            arr[i] = e.target.value;
            onChange(arr.join(""));
          }}
        />
      ))}
    </div>
  ),
}));

const mockUseAuth = jest.fn();
jest.mock("@/context/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockRedirectHook = jest.fn();
jest.mock("@/hooks/useAuthRedirectForAuthPages", () => ({
  useAuthRedirectForAuthPages: () => mockRedirectHook(),
}));

const mockGetNextStep = jest.fn();
jest.mock("@/lib/storage", () => ({
  getNextStep: () => mockGetNextStep(),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

async function renderOTP(options?: {
  nextStep?: string;
  redirectTo?: string | null;
  authMock?: any;
}) {
  const {
    nextStep = "normal",
    redirectTo = null,
    authMock,
  } = options || {};

  mockGetNextStep.mockResolvedValue(nextStep);
  mockRedirectHook.mockReturnValue(redirectTo);

  if (authMock) {
    mockUseAuth.mockReturnValue(authMock);
  }

  await act(async () => {
    render(
      <MemoryRouter>
        <OTP />
      </MemoryRouter>
    );
  });
}

describe("OTP Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      verifyOtp: jest.fn(),
      resendOtp: jest.fn().mockResolvedValue(true),
      isLoading: false,
    });
  });

  test("renders header", async () => {
    await renderOTP();
    expect(screen.getByText("Almost Done")).toBeInTheDocument();
  });

  test("auto verify when OTP reaches 6 digits", async () => {
    const verifyOtpMock = jest.fn().mockResolvedValue(true);

    await renderOTP({
      authMock: {
        verifyOtp: verifyOtpMock,
        resendOtp: jest.fn(),
        isLoading: false,
      },
    });

    await act(async () => {
      for (let i = 0; i < 6; i++) {
        fireEvent.change(screen.getByLabelText(`otp-${i}`), {
          target: { value: `${i + 1}` },
        });
      }
    });

    await waitFor(() => {
      expect(verifyOtpMock).toHaveBeenCalledTimes(1);
    });
    
    expect(verifyOtpMock).toHaveBeenCalledWith("123456");
  });

  test("manual verify triggers verifyOtp once", async () => {
    const verifyOtpMock = jest.fn().mockResolvedValue(true);

    await renderOTP({
      authMock: {
        verifyOtp: verifyOtpMock,
        resendOtp: jest.fn(),
        isLoading: false,
      },
    });

    await act(async () => {
      for (let i = 0; i < 6; i++) {
        fireEvent.change(screen.getByLabelText(`otp-${i}`), {
          target: { value: "9" },
        });
      }
    });

    await waitFor(() => {
      expect(verifyOtpMock).toHaveBeenCalled();
    });

    expect(verifyOtpMock).toHaveBeenCalledWith("999999");
  });

  test("verify button is disabled when OTP is incomplete", async () => {
    await renderOTP();

    const verifyButton = screen.getByRole("button", { name: /verify/i });
    expect(verifyButton).toBeDisabled();

    // Enter only 5 digits
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        fireEvent.change(screen.getByLabelText(`otp-${i}`), {
          target: { value: "1" },
        });
      }
    });

    expect(verifyButton).toBeDisabled();
  });

  test("verify button shows loading state", async () => {
    await renderOTP({
      authMock: {
        verifyOtp: jest.fn(),
        resendOtp: jest.fn(),
        isLoading: true,
      },
    });

    expect(screen.getByText("Verifying...")).toBeInTheDocument();
  });

  test("hides login link when step=verify_mfa", async () => {
    await renderOTP({ nextStep: "verify_mfa" });

    await waitFor(() => {
      expect(screen.queryByText(/Already have an account/i)).not.toBeInTheDocument();
    });
  });

  test("shows login link when step=normal", async () => {
    await renderOTP({ nextStep: "normal" });

    await waitFor(() => {
      expect(screen.getByText(/Already have an account/i)).toBeInTheDocument();
    });
  });

  test("redirects when redirectHook returns path", async () => {
    await renderOTP({ redirectTo: "/dashboard" });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
    });
  });

  test("resend OTP works after timer", async () => {
    jest.useFakeTimers();

    const resendMock = jest.fn().mockResolvedValue(true);

    await renderOTP({
      authMock: {
        verifyOtp: jest.fn(),
        resendOtp: resendMock,
        isLoading: false,
      },
    });

    act(() => {
      jest.advanceTimersByTime(60000);
    });

    const resendButton = screen.getByText("Resend code");
    expect(resendButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(resendButton);
    });

    await waitFor(() => {
      expect(resendMock).toHaveBeenCalledTimes(1);
    });

    jest.useRealTimers();
  });

  test("timer counts down correctly", async () => {
    jest.useFakeTimers();

    await renderOTP();

    expect(screen.getByText(/01:00s/i)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(screen.getByText(/00:30s/i)).toBeInTheDocument();

    jest.useRealTimers();
  });

  test("resend button is disabled during timer", async () => {
    await renderOTP();

    const resendButton = screen.getByText("Resend code");
    expect(resendButton).toBeDisabled();
  });
});