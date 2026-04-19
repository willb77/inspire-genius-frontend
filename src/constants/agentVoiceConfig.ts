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
  { id: "polly-joanna",   name: "Joanna",   description: "Female, US English",  provider: "aws_polly", gender: "female" },
  { id: "polly-kendra",   name: "Kendra",   description: "Female, US English",  provider: "aws_polly", gender: "female" },
  { id: "polly-salli",    name: "Salli",     description: "Female, US English",  provider: "aws_polly", gender: "female" },
  { id: "polly-ruth",     name: "Ruth",      description: "Female, US English",  provider: "aws_polly", gender: "female" },
  { id: "polly-matthew",  name: "Matthew",   description: "Male, US English",    provider: "aws_polly", gender: "male" },
  { id: "polly-stephen",  name: "Stephen",   description: "Male, US English",    provider: "aws_polly", gender: "male" },
  { id: "polly-gregory",  name: "Gregory",   description: "Male, US English",    provider: "aws_polly", gender: "male" },
  { id: "polly-kevin",    name: "Kevin",     description: "Male, US English",    provider: "aws_polly", gender: "male" },
]

// ---------------------------------------------------------------------------
// Google Cloud WaveNet Voices
// ---------------------------------------------------------------------------

export const GOOGLE_WAVENET_VOICES: VoiceOption[] = [
  { id: "wavenet-a", name: "en-US-Wavenet-A", description: "Male",   provider: "google_wavenet", gender: "male" },
  { id: "wavenet-b", name: "en-US-Wavenet-B", description: "Male",   provider: "google_wavenet", gender: "male" },
  { id: "wavenet-c", name: "en-US-Wavenet-C", description: "Female", provider: "google_wavenet", gender: "female" },
  { id: "wavenet-d", name: "en-US-Wavenet-D", description: "Male",   provider: "google_wavenet", gender: "male" },
  { id: "wavenet-e", name: "en-US-Wavenet-E", description: "Female", provider: "google_wavenet", gender: "female" },
  { id: "wavenet-f", name: "en-US-Wavenet-F", description: "Female", provider: "google_wavenet", gender: "female" },
  { id: "wavenet-g", name: "en-US-Wavenet-G", description: "Female", provider: "google_wavenet", gender: "female" },
  { id: "wavenet-h", name: "en-US-Wavenet-H", description: "Female", provider: "google_wavenet", gender: "female" },
  { id: "wavenet-i", name: "en-US-Wavenet-I", description: "Male",   provider: "google_wavenet", gender: "male" },
  { id: "wavenet-j", name: "en-US-Wavenet-J", description: "Male",   provider: "google_wavenet", gender: "male" },
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
  { id: "bridge-001",  name: "Bridge",  domain: "business", gender: "female", description: "Team collaboration and communication coach",   pollyVoice: "Ruth",    voiceId: "polly-ruth",    modelTier: "Haiku" },

  // -- System Domain --
  { id: "sentinel-001", name: "Sentinel", domain: "system", gender: "male",   description: "Platform security and compliance monitor",   pollyVoice: "Matthew", voiceId: "polly-matthew", modelTier: "Haiku" },
  { id: "anchor-001",   name: "Anchor",   domain: "system", gender: "male",   description: "System reliability and performance guardian", pollyVoice: "Stephen", voiceId: "polly-stephen", modelTier: "Haiku" },
  { id: "nexus-001",    name: "Nexus",    domain: "system", gender: "male",   description: "Integration and connectivity orchestrator",   pollyVoice: "Gregory", voiceId: "polly-gregory", modelTier: "Haiku" },

  // -- Career & Talent Domain --
  { id: "beacon-001", name: "Beacon", domain: "career", gender: "female", description: "Talent discovery and recruitment specialist",  pollyVoice: "Kendra",  voiceId: "polly-kendra",  modelTier: "Sonnet" },
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
