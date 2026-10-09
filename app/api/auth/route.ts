import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { password, action } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD || 'dandiya2026';

    if (action === 'logout') {
      const cookieStore = await cookies();
      cookieStore.delete('dandiya_session');
      return NextResponse.json({ ok: true });
    }

    if (!password || password !== adminPassword) {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set('dandiya_session', adminPassword, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}
