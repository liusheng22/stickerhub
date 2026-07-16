import { startAdminSession, verifyAdminLoginKey } from '../../utils/api/admin-session'
import { throwApiError, withApiErrorBoundary } from '../../utils/api/errors'
import { readAdminLoginBody } from '../../utils/api/validation'

export default defineEventHandler(async event => withApiErrorBoundary(event, async () => {
  const { adminKey } = await readAdminLoginBody(event)

  if (!verifyAdminLoginKey(adminKey)) {
    throwApiError(401, 'invalid_admin_key', 'The administrator credential is invalid.')
  }

  await startAdminSession(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { data: { authenticated: true } }
}))
