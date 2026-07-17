import { Webhook } from 'standardwebhooks'
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

type ResendWebhookEvent = {
  type: string
  created_at: string
  data: {
    email_id?: unknown
  }
}

function isResendWebhookEvent(value: unknown): value is ResendWebhookEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  const event = value as Record<string, unknown>
  return typeof event.type === 'string'
    && typeof event.created_at === 'string'
    && Boolean(event.data)
    && typeof event.data === 'object'
    && !Array.isArray(event.data)
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

  let webhookEvent: ResendWebhookEvent
  try {
    const verified = new Webhook(config.resendWebhookSecret).verify(rawPayload, {
      'webhook-id': id,
      'webhook-timestamp': timestamp,
      'webhook-signature': signature,
    })

    if (!isResendWebhookEvent(verified)) {
      return sendNoContent(event)
    }

    webhookEvent = verified
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
