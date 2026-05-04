#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !match[1].startsWith('#')) {
      process.env[match[1]] = match[2];
    }
  });
}

const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_SSL = process.env.DATABASE_SSL !== 'false';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env.local');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_SSL ? { rejectUnauthorized: false } : false,
  application_name: 'coupon-dashboard-setup',
});

async function setupUser() {
  const client = await pool.connect();

  try {
    console.log('🔍 Connecting to database...');
    await client.query('SELECT NOW()');
    console.log('✅ Connected');

    // Check what support users already exist
    console.log('\n👥 Checking existing support users...');
    const existingResult = await client.query(
      `SELECT "employeeId", email, name, role, "isActive"
       FROM "employeeBase"."employee"
       WHERE LOWER(role) = LOWER('support')
       LIMIT 10`
    );

    if (existingResult.rows.length > 0) {
      console.log(`✅ Found ${existingResult.rows.length} support employee(s):`);
      existingResult.rows.forEach((emp, idx) => {
        console.log(`   ${idx + 1}. ${emp.name} (${emp.email}) - Active: ${emp.isActive}`);
      });
    } else {
      console.log('ℹ️  No support employees found');
    }

    // Try to enable an existing support user
    console.log('\n🔄 Ensuring support users are active...');
    const updateResult = await client.query(
      `UPDATE "employeeBase"."employee"
       SET "isActive" = true
       WHERE LOWER(role) = LOWER('support')
       RETURNING email, name`
    );

    if (updateResult.rows.length > 0) {
      console.log(`✅ Activated ${updateResult.rows.length} support employee(s):`);
      updateResult.rows.forEach(emp => {
        console.log(`   • ${emp.name} (${emp.email})`);
      });
    }

    // Get the first support user for testing
    console.log('\n📊 Available support users for login:');
    const testUsersResult = await client.query(
      `SELECT email, name
       FROM "employeeBase"."employee"
       WHERE LOWER(role) = LOWER('support') AND "isActive" = true
       LIMIT 5`
    );

    if (testUsersResult.rows.length > 0) {
      console.log('You can login with any of these emails:');
      testUsersResult.rows.forEach((emp, idx) => {
        console.log(`   ${idx + 1}. Email: ${emp.email}`);
      });

      console.log('\n✨ Setup complete!');
      console.log('\n🎯 Next steps:');
      console.log('1. Visit: http://localhost:3000/login');
      console.log(`2. Email: ${testUsersResult.rows[0].email}`);
      console.log('3. Click "Access Dashboard"');
    } else {
      console.log('⚠️  No active support users found!');
      console.log('Please add a support employee manually:');
      console.log(`
UPDATE "employeeBase"."employee"
SET "isActive" = true, role = 'support'
WHERE email = 'your-email@badho.in';
      `);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupUser();
