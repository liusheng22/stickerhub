import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import { getRuntimeApiKeyStore, secureSecretEquals, type ApiKeyPrincipal } from '../api-keys'
import { throwApiError } from './errors'

function allowedOrigins() {
  return useRuntimeConfig().corsAllowedOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function getAllowedOrigin(event: H3Event): string | null {
  const origin = getRequestHeader(event, 'origin')

  if (!origin) {
    return null
  }

  if (!allowedOrigins().includes(origin)) {
    throwApiError(403, 'origin_not_allowed', 'This origin is not allowed to call the API.')
  }

  return origin
}

function setCorsHeaders(event: H3Event, origin: string | null) {
  if (!origin) {
    return
  }

  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'X-API-Key, Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  })
}

async function enforceRateLimit(event: H3Event, keyId: string, keyLimit: number) {
  const config = useRuntimeConfig()
  const redisUrl = config.upstashRedisRestUrl.replace(/\/$/, '')
  const redisToken = config.upstashRedisRestToken

  if (!redisUrl || !redisToken) {
    if (process.env.NODE_ENV === 'production') {
      throwApiError(503, 'rate_limit_unavailable', 'The API rate limiter is not configured.')
    }

    return
  }

  const minuteBucket = Math.floor(Date.now() / 60_000)
  const keyHash = createHash('sha256').update(keyId).digest('hex')
  const key = `stickerhub:api-rate:${keyHash}:${minuteBucket}`

  let response: Response
  try {
    response = await fetch(`${redisUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, '60', 'NX'],
      ]),
    })
  } catch {
    throwApiError(503, 'rate_limit_unavailable', 'The API rate limiter is unavailable.')
  }

  if (!response.ok) {
    throwApiError(503, 'rate_limit_unavailable', 'The API rate limiter is unavailable.')
  }

  const payload = await response.json() as Array<{ result?: number }>
  const requests = Number(payload[0]?.result)
  const limit = Number.isFinite(keyLimit) && keyLimit > 0
    ? keyLimit
    : Number.isFinite(config.apiRateLimit) && config.apiRateLimit > 0
      ? config.apiRateLimit
      : 60

  if (!Number.isFinite(requests)) {
    throwApiError(503, 'rate_limit_unavailable', 'The API rate limiter returned an invalid response.')
  }

  if (requests > limit) {
    setResponseHeader(event, 'Retry-After', 60)
    throwApiError(429, 'rate_limited', 'Too many requests. Try again in a minute.')
  }
}

async function authenticatePresentedKey(apiKey: string): Promise<ApiKeyPrincipal> {
  const store = getRuntimeApiKeyStore()
  const config = useRuntimeConfig()

  if (store) {
    try {
      const principal = await store.authenticate(apiKey, 'catalog:read')
      if (principal) {
        try {
          await store.touchLastUsed(principal.id)
        } catch {
          // Usage metadata must not make a valid read-only request unavailable.
        }

        return principal
      }

      const legacyKey = process.env.NODE_ENV === 'production' ? '' : config.apiKey
      if (legacyKey && secureSecretEquals(apiKey, legacyKey)) {
        return {
          id: 'legacy-local-key',
          keyPrefix: 'legacy-local',
          scopes: ['catalog:read'],
          rateLimitPerMinute: config.apiRateLimit,
        }
      }

      throwApiError(401, 'unauthorized', 'A valid X-API-Key header is required.')
    } catch (error) {
      if (error instanceof Error && error.name === 'PublicApiError') throw error
      throwApiError(503, 'api_keys_unavailable', 'API key verification is unavailable.')
    }
  }

  const legacyKey = process.env.NODE_ENV === 'production' ? '' : config.apiKey

  if (!legacyKey) {
    throwApiError(503, 'api_keys_not_configured', 'The public API key store is not configured.')
  }

  if (!secureSecretEquals(apiKey, legacyKey)) {
    throwApiError(401, 'unauthorized', 'A valid X-API-Key header is required.')
  }

  return {
    id: 'legacy-local-key',
    keyPrefix: 'legacy-local',
    scopes: ['catalog:read'],
    rateLimitPerMinute: config.apiRateLimit,
  }
}

export async function enforcePublicApiAccess(event: H3Event) {
  const origin = getAllowedOrigin(event)
  setCorsHeaders(event, origin)

  const apiKey = getRequestHeader(event, 'x-api-key')

  if (!apiKey) {
    setResponseHeader(event, 'WWW-Authenticate', 'ApiKey')
    throwApiError(401, 'unauthorized', 'A valid X-API-Key header is required.')
  }

  const principal = await authenticatePresentedKey(apiKey)
  await enforceRateLimit(event, principal.id, principal.rateLimitPerMinute)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return principal
}

export function handlePublicApiPreflight(event: H3Event) {
  const origin = getAllowedOrigin(event)

  if (!origin) {
    throwApiError(400, 'invalid_request', 'An Origin header is required for preflight requests.')
  }

  setCorsHeaders(event, origin)
  return sendNoContent(event, 204)
}
