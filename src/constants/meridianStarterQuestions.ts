/**
 * Meridian home-screen starter questions.
 *
 * Source: "IG Home Screen Starter Questions" (persona prompt library). Five
 * personas × five first-person questions, written the way a user would tap or
 * type them to open a conversation with Meridian. Shown in the HomeV2 "Chat
 * with Meridian" tile's Starter Questions dropdown; tapping one routes into the
 * Meridian chat with the question prefilled and auto-submitted.
 *
 * Note: the fuller design (assessment gating, login-based rotation, and a
 * server-resolved / already-ordered boot payload) is intentionally deferred —
 * this ships the full static library grouped by persona.
 */
export interface StarterQuestionGroup {
  category: string
  questions: string[]
}

export const MERIDIAN_STARTER_GROUPS: StarterQuestionGroup[] = [
  {
    category: "New to Inspires Genius",
    questions: [
      "I just signed up — what's the first thing I should do?",
      "What is a brain map, and what will mine tell me about myself?",
      "Walk me through the assessment — how long does it take and how should I answer?",
      "My results are in. What do my strongest preferences actually mean day to day?",
      "Where am I likely to thrive, and what should I watch out for?",
    ],
  },
  {
    category: "Personal & career goals",
    questions: [
      "Based on my profile, what kinds of goals would actually fit how I'm wired?",
      'Help me turn "I want to grow in my career" into something concrete I can act on.',
      "What's one personal habit my profile suggests would give me the biggest payoff?",
      "Map out a 90-day plan toward the goal I just described.",
      "What strengths should I lean into, and which gaps are worth closing first?",
    ],
  },
  {
    category: "Hiring & team management",
    questions: [
      "I'm hiring for a role — help me build a behavioral blueprint for the ideal candidate.",
      "Score these candidates against the blueprint and tell me why each ranks where it does.",
      "What does my current team's behavioral mix look like, and where are the gaps?",
      "I have a new initiative — who should be on the team and who should own what?",
      "Generate a structured interview kit with scoring rubrics for this position.",
    ],
  },
  {
    category: "Choosing a career (students)",
    questions: [
      "I don't know what I want to do — how do I even start figuring it out?",
      "Based on how I'm wired, what kinds of work would suit me?",
      "Show me a few career clusters that fit me, with real examples of jobs in each.",
      "What courses, certifications, or experiences should I try to test whether a path is right?",
      "Help me pick a primary path and a backup, and lay out my next 12 months.",
    ],
  },
  {
    category: "Changing careers",
    questions: [
      "I'm changing careers — where do my existing strengths transfer best?",
      "What new fields fit my profile that I might not have considered?",
      "Which of my current skills carry over, and what would I realistically need to learn?",
      "Build me a retraining plan that fits around work and family.",
      "What financial aid or scholarships might I qualify for as an adult learner?",
    ],
  },
]
