import { test, expect } from '@playwright/test'

test('browser login flow', async ({ page }) => {
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())

  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/auth/login') &&
      response.request().method() === 'POST'
  )

  const meResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/auth/me') &&
      response.request().method() === 'GET'
  )

  await page.fill('input[type="email"]', 'owner@aquapure.com')
  await page.fill('input[type="password"]', 'admin123')
  await page.click('button[type="submit"]')

  const loginResp = await loginResponse
  const meResp = await meResponse

  const loginStatus = loginResp.status()
  const meStatus = meResp.status()
  const accessToken = await page.evaluate(() => localStorage.getItem('access_token'))
  const refreshToken = await page.evaluate(() => localStorage.getItem('refresh_token'))
  const finalURL = page.url()

  console.log('Login status:', loginStatus)
  console.log('Me status:', meStatus)
  console.log('Access token present:', !!accessToken)
  console.log('Refresh token present:', !!refreshToken)
  console.log('Final URL:', finalURL)

  expect(loginStatus).toBe(200)
  expect(meStatus).toBe(200)
  expect(accessToken).not.toBeNull()
  expect(refreshToken).not.toBeNull()
  expect(finalURL).toContain('/dashboard')
})
