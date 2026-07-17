import type { H3Event } from 'h3'
import { z } from 'zod'
import { API_KEY_SCOPES, type ApiKeyScope } from '../api-keys'
import { throwApiError } from './errors'

const limitSchema = z.preprocess(
  (value) => value === undefined ? 24 : typeof value === 'string' ? Number(value) : value,
  z.number().int().min(1).max(50),
)

const optionalIntegerSchema = z.preprocess(
  (value) => {
    if (value === undefined) {
      return undefined
    }

    if (typeof value === 'string' && /^-?\d+$/.test(value)) {
      return Number(value)
    }

    return value
  },
  z.number().int().optional(),
)

const optionalSearchSchema = z.preprocess(
  (value) => typeof value === 'string' ? value.trim() || undefined : value,
  z.string().max(80).optional(),
)

const optionalCursorSchema = z.preprocess(
  (value) => typeof value === 'string' ? value.trim() || undefined : value,
  z.string().min(1).max(512).optional(),
)

const pageSchema = z.preprocess(
  (value) => value === undefined ? 1 : typeof value === 'string' ? Number(value) : value,
  z.number().int().min(1).max(10_000),
)

export const albumListQuerySchema = z.object({
  q: optionalSearchSchema,
  status: optionalIntegerSchema,
  attr: optionalIntegerSchema,
  cursor: optionalCursorSchema,
  limit: limitSchema,
})

export const siteAlbumPageQuerySchema = z.object({
  q: optionalSearchSchema,
  page: pageSchema,
  limit: limitSchema,
})

export const memberListQuerySchema = z.object({
  cursor: optionalCursorSchema,
  limit: limitSchema,
})

export const creatorListQuerySchema = z.object({
  q: optionalSearchSchema,
  cursor: optionalCursorSchema,
  limit: limitSchema,
})

const productIdSchema = z.string().trim().min(1).max(512)
const creatorSlugSchema = z.string().trim().min(1).max(160)
const md5Schema = z.string().regex(/^[a-fA-F0-9]{32}$/, 'md5 must be a 32-character hexadecimal value')
const apiKeyIdSchema = z.string().regex(/^key_[A-Za-z0-9_-]{16}$/, 'API key ID is invalid')
const apiKeyScopeSchema = z.enum(API_KEY_SCOPES)
const apiKeyCreateBodySchema = z.object({
  label: z.string().trim().min(1).max(120),
  ownerEmail: z.string().trim().email().max(320).optional(),
  scopes: z.array(apiKeyScopeSchema).min(1).max(API_KEY_SCOPES.length).default(['catalog:read']),
  rateLimitPerMinute: z.number().int().min(1).max(10_000).default(60),
  expiresAt: z.string()
    .trim()
    .refine(value => Number.isFinite(Date.parse(value)), 'Expiry must be an ISO date-time')
    .refine(value => Date.parse(value) > Date.now(), 'Expiry must be in the future')
    .optional(),
  notifyOwner: z.boolean().default(false),
}).refine(value => !value.notifyOwner || Boolean(value.ownerEmail), {
  path: ['ownerEmail'],
  message: 'Owner email is required when sending a notification',
})
const apiKeyNotificationBodySchema = z.object({
  notifyOwner: z.boolean().default(false),
}).default({ notifyOwner: false })
const adminLoginBodySchema = z.object({
  adminKey: z.string().min(32).max(512),
})

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)

  if (!result.success) {
    const issue = result.error.issues[0]
    throwApiError(400, 'invalid_request', issue?.message || 'The request parameters are invalid.')
  }

  return result.data
}

export function readAlbumListQuery(event: H3Event) {
  return parseOrThrow(albumListQuerySchema, getQuery(event))
}

export function readSiteAlbumPageQuery(event: H3Event) {
  return parseOrThrow(siteAlbumPageQuerySchema, getQuery(event))
}

export function readMemberListQuery(event: H3Event) {
  return parseOrThrow(memberListQuerySchema, getQuery(event))
}

export function readCreatorListQuery(event: H3Event) {
  return parseOrThrow(creatorListQuerySchema, getQuery(event))
}

export function readProductId(event: H3Event) {
  return parseOrThrow(productIdSchema, getRouterParam(event, 'productId'))
}

export function readCreatorSlug(event: H3Event) {
  return parseOrThrow(creatorSlugSchema, getRouterParam(event, 'creatorSlug'))
}

export function readMd5(event: H3Event) {
  return parseOrThrow(md5Schema, getRouterParam(event, 'md5'))
}

export function readApiKeyId(event: H3Event) {
  return parseOrThrow(apiKeyIdSchema, getRouterParam(event, 'keyId'))
}

export async function readApiKeyCreateBody(event: H3Event) {
  return parseOrThrow(apiKeyCreateBodySchema, await readBody(event)) as {
    label: string
    ownerEmail?: string
    scopes: ApiKeyScope[]
    rateLimitPerMinute: number
    expiresAt?: string
    notifyOwner: boolean
  }
}

export async function readApiKeyNotificationBody(event: H3Event) {
  return parseOrThrow(apiKeyNotificationBodySchema, await readBody(event))
}

export async function readAdminLoginBody(event: H3Event) {
  return parseOrThrow(adminLoginBodySchema, await readBody(event))
}
