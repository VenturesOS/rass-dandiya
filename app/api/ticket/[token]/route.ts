import { db, json, failure, body } from '@/lib/server';
import { admit, AppError } from '@/lib/ticket-service';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const ticketRow = await db().execute({
      sql: 'SELECT token, name, cancelled, entered_at, receipt FROM tickets WHERE token=?',
      args: [token],
    });
    const ticket = ticketRow.rows[0];
    if (!ticket) throw new AppError('Ticket not found. Check the full link with your organiser.', 404);
    const eventRow = await db().execute({
      sql: 'SELECT name, date, venue, gate_open FROM event WHERE id=1',
      args: [],
    });
    return json({ ticket, event: eventRow.rows[0] });
  } catch (e) {
    return failure(e);
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const b = await body(req);
    return json({ ticket: await admit(db(), token, typeof b.gate === 'string' ? b.gate : null, null) });
  } catch (e) {
    return failure(e);
  }
}
