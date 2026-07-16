import { withApiErrorBoundary } from '../../utils/api/errors'
import { readAlbumListQuery } from '../../utils/api/validation'
import { listAlbums } from '../../utils/queries/stickers'

export default defineEventHandler(async (event) => withApiErrorBoundary(event, async () => {
  const options = readAlbumListQuery(event)
  return listAlbums(options)
}))
