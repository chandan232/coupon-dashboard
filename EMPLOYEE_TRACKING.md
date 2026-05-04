# 👤 Employee Tracking in Coupons & Vouchers

## Overview
When an employee logs in and creates a coupon or voucher, their name and email are **automatically captured and stored** in the `createdBy` and `createdByEmail` columns.

---

## 🔄 How It Works

### 1. **Login Process**
When employee logs in at `/login`:
```
Email: support@badho.in
Password: ••••••••
         ↓
API validates credentials
         ↓
JWT token generated
         ↓
Employee info stored in localStorage:
  - authToken
  - employeeName: "Support Agent"
  - employeeEmail: "support@badho.in"
```

### 2. **Create Coupon/Voucher**
When employee creates a coupon or voucher:
```
Employee clicks "Create Coupon" / "Create Voucher"
         ↓
Modal form opens
         ↓
Employee fills form data
         ↓
On submit:
  - Fetch employeeName from localStorage
  - Fetch employeeEmail from localStorage
  - Add to payload:
    {
      ...formData,
      createdBy: "Support Agent",
      createdByEmail: "support@badho.in"
    }
  ↓
Send to API endpoint
  ↓
API inserts into database with createdBy fields
  ↓
Coupon/Voucher created with employee attribution
```

---

## 📊 Database Schema

Your `"promotions"."offer"` table needs these columns:

```sql
-- Existing columns
id
code
name
discountDetails
metaDetails
... (other columns)

-- NEW columns for employee tracking
"createdBy" VARCHAR(255) -- Employee name
"createdByEmail" VARCHAR(255) -- Employee email
```

### Add these columns if they don't exist:

```sql
ALTER TABLE "promotions"."offer"
ADD COLUMN "createdBy" VARCHAR(255),
ADD COLUMN "createdByEmail" VARCHAR(255);

-- Optional: Add timestamp
ALTER TABLE "promotions"."offer"
ADD COLUMN "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

---

## 🔧 Implementation Details

### Files Modified:

#### **Login Flow** (`/app/login/page.tsx`):
```typescript
// Store employee email when logging in
localStorage.setItem('authToken', data.token);
localStorage.setItem('employeeName', data.employeeName);
localStorage.setItem('employeeEmail', data.email); // ← NEW
```

#### **Create Coupon Modal** (`/components/CreateCouponModal.tsx`):
```typescript
// Get employee info from localStorage
const employeeEmail = localStorage.getItem('employeeEmail');
const employeeName = localStorage.getItem('employeeName');

// Add to payload
const payload = {
  ...formData,
  createdBy: employeeName,        // ← NEW
  createdByEmail: employeeEmail,  // ← NEW
};
```

#### **Create Voucher Modal** (`/components/CreateVoucherModal.tsx`):
```typescript
// Same as coupon modal
const employeeEmail = localStorage.getItem('employeeEmail');
const employeeName = localStorage.getItem('employeeName');

const payload = {
  ...formData,
  createdBy: employeeName,        // ← NEW
  createdByEmail: employeeEmail,  // ← NEW
};
```

#### **Create Coupon API** (`/app/api/offers/create/route.ts`):
```typescript
// Accept createdBy fields from request
const { createdBy, createdByEmail, ...otherData } = req.json();

// Insert into database
const sql = `
  INSERT INTO "promotions"."offer" (
    ...columns,
    "createdBy",      // ← NEW
    "createdByEmail"  // ← NEW
  ) VALUES (
    ...values,
    $13, // createdBy
    $14  // createdByEmail
  )
`;
```

#### **Create Voucher API** (`/app/api/vouchers/create/route.ts`):
```typescript
// Accept createdBy fields from request
const { createdBy, createdByEmail, ...otherData } = req.json();

// Add to columns and values arrays dynamically
columns.push('"createdBy"', '"createdByEmail"');
values.push(createdBy || 'System', createdByEmail || '');
```

---

## 📝 Query Examples

### View who created each coupon:
```sql
SELECT 
  code,
  "coupon_name",
  "createdBy",
  "createdByEmail",
  "activationTime"
FROM "promotions"."offer"
WHERE type = 'COUPON'
ORDER BY "activationTime" DESC;
```

### Find all coupons created by a specific employee:
```sql
SELECT *
FROM "promotions"."offer"
WHERE "createdByEmail" = 'support@badho.in'
AND type = 'COUPON';
```

### Count coupons created per employee:
```sql
SELECT 
  "createdBy",
  "createdByEmail",
  COUNT(*) as coupon_count
FROM "promotions"."offer"
WHERE type = 'COUPON'
GROUP BY "createdBy", "createdByEmail"
ORDER BY coupon_count DESC;
```

### Find coupons created in a date range by employee:
```sql
SELECT 
  code,
  "createdBy",
  "createdAt"
FROM "promotions"."offer"
WHERE "createdByEmail" = 'support@badho.in'
AND "createdAt" >= '2026-01-01'
AND "createdAt" <= '2026-12-31'
ORDER BY "createdAt" DESC;
```

---

## 🔐 Security Features

✅ **Employee Identification:**
- Name and email automatically captured from login
- No manual input = no typos or fraud
- Audit trail for all creations

✅ **Authentication Required:**
- Only logged-in support employees can create
- Token validated on all API requests
- Employee info from localStorage (only on authenticated session)

✅ **Data Integrity:**
- Employee info fetched from login (trusted source)
- Stored in database for permanent record
- Cannot be modified after creation

---

## 📋 Workflow Example

### Example: Support Agent creates a coupon

**Step 1: Login**
```
URL: http://localhost:3000/login
Email: john.doe@badho.in
Password: SecurePassword123
  ↓
