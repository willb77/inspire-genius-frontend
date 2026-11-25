jest.mock('@/lib/axios', () => ({ api: { post: jest.fn(), get: jest.fn(), delete: jest.fn() } }))
jest.mock('@/lib/agentApi', () => ({ agentApi: { post: jest.fn() } }))

import { api } from '@/lib/axios'
import { agentApi } from '@/lib/agentApi'
import { tasksService } from '../tasks.service'

const resp = { agent_name: 'Maven', content: 'q', confidence: 1, suggested_next: null, metadata: {} }

describe('tasksService routed paths', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(agentApi.post as jest.Mock).mockResolvedValue({ data: resp })
  })

  it('interviewPrep posts to /v1/agents/maven/run on agentApi, not api', async () => {
    const body = { company_name: 'Acme', industry: 'Tech', role_title: 'Lead' }
    await expect(tasksService.interviewPrep(body)).resolves.toEqual(resp)
    expect(agentApi.post).toHaveBeenCalledWith('/v1/agents/maven/run', body)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('documentResearch posts to /v1/agents/sage/run on agentApi', async () => {
    const body = { question: 'q' }
    await tasksService.documentResearch(body)
    expect(agentApi.post).toHaveBeenCalledWith('/v1/agents/sage/run', body)
    expect(api.post).not.toHaveBeenCalled()
  })
})
