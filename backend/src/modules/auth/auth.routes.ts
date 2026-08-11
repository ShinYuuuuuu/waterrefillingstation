import { Router } from 'express'
import { authController } from './auth.controller'
import { rateLimiter, loginLimiter } from '../../middleware/rateLimiter'
import { securityHeaders } from '../../middleware/security'
import { tenantIsolation } from '../../middleware/tenantIsolation'
import { authenticateToken, requireRole } from '../../middleware/authJwt'
import { validateRequest } from '../../middleware/validateRequest'
import { updateProfileSchema, updateStaffAccountSchema } from './auth.schema'

export const authRoutes = Router()

authRoutes.use(securityHeaders)

authRoutes.post('/login', loginLimiter, authController.login)
authRoutes.post('/register', rateLimiter(), authController.register)
authRoutes.post('/refresh-token', authController.refreshToken)
authRoutes.post('/logout', authController.logout)
authRoutes.post('/logout-all', tenantIsolation, authController.logoutAll)
authRoutes.get('/me', tenantIsolation, authController.getMe)
authRoutes.put(
  '/me',
  authenticateToken,
  requireRole('owner', 'super_admin'),
  validateRequest(updateProfileSchema),
  authController.updateMe,
)
authRoutes.get('/staff-accounts', authenticateToken, requireRole('owner', 'super_admin'), authController.listStaffAccounts)
authRoutes.put(
  '/staff-accounts/:userId',
  authenticateToken,
  requireRole('owner', 'super_admin'),
  validateRequest(updateStaffAccountSchema),
  authController.updateStaffAccount,
)

export default authRoutes
