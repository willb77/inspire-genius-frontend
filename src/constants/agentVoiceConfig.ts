/**
 * Per-agent voice configuration with multi-provider voice support.
 *
 * Supports two operating modes:
 * - Monolith Mode: ALL agents speak individually, each with a different voice
 * - Ecosystem Mode: ONLY Meridian speaks (unified persona), all agents route through Meridian
 *
 * Voice providers: OpenAI, OpenAI Advanced, Gemini, AWS Polly Neural, Google Cloud WaveNet
 */

// ---------------------------------------------------------------------------
// Voice Mode
// ---------------------------------------------------------------------------

export type VoiceMode = "monolith" | "ecosystem"

// ---------------------------------------------------------------------------
// Voice Provider & Voice Option types
// ---------------------------------------------------------------------------

export type VoiceProvider = "openai" | "openai_advanced" | "gemini" | "aws_polly" | "google_wavenet"

export type VoiceOption = {
  id: string
  name: string
  description: string
  provider: VoiceProvider
  gender?: "female" | "male" | "neutral"
}

export const VOICE_PROVIDER_LABELS: Record<VoiceProvider, string> = {
  openai: "OpenAI",
  openai_advanced: "OpenAI Advanced",
  gemini: "Gemini",
  aws_polly: "AWS Polly Neural",
  google_wavenet: "Google Cloud WaveNet",
}

// ---------------------------------------------------------------------------
// OpenAI Voices (Core)
// ---------------------------------------------------------------------------

export const OPENAI_VOICES: VoiceOption[] = [
  { id: "openai-alloy",   name: "Alloy",   description: "Neutral and balanced",       provider: "openai", gender: "neutral" },
  { id: "openai-ash",     name: "Ash",     description: "Clear and precise",           provider: "openai", gender: "neutral" },
  { id: "openai-ballad",  name: "Ballad",  description: "Melodic and smooth",          provider: "openai", gender: "neutral" },
  { id: "openai-breeze",  name: "Breeze",  description: "Animated and earnest",        provider: "openai", gender: "neutral" },
  { id: "openai-coral",   name: "Coral",   description: "Warm and friendly",           provider: "openai", gender: "neutral" },
  { id: "openai-cove",    name: "Cove",    description: "Composed and direct",         provider: "openai", gender: "neutral" },
  { id: "openai-echo",    name: "Echo",    description: "Resonant and deep",           provider: "openai", gender: "neutral" },
  { id: "openai-ember",   name: "Ember",   description: "Confident and optimistic",    provider: "openai", gender: "neutral" },
  { id: "openai-fable",   name: "Fable",   description: "Versatile and expressive",    provider: "openai", gender: "neutral" },
  { id: "openai-juniper", name: "Juniper", description: "Open and upbeat",             provider: "openai", gender: "neutral" },
  { id: "openai-nova",    name: "Nova",    description: "Versatile and warm",           provider: "openai", gender: "neutral" },
  { id: "openai-onyx",    name: "Onyx",    description: "Deep and authoritative",      provider: "openai", gender: "neutral" },
  { id: "openai-sage",    name: "Sage",    description: "Calm and thoughtful",          provider: "openai", gender: "neutral" },
  { id: "openai-shimmer", name: "Shimmer", description: "Bright and energetic",        provider: "openai", gender: "neutral" },
  { id: "openai-verse",   name: "Verse",   description: "Versatile and expressive",    provider: "openai", gender: "neutral" },
]

// ---------------------------------------------------------------------------
// OpenAI Advanced Voice Mode
// ---------------------------------------------------------------------------

export const OPENAI_ADVANCED_VOICES: VoiceOption[] = [
  { id: "openai-adv-arbor",  name: "Arbor",  description: "Easygoing and versatile",    provider: "openai_advanced", gender: "neutral" },
  { id: "openai-adv-maple",  name: "Maple",  description: "Cheerful and candid",        provider: "openai_advanced", gender: "neutral" },
  { id: "openai-adv-sol",    name: "Sol",    description: "Savvy and relaxed",           provider: "openai_advanced", gender: "neutral" },
  { id: "openai-adv-spruce", name: "Spruce", description: "Calm and affirming",         provider: "openai_advanced", gender: "neutral" },
  { id: "openai-adv-vale",   name: "Vale",   description: "Bright and inquisitive",     provider: "openai_advanced", gender: "neutral" },
]

// ---------------------------------------------------------------------------
// Gemini Voices
// ---------------------------------------------------------------------------

