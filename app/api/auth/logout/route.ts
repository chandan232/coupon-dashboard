import { NextResponse } from 'next/server';

export async function POST() {
  try {
    return NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );
  } catch (err) {
    console.error('Logout error:', err);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
