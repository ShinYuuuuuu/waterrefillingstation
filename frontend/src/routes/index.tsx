import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './protected-route'
import { PublicRoute } from './public-route'
import { AuthLayout } from '@/layouts/auth-layout'
import { DashboardLayout } from '@/layouts/dashboard-layout'
import { LoginPage } from '@/pages/login'
import { DashboardPage } from '@/pages/dashboard'
import { CustomersPage } from '@/pages/customers'
import { ProductsPage } from '@/pages/products'
import { InventoryPage } from '@/pages/inventory'
import { GallonsPage } from '@/pages/gallons'
import { SalesPage } from '@/pages/sales'
import { DeliveriesPage } from '@/pages/deliveries'
import { ReportsPage } from '@/pages/reports'
import { SettingsPage } from '@/pages/settings'
import { ProfilePage } from '@/pages/profile'
import { UnauthorizedPage } from '@/pages/unauthorized'
import { NotFoundPage } from '@/pages/not-found'
import { ErrorPage } from '@/pages/error'
import { LoadingScreen } from '@/pages/loading'

export const AppRoutes = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/loading',
    element: <LoadingScreen />,
  },
  {
    path: '/login',
    element: (
      <PublicRoute>
        <AuthLayout>
          <LoginPage />
        </AuthLayout>
      </PublicRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <DashboardPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/customers',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <CustomersPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/products',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <ProductsPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/inventory',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <InventoryPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/gallons',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <GallonsPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/sales',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <SalesPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/deliveries',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <DeliveriesPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/reports',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <ReportsPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <SettingsPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <ProfilePage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/unauthorized',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <UnauthorizedPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/error',
    element: <ErrorPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
