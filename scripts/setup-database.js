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

async function setupDatabase() {
  const client = await pool.connect();

  try {
    console.log('🔍 Checking database connection...');
    await client.query('SELECT NOW()');
    console.log('✅ Database connected');

    // Create schema if it doesn't exist
    console.log('\n📦 Creating schema "employeeBase"...');
    await client.query('CREATE SCHEMA IF NOT EXISTS "employeeBase"');
    console.log('✅ Schema ready');

    // Check if table exists and what columns it has
    console.log('\n📋 Checking employee table structure...');
    const tableCheckQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'employeeBase' AND table_name = 'employee'
      ORDER BY ordinal_position
    `;
    const tableCheckResult = await client.query(tableCheckQuery);

    const existingColumns = tableCheckResult.rows.map(r => r.column_name);
    console.log('Existing columns:', existingColumns);

    // If table doesn't exist, create it
    if (existingColumns.length === 0) {
      console.log('Creating new employee table...');
      const createTableQuery = `
        CREATE TABLE "employeeBase"."employee" (
          id VARCHAR(36) PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          "firstName" VARCHAR(100) NOT NULL,
          "lastName" VARCHAR(100) NOT NULL,
          "passwordHash" VARCHAR(255),
          role VARCHAR(50) NOT NULL,
          "isActive" BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await client.query(createTableQuery);
      console.log('✅ Employee table created');
    } else {
      // Table exists, check and add missing columns
      console.log('✅ Employee table exists');

      // Add missing columns if needed
      const neededColumns = ['email', 'firstName', 'lastName', 'role', 'isActive', 'id'];
      for (const col of neededColumns) {
        if (!existingColumns.includes(col)) {
          console.log(`  Adding missing column: ${col}`);
          let colDefinition = '';
          switch (col) {
            case 'id':
              colDefinition = 'VARCHAR(36) PRIMARY KEY';
              break;
            case 'email':
              colDefinition = 'VARCHAR(255) NOT NULL UNIQUE';
              break;
            case 'firstName':
              colDefinition = 'VARCHAR(100) NOT NULL';
              break;
            case 'lastName':
              colDefinition = 'VARCHAR(100) NOT NULL';
              break;
            case 'role':
              colDefinition = 'VARCHAR(50) NOT NULL DEFAULT \'support\'';
              break;
            case 'isActive':
              colDefinition = 'BOOLEAN DEFAULT true';
              break;
          }
          try {
            await client.query(`ALTER TABLE "employeeBase"."employee" ADD COLUMN "${col}" ${colDefinition}`);
          } catch (e) {
            // Column might already exist or there might be a constraint issue
            console.log(`  ⚠️  Could not add ${col}: ${e.message}`);
          }
        }
      }
    }

    // Now try to insert test employee
    console.log('\n👤 Adding test support employee...');

    // Build the insert query based on existing columns
    const columns = [];
    const values = [];
    const params = [];
    let paramCount = 1;

    // Check which columns exist and build insert accordingly
    const insertableFields = [
      { name: 'email', value: 'support@badho.in' },
      { name: 'firstName', value: 'Support' },
      { name: 'lastName', value: 'Agent' },
      { name: 'role', value: 'support' },
      { name: 'isActive', value: true },
    ];

    // Always add id if the table has the id column
    if (existingColumns.includes('id') || true) {
      columns.push('"id"');
      values.push(`$${paramCount++}`);
      params.push('emp-support-001');
    }

    // Add other fields
    for (const field of insertableFields) {
      if (existingColumns.includes(field.name) || true) {
        columns.push(`"${field.name}"`);
        values.push(`$${paramCount++}`);
        params.push(field.value);
      }
    }

    const insertQuery = `
      INSERT INTO "employeeBase"."employee" (${columns.join(', ')})
      VALUES (${values.join(', ')})
      ON CONFLICT (email) DO UPDATE SET
        "isActive" = true,
        role = 'support',
        updated_at = CURRENT_TIMESTAMP
    `;

    console.log('Insert query:', insertQuery);
    console.log('Params:', params);

    await client.query(insertQuery, params);
    console.log('✅ Test employee added/updated');

    // Verify
    console.log('\n📊 Verifying setup...');
    const result = await client.query(
      'SELECT * FROM "employeeBase"."employee" WHERE email = $1',
      ['support@badho.in']
    );

    if (result.rows.length > 0) {
      const emp = result.rows[0];
      console.log(`✅ Verified employee record:`);
      console.log(`   Email: ${emp.email}`);
      console.log(`   Name: ${emp.firstName} ${emp.lastName}`);
      console.log(`   Role: ${emp.role}`);
      console.log(`   Active: ${emp.isActive}`);
    }

    console.log('\n✨ Database setup complete!');
    console.log('\n🎯 Next steps:');
    console.log('1. Visit: http://localhost:3000/login');
    console.log('2. Email: support@badho.in');
    console.log('3. Click "Access Dashboard"');

  } catch (err) {
    console.error('❌ Setup error:', err.message);
    console.error('Details:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();
