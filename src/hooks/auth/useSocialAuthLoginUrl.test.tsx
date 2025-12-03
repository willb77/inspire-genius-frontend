import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSocialAuthLoginUrlMutation } from "./useSocialAuthLoginUrl";

import { getSocialAuthLoginUrl } from "@/services/auth.service";
import type { ApiEnvelope } from "@/types/auth/api-types";
import type { AxiosError } from "axios";

jest.mock("@/services/auth.service", () => ({
  getSocialAuthLoginUrl: jest.fn(),
}));

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });

  return ({ children }: any) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useSocialAuthLoginUrlMutation", () => {
  beforeEach(() => jest.clearAllMocks());

  const provider = "Google";

  const mockSuccessResponse: ApiEnvelope<{ login_url: string }> = {
    status: true,
    message: "Success",
    data: { login_url: "https://google.com/login" },
  };

  test("mutates successfully and returns login_url", async () => {
    (getSocialAuthLoginUrl as jest.Mock).mockResolvedValueOnce(
      mockSuccessResponse
    );

    const { result } = renderHook(
      () => useSocialAuthLoginUrlMutation(),
      { wrapper: wrapper() }
    );

    result.current.mutate({ provider });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getSocialAuthLoginUrl).toHaveBeenCalledWith(provider);
    expect(result.current.data).toEqual(mockSuccessResponse);
  });

  test("calls custom onSuccess handler", async () => {
    (getSocialAuthLoginUrl as jest.Mock).mockResolvedValueOnce(
      mockSuccessResponse
    );

    const onSuccessMock = jest.fn();

    const { result } = renderHook(
      () => useSocialAuthLoginUrlMutation({ onSuccess: onSuccessMock }),
      { wrapper: wrapper() }
    );

    result.current.mutate({ provider });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(onSuccessMock).toHaveBeenCalledWith(
      mockSuccessResponse,
      { provider },
      undefined
    );
  });

  test("handles error correctly on failed mutation", async () => {
    const mockError: AxiosError<ApiEnvelope> = {
      isAxiosError: true,
      message: "Request failed",
    } as AxiosError<ApiEnvelope>;

    (getSocialAuthLoginUrl as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(
      () => useSocialAuthLoginUrlMutation(),
      { wrapper: wrapper() }
    );

    result.current.mutate({ provider });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("Request failed");
  });

  test("calls custom onError handler", async () => {
    const mockError: AxiosError<ApiEnvelope> = {
      isAxiosError: true,
      message: "OAuth Service Down",
    } as AxiosError<ApiEnvelope>;

    (getSocialAuthLoginUrl as jest.Mock).mockRejectedValueOnce(mockError);

    const onErrorMock = jest.fn();

    const { result } = renderHook(
      () => useSocialAuthLoginUrlMutation({ onError: onErrorMock }),
      { wrapper: wrapper() }
    );

    result.current.mutate({ provider });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(onErrorMock).toHaveBeenCalledWith(
      mockError,
      { provider },
      undefined
    );
  });
});
