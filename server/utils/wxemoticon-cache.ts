import type { WxemoticonAlbumPayload } from '#shared/types/wxemoticon'

export const WXEMOTICON_SCHEMA_VERSION = 1
export const WXEMOTICON_CACHE_CONTROL = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000'

export interface WxemoticonResponseCache {
  match: (request: Request) => Promise<Response | undefined>
  put: (request: Request, response: Response) => Promise<void>
}

export interface ResolveWxemoticonAlbumOptions {
  requestUrl: URL
  productId: string
  ifNoneMatch?: string
  cache?: WxemoticonResponseCache
  load: (productId: string) => Promise<WxemoticonAlbumPayload | null>
}

function cacheHeaders(etag: string): Headers {
  return new Headers({
    'Cache-Control': WXEMOTICON_CACHE_CONTROL,
    'Content-Type': 'application/json; charset=utf-8',
    'ETag': etag,
  })
}

function createCacheKey(requestUrl: URL, productId: string): Request {
  const cacheUrl = new URL(requestUrl.origin)
  cacheUrl.pathname = `/api/integrations/wxemoticon/albums/${encodeURIComponent(productId)}`
  cacheUrl.searchParams.set('schemaVersion', String(WXEMOTICON_SCHEMA_VERSION))

  return new Request(cacheUrl, { method: 'GET' })
}

function notModifiedResponse(etag: string): Response {
  return new Response(null, {
    status: 304,
    headers: cacheHeaders(etag),
  })
}

export function matchesEtag(ifNoneMatch: string | undefined, etag: string): boolean {
  if (!ifNoneMatch) {
    return false
  }

  return ifNoneMatch.split(',').some((candidate) => {
    const normalized = candidate.trim().replace(/^W\//, '')
    return normalized === '*' || normalized === etag
  })
}

export async function createWxemoticonEtag(payload: WxemoticonAlbumPayload): Promise<string> {
  const input = new TextEncoder().encode(JSON.stringify(payload))
  const digest = await crypto.subtle.digest('SHA-256', input)
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')

  return `"wxemoticon-v${WXEMOTICON_SCHEMA_VERSION}-${hash}"`
}

export function getCloudflareResponseCache(): WxemoticonResponseCache | undefined {
  const cacheStorage = (globalThis as typeof globalThis & {
    caches?: { default?: WxemoticonResponseCache }
  }).caches

  return cacheStorage?.default
}

export async function resolveWxemoticonAlbumResponse(
  options: ResolveWxemoticonAlbumOptions,
): Promise<Response | null> {
  const cacheKey = createCacheKey(options.requestUrl, options.productId)

  if (options.cache) {
    try {
      const cached = await options.cache.match(cacheKey)

      if (cached) {
        const etag = cached.headers.get('ETag')
        return etag && matchesEtag(options.ifNoneMatch, etag)
          ? notModifiedResponse(etag)
          : cached
      }
    } catch {
      // Cache availability must never make the integration unavailable.
    }
  }

  const payload = await options.load(options.productId)

  if (!payload) {
    return null
  }

  const etag = await createWxemoticonEtag(payload)
  const response = new Response(JSON.stringify(payload), {
    status: 200,
    headers: cacheHeaders(etag),
  })

  if (options.cache) {
    try {
      await options.cache.put(cacheKey, response.clone())
    } catch {
      // The response remains usable when an edge cache write is rejected.
    }
  }

  return matchesEtag(options.ifNoneMatch, etag)
    ? notModifiedResponse(etag)
    : response
}
