import { withApiErrorBoundary } from '../../utils/api/errors'
import { readSiteAlbumPageQuery } from '../../utils/api/validation'
import { listSiteAlbumPage } from '../../utils/queries/stickers'

export default defineEventHandler(async (event) => withApiErrorBoundary(event, async () => {
  const options = readSiteAlbumPageQuery(event)
  return listSiteAlbumPage(options)
}))
