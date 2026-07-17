import type { AlbumSummary, StickerMember } from '../types/stickers'

export function albumDescription(packName: string, description: string | null, memberCount: number) {
  return description?.trim()
    || `Browse ${packName}, a chat sticker pack with ${memberCount.toLocaleString('en-US')} stickers.`
}

export function stickerImage(member: Pick<StickerMember, 'thumbUrl' | 'cdnUrl'>) {
  return member.cdnUrl || member.thumbUrl
}

export function stickerDisplayName(member: Pick<StickerMember, 'caption' | 'attachedText' | 'displayName' | 'md5'>) {
  const md5 = member.md5.toLowerCase()

  return [member.caption, member.attachedText, member.displayName]
    .map(value => value?.trim())
    .find(value => value && value.toLowerCase() !== md5 && !/^[a-f0-9]{32}$/i.test(value))
    || null
}

export function albumCardImage(album: Pick<AlbumSummary, 'iconUrl' | 'bannerUrl' | 'thumbUrl'>) {
  return album.iconUrl || album.bannerUrl || album.thumbUrl
}

export function albumHeroImage(album: Pick<AlbumSummary, 'bannerUrl' | 'iconUrl' | 'thumbUrl'>) {
  return album.bannerUrl || album.iconUrl || album.thumbUrl
}
