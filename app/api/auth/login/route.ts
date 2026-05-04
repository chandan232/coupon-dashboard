import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/db';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Query the employee from database
    interface EmployeeRow {
      employeeId: string;
      email: string;
      name: string | null;
      password_hash: string | null;
      role: string | null;
      isActive: boolean | null;
    }
    const result = await query<EmployeeRow>(
      `SELECT
        "employeeId",
        email,
        name,
        "password_hash",
        role,
        "isActive"
      FROM "employeeBase"."employee"
      WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const employee = result[0];

    // Check if employee is active
    if (employee.isActive === false) {
      return NextResponse.json(
        { error: 'Your account is inactive. Please contact administrator.' },
        { status: 403 }
      );
    }

    // Check if employee has support role
    if (employee.role?.toLowerCase() !== 'support') {
      return NextResponse.json(
        { error: 'Only support role employees can access this portal' },
        { status: 403 }
      );
    }

    // Verify password (compare with hash)
    const passwordMatch = await bcryptjs.compare(password, employee.password_hash || '');

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: employee.employeeId,
        email: employee.email,
        role: employee.role,
        name: employee.name,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json(
      {
        token,
        employeeName: employee.name,
        email: employee.email,
        message: 'Login successful',
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Login error:', err);
    const msg = (err instanceof Error && err.message) ? err.message : String(err) || 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