export const GEMINI_VOICES: VoiceOption[] = [
  { id: "gemini-nova",     name: "Nova",     description: "Calm, mid-range tone",              provider: "gemini", gender: "neutral" },
  { id: "gemini-ursa",     name: "Ursa",     description: "Engaged, mid-range tone",           provider: "gemini", gender: "neutral" },
  { id: "gemini-vega",     name: "Vega",     description: "Bright, higher-pitched tone",       provider: "gemini", gender: "neutral" },
  { id: "gemini-pegasus",  name: "Pegasus",  description: "Engaged, deeper tone",              provider: "gemini", gender: "neutral" },
  { id: "gemini-orbit",    name: "Orbit",    description: "Energetic, deeper tone",            provider: "gemini", gender: "neutral" },
  { id: "gemini-lyra",     name: "Lyra",     description: "Bright, higher-pitched tone",       provider: "gemini", gender: "neutral" },
  { id: "gemini-orion",    name: "Orion",    description: "Bright, deeper tone",               provider: "gemini", gender: "neutral" },
  { id: "gemini-dipper",   name: "Dipper",   description: "Engaged, deeper tone",              provider: "gemini", gender: "neutral" },
  { id: "gemini-eclipse",  name: "Eclipse",  description: "Energetic, mid-range tone",         provider: "gemini", gender: "neutral" },
  { id: "gemini-capella",  name: "Capella",  description: "British-accented, higher-pitched tone", provider: "gemini", gender: "neutral" },
]

// ---------------------------------------------------------------------------
// AWS Polly Neural Voices
// ---------------------------------------------------------------------------

export const AWS_POLLY_VOICES: VoiceOption[] = [
  // US English Neural
  { id: "polly-joanna",   name: "Joanna",   description: "Female — US English, Neural",     provider: "aws_polly", gender: "female" },
  { id: "polly-kendra",   name: "Kendra",   description: "Female — US English, Neural",     provider: "aws_polly", gender: "female" },
  { id: "polly-salli",    name: "Salli",     description: "Female — US English, Neural",     provider: "aws_polly", gender: "female" },
  { id: "polly-ruth",     name: "Ruth",      description: "Female — US English, Neural",     provider: "aws_polly", gender: "female" },
  { id: "polly-ivy",      name: "Ivy",       description: "Female child — US English, Neural", provider: "aws_polly", gender: "female" },
  { id: "polly-danielle", name: "Danielle",  description: "Female — US English, Neural",     provider: "aws_polly", gender: "female" },
  { id: "polly-matthew",  name: "Matthew",   description: "Male — US English, Neural",       provider: "aws_polly", gender: "male" },
  { id: "polly-stephen",  name: "Stephen",   description: "Male — US English, Neural",       provider: "aws_polly", gender: "male" },
  { id: "polly-gregory",  name: "Gregory",   description: "Male — US English, Neural",       provider: "aws_polly", gender: "male" },
  { id: "polly-kevin",    name: "Kevin",     description: "Male child — US English, Neural", provider: "aws_polly", gender: "male" },
  { id: "polly-joey",     name: "Joey",      description: "Male — US English, Neural",       provider: "aws_polly", gender: "male" },
  { id: "polly-justin",   name: "Justin",    description: "Male child — US English, Neural", provider: "aws_polly", gender: "male" },
  // British English Neural
  { id: "polly-amy",      name: "Amy",       description: "Female — British English, Neural", provider: "aws_polly", gender: "female" },
  { id: "polly-emma",     name: "Emma",      description: "Female — British English, Neural", provider: "aws_polly", gender: "female" },
  { id: "polly-brian",    name: "Brian",     description: "Male — British English, Neural",   provider: "aws_polly", gender: "male" },
  { id: "polly-arthur",   name: "Arthur",    description: "Male — British English, Neural",   provider: "aws_polly", gender: "male" },
  // Australian English
  { id: "polly-olivia",   name: "Olivia",    description: "Female — Australian English, Neural", provider: "aws_polly", gender: "female" },
  // Indian English
  { id: "polly-kajal",    name: "Kajal",     description: "Female — Indian English, Neural",  provider: "aws_polly", gender: "female" },
  // Spanish
  { id: "polly-lupe",     name: "Lupe",      description: "Female — US Spanish, Neural",     provider: "aws_polly", gender: "female" },
  { id: "polly-pedro",    name: "Pedro",     description: "Male — US Spanish, Neural",       provider: "aws_polly", gender: "male" },
  { id: "polly-lucia",    name: "Lucia",     description: "Female — European Spanish, Neural", provider: "aws_polly", gender: "female" },
  { id: "polly-sergio",   name: "Sergio",    description: "Male — European Spanish, Neural", provider: "aws_polly", gender: "male" },
  // French
  { id: "polly-lea",      name: "Léa",       description: "Female — French, Neural",         provider: "aws_polly", gender: "female" },
  { id: "polly-remi",     name: "Rémi",      description: "Male — French, Neural",           provider: "aws_polly", gender: "male" },
  // German
  { id: "polly-vicki",    name: "Vicki",     description: "Female — German, Neural",         provider: "aws_polly", gender: "female" },
  { id: "polly-daniel",   name: "Daniel",    description: "Male — German, Neural",           provider: "aws_polly", gender: "male" },
  // Italian
  { id: "polly-bianca",   name: "Bianca",    description: "Female — Italian, Neural",        provider: "aws_polly", gender: "female" },
  { id: "polly-adriano",  name: "Adriano",   description: "Male — Italian, Neural",          provider: "aws_polly", gender: "male" },
  // Portuguese
  { id: "polly-camila",   name: "Camila",    description: "Female — Brazilian Portuguese, Neural", provider: "aws_polly", gender: "female" },
  { id: "polly-thiago",   name: "Thiago",    description: "Male — Brazilian Portuguese, Neural",   provider: "aws_polly", gender: "male" },
  // Japanese
  { id: "polly-kazuha",   name: "Kazuha",    description: "Female — Japanese, Neural",       provider: "aws_polly", gender: "female" },
  { id: "polly-takumi",   name: "Takumi",    description: "Male — Japanese, Neural",         provider: "aws_polly", gender: "male" },
  // Korean
  { id: "polly-seoyeon",  name: "Seoyeon",   description: "Female — Korean, Neural",         provider: "aws_polly", gender: "female" },
  // Hindi
  { id: "polly-aditi",    name: "Aditi",     description: "Female — Hindi, Standard",        provider: "aws_polly", gender: "female" },
  // Arabic
  { id: "polly-hala",     name: "Hala",      description: "Female — Arabic, Neural",         provider: "aws_polly", gender: "female" },
  // Chinese
  { id: "polly-zhiyu",    name: "Zhiyu",     description: "Female — Chinese Mandarin, Neural", provider: "aws_polly", gender: "female" },
  // Dutch
  { id: "polly-laura",    name: "Laura",     description: "Female — Dutch, Neural",          provider: "aws_polly", gender: "female" },
  // Polish
  { id: "polly-ola",      name: "Ola",       description: "Female — Polish, Neural",         provider: "aws_polly", gender: "female" },
  // Swedish
  { id: "polly-elin",     name: "Elin",      description: "Female — Swedish, Neural",        provider: "aws_polly", gender: "female" },
  // Turkish
  { id: "polly-burcu",    name: "Burcu",     description: "Female — Turkish, Neural",        provider: "aws_polly", gender: "female" },
]

