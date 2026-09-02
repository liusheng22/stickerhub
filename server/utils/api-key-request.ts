import { createHmac, timingSafeEqual } from 'node:crypto'
import { buildApiReferenceUrl, type IntegrationAccessEmail } from './api-key-email'

const TOKEN_PURPOSE = 'stickerhub-api-key-request-v1'
const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1_000
const GITHUB_ISSUE_URL = 'https://github.com/liusheng22/stickerhub/issues/new'

interface VerificationTokenPayload {
  email: string
  expiresAt: number
}

export interface VerifiedApiKeyRequest {
  email: string
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

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', `${TOKEN_PURPOSE}:${secret}`)
    .update(payload)
    .digest('base64url')
}

function isValidSignature(signature: string, expectedSignature: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/.test(signature)) return false

  const actual = Buffer.from(signature)
  const expected = Buffer.from(expectedSignature)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function createApiKeyRequestVerificationToken(email: string, secret: string, now = Date.now()): string {
  const payload: VerificationTokenPayload = {
    email: email.trim().toLowerCase(),
    expiresAt: now + TOKEN_LIFETIME_MS,
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encodedPayload}.${signPayload(encodedPayload, secret)}`
}

export function verifyApiKeyRequestVerificationToken(
  token: string,
  secret: string,
  now = Date.now(),
): VerifiedApiKeyRequest | null {
  if (!secret || token.length > 2_048) return null

  const [encodedPayload, signature, ...extra] = token.split('.')
  if (!encodedPayload || !signature || extra.length || !/^[A-Za-z0-9_-]+$/.test(encodedPayload)) return null
  if (!isValidSignature(signature, signPayload(encodedPayload, secret))) return null

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Partial<VerificationTokenPayload>
    if (
      typeof payload.email !== 'string'
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)
      || typeof payload.expiresAt !== 'number'
      || !Number.isSafeInteger(payload.expiresAt)
      || payload.expiresAt <= now
    ) return null

    return { email: payload.email }
  } catch {
    return null
  }
}

export function buildApiKeyRequestVerificationUrl(siteUrl: string, token: string): string | null {
  const referenceUrl = buildApiReferenceUrl(siteUrl)
  if (!referenceUrl) return null

  const verificationUrl = new URL('/support/api-key', referenceUrl)
  verificationUrl.searchParams.set('token', token)
  return verificationUrl.toString()
}

export function buildApiKeyRequestIssueUrl(email: string): string {
  const url = new URL(GITHUB_ISSUE_URL)
  const body = [
    '## 联系邮箱',
    '',
    email,
    '',
    '## 你正在构建什么？',
    '',
    '<!-- 请简要说明项目是什么，以及准备如何使用 StickerHub。 -->',
    '',
    '## 项目地址或 GitHub 仓库',
    '',
    '<!-- 可选，但建议填写。 -->',
    '',
    '## 预计使用方式',
    '',
    '<!-- 例如：开发调试、个人项目、开源项目或生产服务。 -->',
    '',
    '## API Key 使用承诺',
    '',
    '- [ ] 我会仅在服务器端保存和使用 API Key。',
    '- [ ] 我不会将 API Key 写入浏览器代码、移动端应用或公开仓库。',
    '- [ ] 我理解滥用 API 访问可能导致 Key 被撤销。',
  ].join('\n')

  url.searchParams.set('template', 'api-key-request.md')
  url.searchParams.set('title', '[API Key 申请] ')
  url.searchParams.set('labels', 'api-key-request')
  url.searchParams.set('body', body)
  return url.toString()
}

export function renderApiKeyRequestVerificationEmail(verificationUrl: string): IntegrationAccessEmail {
  const safeVerificationUrl = escapeHtml(verificationUrl)
  const subject = 'Verify your StickerHub API Key request'

  return {
    subject,
    text: [
      'Verify your email to continue a StickerHub API Key request.',
      '',
      'Open this link within 24 hours:',
      verificationUrl,
      '',
      'After verification, you will be able to open a prefilled GitHub Issue and submit your request yourself.',
      'If you did not request an API Key, you can ignore this email.',
    ].join('\n'),
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f1ec;color:#171717;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f1ec;border-collapse:collapse;">
      <tr>
        <td style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:620px;margin:0 auto;border-collapse:collapse;">
            <tr>
              <td style="padding:0 0 14px;border-bottom:2px solid #171717;font-family:Arial,sans-serif;font-size:20px;font-weight:800;">StickerHub <span style="color:#ed3c17;">/ Open API</span></td>
            </tr>
            <tr>
              <td style="padding-top:20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #171717;border-collapse:separate;border-spacing:0;background:#ffffff;">
                  <tr>
                    <td style="padding:28px;background:#b8f1d3;border-bottom:2px solid #171717;">
                      <p style="margin:0 0 8px;font-family:'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Email verification</p>
                      <h1 style="margin:0;font-family:Arial,sans-serif;font-size:30px;font-weight:800;line-height:36px;">Confirm your email.</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:26px 28px 28px;">
                      <p style="margin:0;color:#393735;font-family:Arial,sans-serif;font-size:15px;line-height:24px;">Use the button below within 24 hours to continue your StickerHub API Key request. You will then open a prefilled public GitHub Issue and submit it yourself.</p>
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;border-collapse:collapse;">
                        <tr>
                          <td style="background:#ff5a2f;border:2px solid #171717;box-shadow:3px 3px 0 #171717;">
                            <a href="${safeVerificationUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 18px;color:#171717;font-family:Arial,sans-serif;font-size:14px;font-weight:700;line-height:20px;text-decoration:none;">Verify email and continue</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:28px 0 0;color:#6c6a67;font-family:Arial,sans-serif;font-size:13px;line-height:20px;">If you did not request an API Key, you can safely ignore this email.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  }
}
