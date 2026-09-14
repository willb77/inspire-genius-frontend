/**
 * Which language is Meridian actually speaking?
 *
 * The voice must follow the language of the REPLY, not the language of the app
 * chrome. Those diverge constantly: a French speaker on an English UI types
 * French, Meridian answers in French, and the UI setting still says `en`. That
 * is exactly what happened on staging-b on 2026-09-13 — 26 synthesize calls,
 * every one of them routed to the English voice, because the setting was the
 * only thing anyone was reading.
 *
 * The reply is the only text we ever speak, so the reply's language is the only
 * one that matters. Whether the user spoke or typed, and in what language, is
 * irrelevant to TTS: if a French speaker gets an English answer, English is the
 * correct voice.
 *
 * WHY THIS RUNS ON THE CLIENT
 * ---------------------------
 * The server would be the natural home — it is one place instead of five — but
 * the frontend synthesizes PER SENTENCE. One reply produced 26 separate
 * requests. Detecting server-side judges each sentence alone, so a French reply
 * containing "Oui." falls back on that sentence and the voice AUDIBLY CHANGES
 * mid-answer. The client holds the whole reply before it splits, so it can
 * decide once. That is a structural guarantee, not a cache.
 *
 * CONFIDENCE IS THE WHOLE DESIGN
 * ------------------------------
 * A wrong detection is worse than no detection: it puts a confident foreign
 * voice on English text. So the bar to leave English is deliberately high, and
 * every uncertain case falls back — first to the caller's hint, then to English
 * on OpenAI, which is exactly today's shipped behaviour. Being unsure costs us
 * nothing we did not already have.
 */

/**
 * Languages the platform ships that Google has a Chirp 3 HD voice for.
 *
 * NOTE THE BOUNDARIES. These use Unicode lookarounds, not `\b`, because
 * JavaScript's `\b` is defined on ASCII word characters only: `/\bcześć\b/`
 * can NEVER match, and nor can `très`, `für`, `olá`, `teşekkür` or `snälla`.
 * Every accented stopword in this table was dead on arrival when it shipped.
 *
 * That was not merely a weaker detector. It left Polish running on nothing but
 * its short ASCII tokens — `w`, `sa`, `na`, `to` — which are ordinary Haitian
 * Creole words, and on 2026-09-14 a Polish voice read Creole aloud for two
 * turns. The boundary bug and the capture bug were the same bug.
 */
