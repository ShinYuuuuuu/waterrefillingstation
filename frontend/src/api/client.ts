import axios from 'axios'
import { API_BASE_URL } from '@/constants'
import { useAuthStore } from '@/stores/auth-store'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    console.log('[AUTH DEBUG] REQUEST_INTERCEPTOR', {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      hasManualAuth: !!config.headers.Authorization,
    })
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.log('[AUTH DEBUG] REQUEST_INTERCEPTOR_ERROR', { error: error?.message })
    return Promise.reject(error)
  }
)

apiClient.interceptors.response.use(
  (response) => {
    console.log('[AUTH DEBUG] RESPONSE_INTERCEPTOR_SUCCESS', {
      url: response.config.url,
      status: response.status,
    })
    return response
  },
  async (error) => {
    console.log('[AUTH DEBUG] RESPONSE_INTERCEPTOR_ERROR', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
    })

    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('[AUTH DEBUG] RESPONSE_401_HANDLING', {
        url: originalRequest.url,
        isRefreshing,
        hasRefreshToken: !!localStorage.getItem('refresh_token'),
      })

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return apiClient(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        isRefreshing = false
        processQueue(error)
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const response = await apiClient.post<{ success: boolean; data: { accessToken: string } }>(
          '/auth/refresh-token',
          { refresh_token: refreshToken }
        )
        const { accessToken } = response.data.data

        localStorage.setItem('access_token', accessToken)
        useAuthStore.getState().setTokens(accessToken, refreshToken)
        processQueue(null, accessToken)

        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError)
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (error.response?.status === 403) {
      window.location.href = '/unauthorized'
    }

    return Promise.reject(error)
  }
)
