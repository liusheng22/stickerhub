import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { createClient } from '@tursodatabase/serverless/compat'

type SqlValue = string | number | null
type SqlParams = Record<string, SqlValue>
type SqlRow = Record<string, unknown>

type LocalStatement = {
  all: (params?: SqlParams) => unknown[]
  run: (params?: SqlParams) => unknown
}

type LocalDatabase = {
  exec: (sql: string) => void
  prepare: (sql: string) => LocalStatement
}

export const API_KEY_SCOPES = ['catalog:read'] as const
export type ApiKeyScope = typeof API_KEY_SCOPES[number]
export type ApiKeyStatus = 'active' | 'revoked'

export interface ApiKeyRecord {
  id: string
  keyPrefix: string
  label: string
  ownerEmail: string | null
  scopes: ApiKeyScope[]
  rateLimitPerMinute: number
  status: ApiKeyStatus
  createdAt: string
  expiresAt: string | null
  lastUsedAt: string | null
  revokedAt: string | null
  rotatedAt: string | null
}

export interface CreateApiKeyInput {
  label: string
  ownerEmail?: string
  scopes: ApiKeyScope[]
  rateLimitPerMinute: number
  expiresAt?: string
}

export interface IssuedApiKey {
  apiKey: string
  record: ApiKeyRecord
}

export interface ApiKeyPrincipal {
  id: string
  keyPrefix: string
  scopes: ApiKeyScope[]
  rateLimitPerMinute: number
}

export interface AdminAuditLog {
  id: string
  action: string
  keyId: string | null
  keyPrefix: string | null
  metadata: Record<string, string | number | boolean | null>
  createdAt: string
}

export const API_KEY_EMAIL_NOTIFICATION_STATUSES = ['accepted', 'delayed', 'delivered', 'bounced', 'complained', 'failed', 'suppressed'] as const
export type ApiKeyEmailNotificationStatus = typeof API_KEY_EMAIL_NOTIFICATION_STATUSES[number]

export interface ApiKeyEmailNotification {
  id: string
  keyId: string
  keyPrefix: string
  ownerEmail: string
  providerMessageId: string
  status: ApiKeyEmailNotificationStatus
  createdAt: string
  lastEventAt: string
}

export interface ApiKeyStoreConfiguration {
  databaseUrl?: string
  authToken?: string
  sqlitePath?: string
}

const schemaStatements = [
  `
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      key_prefix TEXT NOT NULL UNIQUE,
      secret_hash TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      owner_email TEXT,
      scopes_json TEXT NOT NULL,
      rate_limit_per_minute INTEGER NOT NULL CHECK (rate_limit_per_minute > 0),
      status TEXT NOT NULL CHECK (status IN ('active', 'revoked')) DEFAULT 'active',
      created_at TEXT NOT NULL,
      expires_at TEXT,
      last_used_at TEXT,
      revoked_at TEXT,
      rotated_at TEXT
    )
  `,
  'CREATE INDEX IF NOT EXISTS api_keys_status_expires_idx ON api_keys(status, expires_at)',
  'CREATE INDEX IF NOT EXISTS api_keys_owner_email_idx ON api_keys(owner_email)',
  `
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      key_id TEXT,
      key_prefix TEXT,
      metadata_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `,
  'CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON admin_audit_logs(created_at DESC)',
  `
    CREATE TABLE IF NOT EXISTS api_key_email_notifications (
      id TEXT PRIMARY KEY,
      key_id TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      owner_email TEXT NOT NULL,
      provider_message_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK (status IN ('accepted', 'delayed', 'delivered', 'bounced', 'complained', 'failed', 'suppressed')),
      created_at TEXT NOT NULL,
      last_event_at TEXT NOT NULL,
      FOREIGN KEY (key_id) REFERENCES api_keys(id)
    )
  `,
  'CREATE INDEX IF NOT EXISTS api_key_email_notifications_provider_message_id_idx ON api_key_email_notifications(provider_message_id)',
  'CREATE INDEX IF NOT EXISTS api_key_email_notifications_key_id_idx ON api_key_email_notifications(key_id, created_at DESC)',
]

const localDatabases = new Map<string, LocalDatabase>()

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return Number.isSafeInteger(Number(value)) ? Number(value) : value.toString()
  }

  return value
}

