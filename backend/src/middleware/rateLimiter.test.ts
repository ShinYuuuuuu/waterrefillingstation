import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { loginLimiter } from './rateLimiter'

function createLoginApp() {
  const app = express()
  app.use(express.json())
  app.post('/login', loginLimiter, (req, res) => {
    if (req.body.password === 'correct') {
      return res.status(200).json({ success: true })
    }
    return res.status(401).json({ success: false })
  })
  return app
}

describe('loginLimiter', () => {
  it('does not count successful logins toward the limit', async () => {
    const app = createLoginApp()

    for (let attempt = 0; attempt < 7; attempt++) {
      const response = await request(app)
        .post('/login')
        .send({ email: 'success@example.com', password: 'correct' })

      expect(response.status).toBe(200)
    }
  })

  it('tracks failed attempts separately for each email address', async () => {
    const app = createLoginApp()

    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await request(app)
        .post('/login')
        .send({ email: 'first@example.com', password: 'wrong' })

      expect(response.status).toBe(401)
    }

    const blocked = await request(app)
      .post('/login')
      .send({ email: 'first@example.com', password: 'wrong' })
    expect(blocked.status).toBe(429)

    const otherAccount = await request(app)
      .post('/login')
      .send({ email: 'second@example.com', password: 'correct' })
    expect(otherAccount.status).toBe(200)
  })
})
