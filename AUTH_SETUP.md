# Authentication Setup Guide

## Overview
This dashboard is now protected with authentication. Only employees with the **"support"** role and **isActive = true** can access the coupon management dashboard.

## Database Requirements

Your `employeeBase.employeeTable` must have the following columns:
- `id` - Employee ID (Primary Key)
- `email` - Employee email (unique)
- `firstName` - First name
- `lastName` - Last name
- `passwordHash` - Bcrypt hashed password (NOT plain text)
- `role` - Employee role (must be "support" for dashboard access)
- `isActive` - Boolean flag (true = active, false = inactive)

### Table Schema Example:
```sql
CREATE TABLE "employeeBase"."employee" (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  "firstName" VARCHAR(100) NOT NULL,
  "lastName" VARCHAR(100) NOT NULL,
  "passwordHash" VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Setting Up Test Users

### Step 1: Generate Password Hash
Run the password hash generator to create a bcrypt hash:

```bash
node scripts/generate-password-hash.js "your-password"
```

Example output:
```
✅ Password Hash Generated Successfully:

$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gZvWFm

Use this hash in your employeeTable.passwordHash column
```

### Step 2: Insert Test Support User
Use this SQL to insert a test support employee:

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
  'emp-001',
  'support@badho.in',
  'Support',
  'Agent',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gZvWFm', -- Replace with your hash
  'support',
  true
);
```

## Environment Setup

### 1. Create `.env.local` file:
```env
# Database connection (already configured)
DATABASE_URL=your_database_url

# JWT Secret (change this to a strong random string in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Environment
NODE_ENV=development
```

### 2. Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Authentication Flow

### Login Process:
1. User navigates to `/login`
2. Enters email and password
3. System validates:
   - Employee exists in database
   - Password matches the hash (bcrypt comparison)
   - Employee role is "support"
   - Employee isActive is true
4. If all checks pass:
   - JWT token is generated (expires in 24 hours)
   - Token stored in localStorage
   - User redirected to dashboard
5. If any check fails:
   - Specific error message shown
   - User remains on login page

### Error Messages:
- **"Invalid email or password"** - User not found OR password doesn't match
- **"Your account is inactive"** - isActive = false
- **"Only support role employees can access this portal"** - Wrong role

### Dashboard Access:
- Dashboard checks for valid token on mount
- If no token: redirects to login
- If token is invalid/expired: redirects to login
- Navbar shows employee name and logout button

### Logout:
- Clicks logout button
- Token removed from localStorage
- Redirected to login page

## API Endpoints

### POST /api/auth/login
**Request:**
```json
{
  "email": "support@badho.in",
  "password": "password123"
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
- 400: Missing email or password
- 401: Invalid credentials
- 403: Inactive account or wrong role
- 500: Server error

### POST /api/auth/logout
**Request:** (No body required)

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

## Security Features

✅ **Password Hashing**: Uses bcryptjs with 10 salt rounds
✅ **JWT Tokens**: Secure tokens with 24-hour expiration
✅ **Role-based Access**: Only "support" role employees allowed
✅ **Active Status Check**: Inactive employees cannot access
✅ **Secure Comparison**: Uses constant-time password comparison
✅ **Protected Routes**: Middleware validates tokens on API requests

## Testing Credentials

After setting up the test user, use these credentials to login:

```
Email: support@badho.in
Password: (the password you used to generate the hash)
```

## Troubleshooting

### Issue: "Login failed" with no specific error
- Check database connection
- Verify employee exists in database
- Check column names match (case-sensitive)

### Issue: Password always fails
- Ensure password hash was correctly generated
- Verify hash is in the correct bcryptjs format (starts with $2a$ or $2b$)
- Don't use plain text passwords!

### Issue: Role check failing
- Verify role is exactly "support" (case-sensitive in the code)
- Check the role value in database

### Issue: "Account is inactive"
- Set `isActive = true` for the employee
- Update: `UPDATE "employeeBase"."employee" SET "isActive" = true WHERE id = 'emp-001';`

## Password Reset

To reset a user's password:

1. Generate a new hash:
```bash
node scripts/generate-password-hash.js "new-password"
```

2. Update the database:
```sql
UPDATE "employeeBase"."employee" 
SET "passwordHash" = '$2a$10/...' -- paste the new hash
WHERE email = 'support@badho.in';
```

## Security Best Practices

⚠️ **Production Checklist:**
- [ ] Change JWT_SECRET to a strong random string
- [ ] Use HTTPS only
- [ ] Set secure session cookies (if using sessions)
- [ ] Enable CORS properly
- [ ] Implement rate limiting on login endpoint
- [ ] Add password complexity requirements
- [ ] Implement password reset flow
- [ ] Add audit logging for access attempts
- [ ] Regularly rotate passwords
- [ ] Use environment variables for all secrets

## Support

For issues with authentication, check:
1. Browser console for error messages
2. Server logs for API errors
3. Database to verify employee data
4. Environment variables are set correctly
