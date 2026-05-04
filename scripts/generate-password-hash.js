#!/usr/bin/env node

/**
 * Utility script to generate bcrypt password hashes
 * Usage: node scripts/generate-password-hash.js "your-password"
 */

const bcryptjs = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/generate-password-hash.js "your-password"');
  process.exit(1);
}

const saltRounds = 10;

bcryptjs.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }
  console.log('\n✅ Password Hash Generated Successfully:\n');
  console.log(hash);
  console.log('\nUse this hash in your employeeTable.passwordHash column\n');
});
