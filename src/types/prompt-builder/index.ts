export type SystemPrompt = {
  id: string
  coach_id: string
  version: number
  persona: string
  tone: string
  knowledge_domain: string
  response_style: string
  constraints: string
  assembled_prompt: string
  created_at: string
}

export type SavePromptPayload = {
  coach_id: string
  persona: string
  tone: string
  knowledge_domain: string
  response_style: string
  constraints: string
}

export type PromptListData = {
  prompts: SystemPrompt[]
}

export type PromptVersionData = {
  versions: SystemPrompt[]
}
