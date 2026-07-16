import { getRuntimeApiKeyStore } from '../../../utils/api-keys'
import { notifyIntegrationOwner } from '../../../utils/api-key-email'
import { enforceAdminApiAccess } from '../../../utils/api/admin-access'
import { throwApiError, withApiErrorBoundary } from '../../../utils/api/errors'
import { readApiKeyCreateBody } from '../../../utils/api/validation'

export default defineEventHandler(async event => withApiErrorBoundary(event, async () => {
  await enforceAdminApiAccess(event)
  const store = getRuntimeApiKeyStore()

  if (!store) {
    throwApiError(503, 'api_keys_not_configured', 'The API key store is not configured.')
  }

  const input = await readApiKeyCreateBody(event)
  const issued = await store.create(input)
  await store.audit('key.created', issued.record, {
    rateLimitPerMinute: issued.record.rateLimitPerMinute,
    hasExpiry: Boolean(issued.record.expiresAt),
  })

  const notification = await notifyIntegrationOwner(issued.record, input.notifyOwner)
  if (notification.status !== 'not-requested') {
    if (notification.providerMessageId) {
      await store.recordEmailNotification(issued.record, notification.providerMessageId)
    }
    await store.audit('key.owner_notification', issued.record, {
      status: notification.status,
      providerMessageId: notification.providerMessageId || null,
    })
  }
  setResponseStatus(event, 201)

  return {
    data: {
      ...issued.record,
      apiKey: issued.apiKey,
      notification: notification.status,
    },
  }
}))
