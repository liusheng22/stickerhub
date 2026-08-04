export interface WxemoticonAlbumPayload {
  schemaVersion: 1
  productId: string
  iconUrl: string | null
  version: string | null
  members: WxemoticonAlbumMember[]
}

export interface WxemoticonAlbumMember {
  memberIndex: number | null
  md5: string
  previewUrl: string | null
  downloadUrl: string | null
}
