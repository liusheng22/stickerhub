import { withApiErrorBoundary } from '../../utils/api/errors'
import { enforcePublicApiAccess } from '../../utils/api/access'
import { selectOne } from '../../utils/db'

export default defineEventHandler(async (event) => withApiErrorBoundary(event, async () => {
  await enforcePublicApiAccess(event)
  await selectOne('SELECT 1 AS ok')

  return {
    ok: true,
    service: 'StickerHub API',
    timestamp: new Date().toISOString(),
  }
}))
