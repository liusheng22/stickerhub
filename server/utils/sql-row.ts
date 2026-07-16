export type SqlRow = Record<string, unknown>

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return Number.isSafeInteger(Number(value)) ? Number(value) : value.toString()
  }

  return value
}

export function normalizeSqlRow(row: unknown, columns: readonly string[] = []): SqlRow {
  if (Array.isArray(row)) {
    const names = columns.length > 0
      ? columns
      : Object.getOwnPropertyNames(row).filter(name => name !== 'length' && !/^\d+$/.test(name))

    return Object.fromEntries(
      names.map((name, index) => [name, normalizeValue(columns.length > 0 ? row[index] : row[name as keyof typeof row])]),
    )
  }

  if (!row || typeof row !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, normalizeValue(value)]),
  )
}
