/**
 * Sentence boundary streamer for SSE token streams.
 *
 * Mirrors the server-side helper at
 * `services/agent-engine/app/voice/sentence_streamer.py` — KEEP THE
 * REGEX IN SYNC.
 *
 * As tokens arrive from the SSE endpoint, this streamer buffers them
 * and emits complete sentences on punctuation boundaries (`.!?;:`
 * followed by whitespace). Each emitted sentence triggers the
 * `onSentence` callback — `MeridianChat.tsx` wires this to
 * `speakSentence(text)` so the per-sentence OpenAI TTS call kicks off
 * as soon as a sentence completes, instead of waiting for the full
 * response (~20s savings).
 *
 * The streamer is NOT markdown-aware — that's left to `speakSentence`
 * which already strips `[*#_\`~[\]]` per-sentence. The minimum length
 * (3 chars default) skips trivial fragments like `"U."` mid-acronym.
 *
 * @example
 *   const streamer = new SentenceStreamer({ onSentence: speakSentence });
 *   streamer.push("Hello there. ");        // emits "Hello there."
 *   streamer.push("How are you? Doing");   // emits "How are you?"
 *   streamer.flushFinal();                  // emits "Doing"
 */
export type SentenceStreamerOptions = {
  /** Called for each complete sentence. Fire-and-forget. */
  onSentence: (sentence: string) => void
  /** Minimum sentence length (after trim) to emit. Default 3. */
  minLen?: number
}

// Match end-of-sentence punctuation followed by actual whitespace.
// We do NOT include `$` (end of buffer) because when a token ends with
// `.`, the next token might continue the sentence (e.g., a decimal or
// acronym). `flushFinal` handles the end-of-stream tail.
const SENTENCE_BOUNDARY = /([.!?;:])(\s+)/

export class SentenceStreamer {
  private buf = ""
  private readonly minLen: number
  private readonly onSentence: (s: string) => void

  constructor(opts: SentenceStreamerOptions) {
    this.onSentence = opts.onSentence
    this.minLen = opts.minLen ?? 3
  }

  /**
   * Append a token to the buffer and emit any sentences that became
   * complete. Returns the list of emitted sentences in order — also
   * passed to `onSentence` synchronously.
   */
  push(token: string): string[] {
    if (!token) return []
    this.buf += token

    const emitted: string[] = []
    let match: RegExpExecArray | null
    while ((match = SENTENCE_BOUNDARY.exec(this.buf)) !== null) {
      // Cut after the punctuation character (capture group 1). The
      // trailing whitespace (group 2) is consumed but not kept.
      const cut = match.index + match[1].length
      const sentence = this.buf.slice(0, cut).trim()
      this.buf = this.buf.slice(cut + match[2].length)
      if (sentence.length >= this.minLen) {
        emitted.push(sentence)
        this.onSentence(sentence)
      }
    }
    return emitted
  }

  /**
   * Drain any unfinished trailing fragment as a final sentence.
   * Returns the fragment if it meets `minLen` (also invoking
   * `onSentence`), otherwise `null`. Always clears the buffer.
   */
  flushFinal(): string | null {
    const tail = this.buf.trim()
    this.buf = ""
    if (tail.length >= this.minLen) {
      this.onSentence(tail)
      return tail
    }
    return null
  }

  /** Current buffered text — exposed for tests / introspection. */
  get buffer(): string {
    return this.buf
  }
}
