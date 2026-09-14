import {
  createTurnLanguageLatch,
  detectLanguage,
  replyLanguage,
} from "../detectLanguage"

/**
 * The asymmetry to keep in mind while reading these: a MISSED detection costs
 * nothing — it falls back to exactly the behaviour shipped today. A WRONG
 * detection puts a confident foreign voice on English text, which is a
 * regression users will hear immediately. So the English-safety tests matter
 * more than the coverage tests, and they are deliberately adversarial.
 */

const EN =
  "That is a really good question about your PRISM profile, and the short answer is that Green tends to value harmony."
const FR =
  "C'est une très bonne question sur votre profil PRISM, et la réponse courte est que le vert valorise l'harmonie."
const DE =
  "Das ist eine sehr gute Frage zu Ihrem PRISM-Profil, und die kurze Antwort ist, dass Grün Harmonie schätzt."
const ES =
  "Esa es una muy buena pregunta sobre tu perfil PRISM, y la respuesta corta es que el verde valora la armonía."

describe("detectLanguage — scripts are decisive", () => {
  it.each([
    ["ja", "こんにちは。今日はいかがお過ごしですか。"],
    ["ko", "안녕하세요. 오늘 기분이 어떠신가요?"],
    ["zh-CN", "您好，今天过得怎么样？"],
    ["ar", "مرحبا، كيف حالك اليوم؟"],
    ["hi", "नमस्ते, आज आप कैसे हैं?"],
    ["th", "สวัสดีครับ วันนี้เป็นอย่างไรบ้าง"],
    ["ru", "Здравствуйте, как ваши дела сегодня?"],
  ])("detects %s with confidence", (lang, text) => {
    expect(detectLanguage(text)).toEqual({ language: lang, confident: true })
  })

  it("calls Japanese Japanese even though it contains Han characters", () => {
    // Testing Han before kana would label every Japanese reply as Mandarin.
    // This is the ordering bug the SCRIPTS list exists to prevent.
    expect(detectLanguage("今日は良い天気ですね").language).toBe("ja")
    expect(detectLanguage("メリディアンと申します").language).toBe("ja")
  })

  it("script wins even in a short string", () => {
    // Length gating applies to stopwords only — a single kana is conclusive.
    expect(detectLanguage("はい").language).toBe("ja")
  })
})

describe("detectLanguage — Latin languages", () => {
  it.each([
    ["en", EN],
    ["fr", FR],
    ["de", DE],
    ["es", ES],
  ])("detects %s", (lang, text) => {
    const d = detectLanguage(text)
    expect(d.confident).toBe(true)
    expect(d.language).toBe(lang)
  })

  it("is not confident about text too short to judge", () => {
    for (const t of ["Oui.", "OK", "Bien sûr !", "Yes", "D'accord"]) {
      expect(detectLanguage(t).confident).toBe(false)
    }
  })

  it("is not confident when two languages score alike", () => {
    // Cognate-heavy filler that belongs to no one in particular.
    expect(detectLanguage("PRISM PRISM PRISM 12345 --- ...").confident).toBe(false)
  })

  it("ignores code spans and URLs", () => {
    const noise =
      "`const der die das ein eine und oder aber mit` https://example.com/der/die/das"
    // Those German stopwords are inside a code span and a URL; without
    // stripping, this scores as German and a US user hears a German voice.
    expect(detectLanguage(noise).confident).toBe(false)
  })
})

describe("English safety — the regression that would be heard", () => {
  const ENGLISH_SAMPLES = [
    EN,
    "Here are three things you can try this week to build on that strength.",
    "I can help with that. What would you like to focus on first?",
    "Your assessment shows a preference for structure and detail in how you work.",
    "Let me know if you would like me to go deeper on any of these points.",
  ]

  it.each(ENGLISH_SAMPLES)("never routes English away from English: %s", (text) => {
    const d = detectLanguage(text)
    // Either it says English, or it says nothing. It must never name another
    // language, because that is what puts a foreign voice on English speech.
    expect(d.language === "en" || d.language === undefined).toBe(true)
  })

  it("English text overrides even a foreign hint", () => {
    // A French UI with an English reply must still speak English.
    expect(replyLanguage(EN, "fr")).toBe("en")
  })
})

