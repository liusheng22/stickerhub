import type {
  WxemoticonAlbumMember,
  WxemoticonAlbumPayload,
} from '#shared/types/wxemoticon'
import { selectRows } from '../db'

type SelectRows = typeof selectRows

const md5Pattern = /^[a-f0-9]{32}$/

function asString(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized || null
  }

  return value == null ? null : String(value)
}

function asMemberIndex(value: unknown): number | null {
  const number = typeof value === 'number'
    ? value
    : typeof value === 'bigint'
      ? Number(value)
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN

  return Number.isInteger(number) ? number : null
}

function asPublicUrl(value: unknown): string | null {
  const rawUrl = asString(value)

  if (!rawUrl) {
    return null
  }

  try {
    const url = new URL(rawUrl)

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }

    url.protocol = 'https:'
    return url.toString()
  } catch {
    return null
  }
}

function buildVersion(row: Record<string, unknown>): string | null {
  const parts = [
    ['a', asString(row.version_a)],
    ['b', asString(row.version_b)],
    ['detail', asString(row.detail_version)],
  ] as const

  const available: Array<readonly [string, string]> = []

  for (const [name, value] of parts) {
    if (value) {
      available.push([name, value])
    }
  }

  return available.length > 0
    ? available.map(([name, value]) => `${name}:${encodeURIComponent(value)}`).join('|')
    : null
}

function compareMembers(left: WxemoticonAlbumMember, right: WxemoticonAlbumMember): number {
  if (left.memberIndex === null && right.memberIndex !== null) {
    return 1
  }

  if (left.memberIndex !== null && right.memberIndex === null) {
    return -1
  }

  if (left.memberIndex !== null && right.memberIndex !== null && left.memberIndex !== right.memberIndex) {
    return left.memberIndex - right.memberIndex
  }

  return left.md5.localeCompare(right.md5)
}

export async function getWxemoticonAlbumPayload(
  productId: string,
  query: SelectRows = selectRows,
): Promise<WxemoticonAlbumPayload | null> {
  const rows = await query(
    `
      SELECT
        p.product_id,
        p.icon_url,
        p.banner_url,
        p.thumb_url AS album_thumb_url,
        p.version_a,
        p.version_b,
        p.detail_version,
        COALESCE(am.member_index, m.member_index) AS member_index,
        m.md5,
        m.thumb_url,
        m.cdn_url
      FROM products AS p
      JOIN album_members AS am ON am.product_id = p.product_id
      JOIN members AS m ON m.md5 = am.md5 AND m.product_id = am.product_id
      WHERE p.product_id = :productId
      ORDER BY
        CASE WHEN COALESCE(am.member_index, m.member_index) IS NULL THEN 1 ELSE 0 END,
        COALESCE(am.member_index, m.member_index),
        LOWER(m.md5)
    `,
    { productId },
  )

  const album = rows[0]

  if (!album) {
    return null
  }

  const members = rows.flatMap((row): WxemoticonAlbumMember[] => {
    const md5 = asString(row.md5)?.toLowerCase() ?? ''

    if (!md5Pattern.test(md5)) {
      return []
    }

    const thumbUrl = asPublicUrl(row.thumb_url)
    const cdnUrl = asPublicUrl(row.cdn_url)

    return [{
      memberIndex: asMemberIndex(row.member_index),
      md5,
      previewUrl: thumbUrl ?? cdnUrl,
      downloadUrl: cdnUrl ?? thumbUrl,
    }]
  }).sort(compareMembers)

  return {
    schemaVersion: 1,
    productId: asString(album.product_id) ?? productId,
    iconUrl: asPublicUrl(album.icon_url)
      ?? asPublicUrl(album.banner_url)
      ?? asPublicUrl(album.album_thumb_url),
    version: buildVersion(album),
    members,
  }
}
