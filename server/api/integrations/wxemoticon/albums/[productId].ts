import { throwApiError, withApiErrorBoundary } from '../../../../utils/api/errors'
import { readWxemoticonProductId } from '../../../../utils/api/validation'
import { getWxemoticonAlbumPayload } from '../../../../utils/queries/wxemoticon'
import {
  getCloudflareResponseCache,
  resolveWxemoticonAlbumResponse,
} from '../../../../utils/wxemoticon-cache'

export default defineEventHandler(async (event) => withApiErrorBoundary(event, async () => {
  const method = getMethod(event)

  if (method !== 'GET' && method !== 'HEAD') {
    setResponseHeaders(event, {
      'Allow': 'GET, HEAD',
      'Cache-Control': 'no-store',
    })
    throwApiError(405, 'method_not_allowed', 'Only GET and HEAD requests are supported.')
  }

  let productId: string

  try {
    productId = readWxemoticonProductId(event)
  } catch (error) {
    setResponseHeader(event, 'Cache-Control', 'no-store')
    throw error
  }

  let response: Response | null

  try {
    response = await resolveWxemoticonAlbumResponse({
      requestUrl: getRequestURL(event),
      productId,
      ifNoneMatch: getRequestHeader(event, 'if-none-match'),
      cache: getCloudflareResponseCache(),
      load: getWxemoticonAlbumPayload,
    })
  } catch {
    console.error('Wxemoticon integration request failed', {
      method: event.method,
      path: event.path,
    })
    setResponseHeader(event, 'Cache-Control', 'no-store')
    throwApiError(500, 'internal_error', 'The service could not complete this request.')
  }

  if (!response) {
    setResponseHeader(event, 'Cache-Control', 'no-store')
    throwApiError(404, 'not_found', 'The requested sticker pack is not available.')
  }

  return response
}))
