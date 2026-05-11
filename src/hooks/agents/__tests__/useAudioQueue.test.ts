import { act, renderHook } from "@testing-library/react";
import { useAudioQueue } from "@/hooks/agents/useAudioQueue";

// Track every Audio instance the hook creates so tests can simulate
// playback state and assert seekBy() effects.
type FakeAudio = {
  src: string;
  currentTime: number;
  duration: number;
  onended: (() => void) | null;
  onerror: (() => void) | null;
  paused: boolean;
  play: jest.Mock;
  pause: jest.Mock;
};

const audios: FakeAudio[] = [];

beforeAll(() => {
  // Object URL plumbing — Blob round-trip is irrelevant to these tests.
  global.URL.createObjectURL = jest.fn(() => "blob:fake");
  global.URL.revokeObjectURL = jest.fn();

  // Replace the global Audio constructor with a stub that records instances.
  // Tests drive .onended manually to advance the queue.
  (global as unknown as { Audio: jest.Mock }).Audio = jest.fn().mockImplementation(() => {
    const audio: FakeAudio = {
      src: "",
      currentTime: 0,
      duration: 30,
      onended: null,
      onerror: null,
      paused: false,
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
    };
    audios.push(audio);
    return audio;
  });
});

beforeEach(() => {
  audios.length = 0;
});

const makeChunk = () => new Uint8Array([0xff, 0xfb, 0x90, 0x00]).buffer;

// End all in-flight playback so the hook's internal loop resolves and
// pending state updates flush before the test exits — avoids act() warnings.
const drain = async () => {
  for (const a of audios) a.onended?.();
  await act(async () => { await Promise.resolve(); });
};

describe("useAudioQueue — seekBy (new audio control)", () => {
  it("adjusts currentTime forward on the currently-playing chunk", async () => {
    const { result } = renderHook(() => useAudioQueue());

    act(() => result.current.enqueue(makeChunk()));
    // Yield so playNext's microtasks run and an Audio instance is created.
    await act(async () => { await Promise.resolve(); });

    expect(audios).toHaveLength(1);
    audios[0].currentTime = 10;

    act(() => result.current.seekBy(5));
    expect(audios[0].currentTime).toBe(15);
    await drain();
  });

  it("rewinds and clamps to zero on the floor", async () => {
    const { result } = renderHook(() => useAudioQueue());

    act(() => result.current.enqueue(makeChunk()));
    await act(async () => { await Promise.resolve(); });

    audios[0].currentTime = 2;
    act(() => result.current.seekBy(-10));
    expect(audios[0].currentTime).toBe(0);
    await drain();
  });

  it("clamps fast-forward to the duration ceiling", async () => {
    const { result } = renderHook(() => useAudioQueue());

    act(() => result.current.enqueue(makeChunk()));
    await act(async () => { await Promise.resolve(); });

    audios[0].duration = 12;
    audios[0].currentTime = 10;
    act(() => result.current.seekBy(30));
    expect(audios[0].currentTime).toBe(12);
    await drain();
  });

  it("is a no-op when nothing is playing", () => {
    const { result } = renderHook(() => useAudioQueue());
    // No throw, no side effects.
    expect(() => act(() => result.current.seekBy(5))).not.toThrow();
    expect(audios).toHaveLength(0);
  });
});

describe("useAudioQueue — existing transport (regression)", () => {
  it("stop() clears the queue and stops current playback", async () => {
    const { result } = renderHook(() => useAudioQueue());

    act(() => {
      result.current.enqueue(makeChunk());
      result.current.enqueue(makeChunk());
      result.current.enqueue(makeChunk());
    });
    await act(async () => { await Promise.resolve(); });

    expect(audios).toHaveLength(1); // only one chunk is "playing" at a time

    await act(async () => { result.current.stop(); });

    expect(result.current.queueLength).toBe(0);
    expect(result.current.isPlaying).toBe(false);
  });

  it("skip() ends the current chunk so the next one can start", async () => {
    const { result } = renderHook(() => useAudioQueue());

    act(() => {
      result.current.enqueue(makeChunk());
      result.current.enqueue(makeChunk());
    });
    await act(async () => { await Promise.resolve(); });

    expect(audios).toHaveLength(1);

    act(() => result.current.skip());
    // Yield so playNext loop picks up the next queued chunk.
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    expect(audios).toHaveLength(2);
    await drain();
  });
});
