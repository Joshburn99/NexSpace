import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with Testing Library matchers
expect.extend(matchers)

// Cleanup after each test case
afterEach(() => {
  cleanup()
})

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/nexspace_test'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'

// Mock React for frontend tests
vi.mock('react', () => ({
  ...vi.importActual('react'),
  default: {
    createElement: vi.fn(),
    Fragment: vi.fn(),
  },
}))

// Global React mock for JSX
global.React = {
  createElement: vi.fn(),
  Fragment: vi.fn(),
} as any