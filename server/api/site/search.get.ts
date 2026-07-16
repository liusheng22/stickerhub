import { throwApiError, withApiErrorBoundary } from '../../utils/api/errors'
import { readAlbumListQuery } from '../../utils/api/validation'
import { listAlbums } from '../../utils/queries/stickers'

export default defineEventHandler(async (event) => withApiErrorBoundary(event, async () => {
  const options = readAlbumListQuery(event)

  if (!options.q) {
    throwApiError(400, 'invalid_request', 'Enter a search phrase to browse sticker packs.')
  }

  return listAlbums(options)
}))
