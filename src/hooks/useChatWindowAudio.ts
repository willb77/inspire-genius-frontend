import { useEffect, useMemo, useRef, useState } from "react";
import { secureGetItem } from "@/lib/secureStorage";
import {
  audioBufferToWavArrayBuffer,
  CHAT_AUDIO_DB_PRUNE_CONFIG,
  getConversationAudioDecrypted,
  listConversationAudioTextPreviews,
  makeAudioTextPreview,
  pruneChatAudioDb,
  putConversationAudioEncrypted,
} from "@/lib/chatAudioDb";

type UseChatWindowAudioParams = {
  conversationId?: string | null;
  messages: Array<{ id: string; kind: string; sender?: string; text?: string }>;
  audioPlayerBuffer: AudioBuffer | null | undefined;
  showAudioPlayer: boolean | undefined;
  setShowAudioPlayer?: (open: boolean) => void;
  onCloseAudioPlayer?: () => void;
};

type UseChatWindowAudioReturn = {
  activeConversationId: string | null;
  hasAudioForText: (text: string) => boolean;
  playForText: (text: string) => Promise<void>;
  activeBuffer: AudioBuffer | null;
  playerKey: string;
  clearOverride: () => void;
};

export function useChatWindowAudio({
  conversationId,
  messages,
  audioPlayerBuffer,
  showAudioPlayer,
  setShowAudioPlayer,
  onCloseAudioPlayer,
}: UseChatWindowAudioParams): UseChatWindowAudioReturn {
  const renderMessages = useMemo(() => messages ?? [], [messages]);
  const lastAssistantTextPreview = useMemo(() => {
    for (let i = renderMessages.length - 1; i >= 0; i--) {
      const m = renderMessages[i];
      if (m?.kind === "text" && m?.sender === "assistant") {
        const preview = makeAudioTextPreview(m.text || "", 200);
        return preview || undefined;
      }
    }
    return undefined;
  }, [renderMessages]);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const prevConversationIdRef = useRef<string | null>(null);

  const [audioTextPreviews, setAudioTextPreviews] = useState<Set<string>>(() => new Set());

  const decodedCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
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

    const provided = typeof conversationId === "string" ? conversationId : null;
    if (provided) {
      setActiveConversationId(provided);
      return () => {
        mounted = false;
      };
    }

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
  }, [conversationId]);

  useEffect(() => {
    const convId = activeConversationId;
    if (!convId) {
      setAudioTextPreviews(new Set());
      return;
    }

    let mounted = true;
    listConversationAudioTextPreviews(convId)
      .then((previews) => {
        if (!mounted) return;
        setAudioTextPreviews(new Set(previews));
      })
      .catch(() => {
        if (!mounted) return;
        setAudioTextPreviews(new Set());
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
      if (pendingStoreRef.current) {
        clearTimeout(pendingStoreRef.current);
        pendingStoreRef.current = null;
      }
    };
  }, [activeConversationId]);

  useEffect(() => {
    const convId = activeConversationId;
    if (!convId) return;
    if (!audioPlayerBuffer) return;
    if (!lastAssistantTextPreview) return;

    const key = `${convId}:${lastAssistantTextPreview}`;
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
        await putConversationAudioEncrypted(convId, lastAssistantTextPreview, wav, "audio/wav");

        await pruneChatAudioDb(CHAT_AUDIO_DB_PRUNE_CONFIG);

        lastStoredSamplesRef.current.set(key, nextLen);
        setAudioTextPreviews((prevSet) => {
          const copy = new Set(prevSet);
          copy.add(lastAssistantTextPreview);
          return copy;
        });
      })().catch(() => {
        // ignore
      });
    }, 1200);
  }, [activeConversationId, audioPlayerBuffer, lastAssistantTextPreview]);

  const ensureDecodeContext = () => {
    const Ctx: typeof AudioContext | undefined =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!decodeCtxRef.current) decodeCtxRef.current = new Ctx();
    return decodeCtxRef.current;
  };

  const resolveStoredPreview = (text: string): string | null => {
    const current = makeAudioTextPreview(text || "", 200);
    if (!current) return null;
    if (audioTextPreviews.has(current)) return current;

    let best: string | null = null;
    for (const stored of audioTextPreviews) {
      if (!stored) continue;
      if (current.startsWith(stored) || stored.startsWith(current)) {
        if (!best || stored.length > best.length) best = stored;
      }
    }
    return best;
  };

  const hasAudioForText = (text: string): boolean => {
    return Boolean(resolveStoredPreview(text));
  };

  const clearOverride = () => {
    setOverrideAudioBuffer(null);
    onCloseAudioPlayer?.();
  };

  const playForText = async (text: string) => {
    const convId = activeConversationId;
    if (!convId) return;

    const resolved = resolveStoredPreview(text);

    if (resolved && resolved === lastAssistantTextPreview && audioPlayerBuffer) {
      setOverrideAudioBuffer(null);
      setPlayerKey(`live:${convId}:${resolved}`);
      setShowAudioPlayer?.(true);
      return;
    }

    if (!resolved) return;

    const cached = decodedCacheRef.current.get(resolved);
    if (cached) {
      setOverrideAudioBuffer(cached);
      setPlayerKey(`idb:${convId}:${resolved}`);
      setShowAudioPlayer?.(true);
      return;
    }

    const rec = await getConversationAudioDecrypted(convId, resolved);
    if (!rec) return;
    const ctx = ensureDecodeContext();
    if (!ctx) return;

    const decoded = await ctx.decodeAudioData(rec.wav.slice(0));
    decodedCacheRef.current.set(resolved, decoded);
    setOverrideAudioBuffer(decoded);
    setPlayerKey(`idb:${convId}:${resolved}`);
    setShowAudioPlayer?.(true);
  };

  const activeBuffer = showAudioPlayer ? (overrideAudioBuffer ?? audioPlayerBuffer ?? null) : null;

  return {
    activeConversationId,
    hasAudioForText,
    playForText,
    activeBuffer,
    playerKey,
    clearOverride,
  };
}
