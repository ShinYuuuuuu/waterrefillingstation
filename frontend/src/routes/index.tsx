import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './protected-route'
import { PublicRoute } from './public-route'
import { AuthLayout } from '@/layouts/auth-layout'
import { DashboardLayout } from '@/layouts/dashboard-layout'
import { LoginPage } from '@/pages/login'
import { DashboardRouter } from './dashboard-router'
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
      <ProtectedRoute requiredRoles={['owner', 'cashier', 'rider', 'super_admin']}>
        <DashboardLayout>
          <DashboardRouter />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/customers',
    element: (
      <ProtectedRoute requiredRoles={['owner', 'cashier', 'super_admin']}>
        <DashboardLayout>
          <CustomersPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/products',
    element: (
      <ProtectedRoute requiredRoles={['owner', 'super_admin']}>
        <DashboardLayout>
          <ProductsPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/inventory',
    element: (
      <ProtectedRoute requiredRoles={['owner', 'cashier', 'super_admin']}>
        <DashboardLayout>
          <InventoryPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/gallons',
    element: (
      <ProtectedRoute requiredRoles={['owner', 'super_admin']}>
        <DashboardLayout>
          <GallonsPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/sales',
    element: (
      <ProtectedRoute requiredRoles={['owner', 'cashier', 'super_admin']}>
        <DashboardLayout>
          <SalesPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/deliveries',
    element: (
      <ProtectedRoute requiredRoles={['owner', 'cashier', 'rider', 'super_admin']}>
        <DashboardLayout>
          <DeliveriesPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/reports',
    element: (
      <ProtectedRoute requiredRoles={['owner', 'super_admin']}>
        <DashboardLayout>
          <ReportsPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute requiredRoles={['owner', 'super_admin']}>
        <DashboardLayout>
          <SettingsPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute requiredRoles={['owner', 'cashier', 'rider', 'super_admin']}>
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
