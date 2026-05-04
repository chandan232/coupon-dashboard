# 🔐 Authentication Quick Start Guide

## What's New
Your Coupon Dashboard now has **secure authentication** with role-based access control!

### Features:
✅ Secure login with email & password
✅ Bcrypt password hashing (NOT plain text)
✅ JWT tokens (24-hour expiration)
✅ Support role verification
✅ Active status checking
✅ Session management with logout
✅ Protected dashboard routes

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Generate a Password Hash

Run this command to create a password hash for your test user:

```bash
node scripts/generate-password-hash.js "myPassword123"
```

**Output Example:**
```
✅ Password Hash Generated Successfully:

$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gZvWFm

Use this hash in your employeeTable.passwordHash column
```

### Step 2: Insert Test Support Employee

Use this SQL to add a test employee (update the hash from step 1):

```sql
INSERT INTO "employeeBase"."employee" (
  id, 
  email, 
  "firstName", 
  "lastName", 
  "passwordHash", 
  role, 
  "isActive"
) VALUES (
  'support-001',
  'support@badho.in',
  'Support',
  'Agent',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gZvWFm', -- REPLACE WITH YOUR HASH
  'support',
  true
);
```

### Step 3: Test Login

Visit: **http://localhost:3000/login**

Use these credentials:
- **Email:** `support@badho.in`
- **Password:** `myPassword123` (or whatever you used in step 1)

---

## 📊 Access Flow

```
┌─────────────────┐
│  User Visits    │
│  http://localhost:3000
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  Has authToken in browser?  │
└──┬─────────────────────┬────┘
   │ NO                  │ YES
   │                     │
   ▼                     ▼
┌─────────────────┐  ┌──────────────┐
│ Redirect to     │  │  Dashboard   │
│ /login          │  │  Loads!  ✅  │
└─────────────────┘  └──────────────┘
```

---

## 🔑 Database Column Requirements

Your `"employeeBase"."employee"` needs these columns:

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `id` | VARCHAR | ✅ | Primary key |
| `email` | VARCHAR | ✅ | Must be unique |
| `firstName` | VARCHAR | ✅ | Employee's first name |
| `lastName` | VARCHAR | ✅ | Employee's last name |
| `passwordHash` | VARCHAR | ✅ | **BCRYPT HASH ONLY** |
| `role` | VARCHAR | ✅ | Must be "support" for access |
| `isActive` | BOOLEAN | ✅ | Must be true |

---

## 🔑 Login API Endpoint

### Request:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"support@badho.in","password":"password123"}'
```

### Success Response (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "employeeName": "Support Agent",
  "email": "support@badho.in",
  "message": "Login successful"
}
```

### Error Response Examples:

❌ **Invalid credentials (401):**
```json
{"error": "Invalid email or password"}
```

❌ **Inactive account (403):**
```json
{"error": "Your account is inactive. Please contact administrator."}
```

❌ **Wrong role (403):**
```json
{"error": "Only support role employees can access this portal"}
```

---

## 🎯 Common Tasks

### Add a New Support Employee

```bash
# 1. Generate hash
node scripts/generate-password-hash.js "SecurePassword123!"

# 2. Copy the hash and insert into database
INSERT INTO "employeeBase"."employee" (
  id, email, "firstName", "lastName", "passwordHash", role, "isActive"
) VALUES (
  'emp-002',
  'newagent@badho.in',
  'New',
  'Agent',
  '$2a$10/...', -- paste hash here
  'support',
  true
);
```

### Deactivate an Employee

```sql
UPDATE "employeeBase"."employee" 
SET "isActive" = false 
WHERE email = 'support@badho.in';
```

Employee will see: *"Your account is inactive. Please contact administrator."*

### Reset Password

```bash
# 1. Generate new hash
node scripts/generate-password-hash.js "NewPassword456!"

# 2. Update database
UPDATE "employeeBase"."employee" 
SET "passwordHash" = '$2a$10/...' -- new hash
WHERE email = 'support@badho.in';
```

