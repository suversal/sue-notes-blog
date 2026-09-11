import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

export const testUser = {
  email: 'dev@payloadcms.com',
  password: 'test-password-2026',
  displayName: 'Playwright test user',
}

async function deleteTestUsers(payload: Awaited<ReturnType<typeof getPayload>>) {
  const existing = await payload.find({
    collection: 'users',
    overrideAccess: true,
    where: { email: { equals: testUser.email } },
  })
  for (const user of existing.docs) {
    const topics = await payload.find({
      collection: 'topics',
      overrideAccess: true,
      where: { owner: { equals: user.id } },
    })
    for (const topic of topics.docs) {
      await payload.delete({
        collection: 'topics',
        id: topic.id,
        disableTransaction: true,
        overrideAccess: true,
      })
    }
    await payload.delete({
      collection: 'users',
      id: user.id,
      disableTransaction: true,
      overrideAccess: true,
    })
  }
}

/**
 * Seeds a test user for e2e admin tests.
 */
export async function seedTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  await deleteTestUsers(payload)

  // Create fresh test user
  await payload.create({
    collection: 'users',
    overrideAccess: true,
    data: testUser,
  })
}

/**
 * Cleans up test user after tests
 */
export async function cleanupTestUser(): Promise<void> {
  const payload = await getPayload({ config })
  await deleteTestUsers(payload)
}