function normalizeRow(row: Record<string, unknown>): SqlRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, normalizeValue(value)]),
  )
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : value == null ? null : String(value)
}

function numberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }

  return 0
}

function isApiKeyScope(value: unknown): value is ApiKeyScope {
  return typeof value === 'string' && (API_KEY_SCOPES as readonly string[]).includes(value)
}

function readScopes(value: unknown): ApiKeyScope[] {
  if (typeof value !== 'string') return []

  try {
    const scopes = JSON.parse(value) as unknown
    return Array.isArray(scopes) ? scopes.filter(isApiKeyScope) : []
  } catch {
    return []
  }
}

function mapRecord(row: SqlRow): ApiKeyRecord {
  const status = stringValue(row.status)

  return {
    id: stringValue(row.id) || '',
    keyPrefix: stringValue(row.key_prefix) || '',
    label: stringValue(row.label) || '',
    ownerEmail: stringValue(row.owner_email),
    scopes: readScopes(row.scopes_json),
    rateLimitPerMinute: numberValue(row.rate_limit_per_minute),
    status: status === 'revoked' ? 'revoked' : 'active',
    createdAt: stringValue(row.created_at) || '',
    expiresAt: stringValue(row.expires_at),
    lastUsedAt: stringValue(row.last_used_at),
    revokedAt: stringValue(row.revoked_at),
    rotatedAt: stringValue(row.rotated_at),
  }
}

function readAuditMetadata(value: unknown): Record<string, string | number | boolean | null> {
  if (typeof value !== 'string') return {}

  try {
    const metadata = JSON.parse(value) as unknown
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {}

    return Object.fromEntries(
      Object.entries(metadata).filter(([, item]) => item === null || ['string', 'number', 'boolean'].includes(typeof item)),
    ) as Record<string, string | number | boolean | null>
  } catch {
    return {}
  }
}

function mapAuditLog(row: SqlRow): AdminAuditLog {
  return {
    id: stringValue(row.id) || '',
    action: stringValue(row.action) || '',
    keyId: stringValue(row.key_id),
    keyPrefix: stringValue(row.key_prefix),
    metadata: readAuditMetadata(row.metadata_json),
    createdAt: stringValue(row.created_at) || '',
  }
}

function isApiKeyEmailNotificationStatus(value: unknown): value is ApiKeyEmailNotificationStatus {
  return typeof value === 'string' && (API_KEY_EMAIL_NOTIFICATION_STATUSES as readonly string[]).includes(value)
}

function mapEmailNotification(row: SqlRow): ApiKeyEmailNotification {
  const status = stringValue(row.status)

  return {
    id: stringValue(row.id) || '',
    keyId: stringValue(row.key_id) || '',
    keyPrefix: stringValue(row.key_prefix) || '',
    ownerEmail: stringValue(row.owner_email) || '',
    providerMessageId: stringValue(row.provider_message_id) || '',
    status: isApiKeyEmailNotificationStatus(status) ? status : 'accepted',
    createdAt: stringValue(row.created_at) || '',
    lastEventAt: stringValue(row.last_event_at) || '',
  }
}

function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}

function generateIssuedKey() {
  const id = `key_${randomBytes(12).toString('base64url')}`
  const keyPrefix = `sm_live_${randomBytes(5).toString('hex')}`
  const apiKey = `${keyPrefix}_${randomBytes(32).toString('base64url')}`

  return { id, keyPrefix, apiKey, secretHash: hashApiKey(apiKey) }
}

function isExpired(expiresAt: string | null, now: Date): boolean {
  if (!expiresAt) return false
  const timestamp = Date.parse(expiresAt)
  return !Number.isFinite(timestamp) || timestamp <= now.getTime()
}

async function getLocalDatabase(path: string): Promise<LocalDatabase> {
  const existing = localDatabases.get(path)
  if (existing) return existing

  await mkdir(dirname(path), { recursive: true })
  const { DatabaseSync } = await import('node:sqlite')
  const database = new DatabaseSync(path) as unknown as LocalDatabase
  database.exec('PRAGMA journal_mode = WAL')
  database.exec('PRAGMA foreign_keys = ON')
  localDatabases.set(path, database)
  return database
}

