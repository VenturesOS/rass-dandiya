import { db, manager, json, failure, body, str, defaults } from '@/lib/server';
import { admit, AppError } from '@/lib/ticket-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const u = await manager();
    const eventRow = await db().execute({ sql: 'SELECT * FROM event WHERE id=1', args: [] });
    const event = eventRow.rows[0] || defaults;
    const ticketsRow = await db().execute({ sql: 'SELECT * FROM tickets ORDER BY created_at DESC', args: [] });
    const teamRow = await db().execute({ sql: 'SELECT email FROM members ORDER BY email', args: [] });
    return json({ event, tickets: ticketsRow.rows, team: teamRow.rows, user: { email: u.email, isOwner: u.isOwner } });
  } catch (e) {
    return failure(e);
  }
}

export async function POST(req: Request) {
  try {
    const u = await manager();
    const b = await body(req);
    switch (b.action) {
      case 'event': {
        if (!u.isOwner) throw new AppError('Only the owner can edit the event.', 403);
        const name = str(b.name, 1, 80), date = str(b.date, 1, 40), venue = str(b.venue, 1, 200);
        const price = Number(b.price);
        if (!Number.isFinite(price) || price < 0 || price > 100000) throw new AppError('Enter a valid ticket price.');
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date)) throw new AppError('Choose the event date and time.');
        await db().execute({
          sql: 'INSERT INTO event (id,name,date,venue,price,gate_key,gate_open) VALUES (1,?,?,?,?,?,0) ON CONFLICT(id) DO UPDATE SET name=excluded.name,date=excluded.date,venue=excluded.venue,price=excluded.price',
          args: [name, date, venue, Math.round(price * 100), crypto.randomUUID() + crypto.randomUUID()],
        });
        return json({ ok: true });
      }
      case 'issue': {
        const evRow = await db().execute({ sql: 'SELECT id FROM event WHERE id=1', args: [] });
        if (!evRow.rows.length) throw new AppError('Save your event details before issuing tickets.');
        if (b.paid !== true) throw new AppError('Confirm that payment has been received.');
        const name = str(b.name, 1, 100), contact = str(b.contact || '', 0, 100), method = str(b.method, 1, 30);
        if (!['Cash', 'UPI / personal transfer', 'Other'].includes(method)) throw new AppError('Choose a payment method.');
        const token = crypto.randomUUID();
        const requestId = str(b.requestId, 36, 36);
        if (!/^[0-9a-f-]{36}$/.test(requestId)) throw new AppError('Invalid request ID.');
        const priceRow = await db().execute({ sql: 'SELECT price FROM event WHERE id=1', args: [] });
        const eventPrice = (priceRow.rows[0] as any)?.price || 0;
        await db().execute({
          sql: 'INSERT INTO tickets (token,name,contact,method,amount,issued_by,created_at,request_id,cancelled) VALUES (?,?,?,?,?,?,?,?,0) ON CONFLICT(request_id) DO NOTHING',
          args: [token, name, contact, method, eventPrice, u.email, new Date().toISOString(), requestId],
        });
        const ticketRow = await db().execute({ sql: 'SELECT * FROM tickets WHERE request_id=?', args: [requestId] });
        return json({ ticket: ticketRow.rows[0] });
      }
      case 'gate': {
        if (typeof b.open !== 'boolean') throw new AppError('Choose open or closed.');
        const r = await db().execute({ sql: 'UPDATE event SET gate_open=? WHERE id=1', args: [b.open ? 1 : 0] });
        if (!r.rowsAffected) throw new AppError('Save event details first.');
        return json({ ok: true });
      }
      case 'admit':
        return json({ ticket: await admit(db(), str(b.token, 36, 36), null, u.email) });
      case 'cancel': {
        const r = await db().execute({
          sql: 'UPDATE tickets SET cancelled=1 WHERE token=? AND entered_at IS NULL AND cancelled=0',
          args: [str(b.token, 36, 36)],
        });
        if (!r.rowsAffected) throw new AppError('Only unused, active tickets can be cancelled.', 409);
        return json({ ok: true });
      }
      case 'member': {
        if (!u.isOwner) throw new AppError('Only the owner can change the team.', 403);
        const email = str(b.email, 3, 254).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('Enter a valid email.');
        if (email === u.email.toLowerCase()) throw new AppError('The owner already has access.');
        if (b.remove === true) {
          await db().execute({ sql: 'DELETE FROM members WHERE email=?', args: [email] });
          return json({ ok: true });
        }
        const countRow = await db().execute({ sql: 'SELECT COUNT(*) as cnt FROM members', args: [] });
        if ((countRow.rows[0] as any).cnt >= 4) throw new AppError('All four teammate places are full.');
        await db().execute({ sql: 'INSERT OR IGNORE INTO members(email) VALUES (?)', args: [email] });
        return json({ ok: true });
      }
      case 'reset_passes': {
        if (!u.isOwner) throw new AppError('Only the owner can reset passes.', 403);
        await db().execute({ sql: 'DELETE FROM tickets', args: [] });
        return json({ ok: true });
      }
      default:
        throw new AppError('Unknown action.');
    }
  } catch (e) {
    return failure(e);
  }
}
