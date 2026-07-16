import { enforcePublicApiAccess } from '../../../utils/api/access'
import { withApiErrorBoundary, throwApiError } from '../../../utils/api/errors'
import { readProductId } from '../../../utils/api/validation'
import { getAlbumByProductId } from '../../../utils/queries/stickers'

export default defineEventHandler(async (event) => withApiErrorBoundary(event, async () => {
  await enforcePublicApiAccess(event)
  const album = await getAlbumByProductId(readProductId(event))

  if (!album) {
    throwApiError(404, 'not_found', 'The requested sticker pack was not found.')
  }

  return { data: album }
}))
