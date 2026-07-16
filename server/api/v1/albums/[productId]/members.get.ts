import { enforcePublicApiAccess } from '../../../../utils/api/access'
import { withApiErrorBoundary, throwApiError } from '../../../../utils/api/errors'
import { readMemberListQuery, readProductId } from '../../../../utils/api/validation'
import { getAlbumByProductId, listAlbumMembers } from '../../../../utils/queries/stickers'

export default defineEventHandler(async (event) => withApiErrorBoundary(event, async () => {
  await enforcePublicApiAccess(event)
  const productId = readProductId(event)
  const album = await getAlbumByProductId(productId)

  if (!album) {
    throwApiError(404, 'not_found', 'The requested sticker pack was not found.')
  }

  return listAlbumMembers(productId, readMemberListQuery(event))
}))
