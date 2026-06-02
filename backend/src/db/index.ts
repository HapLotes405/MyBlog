import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../config';

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/** Test connection and initialize */
export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('[DB] PostgreSQL connected.');
  } finally {
    client.release();
  }
}

/** Run a single query against a dedicated client (for migrations) */
export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

/** Query multiple rows */
export async function queryAll(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  const result: QueryResult = await pool.query(sql, params);
  return result.rows;
}

/** Query a single row or undefined */
export async function queryOne(sql: string, params: unknown[] = []): Promise<Record<string, unknown> | undefined> {
  const result = await pool.query(sql, params);
  return result.rows[0] as Record<string, unknown> | undefined;
}

/**
 * Execute INSERT/UPDATE/DELETE.
 * For INSERT with RETURNING, rows[0] contains the returned row.
 */
export async function execute(
  sql: string,
  params: unknown[] = []
): Promise<{ rowCount: number; rows: Record<string, unknown>[] }> {
  const result = await pool.query(sql, params);
  return { rowCount: result.rowCount ?? 0, rows: result.rows };
}

/** Close pool gracefully */
export async function closeDb(): Promise<void> {
  await pool.end();
  console.log('[DB] Pool closed.');
}
