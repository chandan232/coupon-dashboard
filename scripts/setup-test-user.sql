-- ==========================================
-- Setup Test Support Employee for Authentication
-- ==========================================
--
-- IMPORTANT: Replace the passwordHash value with your own!
--
-- Step 1: Generate a password hash:
--   node scripts/generate-password-hash.js "your-password"
--
-- Step 2: Copy the generated hash and replace it in the query below
--
-- Step 3: Run this script in your database
--
-- ==========================================

-- Insert test support employee
INSERT INTO "employeeBase"."employee" (
  id,
  email,
  "firstName",
  "lastName",
  "passwordHash",
  role,
  "isActive",
  created_at,
  updated_at
) VALUES (
  'emp-support-001',
  'support@badho.in',
  'Support',
  'Agent',
  -- REPLACE THIS WITH YOUR GENERATED HASH!
  -- Example: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gZvWFm
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gZvWFm',
  'support',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "isActive" = true,
  role = 'support',
  updated_at = CURRENT_TIMESTAMP;

-- Verify the employee was created
SELECT
  id,
  email,
  "firstName",
  "lastName",
  role,
  "isActive",
  created_at
FROM "employeeBase"."employee"
WHERE email = 'support@badho.in';

-- ==========================================
-- Additional Test Users (Optional)
-- ==========================================

-- Add another support agent
INSERT INTO "employeeBase"."employee" (
  id,
  email,
  "firstName",
  "lastName",
  "passwordHash",
  role,
  "isActive"
) VALUES (
  'emp-support-002',
  'agent2@badho.in',
  'John',
  'Doe',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gZvWFm', -- Replace with actual hash
  'support',
  true
)
ON CONFLICT (email) DO NOTHING;

-- Add an inactive support employee (will not be able to login)
INSERT INTO "employeeBase"."employee" (
  id,
  email,
  "firstName",
  "lastName",
  "passwordHash",
  role,
  "isActive"
) VALUES (
  'emp-support-003',
  'inactive@badho.in',
  'Inactive',
  'User',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gZvWFm', -- Replace with actual hash
  'support',
  false
)
ON CONFLICT (email) DO NOTHING;

-- Add a non-support employee (will not be able to login)
INSERT INTO "employeeBase"."employee" (
  id,
  email,
  "firstName",
  "lastName",
  "passwordHash",
  role,
  "isActive"
) VALUES (
  'emp-admin-001',
  'admin@badho.in',
  'Admin',
  'User',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gZvWFm', -- Replace with actual hash
  'admin',
  true
)
ON CONFLICT (email) DO NOTHING;

-- ==========================================
-- Useful Queries
-- ==========================================

-- View all support employees
-- SELECT * FROM "employeeBase"."employee" WHERE role = 'support';

-- Activate an employee
-- UPDATE "employeeBase"."employee" SET "isActive" = true WHERE email = 'support@badho.in';

-- Deactivate an employee
-- UPDATE "employeeBase"."employee" SET "isActive" = false WHERE email = 'support@badho.in';

-- Reset password (generate new hash first!)
-- UPDATE "employeeBase"."employee" SET "passwordHash" = '$2a$10/...' WHERE email = 'support@badho.in';

-- Change role
-- UPDATE "employeeBase"."employee" SET role = 'admin' WHERE email = 'support@badho.in';

-- Delete a test user
-- DELETE FROM "employeeBase"."employee" WHERE email = 'support@badho.in';
