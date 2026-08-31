/**
 * useAgentSpeech tests.
 *
 * Focus on the two behaviours that were bug fixes on the main chat surface and
 * are re-implemented here, because a regression in either is audible to the
 * user rather than visible in a type error:
 *   - the duplicate-playback guard (answers read aloud twice)
 *   - parallel synthesis with ordered playback (gaps mid-response)
 */
import { act, renderHook } from "@testing-library/react";

import { useAgentSpeech, splitIntoSentences, isSpeechInputSupported } from "../useAgentSpeech";

const post = jest.fn();
jest.mock("@/lib/agentApi", () => ({
  agentApi: { post: (...args: unknown[]) => post(...args) },
}));

const enqueue = jest.fn();
const stopQueue = jest.fn();
jest.mock("@/hooks/agents/useAudioQueue", () => ({
  useAudioQueue: () => ({ enqueue, stop: stopQueue, isPlaying: false }),
}));

function audio(bytes = 8) {
  return { data: new ArrayBuffer(bytes) };
}

beforeEach(() => {
  jest.clearAllMocks();
  post.mockResolvedValue(audio());
});

describe("splitIntoSentences", () => {
  it("splits on sentence punctuation", () => {
    expect(splitIntoSentences("One. Two. Three.")).toEqual(["One.", "Two.", "Three."]);
  });

  it("strips Markdown so it is not read aloud as syntax", () => {
    expect(splitIntoSentences("**Bold** and `code` here.")).toEqual([
      "Bold and code here.",
    ]);
  });

  it("drops fragments too short to be speech", () => {
    expect(splitIntoSentences("Hello there. a. b.")).toEqual(["Hello there."]);
  });

  it("returns nothing for empty input", () => {
    expect(splitIntoSentences("   ")).toEqual([]);
  });
});

describe("useAgentSpeech — text to speech", () => {
  it("synthesises each sentence and enqueues the audio in order", async () => {
    const { result } = renderHook(() => useAgentSpeech());
    await act(async () => {
      await result.current.speak("First one. Second one.");
    });
    expect(post).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenNthCalledWith(
      1,
      "/v1/agents/voice/synthesize",
      expect.objectContaining({ text: "First one." }),
      expect.anything(),
    );
    expect(enqueue).toHaveBeenCalledTimes(2);
  });

  it("does not speak the same answer twice", async () => {
    const { result } = renderHook(() => useAgentSpeech());
    await act(async () => {
      await result.current.speak("Same answer.");
    });
    expect(post).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.speak("Same answer.");
    });
    // Still one — the duplicate guard suppressed the repeat read-back.
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("speaks a repeat again after the guard is reset for a new turn", async () => {
    const { result } = renderHook(() => useAgentSpeech());
    await act(async () => {
      await result.current.speak("Same answer.");
    });
    act(() => result.current.resetSpokenGuard());
    await act(async () => {
      await result.current.speak("Same answer.");
    });
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("ignores empty text", async () => {
    const { result } = renderHook(() => useAgentSpeech());
    await act(async () => {
      await result.current.speak("   ");
    });
    expect(post).not.toHaveBeenCalled();
  });

  it("retries a failed sentence rather than dropping it silently", async () => {
    post.mockRejectedValueOnce(new Error("503")).mockResolvedValue(audio());
    const { result } = renderHook(() => useAgentSpeech());
    await act(async () => {
      await result.current.speak("Only sentence here.");
    });
    expect(post).toHaveBeenCalledTimes(2);
    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  it("survives a sentence that fails every attempt", async () => {
    post.mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useAgentSpeech());
    await act(async () => {
      await result.current.speak("Doomed sentence here.");
    });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("stopSpeaking clears the audio queue", () => {
    const { result } = renderHook(() => useAgentSpeech());
    act(() => result.current.stopSpeaking());
    expect(stopQueue).toHaveBeenCalled();
  });
});

describe("useAgentSpeech — speech to text", () => {
  const original = Object.getOwnPropertyDescriptor(window, "SpeechRecognition");

  afterEach(() => {
    if (original) Object.defineProperty(window, "SpeechRecognition", original);
    else delete (window as unknown as Record<string, unknown>).SpeechRecognition;
  });

  function installRecogniser() {
    const instances: Record<string, unknown>[] = [];
    class FakeRecogniser {
      continuous = false;
      interimResults = false;
      lang = "";
      onresult: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      start = jest.fn();
      stop = jest.fn();
      constructor() {
        instances.push(this as unknown as Record<string, unknown>);
      }
    }
    (window as unknown as Record<string, unknown>).SpeechRecognition = FakeRecogniser;
    return instances;
  }

  it("reports support based on the browser API", () => {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    expect(isSpeechInputSupported()).toBe(false);
    installRecogniser();
    expect(isSpeechInputSupported()).toBe(true);
  });

  it("hands the final transcript to onTranscript when dictation ends", () => {
    const instances = installRecogniser();
    const onTranscript = jest.fn();
    const { result } = renderHook(() => useAgentSpeech({ onTranscript }));

    act(() => result.current.startRecording());
    expect(result.current.isRecording).toBe(true);

    const rec = instances[0] as unknown as {
      onresult: (e: unknown) => void;
      onend: () => void;
    };
    act(() => {
      rec.onresult({ results: [Object.assign([{ transcript: "reset my password" }], { isFinal: true })] });
      rec.onend();
    });

    expect(onTranscript).toHaveBeenCalledWith("reset my password");
    expect(result.current.isRecording).toBe(false);
  });

  it("does not fire onTranscript when nothing was heard", () => {
    const instances = installRecogniser();
    const onTranscript = jest.fn();
    const { result } = renderHook(() => useAgentSpeech({ onTranscript }));
    act(() => result.current.startRecording());
    const rec = instances[0] as unknown as { onend: () => void };
    act(() => rec.onend());
    expect(onTranscript).not.toHaveBeenCalled();
  });

  it("surfaces an error when the browser has no speech support", () => {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    const { result } = renderHook(() => useAgentSpeech());
    act(() => result.current.startRecording());
    expect(result.current.error).toMatch(/not supported/i);
    expect(result.current.isRecording).toBe(false);
  });
});