export function secureSecretEquals(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)

  return providedBuffer.length === expectedBuffer.length
    && timingSafeEqual(providedBuffer, expectedBuffer)
}

export class ApiKeyStore {
  private schemaReady: Promise<void> | undefined

  constructor(private readonly configuration: ApiKeyStoreConfiguration) {}

  private get isRemote() {
    return Boolean(this.configuration.databaseUrl && this.configuration.authToken)
  }

  private async select(sql: string, params: SqlParams = {}): Promise<SqlRow[]> {
    if (this.isRemote) {
      const client = createClient({
        url: this.configuration.databaseUrl || '',
        authToken: this.configuration.authToken || '',
      })

      try {
        const result = await client.execute({ sql, args: params })
        return result.rows.map(row => normalizeRow(row as unknown as Record<string, unknown>))
      } finally {
        client.close()
      }
    }

    if (!this.configuration.sqlitePath) throw new Error('API key storage is not configured.')
    const database = await getLocalDatabase(this.configuration.sqlitePath)
    const rows = database.prepare(sql).all(params) as Record<string, unknown>[]
    return rows.map(normalizeRow)
  }

  private async execute(sql: string, params: SqlParams = {}): Promise<void> {
    if (this.isRemote) {
      const client = createClient({
        url: this.configuration.databaseUrl || '',
        authToken: this.configuration.authToken || '',
      })

      try {
        await client.execute({ sql, args: params })
      } finally {
        client.close()
      }

      return
    }

    if (!this.configuration.sqlitePath) throw new Error('API key storage is not configured.')
    const database = await getLocalDatabase(this.configuration.sqlitePath)
    database.prepare(sql).run(params)
  }

  async ensureSchema(): Promise<void> {
    if (!this.schemaReady) {
      this.schemaReady = schemaStatements
        .reduce((pending, statement) => pending.then(() => this.execute(statement)), Promise.resolve())
        .then(() => undefined)
    }

    return this.schemaReady
  }

  async list(): Promise<ApiKeyRecord[]> {
    await this.ensureSchema()
    const rows = await this.select(`
      SELECT id, key_prefix, label, owner_email, scopes_json, rate_limit_per_minute,
        status, created_at, expires_at, last_used_at, revoked_at, rotated_at
      FROM api_keys
      ORDER BY created_at DESC
    `)
    return rows.map(mapRecord)
  }

  async get(keyId: string): Promise<ApiKeyRecord | null> {
    await this.ensureSchema()
    const [row] = await this.select(`
      SELECT id, key_prefix, label, owner_email, scopes_json, rate_limit_per_minute,
        status, created_at, expires_at, last_used_at, revoked_at, rotated_at
      FROM api_keys
      WHERE id = :keyId
      LIMIT 1
    `, { keyId })
    return row ? mapRecord(row) : null
  }

  async create(input: CreateApiKeyInput): Promise<IssuedApiKey> {
    await this.ensureSchema()
    const now = new Date()
    const label = input.label.trim()
    const ownerEmail = input.ownerEmail?.trim() || null
    const expiresAt = input.expiresAt || null

    if (!label || input.scopes.length === 0 || input.rateLimitPerMinute < 1) {
      throw new Error('The API key input is invalid.')
    }
    if (expiresAt && isExpired(expiresAt, now)) {
      throw new Error('The API key expiry must be in the future.')
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const issued = generateIssuedKey()
      const createdAt = now.toISOString()

      try {
        await this.execute(`
          INSERT INTO api_keys (
            id, key_prefix, secret_hash, label, owner_email, scopes_json,
            rate_limit_per_minute, status, created_at, expires_at
          ) VALUES (
            :id, :keyPrefix, :secretHash, :label, :ownerEmail, :scopesJson,
            :rateLimitPerMinute, 'active', :createdAt, :expiresAt
          )
        `, {
          id: issued.id,
          keyPrefix: issued.keyPrefix,
          secretHash: issued.secretHash,
          label,
          ownerEmail,
          scopesJson: JSON.stringify(input.scopes),
          rateLimitPerMinute: input.rateLimitPerMinute,
          createdAt,
          expiresAt,
        })

        return {
          apiKey: issued.apiKey,
          record: {
            id: issued.id,
            keyPrefix: issued.keyPrefix,
            label,
            ownerEmail,
            scopes: input.scopes,
            rateLimitPerMinute: input.rateLimitPerMinute,
            status: 'active',
            createdAt,
            expiresAt,
            lastUsedAt: null,
            revokedAt: null,
            rotatedAt: null,
          },
        }
      } catch (error) {
        if (attempt === 2) throw error
      }
    }

    throw new Error('Unable to issue an API key.')
  }

