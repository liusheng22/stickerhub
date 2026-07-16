import type { H3Event } from 'h3'
import { secureSecretEquals } from '../api-keys'
import { configuredAdminKey, hasActiveAdminSession } from './admin-session'
import { throwApiError } from './errors'

export async function enforceAdminApiAccess(event: H3Event) {
  if (await hasActiveAdminSession(event)) {
    setResponseHeader(event, 'Cache-Control', 'no-store')
    return
  }

  const expected = configuredAdminKey()
  const provided = getRequestHeader(event, 'x-admin-api-key')

  if (!provided || !secureSecretEquals(provided, expected)) {
    setResponseHeader(event, 'WWW-Authenticate', 'ApiKey')
    throwApiError(401, 'unauthorized', 'A valid administrator API key is required.')
  }

  setResponseHeader(event, 'Cache-Control', 'no-store')
}
