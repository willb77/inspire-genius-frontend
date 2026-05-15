// All 48 Brain Mapping Light (BML) questions
// 24 Behavior questions (3 per behavior x 8 behaviors)
// 16 Aptitude questions (2 per aptitude x 8 aptitudes)
// 8 Core Trait questions (2 per trait x 4 traits, reduced set)

import type { BMLQuestion } from '@/types/job-blueprint'

export const BML_QUESTIONS: BMLQuestion[] = [
  // ── Behavior: Innovating (3 questions) ──
  { id: 'bml-b1-1', dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', text: 'I enjoy generating original ideas and thinking outside the box.', order: 1 },
  { id: 'bml-b1-2', dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', text: 'I am naturally curious and love exploring new concepts.', order: 2 },
  { id: 'bml-b1-3', dimensionId: 1, dimensionName: 'Innovating', category: 'behavior', text: 'I often find creative solutions to problems others find difficult.', order: 3 },

  // ── Behavior: Initiating (3 questions) ──
  { id: 'bml-b2-1', dimensionId: 2, dimensionName: 'Initiating', category: 'behavior', text: 'I am enthusiastic about building new relationships and networks.', order: 4 },
  { id: 'bml-b2-2', dimensionId: 2, dimensionName: 'Initiating', category: 'behavior', text: 'I find it easy to persuade others and communicate my ideas effectively.', order: 5 },
  { id: 'bml-b2-3', dimensionId: 2, dimensionName: 'Initiating', category: 'behavior', text: 'I naturally take the lead in starting new projects or initiatives.', order: 6 },

  // ── Behavior: Supporting (3 questions) ──
  { id: 'bml-b3-1', dimensionId: 3, dimensionName: 'Supporting', category: 'behavior', text: 'I am patient and deliberate in my approach to work.', order: 7 },
  { id: 'bml-b3-2', dimensionId: 3, dimensionName: 'Supporting', category: 'behavior', text: 'I am empathetic and naturally tune into how others are feeling.', order: 8 },
  { id: 'bml-b3-3', dimensionId: 3, dimensionName: 'Supporting', category: 'behavior', text: 'I prefer working as part of a team rather than independently.', order: 9 },

  // ── Behavior: Coordinating (3 questions) ──
  { id: 'bml-b4-1', dimensionId: 4, dimensionName: 'Coordinating', category: 'behavior', text: 'I enjoy bringing people together and leveraging their different skills.', order: 10 },
  { id: 'bml-b4-2', dimensionId: 4, dimensionName: 'Coordinating', category: 'behavior', text: 'I prefer a consultative approach, seeking input before making decisions.', order: 11 },
  { id: 'bml-b4-3', dimensionId: 4, dimensionName: 'Coordinating', category: 'behavior', text: 'I am broad-minded and value diverse perspectives in problem-solving.', order: 12 },

  // ── Behavior: Focusing (3 questions) ──
  { id: 'bml-b5-1', dimensionId: 5, dimensionName: 'Focusing', category: 'behavior', text: 'I am assertive and comfortable challenging the status quo.', order: 13 },
  { id: 'bml-b5-2', dimensionId: 5, dimensionName: 'Focusing', category: 'behavior', text: 'I thrive in high-pressure negotiation situations.', order: 14 },
  { id: 'bml-b5-3', dimensionId: 5, dimensionName: 'Focusing', category: 'behavior', text: 'I am driven to achieve results and push through obstacles.', order: 15 },

  // ── Behavior: Delivering (3 questions) ──
  { id: 'bml-b6-1', dimensionId: 6, dimensionName: 'Delivering', category: 'behavior', text: 'I am goal-oriented and focus on achieving measurable outcomes.', order: 16 },
  { id: 'bml-b6-2', dimensionId: 6, dimensionName: 'Delivering', category: 'behavior', text: 'I am resourceful and find ways to get things done under pressure.', order: 17 },
  { id: 'bml-b6-3', dimensionId: 6, dimensionName: 'Delivering', category: 'behavior', text: 'I prefer structured approaches with clear deadlines and milestones.', order: 18 },

  // ── Behavior: Finishing (3 questions) ──
  { id: 'bml-b7-1', dimensionId: 7, dimensionName: 'Finishing', category: 'behavior', text: 'I pay close attention to detail and strive for accuracy in my work.', order: 19 },
  { id: 'bml-b7-2', dimensionId: 7, dimensionName: 'Finishing', category: 'behavior', text: 'I always follow through on tasks until they are fully completed.', order: 20 },
  { id: 'bml-b7-3', dimensionId: 7, dimensionName: 'Finishing', category: 'behavior', text: 'I feel uncomfortable leaving work unfinished or loosely tied up.', order: 21 },

  // ── Behavior: Evaluating (3 questions) ──
  { id: 'bml-b8-1', dimensionId: 8, dimensionName: 'Evaluating', category: 'behavior', text: 'I question the validity of data before accepting conclusions.', order: 22 },
  { id: 'bml-b8-2', dimensionId: 8, dimensionName: 'Evaluating', category: 'behavior', text: 'I carefully weigh pros and cons before making important decisions.', order: 23 },
  { id: 'bml-b8-3', dimensionId: 8, dimensionName: 'Evaluating', category: 'behavior', text: 'I base my decisions on facts and evidence rather than intuition alone.', order: 24 },

  // ── Aptitude: Practical & Mechanical (2 questions) ──
  { id: 'bml-a1-1', dimensionId: 1, dimensionName: 'Practical & Mechanical', category: 'aptitude', text: 'I enjoy hands-on work and using tools or equipment.', order: 25 },
  { id: 'bml-a1-2', dimensionId: 1, dimensionName: 'Practical & Mechanical', category: 'aptitude', text: 'I prefer physical, tangible tasks over abstract thinking.', order: 26 },

  // ── Aptitude: Investigative & Analytical (2 questions) ──
  { id: 'bml-a2-1', dimensionId: 2, dimensionName: 'Investigative & Analytical', category: 'aptitude', text: 'I enjoy researching and investigating complex problems.', order: 27 },
  { id: 'bml-a2-2', dimensionId: 2, dimensionName: 'Investigative & Analytical', category: 'aptitude', text: 'I find satisfaction in analysing data to uncover patterns and insights.', order: 28 },

  // ── Aptitude: Creative & Artistic (2 questions) ──
  { id: 'bml-a3-1', dimensionId: 3, dimensionName: 'Creative & Artistic', category: 'aptitude', text: 'I am drawn to creative expression and artistic endeavours.', order: 29 },
  { id: 'bml-a3-2', dimensionId: 3, dimensionName: 'Creative & Artistic', category: 'aptitude', text: 'I naturally blend creativity with analytical thinking.', order: 30 },

  // ── Aptitude: Social & Empathetic (2 questions) ──
  { id: 'bml-a4-1', dimensionId: 4, dimensionName: 'Social & Empathetic', category: 'aptitude', text: 'I am genuinely concerned with the welfare of others.', order: 31 },
  { id: 'bml-a4-2', dimensionId: 4, dimensionName: 'Social & Empathetic', category: 'aptitude', text: 'I have strong interpersonal skills and relate well to people.', order: 32 },

  // ── Aptitude: Competitive & Entrepreneurial (2 questions) ──
  { id: 'bml-a5-1', dimensionId: 5, dimensionName: 'Competitive & Entrepreneurial', category: 'aptitude', text: 'I am ambitious and enjoy competing to achieve the best results.', order: 33 },
  { id: 'bml-a5-2', dimensionId: 5, dimensionName: 'Competitive & Entrepreneurial', category: 'aptitude', text: 'I am comfortable taking calculated risks to seize opportunities.', order: 34 },

  // ── Aptitude: Orderly & Efficient (2 questions) ──
  { id: 'bml-a6-1', dimensionId: 6, dimensionName: 'Orderly & Efficient', category: 'aptitude', text: 'I prefer following defined procedures and established methods.', order: 35 },
  { id: 'bml-a6-2', dimensionId: 6, dimensionName: 'Orderly & Efficient', category: 'aptitude', text: 'I am methodical and structured in how I organise my work.', order: 36 },

  // ── Aptitude: Mathematical & Logical (2 questions) ──
  { id: 'bml-a7-1', dimensionId: 7, dimensionName: 'Mathematical & Logical', category: 'aptitude', text: 'I enjoy working with numbers and solving mathematical problems.', order: 37 },
  { id: 'bml-a7-2', dimensionId: 7, dimensionName: 'Mathematical & Logical', category: 'aptitude', text: 'I approach problems systematically using logical reasoning.', order: 38 },

  // ── Aptitude: Outgoing & Expressive (2 questions) ──
  { id: 'bml-a8-1', dimensionId: 8, dimensionName: 'Outgoing & Expressive', category: 'aptitude', text: 'I build rapport easily and enjoy meeting new people.', order: 39 },
  { id: 'bml-a8-2', dimensionId: 8, dimensionName: 'Outgoing & Expressive', category: 'aptitude', text: 'I am self-confident and persuasive in my communication style.', order: 40 },

  // ── Core Trait: Relationship Management (2 questions) ──
  { id: 'bml-t1-1', dimensionId: 1, dimensionName: 'Relationship Management', category: 'core-trait', text: 'I handle interpersonal conflicts and difficult situations effectively.', order: 41 },
  { id: 'bml-t1-2', dimensionId: 1, dimensionName: 'Relationship Management', category: 'core-trait', text: 'I am skilled at managing relationships across different personality types.', order: 42 },

  // ── Core Trait: Emotional Stability (2 questions) ──
  { id: 'bml-t2-1', dimensionId: 2, dimensionName: 'Emotional Stability', category: 'core-trait', text: 'I remain calm and composed even in stressful situations.', order: 43 },
  { id: 'bml-t2-2', dimensionId: 2, dimensionName: 'Emotional Stability', category: 'core-trait', text: 'I have high self-awareness and manage my emotions effectively.', order: 44 },

  // ── Core Trait: Decisiveness (2 questions) ──
  { id: 'bml-t3-1', dimensionId: 3, dimensionName: 'Decisiveness', category: 'core-trait', text: 'I make sound judgments quickly, even under pressure.', order: 45 },
  { id: 'bml-t3-2', dimensionId: 3, dimensionName: 'Decisiveness', category: 'core-trait', text: 'Once I make a decision, I commit fully and follow through.', order: 46 },

  // ── Core Trait: Self-Motivation (2 questions) ──
  { id: 'bml-t4-1', dimensionId: 4, dimensionName: 'Self-Motivation', category: 'core-trait', text: 'I am a self-starter who does not need external motivation to get going.', order: 47 },
  { id: 'bml-t4-2', dimensionId: 4, dimensionName: 'Self-Motivation', category: 'core-trait', text: 'I maintain high energy and enthusiasm even during challenging projects.', order: 48 },
]

/** Total number of BML questions */
export const BML_QUESTION_COUNT = BML_QUESTIONS.length

/** Questions grouped by category */
export const BML_BEHAVIOR_QUESTIONS = BML_QUESTIONS.filter(q => q.category === 'behavior')
export const BML_APTITUDE_QUESTIONS = BML_QUESTIONS.filter(q => q.category === 'aptitude')
export const BML_CORE_TRAIT_QUESTIONS = BML_QUESTIONS.filter(q => q.category === 'core-trait')
