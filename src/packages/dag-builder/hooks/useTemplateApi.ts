/**
 * Template API service layer + React Query hooks.
 *
 * Connects to the existing /v1/admin/templates CRUD endpoints
 * at services/agent-engine/app/routes/templates.py.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { type AxiosInstance } from "axios";
import type { EcosystemAdapter, EcosystemConfig } from "../types/ecosystem";
import type { DagTemplate } from "../types/dag";
import { useDagStore } from "./useDagStore";

// ─── API Client ─��───────────────────────────────────────────────

export class TemplateApiClient {
  private http: AxiosInstance;
  private adapter: EcosystemAdapter;

  constructor(baseUrl: string, adapter: EcosystemAdapter, httpClient?: AxiosInstance) {
    this.adapter = adapter;
    this.http = httpClient ?? axios.create({ baseURL: baseUrl });
  }

  async list(orgId?: string): Promise<DagTemplate[]> {
    const params = orgId ? { org_id: orgId } : {};
    const { data } = await this.http.get("/v1/admin/templates", { params });
    const templates = data.templates ?? data;
    return (templates as unknown[]).map((t) => this.adapter.fromApiFormat(t));
  }

  async get(id: string): Promise<DagTemplate> {
    const { data } = await this.http.get(`/v1/admin/templates/${id}`);
    return this.adapter.fromApiFormat(data);
  }

  async create(template: DagTemplate): Promise<DagTemplate> {
    const body = this.adapter.toApiFormat(template);
    const { data } = await this.http.post("/v1/admin/templates", body);
    return this.adapter.fromApiFormat(data);
  }

  async update(id: string, template: DagTemplate): Promise<DagTemplate> {
    const body = this.adapter.toApiFormat(template);
    const { data } = await this.http.patch(`/v1/admin/templates/${id}`, body);
    return this.adapter.fromApiFormat(data);
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/v1/admin/templates/${id}`);
  }
}

// ─── React Query Hooks ──────────────────────────────────────────

function makeClient(config: EcosystemConfig): TemplateApiClient {
  return new TemplateApiClient(config.apiBaseUrl, config.adapter, config.httpClient);
}

export function useTemplates(config: EcosystemConfig, orgId?: string) {
  return useQuery({
    queryKey: ["templates", orgId],
    queryFn: () => makeClient(config).list(orgId),
    staleTime: 30_000,
  });
}

export function useTemplate(config: EcosystemConfig, id: string) {
  return useQuery({
    queryKey: ["templates", id],
    queryFn: () => makeClient(config).get(id),
    enabled: !!id,
  });
}

export function useCreateTemplate(config: EcosystemConfig) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (template: DagTemplate) =>
      makeClient(config).create(template),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      useDagStore.setState({ isDirty: false });
    },
  });
}

export function useUpdateTemplate(config: EcosystemConfig) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, template }: { id: string; template: DagTemplate }) =>
      makeClient(config).update(id, template),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      qc.invalidateQueries({ queryKey: ["templates", vars.id] });
      useDagStore.setState({ isDirty: false });
    },
  });
}

export function useDeleteTemplate(config: EcosystemConfig) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => makeClient(config).delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}
