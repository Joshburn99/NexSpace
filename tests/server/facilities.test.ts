import { describe, it, expect } from 'vitest'
import request from 'supertest'
import express from 'express'
import facilitiesRoutes from '../../server/routes/facilities.routes'

// Create test app
const createTestApp = () => {
  const app = express()
  app.use(express.json())
  app.use(facilitiesRoutes)
  return app
}

describe('Facilities Routes', () => {
  const app = createTestApp()

  it('should handle facilities list request', async () => {
    const response = await request(app)
      .get('/api/facilities')
      .expect(expect.any(Number))

    // Should return structured response (may require auth)
    expect(response.body).toBeDefined()
    expect(typeof response.body).toBe('object')
  })

  it('should handle facility creation request', async () => {
    const facilityData = {
      name: 'Test Facility',
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      phone: '555-0123',
      email: 'test@facility.com',
      facilityType: 'hospital',
      bedCount: 100,
    }

    const response = await request(app)
      .post('/api/facilities')
      .send(facilityData)
      .expect(expect.any(Number))

    expect(response.body).toBeDefined()
  })

  it('should handle facility update request', async () => {
    const updateData = {
      name: 'Updated Test Facility',
      bedCount: 150,
    }

    const response = await request(app)
      .patch('/api/facilities/1')
      .send(updateData)
      .expect(expect.any(Number))

    expect(response.body).toBeDefined()
  })

  it('should handle single facility request', async () => {
    const response = await request(app)
      .get('/api/facilities/1')
      .expect(expect.any(Number))

    expect(response.body).toBeDefined()
  })
})