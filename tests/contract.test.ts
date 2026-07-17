import { describe, expect, it } from 'vitest'
import { albumListQuerySchema, creatorListQuerySchema, memberListQuerySchema, siteAlbumPageQuerySchema } from '../server/utils/api/validation'
import { openApiDocument } from '../server/utils/openapi'
import {
  creatorLabel,
  creatorSlug,
  deriveSeriesKey,
  isPlatformPublisher,
  normalizeCopyright,
  stableOffset,
} from '../shared/utils/related'
import { albumCardImage, albumDescription, albumHeroImage, stickerDisplayName, stickerImage } from '../shared/utils/text'
import { isBlockedAiCrawler } from '../server/utils/crawlers'

describe('crawler access policy', () => {
  it('blocks autonomous AI crawlers without blocking search engines or browsers', () => {
    expect(isBlockedAiCrawler('Mozilla/5.0 ClaudeBot/1.0')).toBe(true)
    expect(isBlockedAiCrawler('Mozilla/5.0 (compatible; GPTBot/1.2)')).toBe(true)
    expect(isBlockedAiCrawler('Googlebot/2.1')).toBe(false)
    expect(isBlockedAiCrawler('Mozilla/5.0 Chrome/150.0.0.0')).toBe(false)
  })
})

describe('public API query contract', () => {
  it('applies the documented default and maximum list size', () => {
    expect(albumListQuerySchema.parse({}).limit).toBe(24)
    expect(albumListQuerySchema.safeParse({ limit: 51 }).success).toBe(false)
    expect(memberListQuerySchema.safeParse({ limit: 0 }).success).toBe(false)
  })

  it('normalizes search text while preserving integer filters', () => {
    expect(albumListQuerySchema.parse({
      q: '  cat  ',
      status: '4',
      attr: '2096',
      cursor: 'pack-2',
      limit: '10',
    })).toEqual({
      q: 'cat',
      status: 4,
      attr: 2096,
      cursor: 'pack-2',
      limit: 10,
    })
  })

  it('rejects oversized search and non-integer filters', () => {
    expect(albumListQuerySchema.safeParse({ q: 'a'.repeat(81) }).success).toBe(false)
    expect(albumListQuerySchema.safeParse({ status: '4.2' }).success).toBe(false)
    expect(albumListQuerySchema.safeParse({ attr: 'all' }).success).toBe(false)
  })

  it('normalizes creator directory queries with the same limits', () => {
    expect(creatorListQuerySchema.parse({ q: '  Budding Pop  ', limit: '5' })).toEqual({
      q: 'Budding Pop',
      limit: 5,
    })
    expect(creatorListQuerySchema.safeParse({ cursor: 'a'.repeat(513) }).success).toBe(false)
  })

  it('validates numbered pagination for the site catalog separately', () => {
    expect(siteAlbumPageQuerySchema.parse({ page: '2', limit: '24' })).toEqual({ page: 2, limit: 24 })
    expect(siteAlbumPageQuerySchema.parse({}).page).toBe(1)
    expect(siteAlbumPageQuerySchema.safeParse({ page: 0 }).success).toBe(false)
    expect(siteAlbumPageQuerySchema.safeParse({ page: '2.5' }).success).toBe(false)
  })
})

describe('public response contract', () => {
  it('does not advertise private source or encryption fields', () => {
    const serialized = JSON.stringify(openApiDocument.components.schemas)
    expect(serialized).not.toContain('aes_key')
    expect(serialized).not.toContain('encrypt_url')
    expect(serialized).not.toContain('raw_json')
    expect(JSON.stringify(openApiDocument.components.securitySchemes)).toContain('X-API-Key')
    expect(openApiDocument.openapi).toBe('3.1.0')
  })

  it('documents every operation with a unique id, summary, and API key security', () => {
    const operations = Object.values(openApiDocument.paths).map(path => path.get)
    const operationIds = operations.map(operation => operation.operationId)

    expect(operations).toHaveLength(5)
    expect(new Set(operationIds).size).toBe(operations.length)
    expect(operations.every(operation => operation.summary.length > 0)).toBe(true)
    expect(openApiDocument.security).toEqual([{ ApiKey: [] }])
  })
})

describe('catalog text helpers', () => {
  it('uses a readable fallback description', () => {
    expect(albumDescription('Cats', null, 12)).toContain('12 stickers')
    expect(albumDescription('Cats', '  A pack  ', 12)).toBe('A pack')
  })

  it('prefers the original CDN image when selecting a sticker image', () => {
    expect(stickerImage({
      thumbUrl: 'thumb',
      cdnUrl: 'cdn',
      externUrl: 'extern',
    })).toBe('cdn')
  })

  it('uses real sticker text without exposing hash identifiers as names', () => {
    expect(stickerDisplayName({
      md5: '443c547baae0fcaf42c39dd22d977210',
      caption: '  收到  ',
      attachedText: 'OK',
      displayName: '443c547baae0fcaf42c39dd22d977210',
    })).toBe('收到')

    expect(stickerDisplayName({
      md5: '443c547baae0fcaf42c39dd22d977210',
      caption: null,
      attachedText: null,
      displayName: '443c547baae0fcaf42c39dd22d977210',
    })).toBeNull()
  })

  it('uses full-size album artwork before thumbnails', () => {
    const album = { iconUrl: 'icon', bannerUrl: 'banner', thumbUrl: 'thumb' }
    expect(albumCardImage(album)).toBe('icon')
    expect(albumHeroImage(album)).toBe('banner')
  })
})

describe('related album rules', () => {
  it('normalizes creator labels without treating a platform as a creator', () => {
    expect(normalizeCopyright('Copyright © Hamicat')).toBe('hamicat')
    expect(creatorLabel('Copyright © Hamicat')).toBe('Hamicat')
    expect(isPlatformPublisher('Copyright © Tencent')).toBe(true)
    expect(isPlatformPublisher('Copyright © Hamicat')).toBe(false)
  })

  it('creates stable creator slugs and excludes platform publishers', () => {
    expect(creatorSlug('Copyright © Budding Pop')).toBe(creatorSlug('Budding Pop'))
    expect(creatorSlug('Copyright © Budding Pop')).toMatch(/^budding-pop-[a-z0-9]+$/)
    expect(creatorSlug('Copyright © Tencent')).toBe(null)
  })

  it('derives stable character and series keys', () => {
    expect(deriveSeriesKey('哈咪猫 04')).toBe('哈咪猫')
    expect(deriveSeriesKey('小崽子剧场（第二季）')).toBe('小崽子剧场')
    expect(deriveSeriesKey('Sticker Pack 12')).toBe(null)
  })

  it('uses deterministic fallback offsets', () => {
    expect(stableOffset('album-42', 100)).toBe(stableOffset('album-42', 100))
    expect(stableOffset('album-42', 0)).toBe(0)
  })
})
