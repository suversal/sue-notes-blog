import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export interface LoginOptions {
  page: Page
  serverURL?: string
  user: {
    email: string
    password: string
  }
}

/** Logs the user into the writing backend through the product login page. */
export async function login({
  page,
  serverURL = 'http://127.0.0.1:3100',
  user,
}: LoginOptions): Promise<void> {
  await page.goto(`${serverURL}/login`)

  await page.fill('#email', user.email)
  await page.fill('#password', user.password)
  await page.click('button[type="submit"]')

  await page.waitForURL(`${serverURL}/articles`)

  await expect(page.getByRole('navigation', { name: '后台导航' })).toBeVisible()
}
