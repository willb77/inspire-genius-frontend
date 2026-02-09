import {
  getIssueById,
  addAdminComment,
  type AddAdminCommentRequest,
} from '../issues.service'
import { api } from '@/lib/axios'

// Mock axios instance
jest.mock('@/lib/axios', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

describe('Issue APIs', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  /* ------------------------------------------------------------------
   * getIssueById
   * ------------------------------------------------------------------ */

  describe('getIssueById', () => {
    it('should call API with encoded issue id', async () => {
      ;(api.get as jest.Mock).mockResolvedValueOnce({
        data: {},
      })

      const issueId = 'ISSUE/123'

      await getIssueById(issueId)

      expect(api.get).toHaveBeenCalledTimes(1)
      expect(api.get).toHaveBeenCalledWith(
        `/v1/issues/${encodeURIComponent(issueId)}`
      )
    })

    it('should return issue data on success', async () => {
      const mockResponse = {
        status: true,
        message: 'Success',
        data: {
          id: '1',
          subject: 'Login issue',
          description: 'Unable to login',
          status: 'open',
          priority: 'high',
          issue_type_id: 'type-1',
          issue_type_name: 'Bug',
          reported_by: 'user-1',
          reported_by_name: 'John Doe',
          agent_id: null,
          organization_id: null,
          business_id: null,
          resolved_at: null,
          is_open: true,
          is_resolved: false,
          age_in_days: 2,
          created_at: '2024-01-01',
          updated_at: '2024-01-02',
          comments: [],
          attachments: [],
        },
      }

      ;(api.get as jest.Mock).mockResolvedValueOnce({
        data: mockResponse,
      })

      const result = await getIssueById('1')

      expect(result).toEqual(mockResponse)
    })

    it('should throw error when API fails', async () => {
      const error = new Error('Network error')

      ;(api.get as jest.Mock).mockRejectedValueOnce(error)

      await expect(getIssueById('1')).rejects.toThrow('Network error')
    })
  })

  /* ------------------------------------------------------------------
   * addAdminComment
   * ------------------------------------------------------------------ */

  describe('addAdminComment', () => {
    it('should call API with correct URL and payload', async () => {
      const payload: AddAdminCommentRequest = {
        comment: 'This issue is being investigated',
        change_status: 'in_progress',
      }

      ;(api.post as jest.Mock).mockResolvedValueOnce({
        data: {},
      })

      const issueId = 'ISSUE/456'

      await addAdminComment(issueId, payload)

      expect(api.post).toHaveBeenCalledTimes(1)
      expect(api.post).toHaveBeenCalledWith(
        `/v1/issues/${encodeURIComponent(issueId)}/admin-comment`,
        payload
      )
    })

    it('should return admin comment response on success', async () => {
      const mockResponse = {
        status: true,
        message: 'Comment added',
        data: {
          comment_id: 'comment-123',
        },
      }

      ;(api.post as jest.Mock).mockResolvedValueOnce({
        data: mockResponse,
      })

      const result = await addAdminComment('1', {
        comment: 'Resolved',
      })

      expect(result).toEqual(mockResponse)
    })

    it('should throw error when API call fails', async () => {
      const error = new Error('Server error')

      ;(api.post as jest.Mock).mockRejectedValueOnce(error)

      await expect(
        addAdminComment('1', { comment: 'Test comment' })
      ).rejects.toThrow('Server error')
    })
  })
})