// ---------------------------------------------------------------------------
// Google Cloud WaveNet Voices
// ---------------------------------------------------------------------------

export const GOOGLE_WAVENET_VOICES: VoiceOption[] = [
  // ── US English Neural2 (highest quality) ──
  { id: "en-US-Neural2-A", name: "US Neural2-A", description: "Male — natural",    provider: "google_wavenet", gender: "male" },
  { id: "en-US-Neural2-D", name: "US Neural2-D", description: "Male — clear",      provider: "google_wavenet", gender: "male" },
  { id: "en-US-Neural2-I", name: "US Neural2-I", description: "Male — calm",       provider: "google_wavenet", gender: "male" },
  { id: "en-US-Neural2-J", name: "US Neural2-J", description: "Male — casual",     provider: "google_wavenet", gender: "male" },
  { id: "en-US-Neural2-C", name: "US Neural2-C", description: "Female — natural",  provider: "google_wavenet", gender: "female" },
  { id: "en-US-Neural2-E", name: "US Neural2-E", description: "Female — calm",     provider: "google_wavenet", gender: "female" },
  { id: "en-US-Neural2-F", name: "US Neural2-F", description: "Female — warm",     provider: "google_wavenet", gender: "female" },
  { id: "en-US-Neural2-G", name: "US Neural2-G", description: "Female — bright",   provider: "google_wavenet", gender: "female" },
  { id: "en-US-Neural2-H", name: "US Neural2-H", description: "Female — friendly", provider: "google_wavenet", gender: "female" },
  // ── US English Studio ──
  { id: "en-US-Studio-M",  name: "US Studio-M",  description: "Male — studio quality",   provider: "google_wavenet", gender: "male" },
  { id: "en-US-Studio-O",  name: "US Studio-O",  description: "Female — studio quality",  provider: "google_wavenet", gender: "female" },
  { id: "en-US-Studio-Q",  name: "US Studio-Q",  description: "Male — studio conversational", provider: "google_wavenet", gender: "male" },
  // ── US English Wavenet ──
  { id: "en-US-Wavenet-A",  name: "US Wavenet-A",  description: "Male — standard",    provider: "google_wavenet", gender: "male" },
  { id: "en-US-Wavenet-B",  name: "US Wavenet-B",  description: "Male — deeper",      provider: "google_wavenet", gender: "male" },
  { id: "en-US-Wavenet-C",  name: "US Wavenet-C",  description: "Female — standard",  provider: "google_wavenet", gender: "female" },
  { id: "en-US-Wavenet-D",  name: "US Wavenet-D",  description: "Male — casual",      provider: "google_wavenet", gender: "male" },
  { id: "en-US-Wavenet-E",  name: "US Wavenet-E",  description: "Female — calm",      provider: "google_wavenet", gender: "female" },
  { id: "en-US-Wavenet-F",  name: "US Wavenet-F",  description: "Female — bright",    provider: "google_wavenet", gender: "female" },
  { id: "en-US-Wavenet-G",  name: "US Wavenet-G",  description: "Female — warm",      provider: "google_wavenet", gender: "female" },
  { id: "en-US-Wavenet-H",  name: "US Wavenet-H",  description: "Female — friendly",  provider: "google_wavenet", gender: "female" },
  { id: "en-US-Wavenet-I",  name: "US Wavenet-I",  description: "Male — warm",        provider: "google_wavenet", gender: "male" },
  { id: "en-US-Wavenet-J",  name: "US Wavenet-J",  description: "Male — bright",      provider: "google_wavenet", gender: "male" },
  // ── US English Polyglot ──
  { id: "en-US-Polyglot-1", name: "US Polyglot-1", description: "Male — versatile multilingual", provider: "google_wavenet", gender: "male" },
  // ── British English Neural2 ──
  { id: "en-GB-Neural2-A",  name: "GB Neural2-A",  description: "Female — British, warm",     provider: "google_wavenet", gender: "female" },
  { id: "en-GB-Neural2-B",  name: "GB Neural2-B",  description: "Male — British, clear",      provider: "google_wavenet", gender: "male" },
  { id: "en-GB-Neural2-C",  name: "GB Neural2-C",  description: "Female — British, bright",   provider: "google_wavenet", gender: "female" },
  { id: "en-GB-Neural2-D",  name: "GB Neural2-D",  description: "Male — British, deep",       provider: "google_wavenet", gender: "male" },
  { id: "en-GB-Neural2-F",  name: "GB Neural2-F",  description: "Female — British, friendly", provider: "google_wavenet", gender: "female" },
  // ── British English Wavenet ──
  { id: "en-GB-Wavenet-A",  name: "GB Wavenet-A",  description: "Female — British standard", provider: "google_wavenet", gender: "female" },
  { id: "en-GB-Wavenet-B",  name: "GB Wavenet-B",  description: "Male — British standard",   provider: "google_wavenet", gender: "male" },
  { id: "en-GB-Wavenet-C",  name: "GB Wavenet-C",  description: "Female — British warm",     provider: "google_wavenet", gender: "female" },
  { id: "en-GB-Wavenet-D",  name: "GB Wavenet-D",  description: "Male — British warm",       provider: "google_wavenet", gender: "male" },
  { id: "en-GB-Wavenet-F",  name: "GB Wavenet-F",  description: "Female — British bright",   provider: "google_wavenet", gender: "female" },
  // ── British English Studio ──
  { id: "en-GB-Studio-B",   name: "GB Studio-B",   description: "Male — British studio",     provider: "google_wavenet", gender: "male" },
  { id: "en-GB-Studio-C",   name: "GB Studio-C",   description: "Female — British studio",   provider: "google_wavenet", gender: "female" },
  // ── Australian English Neural2 ──
  { id: "en-AU-Neural2-A",  name: "AU Neural2-A",  description: "Female — Australian, warm",  provider: "google_wavenet", gender: "female" },
  { id: "en-AU-Neural2-B",  name: "AU Neural2-B",  description: "Male — Australian, clear",   provider: "google_wavenet", gender: "male" },
  { id: "en-AU-Neural2-C",  name: "AU Neural2-C",  description: "Female — Australian, bright", provider: "google_wavenet", gender: "female" },
  { id: "en-AU-Neural2-D",  name: "AU Neural2-D",  description: "Male — Australian, deep",    provider: "google_wavenet", gender: "male" },
  // ── Australian English Wavenet ──
  { id: "en-AU-Wavenet-A",  name: "AU Wavenet-A",  description: "Female — Australian standard", provider: "google_wavenet", gender: "female" },
  { id: "en-AU-Wavenet-B",  name: "AU Wavenet-B",  description: "Male — Australian standard",   provider: "google_wavenet", gender: "male" },
  { id: "en-AU-Wavenet-C",  name: "AU Wavenet-C",  description: "Female — Australian warm",     provider: "google_wavenet", gender: "female" },
  { id: "en-AU-Wavenet-D",  name: "AU Wavenet-D",  description: "Male — Australian warm",       provider: "google_wavenet", gender: "male" },
  // ── Indian English Neural2 ──
  { id: "en-IN-Neural2-A",  name: "IN Neural2-A",  description: "Female — Indian English, warm",  provider: "google_wavenet", gender: "female" },
  { id: "en-IN-Neural2-B",  name: "IN Neural2-B",  description: "Male — Indian English, clear",   provider: "google_wavenet", gender: "male" },
  { id: "en-IN-Neural2-C",  name: "IN Neural2-C",  description: "Male — Indian English, deep",    provider: "google_wavenet", gender: "male" },
  { id: "en-IN-Neural2-D",  name: "IN Neural2-D",  description: "Female — Indian English, bright", provider: "google_wavenet", gender: "female" },
  // ── Indian English Wavenet ──
  { id: "en-IN-Wavenet-A",  name: "IN Wavenet-A",  description: "Female — Indian English standard", provider: "google_wavenet", gender: "female" },
  { id: "en-IN-Wavenet-B",  name: "IN Wavenet-B",  description: "Male — Indian English standard",   provider: "google_wavenet", gender: "male" },
  { id: "en-IN-Wavenet-C",  name: "IN Wavenet-C",  description: "Male — Indian English warm",       provider: "google_wavenet", gender: "male" },
  { id: "en-IN-Wavenet-D",  name: "IN Wavenet-D",  description: "Female — Indian English warm",     provider: "google_wavenet", gender: "female" },
  // ── Spanish Neural2 ──
  { id: "es-US-Neural2-A",  name: "ES-US Neural2-A", description: "Female — US Spanish",  provider: "google_wavenet", gender: "female" },
  { id: "es-US-Neural2-B",  name: "ES-US Neural2-B", description: "Male — US Spanish",    provider: "google_wavenet", gender: "male" },
  { id: "es-US-Neural2-C",  name: "ES-US Neural2-C", description: "Male — US Spanish, deeper", provider: "google_wavenet", gender: "male" },
  { id: "es-ES-Neural2-A",  name: "ES-ES Neural2-A", description: "Female — European Spanish", provider: "google_wavenet", gender: "female" },
  { id: "es-ES-Neural2-B",  name: "ES-ES Neural2-B", description: "Male — European Spanish",   provider: "google_wavenet", gender: "male" },
  { id: "es-ES-Neural2-C",  name: "ES-ES Neural2-C", description: "Female — European Spanish, warm", provider: "google_wavenet", gender: "female" },
  { id: "es-ES-Neural2-D",  name: "ES-ES Neural2-D", description: "Female — European Spanish, bright", provider: "google_wavenet", gender: "female" },
  { id: "es-ES-Neural2-E",  name: "ES-ES Neural2-E", description: "Female — European Spanish, calm", provider: "google_wavenet", gender: "female" },
  { id: "es-ES-Neural2-F",  name: "ES-ES Neural2-F", description: "Male — European Spanish, deep", provider: "google_wavenet", gender: "male" },
  // ── French Neural2 ──
  { id: "fr-FR-Neural2-A",  name: "FR Neural2-A",  description: "Female — French, warm",  provider: "google_wavenet", gender: "female" },
  { id: "fr-FR-Neural2-B",  name: "FR Neural2-B",  description: "Male — French, clear",   provider: "google_wavenet", gender: "male" },
  { id: "fr-FR-Neural2-C",  name: "FR Neural2-C",  description: "Female — French, bright", provider: "google_wavenet", gender: "female" },
  { id: "fr-FR-Neural2-D",  name: "FR Neural2-D",  description: "Male — French, deep",    provider: "google_wavenet", gender: "male" },
  { id: "fr-FR-Neural2-E",  name: "FR Neural2-E",  description: "Female — French, friendly", provider: "google_wavenet", gender: "female" },
  // ── German Neural2 ──
  { id: "de-DE-Neural2-A",  name: "DE Neural2-A",  description: "Female — German, warm",   provider: "google_wavenet", gender: "female" },
  { id: "de-DE-Neural2-B",  name: "DE Neural2-B",  description: "Male — German, clear",    provider: "google_wavenet", gender: "male" },
  { id: "de-DE-Neural2-C",  name: "DE Neural2-C",  description: "Female — German, bright", provider: "google_wavenet", gender: "female" },
  { id: "de-DE-Neural2-D",  name: "DE Neural2-D",  description: "Male — German, deep",     provider: "google_wavenet", gender: "male" },
  { id: "de-DE-Neural2-F",  name: "DE Neural2-F",  description: "Female — German, friendly", provider: "google_wavenet", gender: "female" },
  // ── Italian Neural2 ──
  { id: "it-IT-Neural2-A",  name: "IT Neural2-A",  description: "Female — Italian, warm",  provider: "google_wavenet", gender: "female" },
  { id: "it-IT-Neural2-B",  name: "IT Neural2-B",  description: "Female — Italian, bright", provider: "google_wavenet", gender: "female" },
  { id: "it-IT-Neural2-C",  name: "IT Neural2-C",  description: "Male — Italian, clear",   provider: "google_wavenet", gender: "male" },
  { id: "it-IT-Neural2-D",  name: "IT Neural2-D",  description: "Male — Italian, deep",    provider: "google_wavenet", gender: "male" },
  // ── Portuguese Neural2 ──
  { id: "pt-BR-Neural2-A",  name: "PT-BR Neural2-A", description: "Female — Brazilian Portuguese, warm", provider: "google_wavenet", gender: "female" },
  { id: "pt-BR-Neural2-B",  name: "PT-BR Neural2-B", description: "Male — Brazilian Portuguese, clear",  provider: "google_wavenet", gender: "male" },
  { id: "pt-BR-Neural2-C",  name: "PT-BR Neural2-C", description: "Female — Brazilian Portuguese, bright", provider: "google_wavenet", gender: "female" },
  // ── Japanese Neural2 ──
  { id: "ja-JP-Neural2-B",  name: "JP Neural2-B",  description: "Female — Japanese, warm",  provider: "google_wavenet", gender: "female" },
  { id: "ja-JP-Neural2-C",  name: "JP Neural2-C",  description: "Male — Japanese, clear",   provider: "google_wavenet", gender: "male" },
  { id: "ja-JP-Neural2-D",  name: "JP Neural2-D",  description: "Male — Japanese, deep",    provider: "google_wavenet", gender: "male" },
  // ── Korean Neural2 ──
  { id: "ko-KR-Neural2-A",  name: "KR Neural2-A",  description: "Female — Korean, warm",   provider: "google_wavenet", gender: "female" },
  { id: "ko-KR-Neural2-B",  name: "KR Neural2-B",  description: "Female — Korean, bright", provider: "google_wavenet", gender: "female" },
  { id: "ko-KR-Neural2-C",  name: "KR Neural2-C",  description: "Male — Korean, clear",    provider: "google_wavenet", gender: "male" },
  // ── Chinese Mandarin Neural2 ──
  { id: "cmn-CN-Neural2-A", name: "CN Neural2-A",  description: "Female — Chinese Mandarin, warm",  provider: "google_wavenet", gender: "female" },
  { id: "cmn-CN-Neural2-B", name: "CN Neural2-B",  description: "Male — Chinese Mandarin, clear",   provider: "google_wavenet", gender: "male" },
  { id: "cmn-CN-Neural2-C", name: "CN Neural2-C",  description: "Male — Chinese Mandarin, deep",    provider: "google_wavenet", gender: "male" },
  { id: "cmn-CN-Neural2-D", name: "CN Neural2-D",  description: "Female — Chinese Mandarin, bright", provider: "google_wavenet", gender: "female" },
  // ── Hindi Neural2 ──
  { id: "hi-IN-Neural2-A",  name: "HI Neural2-A",  description: "Female — Hindi, warm",   provider: "google_wavenet", gender: "female" },
  { id: "hi-IN-Neural2-B",  name: "HI Neural2-B",  description: "Male — Hindi, clear",    provider: "google_wavenet", gender: "male" },
  { id: "hi-IN-Neural2-C",  name: "HI Neural2-C",  description: "Male — Hindi, deep",     provider: "google_wavenet", gender: "male" },
  { id: "hi-IN-Neural2-D",  name: "HI Neural2-D",  description: "Female — Hindi, bright", provider: "google_wavenet", gender: "female" },
  // ── Arabic Neural2 ──
  { id: "ar-XA-Neural2-A",  name: "AR Neural2-A",  description: "Female — Arabic, warm",  provider: "google_wavenet", gender: "female" },
  { id: "ar-XA-Neural2-B",  name: "AR Neural2-B",  description: "Male — Arabic, clear",   provider: "google_wavenet", gender: "male" },
  { id: "ar-XA-Neural2-C",  name: "AR Neural2-C",  description: "Male — Arabic, deep",    provider: "google_wavenet", gender: "male" },
  { id: "ar-XA-Neural2-D",  name: "AR Neural2-D",  description: "Female — Arabic, bright", provider: "google_wavenet", gender: "female" },
  // ── Dutch Neural2 ──
  { id: "nl-NL-Neural2-A",  name: "NL Neural2-A",  description: "Female — Dutch, warm",   provider: "google_wavenet", gender: "female" },
  { id: "nl-NL-Neural2-B",  name: "NL Neural2-B",  description: "Male — Dutch, clear",    provider: "google_wavenet", gender: "male" },
  { id: "nl-NL-Neural2-C",  name: "NL Neural2-C",  description: "Male — Dutch, deep",     provider: "google_wavenet", gender: "male" },
  { id: "nl-NL-Neural2-D",  name: "NL Neural2-D",  description: "Female — Dutch, bright", provider: "google_wavenet", gender: "female" },
  // ── Turkish Neural2 ──
  { id: "tr-TR-Neural2-A",  name: "TR Neural2-A",  description: "Female — Turkish, warm",  provider: "google_wavenet", gender: "female" },
  { id: "tr-TR-Neural2-B",  name: "TR Neural2-B",  description: "Male — Turkish, clear",   provider: "google_wavenet", gender: "male" },
  { id: "tr-TR-Neural2-C",  name: "TR Neural2-C",  description: "Female — Turkish, bright", provider: "google_wavenet", gender: "female" },
  { id: "tr-TR-Neural2-D",  name: "TR Neural2-D",  description: "Male — Turkish, deep",    provider: "google_wavenet", gender: "male" },
  { id: "tr-TR-Neural2-E",  name: "TR Neural2-E",  description: "Male — Turkish, warm",    provider: "google_wavenet", gender: "male" },
]

