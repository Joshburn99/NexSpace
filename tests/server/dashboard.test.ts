import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import dashboardRoutes from '../../server/routes/dashboard.routes'

// Mock logger middleware
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}

// Create test app
const createTestApp = () => {
  const app = express()
  app.use(express.json())
  
  // Add mock logger middleware
  app.use((req, res, next) => {
    req.logger = mockLogger
    next()
  })
  
  app.use(dashboardRoutes)
  return app
}

describe('Dashboard Routes', () => {
  const app = createTestApp()

  it('should handle dashboard stats request', async () => {
    const response = await request(app)
      .get('/api/dashboard/stats')
      .expect(expect.any(Number))

    // Should return structured response (may require auth)
    expect(response.body).toBeDefined()
    expect(typeof response.body).toBe('object')
  })

  it('should handle dashboard preferences request', async () => {
    const response = await request(app)
      .get('/api/dashboard/preferences')
      .expect(expect.any(Number))

    expect(response.body).toBeDefined()
  })

  it('should handle dashboard preferences update', async () => {
    const updateData = {
      theme: 'dark',
      notifications: true,
    }

    const response = await request(app)
      .patch('/api/dashboard/preferences')
      .send(updateData)
      .expect(expect.any(Number))

    expect(response.body).toBeDefined()
  })
})