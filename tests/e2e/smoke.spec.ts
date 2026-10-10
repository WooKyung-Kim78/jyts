import { expect, test } from '@playwright/test'

// Runs without an API backend, so only signed-out behaviour is covered here.
// Signed-in flows require a local Laravel API server.
test.describe('smoke (signed out)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/user', (route) => route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: '로그인이 필요합니다.' }),
    }))
  })

  test('redirects protected pages to the login page', async ({ page }) => {
    await page.goto('/equipment')

    await expect(page).toHaveURL(/\/login\?redirect=%2Fequipment$/)
    await expect(page.getByRole('heading', { level: 1, name: '로그인' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: '주 메뉴' })).toHaveCount(0)
  })

  test('redirects unknown paths to the login page', async ({ page }) => {
    await page.goto('/does-not-exist')
    await expect(page.getByRole('heading', { level: 1, name: '로그인' })).toBeVisible()
  })

  test('validates the login form before submitting', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: '로그인' }).click()

    await expect(page.getByText('이메일을 입력하세요.')).toBeVisible()
    await expect(page.getByText('비밀번호를 입력하세요.')).toBeVisible()
    await expect(page.getByLabel('이메일')).toHaveAttribute('aria-invalid', 'true')
  })

  test('has no horizontal overflow on the login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { level: 1, name: '로그인' })).toBeVisible()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