// ---------------------------------------------------------------------------
// Combined voice catalogue
// ---------------------------------------------------------------------------

export const ALL_VOICES: VoiceOption[] = [
  ...OPENAI_VOICES,
  ...OPENAI_ADVANCED_VOICES,
  ...GEMINI_VOICES,
  ...AWS_POLLY_VOICES,
  ...GOOGLE_WAVENET_VOICES,
]

/** All provider keys in display order */
export const ALL_PROVIDERS: VoiceProvider[] = [
  "openai",
  "openai_advanced",
  "gemini",
  "aws_polly",
  "google_wavenet",
]

/** Voices grouped by provider (for dropdown sections) */
export const VOICES_BY_PROVIDER: Record<VoiceProvider, VoiceOption[]> = {
  openai: OPENAI_VOICES,
  openai_advanced: OPENAI_ADVANCED_VOICES,
  gemini: GEMINI_VOICES,
  aws_polly: AWS_POLLY_VOICES,
  google_wavenet: GOOGLE_WAVENET_VOICES,
}

// ---------------------------------------------------------------------------
// Voice helpers
// ---------------------------------------------------------------------------

/** Get all voices for a specific provider */
export function getVoicesByProvider(provider: VoiceProvider): VoiceOption[] {
  return VOICES_BY_PROVIDER[provider] ?? []
}

