import { getRuntimeApiKeyStore } from '../../../utils/api-keys'
import { enforceAdminApiAccess } from '../../../utils/api/admin-access'
import { throwApiError, withApiErrorBoundary } from '../../../utils/api/errors'

export default defineEventHandler(async event => withApiErrorBoundary(event, async () => {
  await enforceAdminApiAccess(event)
  const store = getRuntimeApiKeyStore()

  if (!store) {
    throwApiError(503, 'api_keys_not_configured', 'The API key store is not configured.')
  }

  return { data: await store.list() }
}))