const LATIN_STOPWORDS: Record<string, RegExp> = {
  // English is listed FIRST and detected like any other language. Without it,
  // English text scores zero everywhere and any stray match wins by default.
  en: /(?<![\p{L}\p{N}])(?:the|and|is|are|you|your|to|of|that|this|with|for|have|can|will|what|how|it|in|on|be|not|we|they)(?![\p{L}\p{N}])/giu,
  es: /(?<![\p{L}\p{N}])(?:hola|gracias|por favor|cómo|como|dónde|donde|cuando|porque|qué|que|está|esto|el|la|los|las|un|una|del|con|para|pero|más|muy|tu|su)(?![\p{L}\p{N}])/giu,
  fr: /(?<![\p{L}\p{N}])(?:bonjour|merci|comment|pourquoi|quand|je|nous|vous|les|des|dans|avec|pour|est|sont|ont|une|votre|vos|c'est|qui|mais|plus|très|être)(?![\p{L}\p{N}])/giu,
  de: /(?<![\p{L}\p{N}])(?:hallo|danke|bitte|warum|wie|wann|ich|wir|sie|der|die|das|ein|eine|und|oder|aber|mit|nicht|auch|sich|dass|für|ist)(?![\p{L}\p{N}])/giu,
  pt: /(?<![\p{L}\p{N}])(?:olá|ola|obrigado|obrigada|como|onde|quando|porque|eu|nós|nos|você|voce|os|as|um|uma|do|da|com|para|mas|não|nao|seu|sua)(?![\p{L}\p{N}])/giu,
  it: /(?<![\p{L}\p{N}])(?:ciao|grazie|prego|come|dove|quando|perché|perche|io|noi|voi|il|lo|la|gli|un|una|del|della|con|per|ma|non|sono|è)(?![\p{L}\p{N}])/giu,
  nl: /(?<![\p{L}\p{N}])(?:hallo|dank|alsjeblieft|hoe|waar|wanneer|waarom|ik|wij|jij|de|het|een|van|met|voor|maar|niet|zijn|dat|je|ook)(?![\p{L}\p{N}])/giu,
  pl: /(?<![\p{L}\p{N}])(?:cześć|czesc|dziękuję|dziekuje|proszę|prosze|jak|gdzie|kiedy|dlaczego|ja|my|ty|jest|są|sa|nie|tak|to|w|na|się|sie|że|ze)(?![\p{L}\p{N}])/giu,
  tr: /(?<![\p{L}\p{N}])(?:merhaba|teşekkür|tesekkur|lütfen|lutfen|nasıl|nasil|nerede|ne zaman|neden|ben|biz|sen|bir|bu|şu|su|ve|için|icin|değil|degil|var)(?![\p{L}\p{N}])/giu,
  vi: /(?<![\p{L}\p{N}])(?:xin chào|chào|cảm ơn|cam on|thế nào|the nao|ở đâu|khi nào|tại sao|tôi|toi|chúng tôi|bạn|ban|là|la|không|khong|và|va|của|cua)(?![\p{L}\p{N}])/giu,
  id: /(?<![\p{L}\p{N}])(?:halo|terima kasih|bagaimana|di mana|kapan|mengapa|saya|kami|kamu|anda|adalah|tidak|dan|untuk|dengan|ini|itu|yang|dari)(?![\p{L}\p{N}])/giu,
  sv: /(?<![\p{L}\p{N}])(?:hej|tack|snälla|snalla|hur|var|när|nar|varför|varfor|jag|vi|du|är|ar|inte|och|för|for|med|det|som|att)(?![\p{L}\p{N}])/giu,
  nb: /(?<![\p{L}\p{N}])(?:hei|takk|vær så snill|hvordan|hvor|når|nar|hvorfor|jeg|vi|du|er|ikke|og|for|med|det|som|har)(?![\p{L}\p{N}])/giu,
  // Haitian Creole has NO Chirp 3 HD voice. It is listed anyway, precisely so
  // that it wins its own turns: an unlisted language gets captured by whichever
  // listed language happens to share its short words, and on 2026-09-14 that
  // was Polish — a Polish voice read Creole to Bill for two whole turns.
  // Detecting "ht" resolves to no Google locale, so the server degrades to
  // OpenAI deterministically, the same path Albanian takes.
  ht: /(?<![\p{L}\p{N}])(?:mwen|ou|li|nou|yo|nan|pou|ak|avèk|avek|pa|se|ki|kijan|kote|poukisa|bonjou|mèsi|mesi|tanpri|gen|jodi|yon|anpil|konsa|paske)(?![\p{L}\p{N}])/giu,
}

/**
 * Scripts that identify a language outright.
 *
 * Order matters. Japanese is checked before Chinese because Japanese text
 * contains Han characters too — testing Han first would label every Japanese
 * reply as Mandarin.
 */
const SCRIPTS: ReadonlyArray<[string, RegExp]> = [
  ["ja", /[\u3040-\u309F\u30A0-\u30FF]/],   // kana — decisive for Japanese
  ["ko", /[\uAC00-\uD7AF\u1100-\u11FF]/],   // hangul
  ["zh-CN", /[\u4E00-\u9FFF]/],              // han, only after kana/hangul
  ["ar", /[\u0600-\u06FF\u0750-\u077F]/],
  ["hi", /[\u0900-\u097F]/],
  ["th", /[\u0E00-\u0E7F]/],
  ["ru", /[\u0400-\u04FF]/],
]

/** Minimum characters before a stopword verdict is trusted at all. */
const MIN_LATIN_CHARS = 24
/**
 * The winner must beat the runner-up by this much, or it is a coin toss.
 *
 * There is deliberately no separate absolute floor. An earlier `MIN_SCORE = 2`
 * could never fail independently — anything this margin accepts already has
 * best >= 2, because the runner-up cannot be negative — and mutation testing
 * confirmed that deleting it changed no result. One knob, and this is it.
 */
const MIN_MARGIN = 2

/**
 * A token must be this long to count as evidence of identity rather than
 * coincidence. Two-letter function words (`w`, `sa`, `na`, `to`, `la`, `el`,
 * `je`, `du`…) recur across unrelated languages; three or more characters is
 * where a word starts belonging to a language.
 */
const MIN_TOKEN_CHARS = 3

/**
 * How many DISTINCT substantive tokens the winner needs. Two, because one can
 * be a loanword or a name; two agreeing is a claim about the text.
 */
const MIN_SUBSTANTIVE_TOKENS = 2

export type Detection = {
  /** The detected language, or undefined when nothing is certain enough. */
  language: string | undefined
  /** False whenever the caller should prefer its own hint. */
  confident: boolean
}

/**
 * Detect the language of a piece of text.
 *
 * Script-based detection is treated as certain — a reply containing kana is
 * Japanese, and there is no plausible way for that to be a false positive.
 * Stopword detection is treated as provisional and must clear length, score
 * and margin before it counts.
 */
export function detectLanguage(text: string): Detection {
  const raw = (text || "").trim()
  if (!raw) return { language: undefined, confident: false }

  for (const [lang, re] of SCRIPTS) {
    if (re.test(raw)) return { language: lang, confident: true }
  }

  // Strip anything that would inflate a score without being speech: code
  // spans, URLs and markdown punctuation are language-neutral noise.
  const cleaned = raw
    .replace(/`[^`]*`/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[*#_~[\]()>]/g, " ")

  if (cleaned.replace(/\s+/g, "").length < MIN_LATIN_CHARS) {
    return { language: undefined, confident: false }
  }

  const matches: Array<[string, string[]]> = Object.entries(LATIN_STOPWORDS).map(
    ([lang, re]) => [lang, cleaned.match(re) || []],
  )
  matches.sort((a, b) => b[1].length - a[1].length)

  const [bestLang, bestMatches] = matches[0]
  const bestScore = bestMatches.length
  const runnerUp = matches[1]?.[1].length ?? 0

  if (bestScore - runnerUp < MIN_MARGIN) {
    return { language: undefined, confident: false }
  }

  // The margin alone is not enough, and a live turn proved it. A language we
  // DO NOT list has no competitor, so whichever listed language shares its
  // short function words wins by a wide margin and wins confidently. On
  // 2026-09-14 Haitian Creole was read aloud in a Polish voice for two turns,
  // because Polish lists `w`, `sa`, `na` and `to` — all of which are common
  // Creole words. The margin was large. The answer was still wrong.
  //
  // So the winner must also be identified by SUBSTANTIVE evidence: at least
  // two DISTINCT matched tokens of three characters or more. Short tokens
  // still count toward the score, but they can no longer establish confidence
  // on their own. This is what makes an unlisted Latin-script language fall
  // back instead of being captured — Romanian, Swahili and Tagalog would all
  // have hit the same trap.
  const distinctSubstantive = new Set(
    bestMatches.map((m) => m.toLowerCase()).filter((m) => m.length >= MIN_TOKEN_CHARS),
  )
  if (distinctSubstantive.size < MIN_SUBSTANTIVE_TOKENS) {
    return { language: undefined, confident: false }
  }

  return { language: bestLang, confident: true }
}

/**
 * The value to send as `language` when synthesizing `text`.
 *
 * `hint` is the app's UI language — used only when the text itself is not
 * decisive, never to override it. Returning `undefined` is a real answer: the
 * server then behaves exactly as it did before any of this existed.
 */
export function replyLanguage(text: string, hint?: string): string | undefined {
  const { language, confident } = detectLanguage(text)
  if (confident && language) return language
  return hint
}

/**
 * A per-turn latch for the STREAMING path, where sentences arrive one at a
 * time and there is no full reply to inspect up front.
 *
 * Once a confident answer is reached it is frozen for the rest of the turn, so
 * the voice cannot change part-way through an answer. Text is accumulated
 * across sentences, because the opener ("Oui.", "Bien sûr !") is often too
 * short to decide on alone while the first two together are plenty.
 *
 * Create one per turn; never share across turns.
 */
export function createTurnLanguageLatch(hint?: string) {
  let decided: string | undefined
  let locked = false
  let accumulated = ""

  return {
    /** Feed the next sentence; returns the language to use for THIS sentence. */
    next(sentence: string): string | undefined {
      if (locked) return decided
      accumulated = `${accumulated} ${sentence}`.slice(-2000)
      const { language, confident } = detectLanguage(accumulated)
      if (confident && language) {
        decided = language
        locked = true
        return decided
      }
      // Undecided so far: use the hint, and keep listening. This is the one
      // place a mid-turn change is possible — if an early sentence is too
      // short to judge and a later one settles it. Accepted deliberately: the
      // alternative is locking in the hint forever on the strength of "Oui.",
      // which is the bug this whole change exists to fix.
      return hint
    },
    /** What the latch settled on, for logging/tests. `undefined` if never. */
    get settled() {
      return locked ? decided : undefined
    },
  }
}
