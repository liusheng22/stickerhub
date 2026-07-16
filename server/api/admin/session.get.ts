import { requireAdminSession } from '../../utils/api/admin-session'
import { withApiErrorBoundary } from '../../utils/api/errors'

export default defineEventHandler(async event => withApiErrorBoundary(event, async () => {
  await requireAdminSession(event)
  return { data: { authenticated: true } }
}))
