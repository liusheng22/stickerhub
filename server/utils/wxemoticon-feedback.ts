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
  contactEmail?: string
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
  const notificationEmail = payload.contactEmail?.trim() || '未填写'
  const memberLines = payload.members.length
    ? payload.members.map(member => `${member.memberIndex}. ${member.md5.toLowerCase()}`).join('\n')
    : '未解析到成员标识'
  const text = [
    '有一个微信表情专辑尚未收录到 StickerHub。',
    '',
    `专辑名称：${payload.albumName}`,
    `专辑 ID：${payload.productId}`,
    `专辑成员数量：${payload.expectedMemberCount}`,
    `客户端版本：${payload.clientVersion}`,
    `用户希望补录完成后接收通知的邮箱：${notificationEmail}`,
    '',
    '成员 MD5：',
    memberLines,
  ].join('\n')
  const rows: Array<[string, string]> = [
    ['专辑名称', payload.albumName],
    ['专辑 ID', payload.productId],
    ['专辑成员数量', String(payload.expectedMemberCount)],
    ['客户端版本', payload.clientVersion],
    ['补录完成通知邮箱', notificationEmail],
  ]
  const rowsHtml = rows.map(([label, value]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 0;word-break:break-word">${escapeHtml(value)}</td></tr>`).join('')
  const memberHtml = payload.members.length
    ? payload.members.map(member => `${member.memberIndex}. ${member.md5.toLowerCase()}`).join('<br>')
    : '未解析到成员标识'
  const html = `<!doctype html><html lang="zh-CN"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif;color:#17191c"><h2>${escapeHtml(subject)}</h2><table>${rowsHtml}</table><h3>成员 MD5</h3><p style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;line-height:1.6;word-break:break-all">${memberHtml}</p></body></html>`

  return {
    subject,
    text,
    html,
    ...(payload.contactEmail ? { replyTo: payload.contactEmail } : {}),
  }
}
