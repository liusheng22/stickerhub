import { enforcePublicApiAccess } from '../../../utils/api/access'
import { withApiErrorBoundary, throwApiError } from '../../../utils/api/errors'
import { readMd5 } from '../../../utils/api/validation'
import { getMemberByMd5 } from '../../../utils/queries/stickers'

export default defineEventHandler(async (event) => withApiErrorBoundary(event, async () => {
  await enforcePublicApiAccess(event)
  const member = await getMemberByMd5(readMd5(event))

  if (!member) {
    throwApiError(404, 'not_found', 'The requested sticker was not found.')
  }

  return { data: member }
}))
