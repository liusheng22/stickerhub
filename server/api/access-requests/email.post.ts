import { sendResendEmail } from '../../utils/api-key-email'
import {
  buildApiKeyRequestVerificationUrl,
  createApiKeyRequestVerificationToken,
  renderApiKeyRequestVerificationEmail,
} from '../../utils/api-key-request'
import { throwApiError, withApiErrorBoundary } from '../../utils/api/errors'
import { readApiKeyRequestEmailBody } from '../../utils/api/validation'

export default defineEventHandler(async event => withApiErrorBoundary(event, async () => {
  setResponseHeaders(event, {
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  })

  const { email } = await readApiKeyRequestEmailBody(event)
  const config = useRuntimeConfig()
  if (!config.resendApiKey || !config.resendFromEmail || !config.session.password) {
    throwApiError(503, 'access_request_not_configured', 'API Key requests are temporarily unavailable.')
  }

  const token = createApiKeyRequestVerificationToken(email, config.session.password)
  const verificationUrl = buildApiKeyRequestVerificationUrl(config.public.siteUrl, token)
  if (!verificationUrl) {
    throwApiError(503, 'access_request_not_configured', 'API Key requests are temporarily unavailable.')
  }

  let providerMessageId: string | null
  try {
    providerMessageId = await sendResendEmail(
      config.resendApiKey,
      config.resendFromEmail,
      email,
      renderApiKeyRequestVerificationEmail(verificationUrl),
    )
  } catch {
    providerMessageId = null
  }

  if (!providerMessageId) {
    throwApiError(502, 'access_request_email_failed', 'The verification email could not be sent.')
  }

  return { data: { accepted: true } }
}))
