export interface AlbumSummary {
  productId: string
  packName: string
  description: string | null
  status: number | null
  attr: number | null
  priceText: string | null
  iconUrl: string | null
  thumbUrl: string | null
  bannerUrl: string | null
  versionA: string | null
  versionB: string | null
  detailStatus: string | null
  memberCount: number
}

export interface AlbumDetail extends AlbumSummary {
  price: string | null
  currency: string | null
  useLimit: string | null
  copyright: string | null
  detailReason: string | null
  detailVersion: string | null
}

export interface StickerMember {
  productId: string
  packName: string | null
  memberIndex: number | null
  md5: string
  displayName: string | null
  caption: string | null
  attachedText: string | null
  cdnUrl: string | null
  thumbUrl: string | null
  externUrl: string | null
  externMd5: string | null
  fileSize: string | null
  attr: number | null
}

export interface CursorPage<T> {
  data: T[]
  nextCursor: string | null
}

export interface NumberedPage<T> {
  data: T[]
  page: number
  pageSize: number
  total: number
}

export interface HomePayload {
  albums: AlbumSummary[]
  albumCount: number
  stickerCount: number
  searchTrails: string[]
}

export interface CreatorSummary {
  slug: string
  name: string
  albumCount: number
  stickerCount: number
  coverUrl: string | null
}

export interface CreatorPagePayload {
  creator: CreatorSummary
  albums: AlbumSummary[]
}

export type RelatedAlbumReason = 'creator' | 'series' | 'fallback'

export interface RelatedAlbumGroup {
  reason: RelatedAlbumReason
  label: string
  items: AlbumSummary[]
}

export interface AlbumPagePayload {
  album: AlbumDetail
  members: StickerMember[]
  relatedGroups: RelatedAlbumGroup[]
}
