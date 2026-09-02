import { describe, expect, it } from 'vitest'
import {
  buildApiKeyRequestIssueUrl,
  buildApiKeyRequestVerificationUrl,
  createApiKeyRequestVerificationToken,
  renderApiKeyRequestVerificationEmail,
  verifyApiKeyRequestVerificationToken,
} from '../server/utils/api-key-request'

const secret = 'a-long-test-only-session-password-that-is-not-a-production-secret'
const now = Date.UTC(2030, 0, 1)
const oneDay = 24 * 60 * 60 * 1_000

describe('API Key request verification', () => {
  it('normalizes the verified email and rejects expired, altered, or differently signed tokens', () => {
    const token = createApiKeyRequestVerificationToken(' Developer@Example.test ', secret, now)

    expect(verifyApiKeyRequestVerificationToken(token, secret, now + oneDay - 1)).toEqual({
      email: 'developer@example.test',
    })
    expect(verifyApiKeyRequestVerificationToken(token, secret, now + oneDay)).toBeNull()

    const altered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`
    expect(verifyApiKeyRequestVerificationToken(altered, secret, now)).toBeNull()
    expect(verifyApiKeyRequestVerificationToken(token, `${secret}-different`, now)).toBeNull()
  })

  it('builds verification links only for a public HTTPS site origin', () => {
    const url = buildApiKeyRequestVerificationUrl('https://stickerhub.lius.me/some-path', 'payload.signature')

    expect(url).not.toBeNull()
    const parsed = new URL(url || '')
    expect(parsed.origin).toBe('https://stickerhub.lius.me')
    expect(parsed.pathname).toBe('/support/api-key')
    expect(parsed.searchParams.get('token')).toBe('payload.signature')
    expect(buildApiKeyRequestVerificationUrl('http://stickerhub.lius.me', 'token')).toBeNull()
    expect(buildApiKeyRequestVerificationUrl('https://localhost:3000', 'token')).toBeNull()
  })

  it('prefills the public GitHub Issue with the verified email and request template', () => {
    const url = new URL(buildApiKeyRequestIssueUrl('developer+sticker@example.test'))

    expect(url.origin).toBe('https://github.com')
    expect(url.pathname).toBe('/liusheng22/stickerhub/issues/new')
    expect(url.searchParams.get('template')).toBe('api-key-request.md')
    expect(url.searchParams.get('labels')).toBe('api-key-request')
    expect(url.searchParams.get('title')).toBe('[API Key 申请] ')
    expect(url.searchParams.get('body')).toContain('developer+sticker@example.test')
    expect(url.searchParams.get('body')).toContain('我会仅在服务器端保存和使用 API Key。')
  })

  it('escapes the verification URL in the HTML email while preserving it in the text fallback', () => {
    const verificationUrl = 'https://stickerhub.lius.me/support/api-key?token=value&next=<script>'
    const message = renderApiKeyRequestVerificationEmail(verificationUrl)

    expect(message.text).toContain(verificationUrl)
    expect(message.html).toContain('token=value&amp;next=&lt;script&gt;')
    expect(message.html).not.toContain('token=value&next=<script>')
  })
})