/** Get a single voice by its unique ID */
export function getVoiceById(id: string): VoiceOption | undefined {
  return ALL_VOICES.find((v) => v.id === id)
}

// ---------------------------------------------------------------------------
// Agent types & config (unchanged)
// ---------------------------------------------------------------------------

export type AgentGender = "female" | "male" | "neutral"

export type AgentVoiceDef = {
  id: string
  name: string
  domain: "coaching" | "business" | "system" | "career"
  gender: AgentGender
  description: string
  /** Legacy Polly voice name — kept for backward compat */
  pollyVoice: string
  /** Reference to multi-provider voice ID */
  voiceId: string
  modelTier: "Sonnet" | "Haiku" | "Nova"
}

/**
 * The canonical list of all 18 built-in agents with their voice assignments.
 * Male agents use male voices; female agents use female voices.
 */
export const AGENT_VOICE_CONFIG: AgentVoiceDef[] = [
  // -- Unified Persona --
  { id: "meridian-001", name: "Meridian", domain: "coaching", gender: "neutral", description: "Unified AI persona — routes to domain orchestrators", pollyVoice: "Joanna", voiceId: "polly-joanna", modelTier: "Sonnet" },

  // -- Coaching Domain --
  { id: "aura-001",   name: "Aura",   domain: "coaching", gender: "female",  description: "Emotional intelligence and self-awareness coach", pollyVoice: "Salli",   voiceId: "polly-salli",   modelTier: "Sonnet" },
  { id: "alex-001",   name: "Alex",   domain: "coaching", gender: "neutral", description: "General-purpose AI coaching assistant",          pollyVoice: "Joanna",  voiceId: "polly-joanna",  modelTier: "Sonnet" },
  { id: "nova-001",   name: "Nova",   domain: "coaching", gender: "female",  description: "Innovation and creative thinking mentor",       pollyVoice: "Kendra",  voiceId: "polly-kendra",  modelTier: "Sonnet" },
  { id: "echo-001",   name: "Echo",   domain: "coaching", gender: "female",  description: "Feedback and reflection facilitator",           pollyVoice: "Ruth",    voiceId: "polly-ruth",    modelTier: "Haiku" },
  { id: "ascend-001", name: "Ascend", domain: "coaching", gender: "neutral", description: "Goal-setting and growth acceleration coach",    pollyVoice: "Matthew", voiceId: "polly-matthew", modelTier: "Sonnet" },

  // -- Business Domain --
  { id: "forge-001",   name: "Forge",   domain: "business", gender: "male",   description: "Strategic planning and execution advisor",     pollyVoice: "Stephen", voiceId: "polly-stephen", modelTier: "Sonnet" },
  { id: "atlas-001",   name: "Atlas",   domain: "business", gender: "male",   description: "Data analytics and business intelligence",     pollyVoice: "Matthew", voiceId: "polly-matthew", modelTier: "Sonnet" },
  { id: "sage-001",    name: "Sage",    domain: "business", gender: "female", description: "Knowledge management and wisdom advisor",      pollyVoice: "Salli",   voiceId: "polly-salli",   modelTier: "Haiku" },
  { id: "compass-001", name: "Compass", domain: "business", gender: "female", description: "Career navigation and direction finder",       pollyVoice: "Kendra",  voiceId: "polly-kendra",  modelTier: "Haiku" },
  { id: "james-001",   name: "James",   domain: "business", gender: "male",   description: "Professional development and skills coach",    pollyVoice: "Stephen", voiceId: "polly-stephen", modelTier: "Sonnet" },
  { id: "maven-001",   name: "Maven",   domain: "business", gender: "male",   description: "Industry expertise and market insights",       pollyVoice: "Gregory", voiceId: "polly-gregory", modelTier: "Haiku" },

  // -- System Domain --
  { id: "sentinel-001", name: "Sentinel", domain: "system", gender: "male",   description: "Platform security and compliance monitor",   pollyVoice: "Matthew", voiceId: "polly-matthew", modelTier: "Haiku" },
  { id: "anchor-001",   name: "Anchor",   domain: "system", gender: "male",   description: "System reliability and performance guardian", pollyVoice: "Stephen", voiceId: "polly-stephen", modelTier: "Haiku" },
  { id: "nexus-001",    name: "Nexus",    domain: "system", gender: "male",   description: "Integration and connectivity orchestrator",   pollyVoice: "Gregory", voiceId: "polly-gregory", modelTier: "Haiku" },
  { id: "beacon-001",   name: "Beacon",   domain: "system", gender: "female", description: "Talent discovery and recruitment specialist", pollyVoice: "Kendra",  voiceId: "polly-kendra",  modelTier: "Sonnet" },

  // -- Career & Talent Domain --
  { id: "bridge-001", name: "Bridge", domain: "career", gender: "female", description: "Team collaboration and communication coach",     pollyVoice: "Ruth",    voiceId: "polly-ruth",    modelTier: "Haiku" },
  { id: "grant-001",  name: "Grant",  domain: "career", gender: "male",   description: "Learning and professional certification coach", pollyVoice: "Matthew", voiceId: "polly-matthew", modelTier: "Haiku" },
]

