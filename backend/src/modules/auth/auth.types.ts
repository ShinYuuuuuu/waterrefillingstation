export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  fullName: string
  phone?: string
  roleCode: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface LogoutRequest {
  refreshToken: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface AuthUser {
  id: string
  tenantId: string
  branchId: string | null
  fullName: string
  email: string
  role: string
  roleCode: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  accessTokenExpiresIn: number
}