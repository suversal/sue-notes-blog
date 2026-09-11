import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'

test.describe('Writing backend', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()

    const context = await browser.newContext()
    page = await context.newPage()

    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('legacy admin entry opens the writing backend', async () => {
    await page.goto('http://127.0.0.1:3100/admin')
    await expect(page).toHaveURL('http://127.0.0.1:3100/articles')
    await expect(page.getByRole('navigation', { name: '后台导航' })).toBeVisible()
  })

  test('legacy nested admin links do not expose Payload UI', async () => {
    await page.goto('http://127.0.0.1:3100/admin/collections/users')
    await expect(page).toHaveURL('http://127.0.0.1:3100/articles')
    await expect(page.getByRole('navigation', { name: '后台导航' })).toBeVisible()
  })

  test('can open the writing backend', async () => {
    await page.goto('http://127.0.0.1:3100/articles')
    await expect(page).toHaveURL('http://127.0.0.1:3100/articles')
    await expect(page.getByRole('navigation', { name: '后台导航' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '文章', exact: true })).toBeVisible()
  })
})
