import { renderHook } from '@testing-library/react'
import { useAuthRedirectForAuthPages } from '@/hooks/useAuthRedirectForAuthPages'
import { useAuth } from '@/context/useAuth'
import { useLocation } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

jest.mock('@/context/useAuth')
jest.mock('react-router-dom', () => ({ useLocation: jest.fn() }))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>

type User = { token?: string; role?: string; isOnboardingCompleted?: boolean }

function setup(user: User | null, pathname: string, state: unknown = null) {
  mockUseAuth.mockReturnValue({ user } as unknown as ReturnType<typeof useAuth>)
  mockUseLocation.mockReturnValue({
    pathname,
    state,
    search: '',
    hash: '',
    key: 'k',
  } as unknown as ReturnType<typeof useLocation>)
  return renderHook(() => useAuthRedirectForAuthPages()).result.current
}

describe('useAuthRedirectForAuthPages', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns null when there is no authenticated user', () => {
    expect(setup(null, ROUTES.LOGIN)).toBeNull()
  })

  it('returns null when the page is not an auth page', () => {
    expect(setup({ token: 't', role: 'user' }, '/documents')).toBeNull()
  })

  // The regression this file exists for. Forced onboarding was disabled
  // platform-wide on 2026-07-21, but this hook kept redirecting whenever the
  // onboarding flag was not exactly true — and that flag is absent from at
  // least one environment's user-pool schema, so it can never read true there.
  // A signed-in user opening /login from a bookmark landed in the wizard.
  it('sends a signed-in user to their home, NOT onboarding, when the onboarding flag is false', () => {
    expect(setup({ token: 't', role: 'user', isOnboardingCompleted: false }, ROUTES.LOGIN)).toBe(
      ROUTES.HOME,
    )
  })

  it('does the same when the onboarding flag is absent entirely', () => {
    expect(setup({ token: 't', role: 'user' }, ROUTES.LOGIN)).toBe(ROUTES.HOME)
  })

  it('never returns the onboarding route from any auth page', () => {
    for (const page of [ROUTES.LOGIN, ROUTES.SIGNUP, ROUTES.OTP, '/forgot']) {
      const to = setup({ token: 't', role: 'user', isOnboardingCompleted: false }, page)
      expect(to).not.toBe(ROUTES.ONBOARDING.ONE)
    }
  })

  it('still honours an explicit `from` location', () => {
    expect(setup({ token: 't', role: 'user' }, ROUTES.LOGIN, { from: '/coaches' })).toBe('/coaches')
  })

  it('still routes a super-admin to the super-admin dashboard', () => {
    expect(setup({ token: 't', role: 'super-admin' }, ROUTES.LOGIN)).toBe(
      ROUTES.SUPER_ADMIN.DASHBOARD,
    )
  })
})
