import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);
export default sql;

/** Run a raw SQL string — used for schema DDL. */
export function rawQuery(query: string): Promise<unknown[]> {
  return sql.query(query);
}
