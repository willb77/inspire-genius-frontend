/**
 * Job-Fit coaching questions — five categories, ten each.
 *
 * Every question is about the user against **one selected role**, which is what
 * separates this from general Meridian coaching. `{role}` is interpolated with
 * the chosen role title before the question is injected into the chat and
 * auto-submitted, so Meridian opens already knowing what it is being asked to
 * compare against.
 *
 * Written first-person, the way someone would actually type them — the same
 * convention as `meridianStarterQuestions.ts`. They are deliberately specific:
 * "am I a good fit" produces a horoscope, "which parts of my background
 * genuinely map" produces an answer.
 */

export interface FitQuestionGroup {
  /** Stable key used for the dropdown value. */
  key: string
  category: string
  /** One line on what this category is for — shown under the dropdown. */
  blurb: string
  questions: string[]
}

/** Replace the `{role}` placeholder with the selected role title. */
export function withRole(question: string, roleTitle: string): string {
  return question.replace(/\{role\}/g, roleTitle.trim() || "this role")
}

export const JOB_FIT_QUESTION_GROUPS: FitQuestionGroup[] = [
  {
    key: "fit",
    category: "Job fit",
    blurb: "How your profile actually lines up against the role.",
    questions: [
      "Where does my background genuinely fit {role}, and where am I stretching?",
      "Which of my strengths matter most for {role}, and which barely count?",
      "What does my PRISM profile suggest about how I'd behave day to day in {role}?",
      "If someone reviewed me for {role} tomorrow, what would they see first?",
      "What part of {role} would feel most natural to me, and why?",
      "What part of {role} would drain me fastest?",
      "Am I aiming at the right level with {role}, or should I be targeting a step either side?",
      "What evidence from my experience best supports me for {role}?",
      "Which of my assumptions about {role} should I pressure-test?",
      "How would you honestly rate my readiness for {role} today, and on what basis?",
    ],
  },
  {
    key: "gaps",
    category: "Gaps",
    blurb: "What's missing between you and the role, stated plainly.",
    questions: [
      "What are my real gaps for {role} — not the cosmetic ones?",
      "Which gap for {role} would a hiring manager notice first?",
      "Which of my gaps for {role} are about experience, and which are about how I come across?",
      "Is there anything in my background that actively works against me for {role}?",
      "What do I think is a gap for {role} that probably isn't?",
      "Which gaps for {role} are dealbreakers, and which are trainable on the job?",
      "How big is the distance between where I am and {role}, in plain terms?",
      "What would someone already doing {role} say I'm missing?",
      "Which gap for {role} is costing me the most right now?",
      "If I only had evidence for one missing area of {role}, which should it be?",
    ],
  },
  {
    key: "closing",
    category: "Closing gaps",
    blurb: "The shortest credible route from here to qualified.",
    questions: [
      "What's the fastest credible way to close my biggest gap for {role}?",
      "What could I do in the next 90 days that would materially improve my case for {role}?",
      "Which gap for {role} should I close first for the best return?",
      "How do I get real evidence for {role} without already having the title?",
      "What could I do in my current role that would count toward {role}?",
      "Which gaps for {role} can I close by reframing what I've already done?",
      "What would a realistic 6-month plan toward {role} look like for me?",
      "Who should I be learning from to close my gaps for {role}?",
      "What's the smallest project that would prove I can do {role}?",
      "How will I know a gap for {role} is actually closed, rather than just practised?",
    ],
  },
  {
    key: "goals",
    category: "Setting goals",
    blurb: "Turning the gaps into goals you'd actually keep.",
    questions: [
      "Help me set three concrete goals that move me toward {role}.",
      "What's a good 30-day goal for me on the path to {role}?",
      "How should I measure progress toward {role} so I don't fool myself?",
      "Which goal for {role} should I drop because it isn't moving the needle?",
      "How do I set goals for {role} that fit how I'm actually wired?",
      "What's the right sequence of goals to reach {role} without burning out?",
      "How ambitious should my timeline for {role} be, honestly?",
      "What would make me abandon a goal for {role}, and how do I design around that?",
      "How do I keep momentum toward {role} when nothing visible is changing?",
      "What should I review monthly to stay on track for {role}?",
    ],
  },
  {
    key: "interview",
    category: "Interview prep",
    blurb: "Getting ready to be asked about it out loud.",
    questions: [
      "What will I most likely be asked in an interview for {role}?",
      "How should I answer the weakest part of my fit for {role}?",
      "Help me tell the story of my background in a way that lands for {role}.",
      "What examples from my experience should I lead with for {role}?",
      "What question about {role} am I least prepared for?",
      "How do I talk about a gap for {role} without either hiding it or over-apologising?",
      "Given how I'm wired, what should I watch for in my own interview style for {role}?",
      "What should I ask them, to find out whether {role} actually suits me?",
      "How do I show judgment rather than just experience when interviewing for {role}?",
      "Run me through a tough interview question for {role} and critique my thinking.",
    ],
  },
]
