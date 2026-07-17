import type {
  AlbumDetail,
  AlbumPagePayload,
  AlbumSummary,
  CreatorPagePayload,
  CreatorSummary,
  CursorPage,
  HomePayload,
  NumberedPage,
  RelatedAlbumGroup,
  StickerMember,
} from '#shared/types/stickers'
import {
  creatorLabel,
  creatorSlug,
  deriveSeriesKey,
  isPlatformPublisher,
  normalizeCopyright,
  stableOffset,
} from '#shared/utils/related'
import { selectOne, selectRows } from '../db'

export interface AlbumListOptions {
  q?: string
  status?: number
  attr?: number
  cursor?: string
  limit: number
}

export interface SiteAlbumPageOptions {
  q?: string
  page: number
  limit: number
}

export interface MemberListOptions {
  cursor?: string
  limit: number
}

export interface CreatorListOptions {
  q?: string
  cursor?: string
  limit: number
}

const albumSummaryColumns = `
  product_id, pack_name, description, status, attr, price_text,
  icon_url, thumb_url, banner_url, version_a, version_b,
  detail_status, member_count
`

function albumSummaryColumnsFor(alias: string): string {
  return `
    ${alias}.product_id, ${alias}.pack_name, ${alias}.description,
    ${alias}.status, ${alias}.attr, ${alias}.price_text,
    ${alias}.icon_url, ${alias}.thumb_url, ${alias}.banner_url,
    ${alias}.version_a, ${alias}.version_b, ${alias}.detail_status,
    ${alias}.member_count
  `
}

const safeMemberColumns = `
  product_id, pack_name, member_index, md5, display_name,
  caption, attached_text, cdn_url, thumb_url, extern_url,
  extern_md5, file_size, attr
`

const normalizedCopyrightSql = `
  LOWER(TRIM(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(copyright, 'Copyright ©', ''),
            'Copyright',
            ''
          ),
          '©',
          ''
        ),
        '®',
        ''
      ),
      '™',
      ''
    )
  ))
`

const creatorLabelSql = `
  TRIM(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(copyright, 'Copyright ©', ''),
            'Copyright',
            ''
          ),
          '©',
          ''
        ),
        '®',
        ''
      ),
      '™',
      ''
    )
  )
`

const creatorRollupCte = `
  WITH creator_albums AS (
    SELECT
      a.*,
      ${normalizedCopyrightSql} AS normalized_copyright,
      ${creatorLabelSql} AS creator_name
    FROM app_albums AS a
    INNER JOIN products AS p ON p.product_id = a.product_id
    WHERE p.copyright IS NOT NULL
  ),
  creator_rollup AS (
    SELECT
      normalized_copyright,
      MIN(creator_name) AS creator_name,
      COUNT(*) AS album_count,
      SUM(member_count) AS sticker_count,
      MAX(COALESCE(NULLIF(icon_url, ''), NULLIF(banner_url, ''), NULLIF(thumb_url, ''))) AS cover_url
    FROM creator_albums
    WHERE normalized_copyright != ''
      AND normalized_copyright NOT LIKE '%tencent%'
      AND normalized_copyright NOT LIKE '%wechat%'
      AND normalized_copyright NOT LIKE '%weixin%'
      AND normalized_copyright NOT LIKE '%腾讯%'
      AND normalized_copyright NOT LIKE '%微信%'
    GROUP BY normalized_copyright
    HAVING COUNT(*) >= 2
  )
`

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : value == null ? null : String(value)
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'bigint') {
    return Number(value)
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const number = Number(value)
    return Number.isFinite(number) ? number : null
  }

  return null
}

function requiredString(value: unknown): string {
  return asString(value) ?? ''
}

function requiredNumber(value: unknown): number {
  return asNumber(value) ?? 0
}

