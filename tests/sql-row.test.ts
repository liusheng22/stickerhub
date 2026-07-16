import { describe, expect, it } from 'vitest'
import { normalizeSqlRow } from '../server/utils/sql-row'

describe('SQL row normalization', () => {
  it('maps Turso compatibility rows by their result columns', () => {
    const row = ['com.stickerhub.demo', 'Demo pack', 24n]

    expect(normalizeSqlRow(row, ['product_id', 'pack_name', 'member_count'])).toEqual({
      product_id: 'com.stickerhub.demo',
      pack_name: 'Demo pack',
      member_count: 24,
    })
  })

  it('keeps local SQLite object rows compatible', () => {
    expect(normalizeSqlRow({ count: 18_052n, name: 'StickerHub' })).toEqual({
      count: 18_052,
      name: 'StickerHub',
    })
  })
})
