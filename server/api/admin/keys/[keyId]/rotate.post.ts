import { getRuntimeApiKeyStore } from '../../../../utils/api-keys'
import { enforceAdminApiAccess } from '../../../../utils/api/admin-access'
import { throwApiError, withApiErrorBoundary } from '../../../../utils/api/errors'
import { notifyIntegrationOwner } from '../../../../utils/api-key-email'
import { readApiKeyId, readApiKeyNotificationBody } from '../../../../utils/api/validation'

export default defineEventHandler(async event => withApiErrorBoundary(event, async () => {
  await enforceAdminApiAccess(event)
  const store = getRuntimeApiKeyStore()

  if (!store) {
    throwApiError(503, 'api_keys_not_configured', 'The API key store is not configured.')
  }

  const input = await readApiKeyNotificationBody(event)
  const issued = await store.rotate(readApiKeyId(event))
  if (!issued) {
    throwApiError(404, 'api_key_not_found', 'The active API key was not found.')
  }

  await store.audit('key.rotated', issued.record)
  const notification = await notifyIntegrationOwner(issued.record, input.notifyOwner, 'rotated')
  if (notification.status !== 'not-requested') {
    if (notification.providerMessageId) {
      await store.recordEmailNotification(issued.record, notification.providerMessageId)
    }
    await store.audit('key.owner_notification', issued.record, {
      status: notification.status,
      providerMessageId: notification.providerMessageId || null,
      reason: 'rotation',
    })
  }

  return {
    data: {
      ...issued.record,
      apiKey: issued.apiKey,
      notification: notification.status,
    },
  }
}))
