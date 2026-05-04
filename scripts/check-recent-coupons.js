const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m && !m[1].startsWith('#')) process.env[m[1]] = m[2];
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const c = await pool.connect();
  try {
    const r = await c.query(
      `SELECT code, type, "createdBy", "activationTime"
       FROM "promotions"."offer"
       WHERE code LIKE 'TESTLOOKUP%' OR "createdBy" IS NOT NULL
       ORDER BY "activationTime" DESC LIMIT 5`
    );
    console.log('Recent coupons with createdBy:');
    console.table(r.rows);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    c.release();
    await pool.end();
  }
})();
