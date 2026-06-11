import { SentenceStreamer } from "../sentenceStreamer"

describe("SentenceStreamer", () => {
  it("emits a sentence when a period is followed by whitespace", () => {
    const seen: string[] = []
    const s = new SentenceStreamer({ onSentence: (x) => seen.push(x) })
    expect(s.push("Hello there.")).toEqual([])
    expect(s.push(" How are you?")).toEqual(["Hello there."])
    expect(s.buffer).toBe("How are you?")
    expect(seen).toEqual(["Hello there."])
  })

  it("handles multiple boundaries in one token", () => {
    const seen: string[] = []
    const s = new SentenceStreamer({ onSentence: (x) => seen.push(x) })
    const out = s.push("One. Two! Three? ")
    expect(out).toEqual(["One.", "Two!", "Three?"])
    expect(seen).toEqual(["One.", "Two!", "Three?"])
    expect(s.buffer).toBe("")
  })

  it("skips fragments shorter than minLen", () => {
    const seen: string[] = []
    const s = new SentenceStreamer({ onSentence: (x) => seen.push(x), minLen: 3 })
    expect(s.push("U. ")).toEqual([]) // "U." is 2 chars, below 3
    expect(s.push("USA. ")).toEqual(["USA."])
    expect(seen).toEqual(["USA."])
  })

  it("flushFinal drains trailing fragment", () => {
    const seen: string[] = []
    const s = new SentenceStreamer({ onSentence: (x) => seen.push(x) })
    s.push("Complete sentence. ")
    expect(seen).toEqual(["Complete sentence."])
    s.push("Trailing without punctuation")
    expect(s.flushFinal()).toBe("Trailing without punctuation")
    expect(seen).toEqual(["Complete sentence.", "Trailing without punctuation"])
    expect(s.buffer).toBe("")
  })

  it("flushFinal returns null when buffer is empty", () => {
    const s = new SentenceStreamer({ onSentence: () => {} })
    expect(s.flushFinal()).toBeNull()
  })

  it("empty push is a noop", () => {
    const s = new SentenceStreamer({ onSentence: () => {} })
    expect(s.push("")).toEqual([])
    expect(s.buffer).toBe("")
  })

  it("does NOT emit on punctuation at end of buffer without trailing whitespace", () => {
    // This is the load-bearing case: when a token ends with `.`, we
    // wait for the next token to confirm the sentence is over (it
    // might continue with text after a decimal or acronym).
    const seen: string[] = []
    const s = new SentenceStreamer({ onSentence: (x) => seen.push(x) })
    expect(s.push("End.")).toEqual([])
    expect(s.buffer).toBe("End.")
    expect(s.push(" Next")).toEqual(["End."])
    expect(s.buffer).toBe("Next")
  })

  it("supports !, ?, ;, : as sentence boundaries", () => {
    const seen: string[] = []
    const s = new SentenceStreamer({ onSentence: (x) => seen.push(x) })
    s.push("Exclaim! Question? ")
    s.push("Semi; Colon: ")
    expect(seen).toEqual(["Exclaim!", "Question?", "Semi;", "Colon:"])
  })
})
