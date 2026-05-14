import { test, expect } from '@playwright/test'

test('Login-Seite lädt unter /login', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('h2')).toHaveText('Anmelden')
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
})

test('Login mit falschen Credentials zeigt Fehlermeldung', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', 'wrong@test.de')
  await page.fill('input[type="password"]', 'wrongpass')
  await page.click('button[type="submit"]')
  await expect(page.locator('[data-testid="login-error"]')).toBeVisible()
})

test('Ohne Login → /login Redirect', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
})

test('Erfolgreicher Login redirectet auf Dashboard', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', process.env.E2E_TEST_EMAIL!)
  await page.fill('input[type="password"]', process.env.E2E_TEST_PASSWORD!)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/')
})
