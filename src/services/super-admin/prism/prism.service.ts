import { agentApi } from "@/lib/agentApi";

const BASE = "/v1/agents/prism";

export interface PrismRow {
  id: string;
  user_id: string;
  gold: number;
  green: number;
  blue: number;
  orange: number;
  version: string;
  assessed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PrismListResponse {
  rows: PrismRow[];
  total: number;
}

export interface PrismListParams {
  user_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PrismCreateRequest {
  user_id: string;
  gold: number;
  green: number;
  blue: number;
  orange: number;
  version?: string;
}

export type PrismUpdateRequest = Partial<Omit<PrismCreateRequest, "user_id">>;

export async function listPrism(
  params: PrismListParams = {},
): Promise<PrismListResponse> {
  const { data } = await agentApi.get<PrismListResponse>(BASE, { params });
  return data;
}

export async function getPrism(rowId: string): Promise<PrismRow> {
  const { data } = await agentApi.get<PrismRow>(`${BASE}/${rowId}`);
  return data;
}

export async function createPrism(
  body: PrismCreateRequest,
): Promise<PrismRow> {
  const { data } = await agentApi.post<PrismRow>(BASE, body);
  return data;
}

export async function updatePrism(
  rowId: string,
  body: PrismUpdateRequest,
): Promise<PrismRow> {
  const { data } = await agentApi.patch<PrismRow>(`${BASE}/${rowId}`, body);
  return data;
}

export async function deletePrism(rowId: string): Promise<void> {
  await agentApi.delete(`${BASE}/${rowId}`);
}
