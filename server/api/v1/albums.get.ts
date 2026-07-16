import { enforcePublicApiAccess } from '../../utils/api/access'
import { withApiErrorBoundary } from '../../utils/api/errors'
import { readAlbumListQuery } from '../../utils/api/validation'
import { listAlbums } from '../../utils/queries/stickers'

export default defineEventHandler(async (event) => withApiErrorBoundary(event, async () => {
  await enforcePublicApiAccess(event)
  return listAlbums(readAlbumListQuery(event))
}))
