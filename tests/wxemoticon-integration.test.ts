import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it, vi } from 'vitest'
import { wxemoticonProductIdSchema } from '../server/utils/api/validation'
import { getWxemoticonAlbumPayload } from '../server/utils/queries/wxemoticon'
import {
  createWxemoticonEtag,
  resolveWxemoticonAlbumResponse,
  WXEMOTICON_CACHE_CONTROL,
  type WxemoticonResponseCache,
} from '../server/utils/wxemoticon-cache'
import type { WxemoticonAlbumPayload } from '../shared/types/wxemoticon'

const productId = 'com.tencent.xin.emoticon.person.stiker_1769162174748b9dff62c8e6d0'
const requestUrl = new URL(`https://stickerhub.test/api/integrations/wxemoticon/albums/${productId}`)

function albumRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    product_id: productId,
    icon_url: 'http://cdn.test/album-icon.png',
    banner_url: 'http://cdn.test/album-banner.png',
    album_thumb_url: 'http://cdn.test/album-thumb.png',
    version_a: '12',
    version_b: '34',
    detail_version: '56',
    member_index: 1,
    md5: '84FCA82941E003784F71B99100F672EA',
    thumb_url: 'http://cdn.test/member-thumb.png',
    cdn_url: 'http://cdn.test/member.gif',
    ...overrides,
  }
}

function payload(): WxemoticonAlbumPayload {
  return {
    schemaVersion: 1,
    productId,
    iconUrl: 'https://cdn.test/album-icon.png',
    version: 'a:12|b:34|detail:56',
    members: [{
      memberIndex: 1,
      md5: '84fca82941e003784f71b99100f672ea',
      previewUrl: 'https://cdn.test/member-thumb.png',
      downloadUrl: 'https://cdn.test/member.gif',
    }],
  }
}

