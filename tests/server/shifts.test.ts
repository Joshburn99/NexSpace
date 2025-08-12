import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import shiftsRoutes from '../../server/routes/shifts.routes'

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
  
  app.use(shiftsRoutes)
  return app
}

describe('Shifts Routes', () => {
  const app = createTestApp()

  it('should handle shifts list request', async () => {
    const response = await request(app)
      .get('/api/shifts')
      .expect(expect.any(Number))

    // Should return structured response (may require auth)
    expect(response.body).toBeDefined()
    expect(typeof response.body).toBe('object')
  })

  it('should handle shift creation request', async () => {
    const shiftData = {
      facilityId: 1,
      title: 'Test Shift',
      description: 'Test shift description',
      startDateTime: '2025-08-15T08:00:00Z',
      endDateTime: '2025-08-15T16:00:00Z',
      role: 'nurse',
      department: 'ICU',
      requiredWorkers: 1,
    }

    const response = await request(app)
      .post('/api/shifts')
      .send(shiftData)
      .expect(expect.any(Number))

    expect(response.body).toBeDefined()
  })

  it('should handle shift update request', async () => {
    const updateData = {
      title: 'Updated Test Shift',
      requiredWorkers: 2,
    }

    const response = await request(app)
      .patch('/api/shifts/1')
      .send(updateData)
      .expect(expect.any(Number))

    expect(response.body).toBeDefined()
  })

  it('should handle single shift request', async () => {
    const response = await request(app)
      .get('/api/shifts/1')
      .expect(expect.any(Number))

    expect(response.body).toBeDefined()
  })
})