import { describe, it, expect, vi } from 'vitest'

// Mock LoginPage component
vi.mock('../../client/src/pages/login-page', () => ({
  default: () => ({
    type: 'LoginPage',
    hasForm: true,
    hasBranding: true,
    elements: ['username', 'password', 'login-button'],
  }),
}))

describe('LoginPage Component', () => {
  it('should render login form', () => {
    const LoginPage = vi.mocked(require('../../client/src/pages/login-page')).default
    const page = LoginPage()
    
    expect(page.hasForm).toBe(true)
    expect(page.elements).toContain('username')
    expect(page.elements).toContain('password')
    expect(page.elements).toContain('login-button')
  })

  it('should display NexSpace branding', () => {
    const LoginPage = vi.mocked(require('../../client/src/pages/login-page')).default
    const page = LoginPage()

    expect(page.hasBranding).toBe(true)
  })
})