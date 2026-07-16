import { getRuntimeApiKeyStore } from '../../../../utils/api-keys'
import { enforceAdminApiAccess } from '../../../../utils/api/admin-access'
import { throwApiError, withApiErrorBoundary } from '../../../../utils/api/errors'
import { readApiKeyId } from '../../../../utils/api/validation'

export default defineEventHandler(async event => withApiErrorBoundary(event, async () => {
  await enforceAdminApiAccess(event)
  const store = getRuntimeApiKeyStore()

  if (!store) {
    throwApiError(503, 'api_keys_not_configured', 'The API key store is not configured.')
  }

  const record = await store.revoke(readApiKeyId(event))
  if (!record) {
    throwApiError(404, 'api_key_not_found', 'The API key was not found.')
  }

  await store.audit('key.revoked', record)
  return { data: record }
}))
