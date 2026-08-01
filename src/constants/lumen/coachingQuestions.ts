/**
 * Lumen personal-coaching questions — five categories, ten each.
 *
 * These open a Meridian conversation that already has your Self-Portrait behind
 * it, so they're written to go straight at the thing rather than spending the
 * first exchange establishing who you are. First-person, the way someone would
 * actually type them — the same convention as `meridianStarterQuestions.ts`.
 *
 * Deliberately specific: "how can I improve?" produces a horoscope; "which of my
 * tendencies is costing me most in the job I have now?" produces an answer.
 */

export interface LumenQuestionGroup {
  key: string
  category: string
  /** One line on what this category is for — shown under the dropdown. */
  blurb: string
  questions: string[]
}

export const LUMEN_QUESTION_GROUPS: LumenQuestionGroup[] = [
  {
    key: "goals",
    category: "Goals",
    blurb: "What you're aiming at, and whether it's the right target.",
    questions: [
      "Help me set a goal that actually fits how I'm wired.",
      "What goal would make the biggest difference to me in the next 90 days?",
      "I keep abandoning goals. What does my profile say about why?",
      "How should I break a goal down so I'll actually finish it?",
      "What am I likely to over-commit to, and how do I catch myself?",
      "Which of my current goals should I drop?",
      "How do I tell an ambitious goal from an unrealistic one, for me specifically?",
      "What would a good year look like for someone with my profile?",
      "How should I measure progress so I don't fool myself?",
      "What's one thing I could stop doing that would free up real capacity?",
    ],
  },
  {
    key: "education",
    category: "Education",
    blurb: "What's worth learning, and how you actually learn it.",
    questions: [
      "What's the most useful thing I could learn next, given my background?",
      "How do I learn best, based on my profile?",
      "I want to study something but can't commit the hours. What's realistic?",
      "Is a formal qualification worth it for me, or is experience the better route?",
      "What do I keep meaning to learn and never start? Help me work out why.",
      "How should I structure my learning so it sticks?",
      "What's a skill I'm underrating in myself?",
      "How do I stay current in my field without drowning in it?",
      "What should I learn that would compound over the next five years?",
      "How do I know when I've learned something well enough to move on?",
    ],
  },
  {
    key: "career",
    category: "Career",
    blurb: "The long arc — direction, not just the next job.",
    questions: [
      "Where is my career actually heading, based on what you know about me?",
      "What kind of work would suit me that I might not have considered?",
      "Am I in the right field, or the right field and the wrong role?",
      "What's my strongest differentiator, honestly?",
      "What would I need to change to move up a level?",
      "I feel stuck. Help me work out whether it's the job or me.",
      "What does my profile suggest about the environments where I do my best work?",
      "How do I build a reputation for something specific?",
      "What career risk would be worth taking for me right now?",
      "If I stay on my current path for five years, where do I end up?",
    ],
  },
  {
    key: "jobs",
    category: "Jobs",
    blurb: "The immediate thing — this role, or the next one.",
    questions: [
      "How do I get more out of the job I'm in right now?",
      "Should I be looking? Help me think it through.",
      "What should I look for in my next role, given how I work?",
      "How do I tell whether a job posting is actually a fit for me?",
      "What questions should I ask in an interview to find out if I'd thrive there?",
      "How do I talk about what I'm good at without overselling?",
      "What's likely to frustrate me in a new job, and how do I check for it early?",
      "Help me prepare for a conversation with my manager about my role.",
      "What would make me a stronger candidate in the next six months?",
      "I've been offered something. Help me pressure-test whether to take it.",
    ],
  },
  {
    key: "relationships",
    category: "Relationships",
    blurb: "How you work with people — and where that goes wrong.",
    questions: [
      "How do I come across to people who work differently from me?",
      "There's someone I keep clashing with. Help me understand why.",
      "How should I adapt when I'm working with someone very unlike me?",
      "What do I probably get wrong about how others see me?",
      "How do I give difficult feedback in a way that lands?",
      "How do I ask for what I need without it turning into a confrontation?",
      "What's my likely blind spot in a team?",
      "How do I build trust faster with someone new?",
      "I need to have a hard conversation. Help me prepare for it.",
      "What kind of people bring out my best work, and how do I find more of them?",
    ],
  },
]
