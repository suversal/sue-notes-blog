import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'

test.describe('Admin Panel', () => {
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

  test('can navigate to dashboard', async () => {
    await page.goto('http://127.0.0.1:3100/admin')
    await expect(page).toHaveURL('http://127.0.0.1:3100/admin')
    const dashboardArtifact = page.getByRole('heading', { name: '集合' })
    await expect(dashboardArtifact).toBeVisible()
  })

  test('can navigate to list view', async () => {
    await page.goto('http://127.0.0.1:3100/admin/collections/users')
    await expect(page).toHaveURL(/\/admin\/collections\/users(?:\?.*)?$/)
    const listViewArtifact = page.locator('h1', { hasText: 'Users' }).first()
    await expect(listViewArtifact).toBeVisible()
  })

  test('can open the writing backend', async () => {
    await page.goto('http://127.0.0.1:3100/articles')
    await expect(page).toHaveURL('http://127.0.0.1:3100/articles')
    await expect(page.getByRole('navigation', { name: '后台导航' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '文章', exact: true })).toBeVisible()
  })
})
