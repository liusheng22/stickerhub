import { handlePublicApiPreflight } from '../utils/api/access'
import { withApiErrorBoundary } from '../utils/api/errors'

export default defineEventHandler(async (event) => {
  const pathname = getRequestURL(event).pathname

  if (getMethod(event) !== 'OPTIONS' || !pathname.startsWith('/api/v1/')) {
    return
  }

  return withApiErrorBoundary(event, async () => handlePublicApiPreflight(event))
})
