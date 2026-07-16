import { withApiErrorBoundary } from '../../utils/api/errors'

export default defineEventHandler(async event => withApiErrorBoundary(event, async () => {
  await clearUserSession(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { data: { authenticated: false } }
}))
