import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

type Messages = Record<string, string | Messages>

const chinese = JSON.parse(readFileSync(new URL('../i18n/locales/zh-CN.json', import.meta.url), 'utf8')) as Messages
const english = JSON.parse(readFileSync(new URL('../i18n/locales/en.json', import.meta.url), 'utf8')) as Messages

function flattenMessages(messages: Messages, prefix = ''): Record<string, string> {
  return Object.fromEntries(Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === 'string'
      ? [[path, value]]
      : Object.entries(flattenMessages(value, path))
  }))
}

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{([^}]+)\}/g)].map((match) => match[1] || '').sort()
}

describe('i18n message contract', () => {
  const zhMessages = flattenMessages(chinese)
  const enMessages = flattenMessages(english)

  it('keeps identical message keys in Chinese and English', () => {
    expect(Object.keys(zhMessages).sort()).toEqual(Object.keys(enMessages).sort())
  })

  it('keeps interpolation parameters aligned between locales', () => {
    for (const key of Object.keys(zhMessages)) {
      expect(placeholders(zhMessages[key] || ''), key).toEqual(placeholders(enMessages[key] || ''))
    }
  })

  it('does not copy catalog-owned names into UI translation files', () => {
    const serialized = JSON.stringify({ chinese, english })
    expect(serialized).not.toContain('哈咪猫')
    expect(serialized).not.toContain('长草颜团子')
    expect(serialized).not.toContain('小崽子剧场')
  })
})
