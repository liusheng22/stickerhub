import { throwApiError, withApiErrorBoundary } from '../../../utils/api/errors'
import { readProductId } from '../../../utils/api/validation'
import { getAlbumPagePayload } from '../../../utils/queries/stickers'

export default defineEventHandler(async (event) => withApiErrorBoundary(event, async () => {
  const productId = readProductId(event)
  const payload = await getAlbumPagePayload(productId)

  if (!payload) {
    throwApiError(404, 'not_found', 'This sticker pack is not available.')
  }

  return payload
}))
