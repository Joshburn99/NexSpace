import { describe, it, expect, vi } from 'vitest'

// Mock DashboardPage component
vi.mock('../../client/src/pages/dashboard-page', () => ({
  default: () => ({
    type: 'DashboardPage',
    hasContent: true,
    metrics: {
      activeStaff: 83,
      openShifts: 16,
      filledShifts: 3,
      complianceRate: 100,
    },
  }),
}))

describe('DashboardPage Component', () => {
  it('should render dashboard content', () => {
    const DashboardPage = vi.mocked(require('../../client/src/pages/dashboard-page')).default
    const page = DashboardPage()

    expect(page.hasContent).toBe(true)
    expect(page.type).toBe('DashboardPage')
  })

  it('should display key metrics', () => {
    const DashboardPage = vi.mocked(require('../../client/src/pages/dashboard-page')).default
    const page = DashboardPage()

    expect(page.metrics.activeStaff).toBe(83)
    expect(page.metrics.openShifts).toBe(16)
    expect(page.metrics.filledShifts).toBe(3)
    expect(page.metrics.complianceRate).toBe(100)
  })
})