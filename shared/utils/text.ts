import type { AlbumSummary, StickerMember } from '../types/stickers'

export function albumDescription(packName: string, description: string | null, memberCount: number) {
  return description?.trim()
    || `Browse ${packName}, a chat sticker pack with ${memberCount.toLocaleString('en-US')} stickers.`
}

export function stickerImage(member: Pick<StickerMember, 'thumbUrl' | 'cdnUrl' | 'externUrl'>) {
  return member.cdnUrl || member.thumbUrl
}

export function albumCardImage(album: Pick<AlbumSummary, 'iconUrl' | 'bannerUrl' | 'thumbUrl'>) {
  return album.iconUrl || album.bannerUrl || album.thumbUrl
}

export function albumHeroImage(album: Pick<AlbumSummary, 'bannerUrl' | 'iconUrl' | 'thumbUrl'>) {
  return album.bannerUrl || album.iconUrl || album.thumbUrl
}