  async revoke(keyId: string): Promise<ApiKeyRecord | null> {
    const record = await this.get(keyId)
    if (!record) return null
    if (record.status === 'revoked') return record

    const revokedAt = new Date().toISOString()
    await this.execute(`
      UPDATE api_keys
      SET status = 'revoked', revoked_at = :revokedAt
      WHERE id = :keyId
    `, { keyId, revokedAt })

    return { ...record, status: 'revoked', revokedAt }
  }

  async rotate(keyId: string): Promise<IssuedApiKey | null> {
    const record = await this.get(keyId)
    if (!record || record.status !== 'active' || isExpired(record.expiresAt, new Date())) return null

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const issued = generateIssuedKey()
      const rotatedAt = new Date().toISOString()

      try {
        await this.execute(`
          UPDATE api_keys
          SET key_prefix = :keyPrefix,
              secret_hash = :secretHash,
              rotated_at = :rotatedAt,
              last_used_at = NULL
          WHERE id = :keyId
        `, {
          keyId,
          keyPrefix: issued.keyPrefix,
          secretHash: issued.secretHash,
          rotatedAt,
        })

        return {
          apiKey: issued.apiKey,
          record: { ...record, keyPrefix: issued.keyPrefix, lastUsedAt: null, rotatedAt },
        }
      } catch (error) {
        if (attempt === 2) throw error
      }
    }

