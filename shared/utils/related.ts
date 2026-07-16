const publisherFragments = [
  'tencent',
  'wechat',
  'weixin',
  '微信',
  '腾讯',
]

const ignoredSeriesWords = new Set([
  'sticker',
  'stickers',
  'emoji',
  'emoticon',
  'pack',
  '表情',
  '表情包',
  '贴纸',
  '系列',
  '合集',
])

export function normalizeCopyright(value: string | null): string | null {
  if (!value) {
    return null
  }

  const normalized = value
    .normalize('NFKC')
    .replace(/copyright/gi, '')
    .replace(/[©®™]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase()

  return normalized || null
}

export function creatorLabel(value: string | null): string | null {
  if (!value) {
    return null
  }

  const label = value
    .normalize('NFKC')
    .replace(/copyright/gi, '')
    .replace(/[©®™]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return label || null
}

function stableHash(seed: string): number {
  let hash = 2166136261
  for (const character of seed) {
    hash ^= character.codePointAt(0) || 0
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

export function creatorSlug(value: string | null): string | null {
  const normalized = normalizeCopyright(value)
  const label = creatorLabel(value)

  if (!normalized || !label || isPlatformPublisher(value)) {
    return null
  }

  const base = label
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'creator'

  return `${base}-${stableHash(normalized).toString(36)}`
}

export function isPlatformPublisher(value: string | null): boolean {
  const normalized = normalizeCopyright(value)
  return normalized
    ? publisherFragments.some((fragment) => normalized.includes(fragment))
    : false
}

export function deriveSeriesKey(packName: string): string | null {
  const normalized = packName
    .normalize('NFKC')
    .replace(/[【】\[\]（）()《》<>]/g, ' ')
    .replace(/[·•:：|｜/_-]+/g, ' ')
    .replace(/\b(?:vol(?:ume)?|season|part|episode|ep)\.?\s*\d+\b/gi, ' ')
    .replace(/\d+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) {
    return null
  }

  const firstPhrase = normalized.split(' ')[0]?.trim() || ''
  const latinWords = normalized
    .split(' ')
    .filter((word) => word.length >= 3 && !ignoredSeriesWords.has(word.toLocaleLowerCase()))

  if (/^[\p{Script=Han}]+$/u.test(firstPhrase)) {
    return firstPhrase.length >= 3 ? firstPhrase.slice(0, Math.min(6, firstPhrase.length)) : null
  }

  const latinKey = latinWords.slice(0, 2).join(' ')
  return latinKey.length >= 3 ? latinKey : null
}

export function stableOffset(seed: string, total: number): number {
  if (total <= 0) {
    return 0
  }

  return stableHash(seed) % total
}
