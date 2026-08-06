import { Router } from 'express'
import { authController } from './auth.controller'
import { rateLimiter, loginLimiter } from '../../middleware/rateLimiter'
import { securityHeaders } from '../../middleware/security'
import { tenantIsolation } from '../../middleware/tenantIsolation'

export const authRoutes = Router()

authRoutes.use(securityHeaders)

authRoutes.post('/login', loginLimiter, authController.login)
authRoutes.post('/register', rateLimiter(), authController.register)
authRoutes.post('/refresh-token', authController.refreshToken)
authRoutes.post('/logout', authController.logout)
authRoutes.post('/logout-all', tenantIsolation, authController.logoutAll)
authRoutes.get('/me', tenantIsolation, authController.getMe)

export default authRoutes