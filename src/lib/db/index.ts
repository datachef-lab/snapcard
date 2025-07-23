import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import { createPool } from 'mysql2/promise';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { drizzle as drizzlePostgres } from 'drizzle-orm/node-postgres';

export const dbPostgres = drizzlePostgres(process.env.DATABASE_URL!);

// Connection configuration for MySQL
const dbConfig = {
  host: process.env.LEGACY_DB_HOST!,
  port: parseInt(process.env.LEGACY_DB_PORT!, 10),
  user: process.env.LEGACY_DB_USER!,
  password: process.env.LEGACY_DB_PASSWORD!,
  database: process.env.LEGACY_DB_NAME!,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 10000,
  timezone: 'Z',
  
};

// Add type-safe global variables to prevent re-creating pool/db in dev (Next.js hot reload)
declare global {
  // eslint-disable-next-line no-var
  var _pool: Pool | undefined;
  // eslint-disable-next-line no-var
  var _db: MySql2Database | undefined;
}

// Initialize pool and db only once (especially important for development)
const pool: Pool = global._pool ?? createPool(dbConfig);
const db: MySql2Database = global._db ?? drizzle(pool);

// Set global vars (only in development)
if (process.env.NODE_ENV !== 'production') {
  global._pool = pool;
  global._db = db;
}

console.log('✅ MySQL pool and drizzle DB initialized');

export async function query<T extends RowDataPacket[]>(
  sql: string,
  values?: unknown[]
): Promise<T> {
  const connection: PoolConnection = await pool.getConnection();
  try {
    const [results] = await connection.query<T>(sql, values);
    return results;
  } catch (error) {
    console.error('❌ Query execution error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Export pool and db for use in the app
export { pool, db };
