const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join('/Users/chandanprajapati/Downloads/coupon-dashboard', '.env.local');
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
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'promotions' AND table_name = 'offer'
       AND column_name IN ('createdBy', 'createdByEmail', 'createdby', 'created_by')`
    );
    console.log('createdBy-related columns in promotions.offer:');
    console.log(r.rows);

    // Also check sample data
    const r2 = await c.query(
      `SELECT code, "createdBy" FROM "promotions"."offer"
       WHERE "createdBy" IS NOT NULL AND "createdBy" != ''
       ORDER BY "activationTime" DESC LIMIT 5`
    );
    console.log('\nRecent createdBy values:');
    console.log(r2.rows);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    c.release();
    await pool.end();
  }
})();
