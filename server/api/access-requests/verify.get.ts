import { buildApiKeyRequestIssueUrl, verifyApiKeyRequestVerificationToken } from '../../utils/api-key-request'
import { throwApiError, withApiErrorBoundary } from '../../utils/api/errors'
import { readApiKeyRequestVerificationToken } from '../../utils/api/validation'

export default defineEventHandler(async event => withApiErrorBoundary(event, async () => {
  setResponseHeaders(event, {
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  })

  const token = readApiKeyRequestVerificationToken(event)
  const config = useRuntimeConfig()
  if (!config.session.password) {
    throwApiError(503, 'access_request_not_configured', 'API Key requests are temporarily unavailable.')
  }

  const verifiedRequest = verifyApiKeyRequestVerificationToken(token, config.session.password)
  if (!verifiedRequest) {
    throwApiError(400, 'invalid_verification_token', 'This verification link is invalid or has expired.')
  }

  return {
    data: {
      email: verifiedRequest.email,
      githubIssueUrl: buildApiKeyRequestIssueUrl(verifiedRequest.email),
    },
  }
}))
