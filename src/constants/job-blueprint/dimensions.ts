// All 22 PRISM Dimensions with metadata

export type DimensionDef = {
  id: number
  name: string
  description: string
  color?: string
}

export const BEHAVIORS: readonly DimensionDef[] = [
  { id: 1, name: 'Innovating', description: 'Generate ideas, original thinking, creative and curious', color: '#38A169' },
  { id: 2, name: 'Initiating', description: 'Enthusiastic, persuasive, effective communication, build relationships', color: '#2F855A' },
  { id: 3, name: 'Supporting', description: 'Patient, deliberate, empathetic, team-oriented', color: '#E53E3E' },
  { id: 4, name: 'Coordinating', description: 'Collaborative, broad-minded, uses others\u2019 skills, consultative', color: '#C53030' },
  { id: 5, name: 'Focusing', description: 'Assertive, challenging, driven, high-pressure negotiation', color: '#ECC94B' },
  { id: 6, name: 'Delivering', description: 'Goal-oriented, resourceful, works under pressure, structured', color: '#D69E2E' },
  { id: 7, name: 'Finishing', description: 'Attention to detail, accuracy, follows through to completion', color: '#3182CE' },
  { id: 8, name: 'Evaluating', description: 'Questions data validity, checks pros/cons, fact-based decisions', color: '#2B6CB0' },
] as const

export const APTITUDES: readonly DimensionDef[] = [
  { id: 1, name: 'Practical & Mechanical', description: 'Hands-on, enjoy working with tools and machinery' },
  { id: 2, name: 'Investigative & Analytical', description: 'Research-oriented, enjoy solving complex problems' },
  { id: 3, name: 'Creative & Artistic', description: 'Blend art with science, sensitive and expressive' },
  { id: 4, name: 'Social & Empathetic', description: 'Good interpersonal skills, concerned with human welfare' },
  { id: 5, name: 'Competitive & Entrepreneurial', description: 'Ambitious, risk-taking, project-driven' },
  { id: 6, name: 'Orderly & Efficient', description: 'Methodical, structured, follows defined procedures' },
  { id: 7, name: 'Mathematical & Logical', description: 'Numerical reasoning, systematic problem-solving' },
  { id: 8, name: 'Outgoing & Expressive', description: 'Rapport building, self-confident, persuasive' },
] as const

export const CORE_TRAITS: readonly DimensionDef[] = [
  { id: 1, name: 'Relationship Management', description: 'Effective interpersonal interaction, managing difficult situations' },
  { id: 2, name: 'Emotional Stability', description: 'Calm under pressure, resistant to stress, high self-awareness' },
  { id: 3, name: 'Decisiveness', description: 'Sound judgment under pressure, commitment to decisions' },
  { id: 4, name: 'Self-Motivation', description: 'Self-confident, energetic, self-starter' },
  { id: 5, name: 'Conscientiousness', description: 'Reliable, thorough, dedicated to quality' },
  { id: 6, name: 'Flexibility', description: 'Adaptable, open to change, resilient' },
] as const

/** All 22 dimensions combined */
export const ALL_DIMENSIONS = [
  ...BEHAVIORS.map(b => ({ ...b, category: 'behavior' as const })),
  ...APTITUDES.map(a => ({ ...a, category: 'aptitude' as const })),
  ...CORE_TRAITS.map(t => ({ ...t, category: 'core-trait' as const })),
]

/** Category display config */
export const CATEGORY_COLORS = {
  behavior: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', fill: '#38A169' },
  aptitude: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', fill: '#3182CE' },
  'core-trait': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', fill: '#DD6B20' },
} as const

export const CATEGORY_LABELS = {
  behavior: 'Behavior Preferences',
  aptitude: 'Work Aptitude Preferences',
  'core-trait': 'Core Traits',
} as const