### Change Employee Role

```sql
UPDATE "employeeBase"."employee" 
SET role = 'admin' 
WHERE email = 'support@badho.in';
```

(Note: Only 'support' role can access the dashboard)

---

## 🛡️ Security Details

### Password Security:
- ✅ Bcryptjs with 10 salt rounds
- ✅ No plain text passwords stored
- ✅ Constant-time comparison

### Token Security:
- ✅ JWT tokens with HS256 algorithm
- ✅ 24-hour expiration
- ✅ Stored in browser localStorage

### Validation Checks:
- ✅ Employee must exist
- ✅ Password must match hash
- ✅ Role must be "support"
- ✅ Account must be active

---

## ⚙️ Environment Variables

Your `.env.local` file should contain:

```env
# Database
DATABASE_URL=postgres://postgres:Badho_1301@db.badho.in:5432/badho-app
DATABASE_SSL=true

# JWT Secret (change in production!)
JWT_SECRET=your-super-secret-jwt-key-badho-2026-support-portal
```

### ⚠️ Important: Change JWT_SECRET in Production!

Generate a secure random secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then update `.env.local`:
```env
JWT_SECRET=your-generated-random-secret-here
```

---

## 🧪 Testing the Authentication

### Test 1: Can't access dashboard without login
```bash
curl http://localhost:3000/
# Should redirect to /login (or show loading)
```

### Test 2: Login fails with wrong password
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"support@badho.in","password":"wrongpassword"}'
# Should return: "Invalid email or password"
```

### Test 3: Login fails with non-support role
```bash
# First create a user with 'admin' role, then try to login
# Should return: "Only support role employees can access this portal"
```

### Test 4: Login fails with inactive account
```bash
# Set isActive = false, then try to login
# Should return: "Your account is inactive..."
```

### Test 5: Successful login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"support@badho.in","password":"myPassword123"}'
# Should return: token, employeeName, email, message
```

---

## 🆘 Troubleshooting

### Issue: "Invalid email or password" but credentials look correct
**Solutions:**
- Verify employee exists: `SELECT * FROM "employeeBase"."employee" WHERE email = 'support@badho.in';`
- Check password hash is correct (should start with `$2a$` or `$2b$`)
- Ensure you're using the exact password from when you generated the hash

### Issue: "Only support role employees can access"
**Solution:** Check the role value in database:
```sql
SELECT email, role FROM "employeeBase"."employee" WHERE email = 'support@badho.in';
```
Must be exactly `'support'` (case-sensitive in code)

### Issue: "Your account is inactive"
**Solution:** Activate the account:
```sql
UPDATE "employeeBase"."employee" SET "isActive" = true WHERE email = 'support@badho.in';
```

### Issue: Logout button doesn't appear
**Solution:** Clear browser localStorage:
```javascript
// In browser console
localStorage.clear();
location.reload();
```

### Issue: Can't generate password hash
**Solution:** Make sure bcryptjs is installed:
```bash
npm install bcryptjs
node scripts/generate-password-hash.js "test"
```

---

## 📚 File Reference

| File | Purpose |
|------|---------|
| `/app/login/page.tsx` | Login page UI |
| `/app/api/auth/login/route.ts` | Login API endpoint |
| `/app/api/auth/logout/route.ts` | Logout endpoint |
| `/middleware.ts` | Authentication middleware |
| `/components/Navbar.tsx` | Updated with logout button |
| `/app/page.tsx` | Updated with auth checks |
| `/scripts/generate-password-hash.js` | Password hash generator |

---

## 🎓 Next Steps

1. ✅ Add test support employee to database
2. ✅ Test login at http://localhost:3000/login
3. ✅ Verify logout button appears in navbar
4. ✅ Add more support employees as needed
5. 📦 Deploy to production with secure JWT_SECRET
6. 🔒 Enable HTTPS in production
7. 📊 Monitor access logs

---

**Questions?** Check `AUTH_SETUP.md` for detailed documentation!

Happy coding! 🚀