    throw new Error('Unable to rotate the API key.')
  }

  async authenticate(apiKey: string, requiredScope: ApiKeyScope, now = new Date()): Promise<ApiKeyPrincipal | null> {
    await this.ensureSchema()
    const [row] = await this.select(`
      SELECT id, key_prefix, label, owner_email, scopes_json, rate_limit_per_minute,
        status, created_at, expires_at, last_used_at, revoked_at, rotated_at
      FROM api_keys
      WHERE secret_hash = :secretHash
      LIMIT 1
    `, { secretHash: hashApiKey(apiKey) })
    if (!row) return null

    const record = mapRecord(row)
    if (record.status !== 'active' || isExpired(record.expiresAt, now) || !record.scopes.includes(requiredScope)) {
      return null
    }

    return {
      id: record.id,
      keyPrefix: record.keyPrefix,
      scopes: record.scopes,
      rateLimitPerMinute: record.rateLimitPerMinute,
    }
  }

  async touchLastUsed(keyId: string, now = new Date()): Promise<void> {
    await this.ensureSchema()
    const lastUsedAt = now.toISOString()
    const refreshBefore = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    await this.execute(`
      UPDATE api_keys
      SET last_used_at = :lastUsedAt
      WHERE id = :keyId
        AND (last_used_at IS NULL OR last_used_at < :refreshBefore)
    `, { keyId, lastUsedAt, refreshBefore })
  }

  async audit(
    action: string,
    record: Pick<ApiKeyRecord, 'id' | 'keyPrefix'> | null,
    metadata: Record<string, string | number | boolean | null> = {},
  ): Promise<void> {
    await this.ensureSchema()
    await this.execute(`
      INSERT INTO admin_audit_logs (id, action, key_id, key_prefix, metadata_json, created_at)
      VALUES (:id, :action, :keyId, :keyPrefix, :metadataJson, :createdAt)
    `, {
      id: `audit_${randomBytes(12).toString('base64url')}`,
      action,
      keyId: record?.id || null,
      keyPrefix: record?.keyPrefix || null,
      metadataJson: JSON.stringify(metadata),
      createdAt: new Date().toISOString(),
    })
  }

  async recordEmailNotification(
    record: Pick<ApiKeyRecord, 'id' | 'keyPrefix' | 'ownerEmail'>,
    providerMessageId: string,
  ): Promise<ApiKeyEmailNotification> {
    await this.ensureSchema()

    if (!record.ownerEmail || !providerMessageId) {
      throw new Error('Email notification data is incomplete.')
    }

    const now = new Date().toISOString()
    const notification: ApiKeyEmailNotification = {
      id: `email_${randomBytes(12).toString('base64url')}`,
      keyId: record.id,
      keyPrefix: record.keyPrefix,
      ownerEmail: record.ownerEmail,
      providerMessageId,
      status: 'accepted',
      createdAt: now,
      lastEventAt: now,
    }

    await this.execute(`
      INSERT INTO api_key_email_notifications (
        id, key_id, key_prefix, owner_email, provider_message_id, status, created_at, last_event_at
      ) VALUES (
        :id, :keyId, :keyPrefix, :ownerEmail, :providerMessageId, :status, :createdAt, :lastEventAt
      )
    `, {
      id: notification.id,
      keyId: notification.keyId,
      keyPrefix: notification.keyPrefix,
      ownerEmail: notification.ownerEmail,
      providerMessageId: notification.providerMessageId,
      status: notification.status,
      createdAt: notification.createdAt,
      lastEventAt: notification.lastEventAt,
    })

    return notification
  }

  async updateEmailNotificationStatus(
    providerMessageId: string,
    status: Exclude<ApiKeyEmailNotificationStatus, 'accepted'>,
    eventAt: string,
  ): Promise<{ notification: ApiKeyEmailNotification, changed: boolean } | null> {
    await this.ensureSchema()
    const [row] = await this.select(`
      SELECT id, key_id, key_prefix, owner_email, provider_message_id, status, created_at, last_event_at
      FROM api_key_email_notifications
      WHERE provider_message_id = :providerMessageId
      LIMIT 1
    `, { providerMessageId })
    if (!row) return null

    const notification = mapEmailNotification(row)
    const normalizedEventAt = Number.isFinite(Date.parse(eventAt))
      ? new Date(eventAt).toISOString()
      : new Date().toISOString()
    const isOlderOrDuplicate = Date.parse(notification.lastEventAt) > Date.parse(normalizedEventAt)
      || (notification.lastEventAt === normalizedEventAt && notification.status === status)

    if (isOlderOrDuplicate) return { notification, changed: false }

    const updatedNotification = { ...notification, status, lastEventAt: normalizedEventAt }
    await this.execute(`
      UPDATE api_key_email_notifications
      SET status = :status, last_event_at = :lastEventAt
      WHERE provider_message_id = :providerMessageId
    `, {
      status: updatedNotification.status,
      lastEventAt: updatedNotification.lastEventAt,
      providerMessageId: updatedNotification.providerMessageId,
    })

    return { notification: updatedNotification, changed: true }
  }

  async listAuditLogs(limit = 30): Promise<AdminAuditLog[]> {
    await this.ensureSchema()
    const rows = await this.select(`
      SELECT id, action, key_id, key_prefix, metadata_json, created_at
      FROM admin_audit_logs
      ORDER BY created_at DESC
      LIMIT :limit
    `, { limit })
    return rows.map(mapAuditLog)
  }
}

const runtimeStores = new Map<string, ApiKeyStore>()

export function getRuntimeApiKeyStore(): ApiKeyStore | null {
  const config = useRuntimeConfig()
  const hasRemoteConfiguration = Boolean(config.apiKeysDatabaseUrl || config.apiKeysAuthToken)
  const configuration: ApiKeyStoreConfiguration = hasRemoteConfiguration
    ? { databaseUrl: config.apiKeysDatabaseUrl, authToken: config.apiKeysAuthToken }
    : { sqlitePath: config.apiKeysSqlitePath }

  if (hasRemoteConfiguration && !(configuration.databaseUrl && configuration.authToken)) return null
  if (!configuration.sqlitePath && !(configuration.databaseUrl && configuration.authToken)) return null

  const cacheKey = hashApiKey(JSON.stringify(configuration))
  const existing = runtimeStores.get(cacheKey)
  if (existing) return existing

  const store = new ApiKeyStore(configuration)
  runtimeStores.set(cacheKey, store)
  return store
}
