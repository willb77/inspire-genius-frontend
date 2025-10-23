import { api } from "@/lib/axios";
import { getToken } from "@/lib/storage";

export function buildTourAudioUrl(textId: string): string {
  const base = (api.defaults.baseURL as string) || (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL || "";
  return `${base.replace(/\/+$/, "")}/v1/frontend-text/${encodeURIComponent(textId)}/audio-stream`;
}

export async function fetchTourAudioPcm(textId: string, controller?: AbortController): Promise<ArrayBuffer> {
  const url = buildTourAudioUrl(textId);
  const headers: Record<string, string> = {};
  const token = await getToken().catch(() => null);
  if (token) headers["access-token"] = token as string;
  const resp = await fetch(url, { method: "GET", headers, signal: controller?.signal, credentials: "include" });
  if (!resp.ok) throw new Error(`Failed to fetch audio: ${resp.status}`);
  return await resp.arrayBuffer();
}

export async function streamTourAudioPcm(
  textId: string,
  onChunk: (chunk: ArrayBuffer) => void,
  controller: AbortController
): Promise<void> {
  const url = buildTourAudioUrl(textId);
  const headers: Record<string, string> = {};
  const token = await getToken().catch(() => null);
  if (token) headers["access-token"] = token as string;

  const resp = await fetch(url, { method: "GET", headers, signal: controller.signal, credentials: "include" });
  if (!resp.ok || !resp.body) throw new Error(`Failed to stream audio: ${resp.status}`);

  const reader = resp.body.getReader();
  // Stream chunks to the consumer
  // Note: value is a Uint8Array; slice with byteOffset to get the exact ArrayBuffer portion
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value && value.byteLength) {
      const chunk = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
      onChunk(chunk);
    }
  }
}
