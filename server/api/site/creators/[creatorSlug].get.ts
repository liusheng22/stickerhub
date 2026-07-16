import { throwApiError, withApiErrorBoundary } from '../../../utils/api/errors'
import { readCreatorSlug } from '../../../utils/api/validation'
import { getCreatorPagePayload } from '../../../utils/queries/stickers'

export default defineEventHandler(async (event) => withApiErrorBoundary(event, async () => {
  const creatorSlug = readCreatorSlug(event)
  const payload = await getCreatorPagePayload(creatorSlug)

  if (!payload) {
    throwApiError(404, 'not_found', 'This creator is not available.')
  }

  return payload
}))
