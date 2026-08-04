import type { IntegrationAccessEmail } from './api-key-email'

export const WXEMOTICON_FEEDBACK_RECIPIENT = 'black.liusheng@gmail.com'

export interface MissingAlbumFeedbackMessage {
  schemaVersion: 1
  productId: string
  albumName: string
  expectedMemberCount: number
  members: Array<{
    memberIndex: number
    md5: string
  }>
  clientVersion: string
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] || character)
}

export function renderMissingAlbumFeedbackEmail(
  payload: MissingAlbumFeedbackMessage,
): IntegrationAccessEmail {
  const subject = `[缺失专辑] ${payload.albumName}`
  const memberLines = payload.members.length
    ? payload.members.map(member => `${member.memberIndex}. ${member.md5.toLowerCase()}`).join('\n')
    : '(no member identifiers)'
  const text = [
    'A WeChat sticker album is missing from StickerHub.',
    '',
    `Album name: ${payload.albumName}`,
    `Product ID: ${payload.productId}`,
    `Expected members: ${payload.expectedMemberCount}`,
    `Client version: ${payload.clientVersion}`,
    '',
    'Members:',
    memberLines,
  ].join('\n')
  const rows: Array<[string, string]> = [
    ['Album name', payload.albumName],
    ['Product ID', payload.productId],
    ['Expected members', String(payload.expectedMemberCount)],
    ['Client version', payload.clientVersion],
  ]
  const rowsHtml = rows.map(([label, value]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 0;word-break:break-word">${escapeHtml(value)}</td></tr>`).join('')
  const memberHtml = payload.members.length
    ? payload.members.map(member => `${member.memberIndex}. ${member.md5.toLowerCase()}`).join('<br>')
    : '(no member identifiers)'
  const html = `<!doctype html><html lang="en"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#17191c"><h2>${escapeHtml(subject)}</h2><table>${rowsHtml}</table><h3>Members</h3><p style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;line-height:1.6">${memberHtml}</p></body></html>`

  return { subject, text, html }
}
