jest.mock('@/lib/axios', () => ({ api: { post: jest.fn(), get: jest.fn(), delete: jest.fn() } }))
jest.mock('@/lib/agentApi', () => ({ agentApi: { post: jest.fn() } }))

import fs from 'fs'
import path from 'path'

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

  it('jobBlueprint posts to /v1/agents/james/run on agentApi, not the /v1/tasks proxy on api', async () => {
    // F-JAMES-1: the monolith proxy behind /v1/tasks/job-blueprint forwards no
    // access-token, the engine answers 401, and the interceptor signs the user out.
    const body = {
      role_title: 'Lead',
      company_name: 'Acme',
      role_responsibilities: 'Run the team',
      candidate_summary: 'Ten years of delivery',
      desired_outcomes: 'Ship on time',
    }
    await expect(tasksService.jobBlueprint(body)).resolves.toEqual(resp)
    expect(agentApi.post).toHaveBeenCalledTimes(1)
    expect(agentApi.post).toHaveBeenCalledWith('/v1/agents/james/run', body)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('no code in the service still calls the /v1/tasks/job-blueprint proxy path', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '..', 'tasks.service.ts'), 'utf8')
    // Comments may explain the history; only code is checked.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(code).not.toMatch(/job-blueprint/)
    expect(code).toContain("'/v1/agents/james/run'")
  })

  it('saveResult stays on the routed /v1/tasks/results path on api', async () => {
    ;(api.post as jest.Mock).mockResolvedValue({ data: { id: '1' } })
    const body = { task_slug: 'onboarding', agent_id: 'forge', request_payload: {}, result_payload: {} }
    await tasksService.saveResult(body)
    expect(api.post).toHaveBeenCalledWith('/v1/tasks/results', body)
    expect(agentApi.post).not.toHaveBeenCalled()
  })
})
