import express from 'express'
import cors from 'cors'
import { config } from './config'
import { globalErrorHandler } from './middleware/globalErrorHandler'
import { notFoundHandler } from './middleware/globalErrorHandler'
import { securityHeaders, requestLogging } from './middleware/security'
import { rateLimiter } from './middleware/rateLimiter'
import { tenantIsolation } from './middleware/tenantIsolation'
import { authRoutes } from './modules/auth/auth.routes'
import { customerRoutes } from './modules/customer/customer.routes'
import { productRoutes } from './modules/product/product.routes'
import { gallonRoutes } from './modules/gallons/gallon.routes'
import { inventoryRoutes } from './modules/inventory/inventory.routes'
import { saleRoutes } from './modules/sales/sales.routes'
import { deliveryRoutes } from './modules/delivery/delivery.routes'
import { maintenanceRoutes } from './modules/maintenance/maintenance.routes'
import { swaggerRouter } from './docs/swagger'

export function createApp() {
  const app = express()

  // Trust proxy for rate limiting and IP detection
  app.set('trust proxy', 1)

  // Security headers
  app.use(securityHeaders)

  // Request logging
  app.use(requestLogging)

  // Tenant isolation (extract tenant context from token)
  app.use(tenantIsolation)

  // CORS
  app.use(cors({ origin: config.corsOrigin }))

  // Body parsing
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // Development logging
  // morgan is not included in dependencies; use built-in Express logging or add morgan to package.json

  // Health checks must remain outside the general rate limiter because the
  // hosting platform polls this endpoint frequently to determine availability.
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Rate limiting (general)
  app.use(rateLimiter())

  // API routes
  app.use('/api/v1/auth', authRoutes)
  app.use('/api/v1/customers', customerRoutes)
  app.use('/api/v1/products', productRoutes)
  app.use('/api/v1/gallons', gallonRoutes)
  app.use('/api/v1/inventory', inventoryRoutes)
  app.use('/api/v1/sales', saleRoutes)
  app.use('/api/v1/delivery', deliveryRoutes)
  app.use('/api/v1/maintenance', maintenanceRoutes)
  app.use('/api/v1/docs', swaggerRouter)

  // 404 handler
  app.use(notFoundHandler)

  // Global error handler (must be last)
  app.use(globalErrorHandler)

  return app
}
