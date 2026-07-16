import { Resend } from 'resend'
import type { ApiKeyRecord } from './api-keys'

export type KeyNotificationStatus = 'not-requested' | 'not-configured' | 'invalid-site-url' | 'accepted' | 'failed'
export type KeyNotificationPurpose = 'created' | 'rotated'

export interface KeyNotificationResult {
  status: KeyNotificationStatus
  providerMessageId?: string
}

export interface IntegrationAccessEmail {
  subject: string
  text: string
  html: string
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] || character)
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number)
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [first = -1, second = -1] = parts

  return first === 10
    || first === 127
    || first === 0
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
}

export function buildApiReferenceUrl(siteUrl: string): string | null {
  try {
    const baseUrl = new URL(siteUrl.trim())
    const hostname = baseUrl.hostname.toLowerCase()
    const hasInvalidHost = hostname === 'localhost'
      || hostname.endsWith('.localhost')
      || hostname === '::1'
      || hostname.endsWith('.example')
      || isPrivateIpv4(hostname)

    if (baseUrl.protocol !== 'https:' || baseUrl.username || baseUrl.password || hasInvalidHost) return null

    return new URL('/docs/reference', baseUrl.origin).toString()
  } catch {
    return null
  }
}

export function renderIntegrationAccessEmail(
  record: ApiKeyRecord,
  referenceUrl: string,
  purpose: KeyNotificationPurpose = 'created',
): IntegrationAccessEmail {
  const expiry = record.expiresAt || 'No expiry configured'
  const isRotation = purpose === 'rotated'
  const subject = isRotation ? 'StickerHub API key rotated' : 'StickerHub API access created'
  const headline = isRotation ? 'Your API key was rotated.' : 'Your API access is ready.'
  const eyebrow = isRotation ? 'Key rotated' : 'Access created'
  const description = isRotation
    ? 'The previous key has been disabled. Use the new key supplied by the service operator.'
    : 'The integration below can now read StickerHub sticker pack data.'
  const securityNote = isRotation
    ? 'This email does not contain the new API key. The service operator will share it through an approved secure channel.'
    : 'This email does not contain an API key. The service operator will share the one-time key through an approved secure channel.'
  const text = [
    isRotation ? 'Your StickerHub API key has been rotated.' : 'Your StickerHub API access has been created.',
    '',
    `Integration: ${record.label}`,
    `Key prefix: ${record.keyPrefix}`,
    `Scope: ${record.scopes.join(', ')}`,
    `Rate limit: ${record.rateLimitPerMinute} requests per minute`,
    `Expiry: ${expiry}`,
    '',
    description,
    '',
    `For security, ${securityNote.charAt(0).toLowerCase()}${securityNote.slice(1)}`,
    `API reference: ${referenceUrl}`,
  ].join('\n')

  const details = [
    ['Integration', record.label],
    ['Key prefix', record.keyPrefix],
    ['Scope', record.scopes.join(', ')],
    ['Rate limit', `${record.rateLimitPerMinute} requests per minute`],
    ['Expiry', expiry],
  ] as const
  const detailsHtml = details.map(([label, value]) => `
    <tr>
      <td style="padding: 11px 0; border-bottom: 1px solid #e7e4df; color: #6c6a67; font-family: Arial, sans-serif; font-size: 13px; line-height: 20px;">${escapeHtml(label)}</td>
      <td style="padding: 11px 0; border-bottom: 1px solid #e7e4df; color: #171717; font-family: Arial, sans-serif; font-size: 13px; font-weight: 700; line-height: 20px; text-align: right;">${escapeHtml(value)}</td>
    </tr>`).join('')
  const safeReferenceUrl = escapeHtml(referenceUrl)

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin: 0; padding: 0; background: #f4f1ec; color: #171717;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f4f1ec; border-collapse: collapse;">
      <tr>
        <td style="padding: 32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width: 620px; margin: 0 auto; border-collapse: collapse;">
            <tr>
              <td style="padding: 0 0 14px; border-bottom: 2px solid #171717; font-family: Arial, sans-serif; font-size: 20px; font-weight: 800; letter-spacing: 0;">StickerHub <span style="color: #ed3c17;">/ Open API</span></td>
            </tr>
            <tr>
              <td style="padding: 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px; border: 2px solid #171717; border-collapse: separate; border-spacing: 0; background: #ffffff;">
                  <tr>
                    <td style="padding: 28px 28px 24px; background: #dcc4ff; border-bottom: 2px solid #171717;">
                      <p style="margin: 0 0 8px; color: #171717; font-family: 'Courier New', monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">${escapeHtml(eyebrow)}</p>
                      <h1 style="margin: 0; color: #171717; font-family: Arial, sans-serif; font-size: 30px; font-weight: 800; letter-spacing: 0; line-height: 36px;">${escapeHtml(headline)}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 26px 28px 28px;">
                      <p style="margin: 0 0 20px; color: #393735; font-family: Arial, sans-serif; font-size: 15px; line-height: 24px;">${escapeHtml(description)}</p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">${detailsHtml}
                      </table>
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top: 26px; border-collapse: collapse;">
                        <tr>
                          <td style="background: #ff5a2f; border: 2px solid #171717; box-shadow: 3px 3px 0 #171717;">
                            <a href="${safeReferenceUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 18px; color: #171717; font-family: Arial, sans-serif; font-size: 14px; font-weight: 700; line-height: 20px; text-decoration: none;">Open API reference</a>
                          </td>
                        </tr>
                      </table>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 16px; border-left: 4px solid #ff5a2f; background: #fff3ef; color: #393735; font-family: Arial, sans-serif; font-size: 13px; line-height: 20px;"><strong style="color: #171717;">Security note.</strong> ${escapeHtml(securityNote)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <p style="margin: 18px 0 0; color: #77736f; font-family: Arial, sans-serif; font-size: 12px; line-height: 18px;">This is an operational notification for a StickerHub integration.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject, text, html }
}

export async function notifyIntegrationOwner(
  record: ApiKeyRecord,
  shouldNotify: boolean,
  purpose: KeyNotificationPurpose = 'created',
): Promise<KeyNotificationResult> {
  if (!shouldNotify) return { status: 'not-requested' }
  if (!record.ownerEmail) return { status: 'failed' }

  const config = useRuntimeConfig()
  if (!config.resendApiKey || !config.resendFromEmail) return { status: 'not-configured' }

  const referenceUrl = buildApiReferenceUrl(config.public.siteUrl)
  if (!referenceUrl) return { status: 'invalid-site-url' }

  const message = renderIntegrationAccessEmail(record, referenceUrl, purpose)

  try {
    const resend = new Resend(config.resendApiKey)
    const response = await resend.emails.send({
      from: config.resendFromEmail,
      to: record.ownerEmail,
      subject: message.subject,
      text: message.text,
      html: message.html,
    })
    const providerMessageId = response.data?.id

    return response.error || !providerMessageId
      ? { status: 'failed' }
      : { status: 'accepted', providerMessageId }
  } catch {
    return { status: 'failed' }
  }
}