describe("replyLanguage — text beats hint, hint fills the gap", () => {
  it("uses the detected language when confident, ignoring the hint", () => {
    // The whole point: French typed on an English UI.
    expect(replyLanguage(FR, "en")).toBe("fr")
  })

  it("falls back to the hint when the text is inconclusive", () => {
    expect(replyLanguage("Oui.", "fr")).toBe("fr")
  })

  it("returns undefined when inconclusive and there is no hint", () => {
    // undefined is a real answer — the server then behaves as it always did.
    expect(replyLanguage("OK", undefined)).toBeUndefined()
  })

  it("works with no hint at all when the text is clear", () => {
    expect(replyLanguage(FR)).toBe("fr")
  })
})

describe("createTurnLanguageLatch — the voice cannot change mid-answer", () => {
  it("locks on the first confident sentence and never moves", () => {
    const latch = createTurnLanguageLatch("en")
    expect(latch.next(FR)).toBe("fr")
    // Later sentences that would individually read as English must not flip it.
    expect(latch.next("OK.")).toBe("fr")
    expect(latch.next("The PRISM model is useful.")).toBe("fr")
    expect(latch.settled).toBe("fr")
  })

  it("accumulates across short sentences instead of giving up", () => {
    const latch = createTurnLanguageLatch("en")
    // Individually none of these clears the bar; together they do.
    latch.next("Bien sûr !")
    latch.next("Je vous explique.")
    const third = latch.next("C'est une très bonne question sur votre profil.")
    expect(third).toBe("fr")
    expect(latch.settled).toBe("fr")
  })

  it("uses the hint while still undecided", () => {
    const latch = createTurnLanguageLatch("de")
    expect(latch.next("Ja.")).toBe("de")
    expect(latch.settled).toBeUndefined()
  })

  it("an all-English turn settles on English, not the foreign hint", () => {
    const latch = createTurnLanguageLatch("fr")
    expect(latch.next(EN)).toBe("en")
    expect(latch.settled).toBe("en")
  })

  it("two turns do not share state", () => {
    const a = createTurnLanguageLatch("en")
    const b = createTurnLanguageLatch("en")
    a.next(FR)
    expect(a.settled).toBe("fr")
    expect(b.settled).toBeUndefined()
  })
})

describe("the three guards that mutation testing showed were untested", () => {
  /**
   * Added after mutation testing: removing the margin check, the length gate,
   * or the latch freeze left the suite GREEN. The earlier tests looked like
   * they covered these — "text too short", "two languages score alike",
   * "locks and never moves" — but each was passing for the wrong reason, so
   * all three guards could have been deleted silently.
   */

  it("rejects a close call between two languages (margin guard)", () => {
    // Spanish and Portuguese share these words exactly, so both score high and
    // neither wins. The earlier "score alike" test used gibberish that scored
    // ZERO, so it was rejected by the score floor and never reached the margin
    // check at all.
    const ambiguous = "como para como para como para como"
    const d = detectLanguage(ambiguous)
    expect(d.confident).toBe(false)
  })

  it("rejects text that is decisive but too short (length gate)", () => {
    // "Bonjour merci" matches ONLY French — neither word appears in any other
    // stopword set — so score is 2, runner-up 0, margin 2. Every other guard
    // passes it; ONLY the length gate can reject it.
    //
    // My first attempt used "Je vous", which failed for the wrong reason:
    // Dutch also lists "je", so the MARGIN rejected it and the length gate was
    // still never exercised. Mutation testing caught that, twice.
    const d = detectLanguage("Bonjour merci")
    expect(d.confident).toBe(false)
    expect(replyLanguage("Bonjour merci", "en")).toBe("en")
  })

  it("keeps the first verdict even when later text would outvote it (freeze)", () => {
    // The earlier freeze test fed "OK." after French: accumulation still read
    // as French, so the frozen and unfrozen paths agreed and the guard was
    // never tested. This feeds a long English passage that WOULD win on the
    // accumulated text — the voice must not change mid-answer.
    const latch = createTurnLanguageLatch("en")
    expect(latch.next("C'est une très bonne question sur votre profil.")).toBe("fr")
    const longEnglish =
      "The PRISM model is useful and you can use it to understand how you work " +
      "with the people that are on your team, and what they need from you."
    expect(latch.next(longEnglish)).toBe("fr")
    expect(latch.next(longEnglish)).toBe("fr")
    expect(latch.settled).toBe("fr")
  })
})
