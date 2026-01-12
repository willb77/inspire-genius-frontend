import { useEffect, useMemo, useRef, useState } from "react";
import { secureGetItem } from "@/lib/secureStorage";
import {
  audioBufferToWavArrayBuffer,
  CHAT_AUDIO_DB_PRUNE_CONFIG,
  getConversationAudioDecrypted,
  listConversationAudioIndices,
  pruneChatAudioDb,
  putConversationAudioEncrypted,
} from "@/lib/chatAudioDb";

type UseChatWindowAudioParams = {
  messages: Array<{ id: string; kind: string; sender?: string }>;
  audioPlayerBuffer: AudioBuffer | null | undefined;
  showAudioPlayer: boolean | undefined;
  setShowAudioPlayer?: (open: boolean) => void;
  onCloseAudioPlayer?: () => void;
};

type UseChatWindowAudioReturn = {
  activeConversationId: string | null;
  audioIndexByMessageId: Map<string, number>;
  hasAudioForMessageId: (messageId: string) => boolean;
  playForMessageId: (messageId: string) => Promise<void>;
  activeBuffer: AudioBuffer | null;
  playerKey: string;
  clearOverride: () => void;
};

export function useChatWindowAudio({
  messages,
  audioPlayerBuffer,
  showAudioPlayer,
  setShowAudioPlayer,
  onCloseAudioPlayer,
}: UseChatWindowAudioParams): UseChatWindowAudioReturn {
  const renderMessages = useMemo(() => messages ?? [], [messages]);
  const lastMessageId = renderMessages.length ? renderMessages[renderMessages.length - 1]?.id : undefined;

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const prevConversationIdRef = useRef<string | null>(null);

  const [audioIndices, setAudioIndices] = useState<Set<number>>(() => new Set());

  const audioIndexByMessageId = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const m of renderMessages) {
      if (m.kind === "text" && m.sender === "assistant") {
        map.set(m.id, idx);
        idx++;
      }
    }
    return map;
  }, [renderMessages]);

  const decodedCacheRef = useRef<Map<number, AudioBuffer>>(new Map());
  const decodeCtxRef = useRef<AudioContext | null>(null);
  const [overrideAudioBuffer, setOverrideAudioBuffer] = useState<AudioBuffer | null>(null);
  const [playerKey, setPlayerKey] = useState<string>("live");

  const lastStoredSamplesRef = useRef<Map<string, number>>(new Map());
  const pendingStoreRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const TARGET_STORAGE_SAMPLE_RATE = 16000;

  const resampleForStorage = async (buf: AudioBuffer): Promise<AudioBuffer> => {
    if (buf.sampleRate === TARGET_STORAGE_SAMPLE_RATE) return buf;
    try {
      const frames = Math.max(1, Math.round((buf.length / buf.sampleRate) * TARGET_STORAGE_SAMPLE_RATE));
      const offline = new OfflineAudioContext(buf.numberOfChannels, frames, TARGET_STORAGE_SAMPLE_RATE);
      const src = offline.createBufferSource();
      src.buffer = buf;
      src.connect(offline.destination);
      src.start(0);
      return await offline.startRendering();
    } catch {
      return buf;
    }
  };

  useEffect(() => {
    let mounted = true;
    secureGetItem<{ id?: string }>("conv")
      .then((v) => {
        if (!mounted) return;
        const id = typeof v?.id === "string" ? v.id : null;
        setActiveConversationId(id);
      })
      .catch(() => {
        if (!mounted) return;
        setActiveConversationId(null);
      });
    return () => {
      mounted = false;
    };
  }, [renderMessages.length, lastMessageId]);

  useEffect(() => {
    const convId = activeConversationId;
    if (!convId) {
      setAudioIndices(new Set());
      return;
    }

    let mounted = true;
    listConversationAudioIndices(convId)
      .then((indices) => {
        if (!mounted) return;
        setAudioIndices(new Set(indices));
      })
      .catch(() => {
        if (!mounted) return;
        setAudioIndices(new Set());
      });

    const prev = prevConversationIdRef.current;
    if (prev && prev !== convId) {
      decodedCacheRef.current.clear();
      setOverrideAudioBuffer(null);
      if (pendingStoreRef.current) {
        clearTimeout(pendingStoreRef.current);
        pendingStoreRef.current = null;
      }
      lastStoredSamplesRef.current.clear();
    }
    prevConversationIdRef.current = convId;

    return () => {
      mounted = false;
    };
  }, [activeConversationId]);

  useEffect(() => {
    const convId = activeConversationId;
    if (!convId) return;
    if (!audioPlayerBuffer) return;
    if (!lastMessageId) return;

    const idx = audioIndexByMessageId.get(lastMessageId);
    if (typeof idx !== "number") return;

    const key = `${convId}:${idx}`;
    const lastStored = lastStoredSamplesRef.current.get(key) ?? 0;
    const nextLen = audioPlayerBuffer.length;
    if (nextLen <= lastStored) return;

    if (pendingStoreRef.current) {
      clearTimeout(pendingStoreRef.current);
      pendingStoreRef.current = null;
    }

    pendingStoreRef.current = setTimeout(() => {
      pendingStoreRef.current = null;
      (async () => {
        const normalized = await resampleForStorage(audioPlayerBuffer);
        const wav = await audioBufferToWavArrayBuffer(normalized);
        await putConversationAudioEncrypted(convId, idx, wav, "audio/wav");

        await pruneChatAudioDb(CHAT_AUDIO_DB_PRUNE_CONFIG);

        lastStoredSamplesRef.current.set(key, nextLen);
        setAudioIndices((prevSet) => {
          const copy = new Set(prevSet);
          copy.add(idx);
          return copy;
        });
      })().catch(() => {
        // ignore
      });
    }, 1200);
  }, [activeConversationId, audioIndexByMessageId, audioPlayerBuffer, lastMessageId]);

  const ensureDecodeContext = () => {
    const Ctx: typeof AudioContext | undefined =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!decodeCtxRef.current) decodeCtxRef.current = new Ctx();
    return decodeCtxRef.current;
  };

  const hasAudioForMessageId = (messageId: string): boolean => {
    const idx = audioIndexByMessageId.get(messageId);
    if (typeof idx !== "number") return false;
    return audioIndices.has(idx);
  };

  const clearOverride = () => {
    setOverrideAudioBuffer(null);
    onCloseAudioPlayer?.();
  };

  const playForMessageId = async (messageId: string) => {
    const convId = activeConversationId;
    if (!convId) return;

    // Latest "live" message uses current buffer and just resets player position
    if (messageId === lastMessageId && audioPlayerBuffer) {
      setOverrideAudioBuffer(null);
      setPlayerKey(`live:${convId}:${messageId}`);
      setShowAudioPlayer?.(true);
      return;
    }

    const idx = audioIndexByMessageId.get(messageId);
    if (typeof idx !== "number") return;

    const cached = decodedCacheRef.current.get(idx);
    if (cached) {
      setOverrideAudioBuffer(cached);
      setPlayerKey(`idb:${convId}:${idx}`);
      setShowAudioPlayer?.(true);
      return;
    }

    const rec = await getConversationAudioDecrypted(convId, idx);
    if (!rec) return;
    const ctx = ensureDecodeContext();
    if (!ctx) return;

    const decoded = await ctx.decodeAudioData(rec.wav.slice(0));
    decodedCacheRef.current.set(idx, decoded);
    setOverrideAudioBuffer(decoded);
    setPlayerKey(`idb:${convId}:${idx}`);
    setShowAudioPlayer?.(true);
  };

  const activeBuffer = showAudioPlayer ? (overrideAudioBuffer ?? audioPlayerBuffer ?? null) : null;

  return {
    activeConversationId,
    audioIndexByMessageId,
    hasAudioForMessageId,
    playForMessageId,
    activeBuffer,
    playerKey,
    clearOverride,
  };
}
