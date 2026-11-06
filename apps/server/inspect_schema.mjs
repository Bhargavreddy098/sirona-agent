import pg from 'pg';

async function main() {
  const pool = new pg.Pool({
    database: 'sirona_workspace_p0_test_20261028',
    user: 'postgres',
    password: 'admin123',
    host: '127.0.0.1',
    port: 5432,
  });

  const res = await pool.query(
    `SELECT conname, pg_get_constraintdef(c.oid) as def FROM pg_constraint c WHERE conrelid = 'run_checkpoints'::regclass`
  );
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}

main().catch(console.error);