/** Lookup an agent voice config by agent ID */
export function getAgentVoice(agentId: string): AgentVoiceDef | undefined {
  return AGENT_VOICE_CONFIG.find((a) => a.id === agentId)
}

/** Get domain color class for badges */
export function getDomainColor(domain: string): string {
  switch (domain) {
    case "coaching": return "bg-blue-100 text-blue-700"
    case "business": return "bg-emerald-100 text-emerald-700"
    case "system":   return "bg-amber-100 text-amber-700"
    case "career":   return "bg-violet-100 text-violet-700"
    default:         return "bg-gray-100 text-gray-700"
  }
}

/** Get gender icon label */
export function getGenderLabel(gender: AgentGender): string {
  switch (gender) {
    case "female":  return "Female"
    case "male":    return "Male"
    case "neutral": return "Neutral"
  }
}

/** Get provider badge color */
export function getProviderColor(provider: VoiceProvider): string {
  switch (provider) {
    case "openai":          return "bg-green-100 text-green-700"
    case "openai_advanced": return "bg-teal-100 text-teal-700"
    case "gemini":          return "bg-blue-100 text-blue-700"
    case "aws_polly":       return "bg-orange-100 text-orange-700"
    case "google_wavenet":  return "bg-purple-100 text-purple-700"
    default:                return "bg-gray-100 text-gray-700"
  }
}
