# 🔧 Developer Reference - Quick Commands

## ⚡ Quick Start (Copy & Paste)

### Test Email-Only Login
```bash
curl -X POST http://localhost:3000/api/auth/email-login \
  -H "Content-Type: application/json" \
  -d '{"email":"chandan@badho.in"}'
```

### Test Password-Based Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"chandan@badho.in","password":"yourpassword"}'
```

### Check Support Employees
```bash
psql postgres://postgres:Badho_1301@db.badho.in:5432/badho-app \
  -c "SELECT email, name, role, \"isActive\" FROM \"employeeBase\".\"employee\" WHERE LOWER(role)='support' LIMIT 10;"
```

---

## 🔑 Key Files

| File | Purpose | Edit When |
|------|---------|-----------|
| `app/api/auth/email-login/route.ts` | Email login logic | Changing validation rules |
| `app/api/auth/login/route.ts` | Password login logic | Adding password requirements |
| `app/login/page.tsx` | Login UI | Changing login form design |
| `components/CreateCouponModal.tsx` | Coupon creation | Modifying coupon fields |
| `.env.local` | Configuration | Changing JWT_SECRET |
| `middleware.ts` | Route protection | Changing which routes are protected |

---

## 🔐 Database Schema (Reference)

```sql
-- Employee table structure
Table: "employeeBase"."employee"
Columns:
  - employeeId (VARCHAR, PRIMARY KEY)
  - email (VARCHAR, UNIQUE)
  - name (VARCHAR)
  - role (VARCHAR) -- must be 'support'
  - isActive (BOOLEAN) -- must be true for login
  - password_hash (VARCHAR, optional)
  - ... other columns
```

---

## 📋 Common SQL Queries

### Activate All Support Employees
```sql
UPDATE "employeeBase"."employee"
SET "isActive" = true
WHERE LOWER(role) = 'support';
```

### Deactivate Specific Employee
```sql
UPDATE "employeeBase"."employee"
SET "isActive" = false
WHERE email = 'chandan@badho.in';
```

### List All Active Support Users
```sql
SELECT email, name
FROM "employeeBase"."employee"
WHERE "isActive" = true AND LOWER(role) = 'support'
ORDER BY name;
```

### Check Coupons Created by User
```sql
SELECT code, "createdBy", "createdByEmail", created_at
FROM "promotions"."offer"
WHERE "createdByEmail" = 'chandan@badho.in'
ORDER BY created_at DESC;
```

### Count Coupons per User
```sql
SELECT "createdBy", COUNT(*) as count
FROM "promotions"."offer"
GROUP BY "createdBy"
ORDER BY count DESC;
```

---

## 💾 API Endpoints

### POST /api/auth/email-login
**Request:**
```json
{ "email": "user@badho.in" }
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "employeeName": "Full Name",
  "email": "user@badho.in",
  "message": "Login successful"
}
```

**Errors:**
- 400: Invalid email format
- 401: Email not registered
- 403: Account inactive or wrong role
- 500: Server error

---

### POST /api/auth/login
**Request:**
```json
{
  "email": "user@badho.in",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "...",
  "employeeName": "Full Name",
  "email": "user@badho.in",
  "message": "Login successful"
}
```

**Errors:**
- 400: Missing email/password
- 401: Invalid credentials
- 403: Inactive account or wrong role
- 500: Server error

---

### POST /api/offers/create
**Request:**
```json
{
  "code": "SUMMER2026",
  "createdBy": "Chandan Prajapati",
  "createdByEmail": "chandan@badho.in",
  "discountDetails": {
    "type": "PERCENTAGE",
    "value": 20,
    "cap": 20
  },
  "metaDetails": {
    "label": "Summer Sale",
    "desc": "20% off on all items"
  },
  ...otherFields
}
```

---

## 🧪 Testing Checklist

- [ ] Can login with valid support email
- [ ] Login fails with non-existent email
- [ ] Login fails when account is inactive
- [ ] Login fails when role is not 'support'
- [ ] JWT token is valid for 24 hours
- [ ] Navbar shows employee name after login
- [ ] Logout button clears localStorage
- [ ] Coupon creation captures employeeName and employeeEmail
- [ ] Database shows createdBy values in coupon records
- [ ] Can create multiple coupons with different employee tracking

---

## 🚀 Dev Server Commands

```bash
# Start dev server
npm run dev

# View logs
tail -f /tmp/dev-server.log

# Kill dev server
pkill -f "npm run dev"

# Restart dev server
pkill -f "npm run dev"; npm run dev

