import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ApiKeyStore } from '../server/utils/api-keys'

let testDirectory = ''
let store: ApiKeyStore

beforeEach(async () => {
  testDirectory = await mkdtemp(join(tmpdir(), 'stickerhub-api-keys-'))
  store = new ApiKeyStore({ sqlitePath: join(testDirectory, 'api-keys.db') })
})

afterEach(async () => {
  await rm(testDirectory, { recursive: true, force: true })
})

describe('API key store', () => {
  it('issues a distinct scoped key for each integration without storing the secret in listings', async () => {
    const first = await store.create({
      label: 'Catalog sync',
      ownerEmail: 'sync@example.test',
      scopes: ['catalog:read'],
      rateLimitPerMinute: 30,
    })
    const second = await store.create({
      label: 'Analytics export',
      scopes: ['catalog:read'],
      rateLimitPerMinute: 90,
    })

    expect(first.apiKey).toMatch(/^sm_live_[a-f0-9]{10}_[A-Za-z0-9_-]{43}$/)
    expect(second.apiKey).not.toBe(first.apiKey)
    expect(first.record.id).not.toBe(second.record.id)

    const keys = await store.list()
    expect(keys).toHaveLength(2)
    expect(keys[0]).not.toHaveProperty('apiKey')
    expect(JSON.stringify(keys)).not.toContain(first.apiKey)
    expect(JSON.stringify(keys)).not.toContain(second.apiKey)
  })

  it('accepts only active, unexpired keys with the required scope', async () => {
    const issued = await store.create({
      label: 'Short-lived integration',
      scopes: ['catalog:read'],
      rateLimitPerMinute: 15,
      expiresAt: '2030-01-02T00:00:00.000Z',
    })

    await expect(store.authenticate(issued.apiKey, 'catalog:read', new Date('2030-01-01T00:00:00.000Z')))
      .resolves.toMatchObject({ id: issued.record.id, rateLimitPerMinute: 15 })
    await expect(store.authenticate('sm_live_invalid', 'catalog:read')).resolves.toBeNull()
    await expect(store.authenticate(issued.apiKey, 'catalog:read', new Date('2030-01-03T00:00:00.000Z')))
      .resolves.toBeNull()
  })

  it('invalidates the previous secret on rotation and disables the key on revocation', async () => {
    const issued = await store.create({
      label: 'Rotatable integration',
      scopes: ['catalog:read'],
      rateLimitPerMinute: 60,
    })
    const rotated = await store.rotate(issued.record.id)

    expect(rotated?.apiKey).toBeDefined()
    expect(rotated?.apiKey).not.toBe(issued.apiKey)
    await expect(store.authenticate(issued.apiKey, 'catalog:read')).resolves.toBeNull()
    await expect(store.authenticate(rotated?.apiKey || '', 'catalog:read')).resolves.toMatchObject({ id: issued.record.id })

    const revoked = await store.revoke(issued.record.id)
    expect(revoked).toMatchObject({ status: 'revoked' })
    await expect(store.authenticate(rotated?.apiKey || '', 'catalog:read')).resolves.toBeNull()
  })

  it('records last use without exposing the secret', async () => {
    const issued = await store.create({
      label: 'Observed integration',
      scopes: ['catalog:read'],
      rateLimitPerMinute: 60,
    })
    const usedAt = new Date('2030-01-01T12:00:00.000Z')

    await store.touchLastUsed(issued.record.id, usedAt)

    await expect(store.get(issued.record.id)).resolves.toMatchObject({
      id: issued.record.id,
      lastUsedAt: usedAt.toISOString(),
    })
  })

  it('keeps non-sensitive administrator audit records for lifecycle actions', async () => {
    const issued = await store.create({
      label: 'Audited integration',
      scopes: ['catalog:read'],
      rateLimitPerMinute: 60,
    })

    await store.audit('key.created', issued.record, { hasExpiry: false, rateLimitPerMinute: 60 })
    const logs = await store.listAuditLogs()

    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({
      action: 'key.created',
      keyId: issued.record.id,
      keyPrefix: issued.record.keyPrefix,
      metadata: { hasExpiry: false, rateLimitPerMinute: 60 },
    })
    expect(JSON.stringify(logs)).not.toContain(issued.apiKey)
  })

  it('tracks provider delivery status idempotently without storing an API key', async () => {
    const issued = await store.create({
      label: 'Email status integration',
      ownerEmail: 'developer@example.test',
      scopes: ['catalog:read'],
      rateLimitPerMinute: 60,
    })
    const notification = await store.recordEmailNotification(issued.record, 'email_123')

    expect(notification).toMatchObject({
      keyId: issued.record.id,
      keyPrefix: issued.record.keyPrefix,
      status: 'accepted',
    })

    const delayed = await store.updateEmailNotificationStatus('email_123', 'delayed', '2030-01-01T11:00:00.000Z')
    const delivered = await store.updateEmailNotificationStatus('email_123', 'delivered', '2030-01-01T12:00:00.000Z')
    const duplicate = await store.updateEmailNotificationStatus('email_123', 'delivered', '2030-01-01T12:00:00.000Z')

    expect(delayed).toMatchObject({ changed: true, notification: { status: 'delayed' } })
    expect(delivered).toMatchObject({ changed: true, notification: { status: 'delivered' } })
    expect(duplicate).toMatchObject({ changed: false, notification: { status: 'delivered' } })
    expect(JSON.stringify(delivered)).not.toContain(issued.apiKey)
  })
})
