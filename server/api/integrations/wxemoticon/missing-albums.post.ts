import { sendResendEmail } from '../../../utils/api-key-email'
import { throwApiError, withApiErrorBoundary } from '../../../utils/api/errors'
import { readMissingAlbumFeedbackBody } from '../../../utils/api/validation'
import {
  renderMissingAlbumFeedbackEmail,
  WXEMOTICON_FEEDBACK_RECIPIENT,
} from '../../../utils/wxemoticon-feedback'

export default defineEventHandler(async (event) => withApiErrorBoundary(event, async () => {
  setResponseHeaders(event, {
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  })

  const payload = await readMissingAlbumFeedbackBody(event)
  const config = useRuntimeConfig()
  if (!config.resendApiKey || !config.resendFromEmail) {
    throwApiError(503, 'feedback_email_not_configured', 'Email feedback is not configured.')
  }

  const message = renderMissingAlbumFeedbackEmail(payload)
  let providerMessageId: string | null
  try {
    providerMessageId = await sendResendEmail(
      config.resendApiKey,
      config.resendFromEmail,
      WXEMOTICON_FEEDBACK_RECIPIENT,
      message,
    )
  } catch {
    providerMessageId = null
  }

  if (!providerMessageId) {
    throwApiError(502, 'feedback_email_failed', 'The feedback email could not be sent.')
  }

  return {
    schemaVersion: 1,
    status: 'accepted' as const,
  }
}))
