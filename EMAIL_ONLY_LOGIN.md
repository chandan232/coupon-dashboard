# 📧 Email-Only Login (Passwordless)

## Overview
The login system has been simplified to use **email only** - no password required! Only registered support employees can access.

---

## 🔐 How It Works

```
Support Employee visits: http://localhost:3000/login
                    ↓
Enter email: support@badho.in
(NO password required!)
                    ↓
Click "Access Dashboard"
                    ↓
System checks:
  ✅ Email exists in employeeBase.employeeTable?
  ✅ Role = 'support'?
  ✅ isActive = true?
                    ↓
If all checks pass:
  Generate JWT token → Store in localStorage → Redirect to dashboard
                    ↓
If any check fails:
  Show error message and stay on login page
```

---

## ✨ Key Features

✅ **No Password Required** - Just email!
✅ **Instant Access** - No password to remember
✅ **Role-Based** - Only 'support' role employees
✅ **Active Status Check** - Inactive employees blocked
✅ **Email Verification** - Must be registered in database
✅ **Secure** - Still uses JWT tokens (24-hour expiration)

---

## 📋 Setup

### 1. Ensure Employee Exists
Employee must exist in `"employeeBase"."employee"` with:
- `email` - Registered email address
- `role` = `'support'` (exact match)
- `isActive` = `true`

Example:
```sql
INSERT INTO "employeeBase"."employee" (
  id, email, "firstName", "lastName", role, "isActive"
) VALUES (
  'emp-001',
  'support@badho.in',
  'Support',
  'Agent',
  'support',      -- ← MUST be 'support'
  true            -- ← MUST be true
);
```

### 2. No Password Needed
❌ Don't add password hash
✅ Just register the email and name

### 3. Test Login
Visit: http://localhost:3000/login
- Email: `support@badho.in`
- Click "Access Dashboard"
- ✅ You're logged in!

---

## 🎯 Login Page Changes

**Before (Password Required):**
```
Email: ___________________
Password: _________________
[Sign In]
```

**After (Email Only):**
```
Email: ___________________

📧 Email Only: Enter your support email to access the dashboard.

[Access Dashboard]
```

---

## 🔑 API Endpoint

### Endpoint: `POST /api/auth/email-login`

**Request:**
```json
{
  "email": "support@badho.in"
}
```

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "employeeName": "Support Agent",
  "email": "support@badho.in",
  "message": "Login successful"
}
```

**Error Responses:**
- `400` - Invalid email format or missing email
- `401` - Email not registered in system
- `403` - Inactive account or wrong role
- `500` - Server error

---

## 📊 Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "This email is not registered" | Email doesn't exist in DB | Register the employee in database |
| "Your account is inactive" | `isActive = false` | Set `isActive = true` in database |
| "Only support staff can access" | Role is not 'support' | Change role to 'support' in database |
| "Invalid email format" | Email syntax wrong | Enter valid email format |

---

## 🧪 Testing Steps

### Test 1: Valid Support Email
1. Go to http://localhost:3000/login
2. Enter: `support@badho.in`
3. Click "Access Dashboard"
4. ✅ Should redirect to dashboard

### Test 2: Non-Registered Email
1. Go to http://localhost:3000/login
2. Enter: `unknown@badho.in`
3. Click "Access Dashboard"
4. ❌ Error: "This email is not registered"

### Test 3: Inactive Account
1. Deactivate user in database:
   ```sql
   UPDATE "employeeBase"."employee" 
   SET "isActive" = false 
   WHERE email = 'support@badho.in';
   ```
2. Try to login
3. ❌ Error: "Your account is inactive"

### Test 4: Wrong Role
1. Change user role to 'admin':
   ```sql
   UPDATE "employeeBase"."employee" 
   SET role = 'admin' 
   WHERE email = 'support@badho.in';
   ```
2. Try to login
3. ❌ Error: "Only support staff can access"

### Test 5: Invalid Email Format
1. Enter: `notatvalidemail`
2. Click "Access Dashboard"
3. ❌ Error: "Invalid email format"

---

## 👥 Add Multiple Support Employees

```sql
-- Support Agent 1
INSERT INTO "employeeBase"."employee" (
  id, email, "firstName", "lastName", role, "isActive"
) VALUES (
  'emp-001', 'john@badho.in', 'John', 'Doe', 'support', true
);

-- Support Agent 2
INSERT INTO "employeeBase"."employee" (
  id, email, "firstName", "lastName", role, "isActive"
) VALUES (
  'emp-002', 'jane@badho.in', 'Jane', 'Smith', 'support', true
);

-- Support Manager
INSERT INTO "employeeBase"."employee" (
  id, email, "firstName", "lastName", role, "isActive"
) VALUES (
  'emp-003', 'manager@badho.in', 'Manager', 'Name', 'support', true
);
```

---

## 🔄 Manage Employees

### Activate Employee
```sql
UPDATE "employeeBase"."employee" 
SET "isActive" = true 
WHERE email = 'support@badho.in';
```

### Deactivate Employee
```sql
UPDATE "employeeBase"."employee" 
SET "isActive" = false 
WHERE email = 'support@badho.in';
```

### Change Name
```sql
UPDATE "employeeBase"."employee" 
SET "firstName" = 'New', "lastName" = 'Name'
WHERE email = 'support@badho.in';
```

### View All Support Employees
```sql
SELECT email, "firstName", "lastName", "isActive" 
FROM "employeeBase"."employee" 
WHERE role = 'support';
```

---

## 📝 Database Requirements

Your employee table must have:
- `email` - VARCHAR (unique)
- `firstName` - VARCHAR
- `lastName` - VARCHAR
- `role` - VARCHAR (must be 'support')
- `isActive` - BOOLEAN (true/false)

Optional columns can be removed:
- ❌ `passwordHash` - NO LONGER NEEDED

---

## 🎯 Benefits of Email-Only Login

✅ **Simpler** - One field instead of two
✅ **Easier to Remember** - Just remember your email
✅ **More Secure** - No passwords to hack
✅ **Faster** - No password resets needed
✅ **No Typos** - Can't mistype password
✅ **Database-Driven** - Email list matches HR system

---

## 🔒 Security Notes

- ✅ Still uses JWT tokens
- ✅ Still validates role and active status
- ✅ Still requires HTTPS in production
- ✅ Tokens expire after 24 hours
- ✅ Only support emails can access
- ✅ Email case-insensitive (john@badho.in = JOHN@BADHO.IN)

---

## 🚀 Quick Start

1. **Add Employee:**
```sql
INSERT INTO "employeeBase"."employee" 
(id, email, "firstName", "lastName", role, "isActive")
VALUES ('emp-1', 'you@badho.in', 'Your', 'Name', 'support', true);
```

2. **Login:**
- Visit: http://localhost:3000/login
- Email: `you@badho.in`
- Click "Access Dashboard"

3. **Done!** ✅

---

## 📧 Email Validation

- Must be valid email format (name@domain.com)
- Case-insensitive matching
- Trimmed of whitespace
- Must be lowercase in database

---

## 💡 Pro Tips

**Tip 1:** Use email addresses from your employee management system for consistency

**Tip 2:** Deactivate old employees instead of deleting them for audit trail

**Tip 3:** Use descriptive first/last names for easy identification

**Tip 4:** Create a shared email (team@badho.in) for demo/testing

---

**Status:** ✅ Ready to use!

Your dashboard now uses **email-only passwordless authentication**! 🎉
