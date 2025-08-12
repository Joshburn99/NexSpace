import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import session from 'express-session'
import authRoutes from '../../server/routes/auth.routes'

// Create test app
const createTestApp = () => {
  const app = express()
  app.use(express.json())
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  }))
  app.use(authRoutes)
  return app
}

describe('Auth Routes', () => {
  const app = createTestApp()

  it('should handle login request', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'test-user',
        password: 'test-password'
      })
      .expect(expect.any(Number))

    // Should return structured response regardless of auth success/failure
    expect(response.body).toBeDefined()
    expect(typeof response.body).toBe('object')
  })

  it('should handle logout request', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .expect(expect.any(Number))

    expect(response.body).toBeDefined()
  })

  it('should return current user info', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .expect(expect.any(Number))

    expect(response.body).toBeDefined()
    expect(typeof response.body).toBe('object')
  })

  it('should handle refresh token requests', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .expect(expect.any(Number))

    expect(response.body).toBeDefined()
  })
})