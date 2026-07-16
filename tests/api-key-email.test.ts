import { describe, expect, it } from 'vitest'
import { buildApiReferenceUrl, renderIntegrationAccessEmail } from '../server/utils/api-key-email'
import type { ApiKeyRecord } from '../server/utils/api-keys'

const record: ApiKeyRecord = {
  id: 'key_1234567890123456',
  keyPrefix: 'sm_live_0123456789',
  label: 'Catalog sync',
  ownerEmail: 'developer@example.test',
  scopes: ['catalog:read'],
  rateLimitPerMinute: 60,
  status: 'active',
  createdAt: '2030-01-01T00:00:00.000Z',
  expiresAt: null,
  lastUsedAt: null,
  revokedAt: null,
  rotatedAt: null,
}

describe('API key notification email', () => {
  it('builds the reference link from a public HTTPS site URL only', () => {
    expect(buildApiReferenceUrl('https://stickerhub.lius.me')).toBe('https://stickerhub.lius.me/docs/reference')
    expect(buildApiReferenceUrl('http://stickerhub.lius.me')).toBeNull()
    expect(buildApiReferenceUrl('https://localhost:3000')).toBeNull()
    expect(buildApiReferenceUrl('https://192.168.1.20')).toBeNull()
    expect(buildApiReferenceUrl('https://invalid.example')).toBeNull()
  })

  it('escapes operator input in HTML while keeping the full API key out of both variants', () => {
    const fullApiKey = 'sm_live_0123456789_recoverable-secret-must-never-appear'
    const message = renderIntegrationAccessEmail({
      ...record,
      label: '<img src=x onerror=alert(1)>',
    }, 'https://stickerhub.lius.me/docs/reference')

    expect(message.html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(message.html).not.toContain('<img src=x onerror=alert(1)>')
    expect(message.html).toContain('https://stickerhub.lius.me/docs/reference')
    expect(message.html).not.toContain(fullApiKey)
    expect(message.text).not.toContain(fullApiKey)
  })

  it('uses rotation-specific copy when the previous key has been disabled', () => {
    const message = renderIntegrationAccessEmail(record, 'https://stickerhub.lius.me/docs/reference', 'rotated')

    expect(message.subject).toBe('StickerHub API key rotated')
    expect(message.text).toContain('The previous key has been disabled.')
    expect(message.html).toContain('Your API key was rotated.')
  })
})
