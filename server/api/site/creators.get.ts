import { withApiErrorBoundary } from '../../utils/api/errors'
import { readCreatorListQuery } from '../../utils/api/validation'
import { listCreators } from '../../utils/queries/stickers'

export default defineEventHandler(async (event) => withApiErrorBoundary(event, async () => {
  const options = readCreatorListQuery(event)
  return listCreators(options)
}))
