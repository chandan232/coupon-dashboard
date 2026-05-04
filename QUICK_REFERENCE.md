# ⚡ Authentication - Quick Reference Card

## 🎯 3-Step Setup

### Step 1️⃣: Generate Password Hash (1 minute)
```bash
cd /Users/chandanprajapati/Downloads/coupon-dashboard
node scripts/generate-password-hash.js "MyPassword123"
```
**👉 Copy the hash output!**

### Step 2️⃣: Add Test Employee (1 minute)
Run this SQL in your database (replace `HASH_HERE` with your hash):
```sql
INSERT INTO "employeeBase"."employee" (
  id, email, "firstName", "lastName", "passwordHash", role, "isActive"
) VALUES (
  'emp-001',
  'support@badho.in',
  'Support',
  'Agent',
  'HASH_HERE',  -- ← REPLACE WITH YOUR HASH
  'support',
  true
);
```

### Step 3️⃣: Test Login (1 minute)
- Visit: **http://localhost:3000/login**
- Email: `support@badho.in`
- Password: `MyPassword123` (whatever you used in step 1)
- Click **Sign In**

✅ **Done! You're authenticated!**

---

## 📍 Key URLs

| URL | Purpose |
|-----|---------|
| `http://localhost:3000/` | Dashboard (requires auth) |
| `http://localhost:3000/login` | Login page |
| `/api/auth/login` | Login endpoint |
| `/api/auth/logout` | Logout endpoint |

---

## 🔐 How It Works

```
User → Login Page → Enter Credentials → API Check → Token Generated → Dashboard
```

1. User visits dashboard → No token → Redirects to login
2. User enters email & password
3. API validates against database:
   - ✅ Employee exists?
   - ✅ Password matches (bcrypt)?
   - ✅ Role = "support"?
   - ✅ isActive = true?
4. Token created (24-hour expiration)
5. Dashboard loads with employee name in navbar
6. User can logout anytime

---

## 📋 Database Columns Needed

These must exist in `"employeeBase"."employee"`:
- `id` - Employee ID (primary key)
- `email` - Email address (unique)
- `firstName` - First name
- `lastName` - Last name
- `passwordHash` - **BCRYPT HASH ONLY** (NOT plain text!)
- `role` - Must be `'support'` for access
- `isActive` - Boolean (true = can access)

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Invalid email or password" | Wrong email or password, or employee doesn't exist |
| "Only support role" | Change role to `'support'` in database |
| "Account is inactive" | Set `isActive = true` |
| Logout button doesn't show | Clear localStorage: `localStorage.clear()` |
| Can't generate hash | Run: `npm install bcryptjs` |

---

## ⚡ Quick Commands

```bash
# Generate password hash
node scripts/generate-password-hash.js "password"

# Restart dev server
pkill -f "npm run dev"; npm run dev

# View employees
psql -c "SELECT email, role, \"isActive\" FROM \"employeeBase\".\"employeeTable\";"

# Deactivate user
psql -c "UPDATE \"employeeBase\".\"employeeTable\" SET \"isActive\"=false WHERE email='support@badho.in';"

# Reset password (generate new hash first!)
psql -c "UPDATE \"employeeBase\".\"employeeTable\" SET \"passwordHash\"='NEWHASH' WHERE email='support@badho.in';"
```

---

## 📁 Important Files

| File | What It Does |
|------|--------------|
| `/app/login/page.tsx` | Login page UI |
| `/app/api/auth/login/route.ts` | Login validation logic |
| `/middleware.ts` | Protects routes |
| `/scripts/generate-password-hash.js` | Creates password hashes |
| `/.env.local` | Contains JWT_SECRET |

---

## 🔑 API Quick Test

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"support@badho.in","password":"MyPassword123"}'
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "employeeName": "Support Agent",
  "email": "support@badho.in"
}
```

---

## 🎯 Step-by-Step Checklist

- [ ] Generate password hash
- [ ] Insert test employee in database
- [ ] Verify employee was inserted
- [ ] Visit http://localhost:3000/login
- [ ] Try logging in
- [ ] See dashboard with employee name
- [ ] Try logout
- [ ] Redirected to login
- [ ] Try login again with wrong password → fails
- [ ] Try with correct password → works

---

## 💡 Remember

✅ **DO:**
- Generate hashes with the script
- Keep JWT_SECRET secret
- Use HTTPS in production
- Log access attempts
- Regularly update passwords

❌ **DON'T:**
- Store plain text passwords
- Share JWT_SECRET publicly
- Use "password123" as JWT_SECRET
- Hard-code credentials
- Commit .env.local to git

---

**Need more details?** → Read `AUTH_SETUP.md`
**Ready to go?** → http://localhost:3000/login 🚀
