import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendResendEmail } from '../server/utils/api-key-email'
import { missingAlbumFeedbackBodySchema } from '../server/utils/api/validation'
import {
  renderMissingAlbumFeedbackEmail,
  WXEMOTICON_FEEDBACK_RECIPIENT,
} from '../server/utils/wxemoticon-feedback'

const productId = 'com.tencent.xin.emoticon.person.feedback_album'
const validPayload = {
  schemaVersion: 1 as const,
  productId,
  albumName: '缺失专辑',
  expectedMemberCount: 2,
  members: [
    { memberIndex: 1, md5: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    { memberIndex: 2, md5: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
  ],
  clientVersion: '0.1.4',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('wxemoticon missing album feedback', () => {
  it('accepts the client contract and rejects duplicate or malformed members', () => {
    const result = missingAlbumFeedbackBodySchema.safeParse({
      ...validPayload,
      productId: `  ${productId}  `,
      albumName: '  缺失专辑  ',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.productId).toBe(productId)
      expect(result.data.albumName).toBe('缺失专辑')
    }

    expect(missingAlbumFeedbackBodySchema.safeParse({
      ...validPayload,
      members: [validPayload.members[0], validPayload.members[0]],
    }).success).toBe(false)
    expect(missingAlbumFeedbackBodySchema.safeParse({
      ...validPayload,
      productId: 'not-a-wechat-product',
    }).success).toBe(false)
  })

  it('keeps the member limit bounded', () => {
    const members = Array.from({ length: 1_001 }, (_, index) => ({
      memberIndex: index + 1,
      md5: index.toString(16).padStart(32, '0'),
    }))

    expect(missingAlbumFeedbackBodySchema.safeParse({
      ...validPayload,
      members,
    }).success).toBe(false)
  })

  it('renders escaped album metadata and normalized member identifiers', () => {
    const message = renderMissingAlbumFeedbackEmail({
      ...validPayload,
      albumName: '<script>alert("x")</script>',
      productId: `${productId}&unsafe`,
    })

    expect(message.subject).toContain('<script>')
    expect(message.text).toContain('Product ID:')
    expect(message.html).not.toContain('<script>alert')
    expect(message.html).toContain('&lt;script&gt;')
    expect(message.html).toContain('1. aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
  })

  it('sends the rendered message to the fixed feedback recipient', async () => {
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify({ id: 'email_feedback_123' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)
    const message = renderMissingAlbumFeedbackEmail(validPayload)

    await expect(sendResendEmail(
      're_test_key',
      'feedback@stickerhub.lius.me',
      WXEMOTICON_FEEDBACK_RECIPIENT,
      message,
    )).resolves.toBe('email_feedback_123')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer re_test_key',
        }),
      }),
    )
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(String(request.body))).toMatchObject({
      from: 'feedback@stickerhub.lius.me',
      to: 'black.liusheng@gmail.com',
      subject: '[缺失专辑] 缺失专辑',
    })
  })

  it('returns null for provider errors or missing provider IDs', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const message = renderMissingAlbumFeedbackEmail(validPayload)

    fetchMock.mockResolvedValueOnce(new Response('temporary failure', { status: 503 }))
    await expect(sendResendEmail('key', 'from@example.com', WXEMOTICON_FEEDBACK_RECIPIENT, message))
      .resolves.toBeNull()

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
    await expect(sendResendEmail('key', 'from@example.com', WXEMOTICON_FEEDBACK_RECIPIENT, message))
      .resolves.toBeNull()
  })
})