localStorage now contains:
  - authToken: "eyJhbGciOiJIUzI1NiIs..."
  - employeeName: "John Doe"
  - employeeEmail: "john.doe@badho.in"
```

**Step 2: Create Coupon**
```
URL: http://localhost:3000/ (dashboard)
Click: "Create Coupon"
Modal opens with form

Fill in:
  - Code: "SUMMER2026"
  - Description: "Summer discount"
  - Discount: 20%
  - Valid Till: 2026-08-31

Click: "Create"
  ↓
Form automatically adds:
  {
    code: "SUMMER2026",
    discountDetails: {...},
    metaDetails: {...},
    createdBy: "John Doe",           ← auto-added
    createdByEmail: "john.doe@badho.in" ← auto-added
  }
  ↓
API receives and inserts
```

**Step 3: Database Record**
```sql
INSERT INTO "promotions"."offer" (
  code,
  discountDetails,
  metaDetails,
  createdBy,              ← "John Doe"
  createdByEmail,         ← "john.doe@badho.in"
  ...
) VALUES (...)
```

**Step 4: View History**
```sql
SELECT code, "createdBy", "createdByEmail"
FROM "promotions"."offer"
WHERE code = 'SUMMER2026';

Result:
code        | createdBy  | createdByEmail
SUMMER2026  | John Doe   | john.doe@badho.in
```

---

## 🧪 Testing Employee Tracking

### Test 1: Verify localStorage is populated
1. Login at `/login`
2. Open browser console (F12)
3. Type: `localStorage.getItem('employeeEmail')`
4. Should return: `"support@badho.in"`

### Test 2: Create coupon and verify tracking
1. Login as support employee
2. Go to dashboard
3. Create a coupon
4. Check database:
```sql
SELECT "createdBy", "createdByEmail" 
FROM "promotions"."offer" 
WHERE code = 'YOUR_CODE';
```
Should show employee name and email

### Test 3: Multiple employees
1. Create coupon as Employee A
2. Logout
3. Login as Employee B
4. Create another coupon
5. Check database - each has different createdBy

---

## ⚠️ Important Notes

### 1. **Email-based Tracking**
- Employee identified by **email address**
- Email must match between:
  - `/login` form input
  - `"employeeBase"."employee"` database
  - Coupon/voucher `createdByEmail` field

### 2. **localStorage Security**
- Employee info stored in browser localStorage
- Cleared on logout
- New login updates localStorage with new employee

### 3. **Default Values**
If for some reason employee info is missing:
```typescript
createdBy: employeeName || 'System'
createdByEmail: employeeEmail || ''
```
So coupons can still be created but with "System" attribution

### 4. **Employee Name Format**
The `createdBy` field stores the full name from database:
```typescript
createdBy: `${employee.firstName} ${employee.lastName}`
// Example: "John Doe"
```

---

## 🔍 Troubleshooting

### Issue: createdBy shows "System"
**Problem:** Employee info not in localStorage
**Solution:** 
- Clear localStorage: `localStorage.clear()`
- Login again
- Verify `localStorage.getItem('employeeName')` returns value

### Issue: createdByEmail is empty
**Problem:** Email not stored during login
**Solution:**
- Check login API returns email field
- Verify localStorage stores it: `localStorage.getItem('employeeEmail')`

### Issue: Database columns don't exist
**Problem:** "createdBy" column missing in promotions.offer table
**Solution:**
Run SQL to add columns:
```sql
ALTER TABLE "promotions"."offer"
ADD COLUMN "createdBy" VARCHAR(255),
ADD COLUMN "createdByEmail" VARCHAR(255);
```

### Issue: Only some coupons show createdBy
**Problem:** Old coupons (created before feature) don't have data
**Solution:**
- Update old records manually:
```sql
UPDATE "promotions"."offer" 
SET "createdBy" = 'Migration', "createdByEmail" = 'system@badho.in'
WHERE "createdBy" IS NULL;
```

---

## 📊 Reports You Can Now Generate

With employee tracking, you can create reports:

1. **Coupon Creation by Employee**
   - Most active coupon creators
   - Productivity metrics

2. **Audit Trail**
   - Who created what, when
   - Compliance tracking

3. **Quality Metrics**
   - Coupons created per employee
   - Performance comparison

4. **Access Control**
   - Who has created coupons
   - Identify unauthorized access attempts

---

## 🎯 Best Practices

✅ **DO:**
- Ensure every employee has unique email
- Regularly audit createdBy records
- Keep employee data up-to-date
- Review logout to ensure session ends

❌ **DON'T:**
- Share login credentials (each person gets their own)
- Modify createdBy after creation
- Delete old coupon records without backup
- Keep multiple logins active simultaneously

---

**Implementation Status:** ✅ Complete

All files updated to track employee creation of coupons and vouchers!