function asPublicUrl(value: unknown): string | null {
  const url = asString(value)
  return url?.replace(/^http:\/\//i, 'https://') ?? null
}

function mapAlbumSummary(row: Record<string, unknown>): AlbumSummary {
  return {
    productId: requiredString(row.product_id),
    packName: requiredString(row.pack_name),
    description: asString(row.description),
    status: asNumber(row.status),
    attr: asNumber(row.attr),
    priceText: asString(row.price_text),
    iconUrl: asPublicUrl(row.icon_url),
    thumbUrl: asPublicUrl(row.thumb_url),
    bannerUrl: asPublicUrl(row.banner_url),
    versionA: asString(row.version_a),
    versionB: asString(row.version_b),
    detailStatus: asString(row.detail_status),
    memberCount: requiredNumber(row.member_count),
  }
}

function mapAlbumDetail(row: Record<string, unknown>): AlbumDetail {
  return {
    ...mapAlbumSummary(row),
    price: asString(row.price),
    currency: asString(row.currency),
    useLimit: asString(row.use_limit),
    copyright: asString(row.copyright),
    detailReason: asString(row.detail_reason),
    detailVersion: asString(row.detail_version),
  }
}

function mapMember(row: Record<string, unknown>): StickerMember {
  return {
    productId: requiredString(row.product_id),
    packName: asString(row.pack_name),
    memberIndex: asNumber(row.member_index),
    md5: requiredString(row.md5),
    displayName: asString(row.display_name),
    caption: asString(row.caption),
    attachedText: asString(row.attached_text),
    cdnUrl: asPublicUrl(row.cdn_url),
    thumbUrl: asPublicUrl(row.thumb_url),
    externUrl: asPublicUrl(row.extern_url),
    externMd5: asString(row.extern_md5),
    fileSize: asString(row.file_size),
    attr: asNumber(row.attr),
  }
}

function mapCreatorSummary(row: Record<string, unknown>): CreatorSummary {
  const name = requiredString(row.creator_name)
  return {
    slug: creatorSlug(name) || '',
    name,
    albumCount: requiredNumber(row.album_count),
    stickerCount: requiredNumber(row.sticker_count),
    coverUrl: asPublicUrl(row.cover_url),
  }
}

function toCursorPage<T extends { productId?: string, md5?: string }>(
  rows: T[],
  limit: number,
  key: 'productId' | 'md5',
): CursorPage<T> {
  const hasNextPage = rows.length > limit
  const data = hasNextPage ? rows.slice(0, limit) : rows
  const last = data.at(-1)

  return {
    data,
    nextCursor: hasNextPage ? last?.[key] ?? null : null,
  }
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

export async function listAlbums(options: AlbumListOptions): Promise<CursorPage<AlbumSummary>> {
  const rows = await selectRows(
    `
      SELECT ${albumSummaryColumns}
      FROM app_albums
      WHERE (:cursor IS NULL OR product_id > :cursor)
        AND (:query IS NULL OR pack_name LIKE :query ESCAPE '\\' OR description LIKE :query ESCAPE '\\')
        AND (:status IS NULL OR status = :status)
        AND (:attr IS NULL OR attr = :attr)
      ORDER BY product_id
      LIMIT :limit
    `,
    {
      cursor: options.cursor ?? null,
      query: options.q ? `%${escapeLike(options.q)}%` : null,
      status: options.status ?? null,
      attr: options.attr ?? null,
      limit: options.limit + 1,
    },
  )

  return toCursorPage(rows.map(mapAlbumSummary), options.limit, 'productId')
}

export async function listSiteAlbumPage(options: SiteAlbumPageOptions): Promise<NumberedPage<AlbumSummary>> {
  const query = options.q ? `%${escapeLike(options.q)}%` : null
  const totalRow = await selectOne(
    `
      SELECT COUNT(*) AS count
      FROM app_albums
      WHERE (:query IS NULL OR pack_name LIKE :query ESCAPE '\\' OR description LIKE :query ESCAPE '\\')
    `,
    { query },
  )
  const total = requiredNumber(totalRow?.count)
  const lastPage = Math.max(1, Math.ceil(total / options.limit))
  const page = Math.min(options.page, lastPage)
  const rows = await selectRows(
    `
      SELECT ${albumSummaryColumns}
      FROM app_albums
      WHERE (:query IS NULL OR pack_name LIKE :query ESCAPE '\\' OR description LIKE :query ESCAPE '\\')
      ORDER BY product_id
      LIMIT :limit OFFSET :offset
    `,
    {
      query,
      limit: options.limit,
      offset: (page - 1) * options.limit,
    },
  )

  return {
    data: rows.map(mapAlbumSummary),
    page,
    pageSize: options.limit,
    total,
  }
}

export async function listCreators(options: CreatorListOptions): Promise<CursorPage<CreatorSummary>> {
  const rows = await selectRows(
    `
      ${creatorRollupCte}
      SELECT normalized_copyright, creator_name, album_count, sticker_count, cover_url
      FROM creator_rollup
      WHERE (:cursor IS NULL OR normalized_copyright > :cursor)
        AND (:query IS NULL OR normalized_copyright LIKE :query ESCAPE '\\')
      ORDER BY normalized_copyright
      LIMIT :limit
    `,
    {
      cursor: options.cursor ?? null,
      query: options.q ? `%${escapeLike(options.q.toLocaleLowerCase())}%` : null,
      limit: options.limit + 1,
    },
  )

  const hasNextPage = rows.length > options.limit
  const pageRows = hasNextPage ? rows.slice(0, options.limit) : rows

  return {
    data: pageRows.map(mapCreatorSummary),
    nextCursor: hasNextPage ? asString(pageRows.at(-1)?.normalized_copyright) : null,
  }
}

export async function getCreatorPagePayload(slug: string): Promise<CreatorPagePayload | null> {
  const creatorRows = await selectRows(
    `
      ${creatorRollupCte}
      SELECT normalized_copyright, creator_name, album_count, sticker_count, cover_url
      FROM creator_rollup
      ORDER BY normalized_copyright
    `,
  )
  const creatorRow = creatorRows.find((row) => creatorSlug(asString(row.creator_name)) === slug)

  if (!creatorRow) {
    return null
  }

  const normalizedCreator = requiredString(creatorRow.normalized_copyright)
  const albumRows = await selectRows(
    `
      SELECT ${albumSummaryColumnsFor('a')}
      FROM app_albums AS a
      INNER JOIN products AS p ON p.product_id = a.product_id
      WHERE ${normalizedCopyrightSql} = :copyright
      ORDER BY a.member_count DESC, a.product_id
    `,
    { copyright: normalizedCreator },
  )

  return {
    creator: mapCreatorSummary(creatorRow),
    albums: albumRows.map(mapAlbumSummary),
  }
}

export async function getAlbumByProductId(productId: string): Promise<AlbumDetail | null> {
  const row = await selectOne(
    `
      SELECT
        p.product_id, p.pack_name, p.description, p.status, p.attr,
        p.price_text, p.icon_url, p.thumb_url, p.banner_url,
        p.version_a, p.version_b, p.detail_status,
        p.price, p.currency, p.use_limit, p.copyright,
        p.detail_reason, p.detail_version,
        COUNT(am.md5) AS member_count
      FROM products AS p
      LEFT JOIN album_members AS am ON am.product_id = p.product_id
      WHERE p.product_id = :productId
      GROUP BY p.product_id
    `,
    { productId },
  )

  return row ? mapAlbumDetail(row) : null
}

export async function listAlbumMembers(
  productId: string,
  options: MemberListOptions,
): Promise<CursorPage<StickerMember>> {
  const rows = await selectRows(
    `
      SELECT ${safeMemberColumns}
      FROM app_album_members
      WHERE product_id = :productId
        AND (:cursor IS NULL OR md5 > :cursor)
      ORDER BY md5
      LIMIT :limit
    `,
    {
      productId,
      cursor: options.cursor ?? null,
      limit: options.limit + 1,
    },
  )

  return toCursorPage(rows.map(mapMember), options.limit, 'md5')
}

export async function listAlbumMembersInPackOrder(productId: string): Promise<StickerMember[]> {
  const rows = await selectRows(
    `
      SELECT ${safeMemberColumns}
      FROM app_album_members
      WHERE product_id = :productId
      ORDER BY
        CASE WHEN member_index IS NULL THEN 1 ELSE 0 END,
        member_index,
        md5
    `,
    { productId },
  )

  return rows.map(mapMember)
}

export async function getMemberByMd5(md5: string): Promise<StickerMember | null> {
  const row = await selectOne(
    `
      SELECT
        m.product_id, p.pack_name, m.member_index, m.md5,
        COALESCE(NULLIF(m.caption, ''), NULLIF(m.attached_text, ''), m.md5) AS display_name,
        m.caption, m.attached_text, m.cdn_url, m.thumb_url,
        m.extern_url, m.extern_md5, m.file_size, m.attr
      FROM members AS m
      LEFT JOIN products AS p ON p.product_id = m.product_id
      WHERE m.md5 = :md5
    `,
    { md5 },
  )

  return row ? mapMember(row) : null
}

export async function getHomePayload(): Promise<HomePayload> {
  const [albums, albumTotals, stickerTotals] = await Promise.all([
    selectRows(
      `
        SELECT ${albumSummaryColumns}
        FROM app_albums
        ORDER BY member_count DESC, product_id
        LIMIT 12
      `,
    ),
    selectOne('SELECT COUNT(*) AS count FROM app_albums'),
    selectOne('SELECT COUNT(*) AS count FROM app_album_members'),
  ])

  const mappedAlbums = albums.map(mapAlbumSummary)

  return {
    albums: mappedAlbums,
    albumCount: requiredNumber(albumTotals?.count),
    stickerCount: requiredNumber(stickerTotals?.count),
    searchTrails: mappedAlbums
      .map((album) => album.packName.trim())
      .filter((name, index, names) => name.length > 0 && names.indexOf(name) === index)
      .slice(0, 6),
  }
}

async function getRelatedAlbumGroups(album: AlbumDetail): Promise<RelatedAlbumGroup[]> {
  const groups: RelatedAlbumGroup[] = []
  const selected = new Set<string>([album.productId])
  const creator = creatorLabel(album.copyright)
  const normalizedCreator = normalizeCopyright(album.copyright)

  if (creator && normalizedCreator && !isPlatformPublisher(album.copyright)) {
    const creatorRows = await selectRows(
      `
        SELECT ${albumSummaryColumnsFor('a')}
        FROM app_albums AS a
        INNER JOIN products AS p ON p.product_id = a.product_id
        WHERE a.product_id != :productId
          AND ${normalizedCopyrightSql} = :copyright
        ORDER BY
          CASE WHEN a.status = :status THEN 0 ELSE 1 END,
          CASE WHEN a.attr = :attr THEN 0 ELSE 1 END,
          a.member_count DESC,
          a.product_id
        LIMIT 8
      `,
      {
        productId: album.productId,
        copyright: normalizedCreator,
        status: album.status,
        attr: album.attr,
      },
    )

    const items = creatorRows
      .map(mapAlbumSummary)
      .filter((candidate) => {
        if (selected.has(candidate.productId)) {
          return false
        }
        selected.add(candidate.productId)
        return true
      })
      .slice(0, 4)

    if (items.length) {
      groups.push({ reason: 'creator', label: `More from ${creator}`, items })
    }
  }

  const series = deriveSeriesKey(album.packName)

  if (series) {
    const seriesRows = await selectRows(
      `
        SELECT ${albumSummaryColumns}
        FROM app_albums
        WHERE product_id != :productId
          AND pack_name LIKE :series ESCAPE '\\'
        ORDER BY
          CASE WHEN status = :status THEN 0 ELSE 1 END,
          CASE WHEN attr = :attr THEN 0 ELSE 1 END,
          member_count DESC,
          product_id
        LIMIT 12
      `,
      {
        productId: album.productId,
        series: `%${escapeLike(series)}%`,
        status: album.status,
        attr: album.attr,
      },
    )

    const items = seriesRows
      .map(mapAlbumSummary)
      .filter((candidate) => {
        if (selected.has(candidate.productId)) {
          return false
        }
        selected.add(candidate.productId)
        return true
      })
      .slice(0, 4)

    if (items.length) {
      groups.push({ reason: 'series', label: `More in the ${series} series`, items })
    }
  }

  const totalRow = await selectOne('SELECT COUNT(*) AS count FROM app_albums')
  const total = requiredNumber(totalRow?.count)
  const fallbackPoolSize = Math.min(total, 240)
  const windowSize = Math.min(20, Math.max(fallbackPoolSize, 1))
  const offset = stableOffset(album.productId, Math.max(fallbackPoolSize - windowSize + 1, 1))
  const fallbackRows = await selectRows(
    `
      SELECT ${albumSummaryColumns}
      FROM app_albums
      ORDER BY member_count DESC, product_id
      LIMIT :limit OFFSET :offset
    `,
    { limit: windowSize, offset },
  )

  let candidates = fallbackRows.map(mapAlbumSummary)
  if (candidates.length < 4 || candidates.filter(candidate => !selected.has(candidate.productId)).length < 4) {
    candidates = candidates.concat(
      (await selectRows(
        `
          SELECT ${albumSummaryColumns}
          FROM app_albums
          ORDER BY member_count DESC, product_id
          LIMIT :limit
        `,
        { limit: windowSize },
      )).map(mapAlbumSummary),
    )
  }

  const fallbackItems = candidates
    .filter((candidate) => {
      if (selected.has(candidate.productId)) {
        return false
      }
      selected.add(candidate.productId)
      return true
    })
    .slice(0, 4)

  if (fallbackItems.length) {
    groups.push({ reason: 'fallback', label: 'More to explore', items: fallbackItems })
  }

  return groups
}

export async function getAlbumPagePayload(productId: string): Promise<AlbumPagePayload | null> {
  const album = await getAlbumByProductId(productId)

  if (!album) {
    return null
  }

  const [members, relatedGroups] = await Promise.all([
    listAlbumMembersInPackOrder(productId),
    getRelatedAlbumGroups(album),
  ])

  return {
    album,
    members,
    relatedGroups,
  }
}

export async function listSitemapAlbums(): Promise<Array<{ productId: string }>> {
  const rows = await selectRows(
    'SELECT product_id FROM app_albums ORDER BY product_id',
  )

  return rows.map((row) => ({ productId: requiredString(row.product_id) }))
}

export async function listSitemapCreators(): Promise<Array<{ slug: string }>> {
  const rows = await selectRows(
    `
      ${creatorRollupCte}
      SELECT creator_name
      FROM creator_rollup
      ORDER BY normalized_copyright
    `,
  )

  return rows
    .map((row) => creatorSlug(asString(row.creator_name)))
    .filter((slug): slug is string => Boolean(slug))
    .map((slug) => ({ slug }))
}