# Check if server is running
curl -s http://localhost:3000/login | head -20
```

---

## 🔍 Debugging

### Check localStorage in Browser
```javascript
// In browser console (F12)
localStorage.getItem('authToken')
localStorage.getItem('employeeName')
localStorage.getItem('employeeEmail')
```

### Check JWT Token Contents
```bash
# Decode JWT (replace token below)
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." | \
  jq -R 'split(".") | .[1] | @base64d | fromjson'
```

### View Server Error Logs
```bash
tail -100 /tmp/dev-server.log | grep -i error
```

### Test Database Connection
```bash
psql -h db.badho.in -U postgres -d badho-app -c "SELECT NOW();"
```

---

## 🐛 Common Issues & Fixes

### Issue: "Column id does not exist"
**Cause:** Using wrong column name
**Fix:** Use `employeeId` instead of `id`

### Issue: Login returns empty employee name
**Cause:** Database has NULL in name column
**Fix:** Update employee record with proper name

### Issue: localStorage is empty after login
**Cause:** localStorage.setItem() not called
**Fix:** Check login/page.tsx lines 40-42

### Issue: Coupons don't show createdBy
**Cause:** createdByEmail/createdBy fields not in database
**Fix:** Add columns to promotions.offer table:
```sql
ALTER TABLE "promotions"."offer"
ADD COLUMN "createdBy" VARCHAR(255),
ADD COLUMN "createdByEmail" VARCHAR(255);
```

---

## 📝 Environment Setup

### Required .env.local Variables
```env
DATABASE_URL=postgres://user:password@host:port/database
DATABASE_SSL=true
JWT_SECRET=your-secret-key
```

### Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🔐 Security Checklist

- [ ] JWT_SECRET is strong (32+ characters)
- [ ] JWT_SECRET is never committed to git
- [ ] DATABASE_URL uses SSL connection
- [ ] Only 'support' role can access dashboard
- [ ] isActive flag is enforced
- [ ] Tokens expire after 24 hours
- [ ] HTTPS is enabled in production
- [ ] Audit logs are created for login attempts
- [ ] Password reset has secure flow
- [ ] Rate limiting on login endpoint

---

## 📊 Database Maintenance

### Backup Before Changes
```bash
# Take database backup
pg_dump postgres://postgres@db.badho.in:5432/badho-app > backup.sql

# Restore if needed
psql postgres://postgres@db.badho.in:5432/badho-app < backup.sql
```

### Check Database Size
```sql
SELECT pg_size_pretty(pg_database_size('badho-app')) as database_size;
```

### Monitor Employees Table
```sql
SELECT COUNT(*) as total_employees,
       COUNT(CASE WHEN "isActive" = true THEN 1 END) as active,
       COUNT(CASE WHEN LOWER(role) = 'support' THEN 1 END) as support_staff
FROM "employeeBase"."employee";
```

---

## 🎯 Performance Tips

1. **Add Index on Email**
   ```sql
   CREATE INDEX idx_employee_email ON "employeeBase"."employee" (LOWER(email));
   ```

2. **Add Index on createdBy**
   ```sql
   CREATE INDEX idx_offer_created_by ON "promotions"."offer" ("createdByEmail");
   ```

3. **Cache JWT Validation**
   - Implement Redis caching for token validation

4. **Log Database Queries**
   - Enable query logging for slow queries

---

## 🚀 Deployment

### Before Production
- [ ] Change JWT_SECRET
- [ ] Update DATABASE_URL
- [ ] Enable HTTPS
- [ ] Set up monitoring
- [ ] Configure rate limiting
- [ ] Set up audit logging
- [ ] Test with production data
- [ ] Create database backups

### Deployment Command
```bash
# Build and deploy
npm run build
npm start  # or deploy to Vercel
```

---

## 📞 Debugging Workflow

1. **Check if API endpoint responds**
   ```bash
   curl -X POST http://localhost:3000/api/auth/email-login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@badho.in"}'
   ```

2. **Check server logs**
   ```bash
   tail -50 /tmp/dev-server.log
   ```

3. **Check database connection**
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

4. **Check employee exists**
   ```bash
   psql $DATABASE_URL -c "SELECT * FROM \"employeeBase\".\"employee\" WHERE email = 'test@badho.in';"
   ```

5. **Check if role is 'support'**
   ```bash
   psql $DATABASE_URL -c "SELECT role FROM \"employeeBase\".\"employee\" WHERE email = 'test@badho.in';"
   ```

---

**Last Updated:** May 4, 2026
**Maintained By:** Development Team
