import { api } from "@/lib/axios";

export type AlexDeviceIdResponse = {
  status?: boolean;
  success?: boolean;
  message?: string;
  data?: { device_id?: string } | { deviceId?: string } | Record<string, unknown>;
};

export async function getAlexDeviceId() {
  const { data } = await api.get<AlexDeviceIdResponse>("/v1/chat/AlexChat/device-id");
  // Normalize common shapes
  const raw = data?.data as { device_id?: string; deviceId?: string } | undefined;
  const device_id = (raw?.device_id || raw?.deviceId || (data as unknown as { device_id?: string })?.device_id || "").toString();
  return { ...data, device_id };
}

export type AlexHistoryParams = {
  device_key: string;
  limit?: number;
  offset?: number;
  start_date?: string; // YYYY-MM-DD
  end_date?: string;   // YYYY-MM-DD
};

export async function getAlexHistoryBlob(params: AlexHistoryParams) {
  const { device_key, limit = 100, offset = 0, start_date, end_date } = params;
  const res = await api.get("/v1/chat/AlexChat/history", {
    params: { device_key, limit, offset, start_date, end_date },
    responseType: "blob",
  });
  return res;
}

// History list (JSON) with limit/offset and optional device_key
export type AlexHistoryListParams = { limit?: number; offset?: number; device_key?: string };
export async function getAlexHistoryList(params: AlexHistoryListParams = {}) {
  const { limit = 100, offset = 0, device_key } = params;
  const { data } = await api.get("/v1/chat/AlexChat/history", {
    params: { limit, offset, device_key },
  });
  return data;
}
