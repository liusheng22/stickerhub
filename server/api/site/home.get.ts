import { withApiErrorBoundary } from '../../utils/api/errors'
import { getHomePayload } from '../../utils/queries/stickers'

export default defineEventHandler(async (event) => withApiErrorBoundary(
  event,
  () => getHomePayload(),
))
