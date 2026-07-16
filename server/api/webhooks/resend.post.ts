import { Resend } from 'resend'
import { getRuntimeApiKeyStore, type ApiKeyEmailNotificationStatus } from '../../utils/api-keys'
import { throwApiError, withApiErrorBoundary } from '../../utils/api/errors'

const deliveryStatusByEvent: Record<string, Exclude<ApiKeyEmailNotificationStatus, 'accepted'>> = {
  'email.delivery_delayed': 'delayed',
  'email.delivered': 'delivered',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.failed': 'failed',
  'email.suppressed': 'suppressed',
}

export default defineEventHandler(event => withApiErrorBoundary(event, async () => {
  const config = useRuntimeConfig()
  if (!config.resendWebhookSecret) {
    throwApiError(503, 'resend_webhook_not_configured', 'The email delivery webhook is not configured.')
  }

  const payload = await readRawBody(event, false)
  const id = getRequestHeader(event, 'svix-id')
  const timestamp = getRequestHeader(event, 'svix-timestamp')
  const signature = getRequestHeader(event, 'svix-signature')

  if (!payload || !id || !timestamp || !signature) {
    throwApiError(400, 'invalid_webhook_request', 'The email delivery webhook request is incomplete.')
  }
  const rawPayload = typeof payload === 'string' ? payload : payload.toString('utf8')

  let webhookEvent: ReturnType<Resend['webhooks']['verify']>
  try {
    webhookEvent = new Resend().webhooks.verify({
      payload: rawPayload,
      headers: { id, timestamp, signature },
      webhookSecret: config.resendWebhookSecret,
    })
  } catch {
    throwApiError(401, 'invalid_webhook_signature', 'The email delivery webhook signature is invalid.')
  }

  const status = deliveryStatusByEvent[webhookEvent.type]
  if (!status || !('email_id' in webhookEvent.data) || typeof webhookEvent.data.email_id !== 'string') {
    return sendNoContent(event)
  }

  const store = getRuntimeApiKeyStore()
  if (!store) {
    throwApiError(503, 'api_keys_not_configured', 'The API key store is not configured.')
  }

  const result = await store.updateEmailNotificationStatus(
    webhookEvent.data.email_id,
    status,
    webhookEvent.created_at,
  )

  if (result?.changed) {
    await store.audit('key.owner_notification.delivery', {
      id: result.notification.keyId,
      keyPrefix: result.notification.keyPrefix,
    }, {
      status: result.notification.status,
      providerMessageId: result.notification.providerMessageId,
    })
  }

  return sendNoContent(event)
}))
