import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import { secureSecretEquals } from '../api-keys'
import { throwApiError } from './errors'

const adminSessionDuration = 60 * 60 * 8

export function configuredAdminKey(): string {
  const adminKey = useRuntimeConfig().adminApiKey

  if (adminKey.length < 32) {
    throwApiError(503, 'admin_console_not_configured', 'The administrator console is not configured.')
  }

  return adminKey
}

function adminKeyFingerprint(adminKey: string): string {
  return createHash('sha256').update(adminKey).digest('hex')
}

function assertSessionPassword() {
  const sessionPassword = useRuntimeConfig().session?.password

  if (typeof sessionPassword !== 'string' || sessionPassword.length < 32) {
    throwApiError(503, 'admin_console_not_configured', 'The administrator console is not configured.')
  }
}

export function verifyAdminLoginKey(provided: string): boolean {
  return secureSecretEquals(provided, configuredAdminKey())
}

export async function startAdminSession(event: H3Event) {
  assertSessionPassword()
  const adminKey = configuredAdminKey()

  await replaceUserSession(event, {
    user: {
      role: 'admin',
      label: 'StickerHub owner',
    },
    secure: {
      adminKeyFingerprint: adminKeyFingerprint(adminKey),
    },
  }, { maxAge: adminSessionDuration })
}

export async function hasActiveAdminSession(event: H3Event): Promise<boolean> {
  try {
    const session = await getUserSession(event)
    const adminKey = configuredAdminKey()
    const active = session.user?.role === 'admin'
      && session.secure?.adminKeyFingerprint === adminKeyFingerprint(adminKey)

    if (!active && session.user) {
      await clearUserSession(event)
    }

    return active
  } catch {
    return false
  }
}

export async function requireAdminSession(event: H3Event) {
  if (!await hasActiveAdminSession(event)) {
    throwApiError(401, 'admin_session_required', 'An administrator session is required.')
  }
}