describe('wxemoticon catalog query', () => {
  it('executes the production query against a minimal SQLite fixture', async () => {
    const database = new DatabaseSync(':memory:')

    try {
      database.exec(`
        CREATE TABLE products (
          product_id TEXT PRIMARY KEY,
          icon_url TEXT,
          banner_url TEXT,
          thumb_url TEXT,
          version_a TEXT,
          version_b TEXT,
          detail_version TEXT
        );
        CREATE TABLE album_members (
          product_id TEXT,
          md5 TEXT,
          member_index INTEGER,
          PRIMARY KEY (product_id, md5)
        );
        CREATE TABLE members (
          md5 TEXT PRIMARY KEY,
          product_id TEXT,
          member_index INTEGER,
          thumb_url TEXT,
          cdn_url TEXT
        );
      `)
      database.prepare('INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        productId,
        'http://cdn.test/icon.png',
        null,
        null,
        '1',
        null,
        null,
      )
      database.prepare('INSERT INTO album_members VALUES (?, ?, ?)').run(
        productId,
        '84fca82941e003784f71b99100f672ea',
        1,
      )
      database.prepare('INSERT INTO members VALUES (?, ?, ?, ?, ?)').run(
        '84fca82941e003784f71b99100f672ea',
        productId,
        1,
        'http://cdn.test/thumb.png',
        'http://cdn.test/member.gif',
      )

      const result = await getWxemoticonAlbumPayload(productId, async (sql, params = {}) => {
        return database.prepare(sql).all(params) as Record<string, unknown>[]
      })

      expect(result?.members).toEqual([expect.objectContaining({
        memberIndex: 1,
        md5: '84fca82941e003784f71b99100f672ea',
        previewUrl: 'https://cdn.test/thumb.png',
        downloadUrl: 'https://cdn.test/member.gif',
      })])
    } finally {
      database.close()
    }
  })

  it('uses one bound read query and returns normalized, ordered safe fields', async () => {
    const query = vi.fn(async () => [
      albumRow({ member_index: null, md5: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB' }),
      albumRow({ member_index: 2, md5: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }),
      albumRow({ member_index: 1 }),
    ])

    const result = await getWxemoticonAlbumPayload(productId, query)

    expect(query).toHaveBeenCalledTimes(1)
    const [sql, params] = query.mock.calls[0]!
    expect(sql).toContain('WHERE p.product_id = :productId')
    expect(sql).not.toContain(productId)
    expect(sql).not.toMatch(/SELECT\s+\*/i)
    expect(sql).not.toMatch(/aes_key|encrypt_url/i)
    expect(params).toEqual({ productId })

    expect(result).toMatchObject({
      schemaVersion: 1,
      productId,
      iconUrl: 'https://cdn.test/album-icon.png',
      version: 'a:12|b:34|detail:56',
    })
    expect(result?.members.map(member => [member.memberIndex, member.md5])).toEqual([
      [1, '84fca82941e003784f71b99100f672ea'],
      [2, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
      [null, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
    ])
    expect(JSON.stringify(result)).not.toMatch(/aes_key|encrypt_url/i)
  })

  it('returns every member without the public API 50-item pagination limit', async () => {
    const rows = Array.from({ length: 75 }, (_, index) => albumRow({
      member_index: index + 1,
      md5: index.toString(16).padStart(32, '0'),
    }))

    const result = await getWxemoticonAlbumPayload(productId, async () => rows)

    expect(result?.members).toHaveLength(75)
    expect(result?.members.at(-1)?.memberIndex).toBe(75)
  })

  it('applies member and album URL fallbacks while retaining members without URLs', async () => {
    const result = await getWxemoticonAlbumPayload(productId, async () => [
      albumRow({
        icon_url: null,
        banner_url: null,
        member_index: 1,
        cdn_url: null,
        thumb_url: 'http://cdn.test/only-thumb.png',
      }),
      albumRow({
        member_index: 2,
        md5: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
        cdn_url: 'http://cdn.test/only-cdn.gif',
        thumb_url: null,
      }),
      albumRow({
        member_index: 3,
        md5: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
        cdn_url: null,
        thumb_url: null,
      }),
    ])

    expect(result?.iconUrl).toBe('https://cdn.test/album-thumb.png')
    expect(result?.members).toEqual([
      expect.objectContaining({
        previewUrl: 'https://cdn.test/only-thumb.png',
        downloadUrl: 'https://cdn.test/only-thumb.png',
      }),
      expect.objectContaining({
        previewUrl: 'https://cdn.test/only-cdn.gif',
        downloadUrl: 'https://cdn.test/only-cdn.gif',
      }),
      expect.objectContaining({ previewUrl: null, downloadUrl: null }),
    ])
  })

  it('returns null for an unavailable album', async () => {
    const query = vi.fn(async () => [])

    await expect(getWxemoticonAlbumPayload(productId, query)).resolves.toBeNull()
    expect(query).toHaveBeenCalledTimes(1)
  })
})

describe('wxemoticon request validation', () => {
  it('accepts a canonical WeChat product ID and trims it', () => {
    expect(wxemoticonProductIdSchema.parse(`  ${productId}  `)).toBe(productId)
  })

  it('rejects unrelated, malformed, and oversized IDs', () => {
    expect(wxemoticonProductIdSchema.safeParse('another-product').success).toBe(false)
    expect(wxemoticonProductIdSchema.safeParse('com.tencent.xin.emoticon.bad/id').success).toBe(false)
    expect(wxemoticonProductIdSchema.safeParse(`com.tencent.xin.emoticon.${'a'.repeat(513)}`).success).toBe(false)
  })
})

describe('wxemoticon edge response cache', () => {
  it('skips the loader completely on a cache hit', async () => {
    const cachedPayload = payload()
    const etag = await createWxemoticonEtag(cachedPayload)
    const cache: WxemoticonResponseCache = {
      match: vi.fn(async () => new Response(JSON.stringify(cachedPayload), {
        headers: {
          'Cache-Control': WXEMOTICON_CACHE_CONTROL,
          'Content-Type': 'application/json; charset=utf-8',
          ETag: etag,
        },
      })),
      put: vi.fn(async () => undefined),
    }
    const load = vi.fn(async () => cachedPayload)

    const response = await resolveWxemoticonAlbumResponse({
      requestUrl,
      productId,
      cache,
      load,
    })

    expect(load).not.toHaveBeenCalled()
    expect(cache.put).not.toHaveBeenCalled()
    expect(await response?.json()).toEqual(cachedPayload)
  })

  it('loads once and writes the complete response on a cache miss', async () => {
    const albumPayload = payload()
    const cache: WxemoticonResponseCache = {
      match: vi.fn(async () => undefined),
      put: vi.fn(async () => undefined),
    }
    const load = vi.fn(async () => albumPayload)

    const response = await resolveWxemoticonAlbumResponse({
      requestUrl,
      productId,
      cache,
      load,
    })

    expect(load).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledWith(productId)
    expect(cache.put).toHaveBeenCalledTimes(1)
    const [cacheKey, cachedResponse] = vi.mocked(cache.put).mock.calls[0]!
    expect(new URL(cacheKey.url).pathname).toBe(`/api/integrations/wxemoticon/albums/${productId}`)
    expect(new URL(cacheKey.url).searchParams.get('schemaVersion')).toBe('1')
    expect(cachedResponse.headers.get('Cache-Control')).toBe(WXEMOTICON_CACHE_CONTROL)
    expect(response?.headers.get('ETag')).toMatch(/^"wxemoticon-v1-[a-f0-9]{64}"$/)
  })

  it('returns 304 for a matching ETag without calling the loader', async () => {
    const albumPayload = payload()
    const etag = await createWxemoticonEtag(albumPayload)
    const cache: WxemoticonResponseCache = {
      match: vi.fn(async () => new Response(JSON.stringify(albumPayload), {
        headers: { ETag: etag, 'Cache-Control': WXEMOTICON_CACHE_CONTROL },
      })),
      put: vi.fn(async () => undefined),
    }
    const load = vi.fn(async () => albumPayload)

    const response = await resolveWxemoticonAlbumResponse({
      requestUrl,
      productId,
      ifNoneMatch: `W/${etag}`,
      cache,
      load,
    })

    expect(response?.status).toBe(304)
    expect(response?.headers.get('ETag')).toBe(etag)
    expect(load).not.toHaveBeenCalled()
  })

  it('keeps ETags stable for identical ordered payloads', async () => {
    expect(await createWxemoticonEtag(payload())).toBe(await createWxemoticonEtag(payload()))

    const changed = payload()
    changed.members[0] = { ...changed.members[0]!, downloadUrl: 'https://cdn.test/changed.gif' }
    expect(await createWxemoticonEtag(changed)).not.toBe(await createWxemoticonEtag(payload()))
  })

  it('enables Cloudflare tiered Worker caching in deployment configuration', () => {
    const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'))

    expect(config.cache).toEqual({ enabled: true })
    expect(config.compatibility_date.localeCompare('2026-08-03')).toBeGreaterThanOrEqual(0)
  })
})
