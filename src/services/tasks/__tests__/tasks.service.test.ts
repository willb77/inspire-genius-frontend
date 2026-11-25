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

  it('teamComposition posts to /v1/agents/atlas/run on agentApi, not api', async () => {
    const body = { team_name: 'Core', team_purpose: 'Ship', member_summaries: ['A', 'B'], target_skills: ['x'] }
    await expect(tasksService.teamComposition(body)).resolves.toEqual(resp)
    expect(agentApi.post).toHaveBeenCalledWith('/v1/agents/atlas/run', body)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('onboarding posts to /v1/agents/forge/run on agentApi, not api', async () => {
    const body = { new_hire_name: 'Sam', new_hire_role: 'Analyst', company_name: 'Acme', week_number: 2 }
    await expect(tasksService.onboarding(body)).resolves.toEqual(resp)
    expect(agentApi.post).toHaveBeenCalledWith('/v1/agents/forge/run', body)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('saveResult stays on the routed /v1/tasks/results path on api', async () => {
    ;(api.post as jest.Mock).mockResolvedValue({ data: { id: '1' } })
    const body = { task_slug: 'onboarding', agent_id: 'forge', request_payload: {}, result_payload: {} }
    await tasksService.saveResult(body)
    expect(api.post).toHaveBeenCalledWith('/v1/tasks/results', body)
    expect(agentApi.post).not.toHaveBeenCalled()
  })
})
