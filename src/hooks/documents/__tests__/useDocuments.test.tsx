/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import {
  useDocuments,
  useDownloadDocumentV2,
  useDeleteDocumentV2,
  useBulkDeleteDocumentsV2,
  useSearchDocumentsV2,
} from "@/hooks/documents/useDocuments";
import {
  listDocumentsV2,
  getDownloadUrl,
  deleteDocumentV2,
  searchDocuments,
} from "@/services/documents/documentService";
import { logAuditEvent } from "@/services/audit/audit.service";

jest.mock("@/services/documents/documentService", () => ({
  listDocumentsV2: jest.fn(),
  getDownloadUrl: jest.fn(),
  deleteDocumentV2: jest.fn(),
  searchDocuments: jest.fn(),
}));

jest.mock("@/services/audit/audit.service", () => ({
  logAuditEvent: jest.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const DOC_LIST = {
  documents: [
    {
      id: "doc-1",
      user_id: "u1",
      company_id: null,
      filename: "report.pdf",
      content_type: "application/pdf",
      file_size: 102400,
      status: "ready",
      status_detail: null,
      page_count: 10,
      chunk_count: 20,
      doc_kind: "report",
      tags: null,
      metadata: null,
      created_at: "2026-03-30T00:00:00Z",
      updated_at: "2026-03-30T00:00:00Z",
    },
  ],
  total: 1,
  limit: 20,
  offset: 0,
  has_more: false,
};

beforeEach(() => jest.clearAllMocks());

// ─── useDocuments ────────────────────────────────────────────────

describe("useDocuments", () => {
  it("returns document list on success", async () => {
    (listDocumentsV2 as jest.Mock).mockResolvedValueOnce(DOC_LIST);

    const { result } = renderHook(() => useDocuments(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(DOC_LIST);
    expect(listDocumentsV2).toHaveBeenCalledWith({});
  });

  it("passes filter params to listDocumentsV2", async () => {
    (listDocumentsV2 as jest.Mock).mockResolvedValueOnce(DOC_LIST);

    const params = { doc_kind: "report", limit: 10, offset: 0 };
    const { result } = renderHook(() => useDocuments(params), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listDocumentsV2).toHaveBeenCalledWith(params);
  });

  it("sets isError on failure", async () => {
    (listDocumentsV2 as jest.Mock).mockRejectedValueOnce(new Error("Server error"));

    const { result } = renderHook(() => useDocuments(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ─── useDownloadDocumentV2 ───────────────────────────────────────

describe("useDownloadDocumentV2", () => {
  it("returns presigned download URL", async () => {
    const url = "https://s3.example.com/doc-1?sig=abc";
    (getDownloadUrl as jest.Mock).mockResolvedValueOnce(url);

    const { result } = renderHook(() => useDownloadDocumentV2(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync("doc-1");
    });

    expect(getDownloadUrl).toHaveBeenCalledWith("doc-1");
    await waitFor(() => expect(result.current.data).toBe(url));
  });

  it("sets isError when download fails", async () => {
    (getDownloadUrl as jest.Mock).mockRejectedValueOnce(new Error("Not found"));

    const { result } = renderHook(() => useDownloadDocumentV2(), { wrapper: createWrapper() });

    await act(async () => {
      try {
        await result.current.mutateAsync("doc-missing");
      } catch {
        // swallow
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ─── useDeleteDocumentV2 ─────────────────────────────────────────

describe("useDeleteDocumentV2", () => {
  it("calls deleteDocumentV2 and logs audit event", async () => {
    (deleteDocumentV2 as jest.Mock).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useDeleteDocumentV2(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync("doc-1");
    });

    expect(deleteDocumentV2).toHaveBeenCalledWith("doc-1");
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "document_deleted", target_type: "document" }),
    );
  });

  it("sets isError when delete fails", async () => {
    (deleteDocumentV2 as jest.Mock).mockRejectedValueOnce(new Error("Forbidden"));

    const { result } = renderHook(() => useDeleteDocumentV2(), { wrapper: createWrapper() });

    await act(async () => {
      try {
        await result.current.mutateAsync("doc-1");
      } catch {
        // swallow
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ─── useBulkDeleteDocumentsV2 ────────────────────────────────────

describe("useBulkDeleteDocumentsV2", () => {
  it("deletes all documents in parallel and logs audit event with count", async () => {
    (deleteDocumentV2 as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useBulkDeleteDocumentsV2(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync(["doc-1", "doc-2", "doc-3"]);
    });

    expect(deleteDocumentV2).toHaveBeenCalledTimes(3);
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "document_deleted",
        extra_data: expect.objectContaining({ count: 3 }),
      }),
    );
  });
});

// ─── useSearchDocumentsV2 ────────────────────────────────────────

describe("useSearchDocumentsV2", () => {
  it("calls searchDocuments with the provided request", async () => {
    const searchResponse = {
      hits: [
        {
          document_id: "doc-1",
          filename: "report.pdf",
          chunk_content: "Relevant content",
          chunk_index: 0,
          page_number: 1,
          score: 0.95,
        },
      ],
      total: 1,
      query: "relevant",
    };
    (searchDocuments as jest.Mock).mockResolvedValueOnce(searchResponse);

    const { result } = renderHook(() => useSearchDocumentsV2(), { wrapper: createWrapper() });

    const req = { query: "relevant", limit: 5 };
    await act(async () => {
      await result.current.mutateAsync(req);
    });

    expect(searchDocuments).toHaveBeenCalledWith(req);
    await waitFor(() => expect(result.current.data).toEqual(searchResponse));
  });

  it("sets isError when search fails", async () => {
    (searchDocuments as jest.Mock).mockRejectedValueOnce(new Error("Search unavailable"));

    const { result } = renderHook(() => useSearchDocumentsV2(), { wrapper: createWrapper() });

    await act(async () => {
      try {
        await result.current.mutateAsync({ query: "test" });
      } catch {
        // swallow
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
