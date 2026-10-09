import { cookies } from 'next/headers';
import { getDb, ensureSchema } from './db';
import { AppError } from './ticket-service';

export function db() {
  const c = getDb();
  ensureSchema(c).catch(() => {});
  return c;
}

export const defaults = { name: 'Dandiya Night', date: '', venue: '', price: 0, gate_open: 0 };

export async function manager() {
  const cookieStore = await cookies();
  const session = cookieStore.get('dandiya_session')?.value;
  const adminPassword = process.env.ADMIN_PASSWORD || 'dandiya2026';
  if (!session || session !== adminPassword) {
    throw new AppError('Please sign in to manage tickets.', 401);
  }
  const ownerEmails = (process.env.OWNER_EMAIL || '')
    .toLowerCase()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const email = ownerEmails[0] || 'admin@dandiya.app';
  return { email, isOwner: true };
}

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}

export function failure(e: unknown) {
  if (e instanceof AppError) return json({ error: e.message }, e.status);
  console.error('Ticket operation failed', e);
  return json(
    { error: 'We could not reach the ticket records. Please try again.' },
    503
  );
}

export async function body(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin)
    throw new AppError('Request not allowed.', 403);
  if (!req.headers.get('content-type')?.includes('application/json'))
    throw new AppError('JSON required.', 415);
  const text = await req.text();
  if (text.length > 12000) throw new AppError('Request too large.', 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError('Invalid request.');
  }
}

export function str(value: unknown, min: number, max: number) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max)
    throw new AppError('Please check the form fields.');
  return value.trim();
}
