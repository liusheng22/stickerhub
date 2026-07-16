import { createClient } from '@tursodatabase/serverless/compat'
import { normalizeSqlRow, type SqlRow } from './sql-row'

type SqlValue = string | number | bigint | boolean | null
export type SqlParams = Record<string, SqlValue>

type LocalStatement = {
  all: (params?: SqlParams) => unknown[]
}

type LocalDatabase = {
  prepare: (sql: string) => LocalStatement
}

let localDatabase: LocalDatabase | undefined
let localDatabasePath: string | undefined

function assertReadOnlyStatement(sql: string) {
  if (!/^\s*(?:SELECT|WITH)\b/i.test(sql)) {
    throw new Error('Only read-only database statements are allowed.')
  }
}

async function getLocalDatabase(path: string): Promise<LocalDatabase> {
  if (localDatabase && localDatabasePath === path) {
    return localDatabase
  }

  const { DatabaseSync } = await import('node:sqlite')
  localDatabase = new DatabaseSync(path, { readOnly: true }) as unknown as LocalDatabase
  localDatabasePath = path
  return localDatabase
}

export async function selectRows(sql: string, params: SqlParams = {}): Promise<SqlRow[]> {
  assertReadOnlyStatement(sql)

  const config = useRuntimeConfig()

  if (config.tursoDatabaseUrl && config.tursoAuthToken) {
    const client = createClient({
      url: config.tursoDatabaseUrl,
      authToken: config.tursoAuthToken,
    })
    try {
      const result = await client.execute({ sql, args: params })
      return result.rows.map(row => normalizeSqlRow(row, result.columns))
    } finally {
      client.close()
    }
  }

  if (config.sqlitePath) {
    const database = await getLocalDatabase(config.sqlitePath)
    const rows = database.prepare(sql).all(params) as Record<string, unknown>[]

    return rows.map(row => normalizeSqlRow(row))
  }

  throw new Error('Sticker catalog database is not configured.')
}

export async function selectOne(sql: string, params: SqlParams = {}): Promise<SqlRow | null> {
  const [row] = await selectRows(sql, params)
  return row ?? null
}
