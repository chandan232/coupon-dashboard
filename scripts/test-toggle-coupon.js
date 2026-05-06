#!/usr/bin/env node
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

const BASE = process.argv[2] || 'http://localhost:3000';

async function getState(c, code) {
  const r = await c.query(
    `SELECT code, "isActive", "isTest" FROM "promotions"."offer"
     WHERE code = $1 LIMIT 1`,
    [code]
  );
  return r.rows[0];
}

async function getId(c, code) {
  const r = await c.query(
    `SELECT id FROM "promotions"."offer" WHERE code = $1 LIMIT 1`,
    [code]
  );
  return r.rows[0]?.id;
}

(async () => {
  const c = await pool.connect();
  try {
    // Pick a recent test coupon
    const codeRow = await c.query(
      `SELECT code FROM "promotions"."offer"
       WHERE code LIKE 'TESTLOOKUP%' AND type = 'COUPON'
       ORDER BY "activationTime" DESC LIMIT 1`
    );
    const code = codeRow.rows[0]?.code;
    if (!code) {
      console.log('No TESTLOOKUP coupon found. Skipping live test.');
      return;
    }
    const offerId = await getId(c, code);
    console.log(`Testing coupon: ${code} (id=${offerId})`);
    console.log(`Endpoint base: ${BASE}\n`);

    // 1. Show initial state
    const before = await getState(c, code);
    console.log('STATE BEFORE:', before);

    // 2. Call DEACTIVATE
    console.log('\n→ POST /api/offers/deactivate');
    const r1 = await fetch(`${BASE}/api/offers/deactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId }),
    });
    console.log(`  status: ${r1.status}`);

    const afterDeact = await getState(c, code);
    console.log('STATE AFTER DEACTIVATE:', afterDeact);
    const deactOK = afterDeact.isActive === false && afterDeact.isTest === true;
    console.log(deactOK
      ? '  ✅ isTest=true, isActive=false  ← matches spec'
      : '  ❌ does not match spec');

    // 3. Call ACTIVATE
    console.log('\n→ POST /api/offers/activate');
    const r2 = await fetch(`${BASE}/api/offers/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId }),
    });
    console.log(`  status: ${r2.status}`);

    const afterAct = await getState(c, code);
    console.log('STATE AFTER ACTIVATE:', afterAct);
    const actOK = afterAct.isActive === true && afterAct.isTest === false;
    console.log(actOK
      ? '  ✅ isTest=false, isActive=true  ← matches spec'
      : '  ❌ does not match spec');

    console.log('\n— Final result —');
    console.log(deactOK && actOK
      ? '✅ All spec requirements met. Endpoints work as required.'
      : '❌ Spec mismatch — see output above.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    c.release();
    await pool.end();
  }
})();
