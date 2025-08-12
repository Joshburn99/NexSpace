import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import healthRoutes from '../../server/routes/health.routes'

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
  
  app.use(healthRoutes)
  return app
}

describe('Health Routes', () => {
  const app = createTestApp()

  it('should return basic health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200)

    expect(response.body).toMatchObject({
      ok: true,
      version: expect.any(String),
      timestamp: expect.any(String),
      environment: expect.any(String),
      uptime: expect.any(Number),
    })
  })

  it('should return detailed health check', async () => {
    const response = await request(app)
      .get('/health/detailed')
      .expect(expect.any(Number)) // Can be 200 or 503 depending on system state

    expect(response.body).toMatchObject({
      ok: expect.any(Boolean),
      version: expect.any(String),
      timestamp: expect.any(String),
      environment: expect.any(String),
      uptime: expect.any(Number),
      checks: expect.objectContaining({
        database: expect.any(Object),
        memory: expect.any(Object),
        environment: expect.any(Object),
        externalApis: expect.any(Object),
      }),
      responseTime: expect.any(String),
    })
  })

  it('should return readiness probe status', async () => {
    const response = await request(app)
      .get('/health/ready')
      .expect(expect.any(Number))

    expect(response.body).toMatchObject({
      ready: expect.any(Boolean),
      timestamp: expect.any(String),
      version: expect.any(String),
    })
  })

  it('should return liveness probe status', async () => {
    const response = await request(app)
      .get('/health/live')
      .expect(200)

    expect(response.body).toMatchObject({
      alive: true,
      timestamp: expect.any(String),
      pid: expect.any(Number),
      uptime: expect.any(Number),
    })
  })

  it('should return system metrics', async () => {
    const response = await request(app)
      .get('/health/metrics')
      .expect(200)

    expect(response.body).toMatchObject({
      timestamp: expect.any(String),
      process: expect.objectContaining({
        pid: expect.any(Number),
        uptime: expect.any(Number),
        version: expect.any(String),
        platform: expect.any(String),
        arch: expect.any(String),
      }),
      memory: expect.any(Object),
      cpu: expect.any(Object),
      application: expect.objectContaining({
        version: expect.any(String),
        environment: expect.any(String),
        nodeVersion: expect.any(String),
      }),
    })
  })
})