import type { Client } from '@libsql/client';

export class AppError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function admit(
  db: Client,
  token: string,
  _gate: string | null,
  staff: string | null
) {
  const eventRow = await db.execute({
    sql: 'SELECT gate_key, gate_open FROM event WHERE id=1',
    args: [],
  });
  const event = eventRow.rows[0] as unknown as { gate_key: string; gate_open: number } | undefined;
  if (!event?.gate_open) {
    throw new AppError('Entry is currently closed. Please ask the event manager to open gate admission.', 409);
  }

  const at = new Date().toISOString();
  const receipt = crypto.randomUUID().slice(0, 8).toUpperCase();

  // Atomically check-in if valid, unused, and not cancelled
  const result = await db.execute({
    sql: 'UPDATE tickets SET entered_at=?, receipt=?, checked_by=? WHERE token=? AND entered_at IS NULL AND cancelled=0 RETURNING token, name, entered_at, receipt',
    args: [at, receipt, staff || 'Volunteer Scanner', token],
  });

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  // If update didn't match, find the reason
  const ticketRow = await db.execute({
    sql: 'SELECT token, name, cancelled, entered_at, receipt, checked_by FROM tickets WHERE token=?',
    args: [token],
  });
  const ticket = ticketRow.rows[0] as unknown as
    | { token: string; name: string; cancelled: number; entered_at: string | null; receipt: string | null }
    | undefined;

  if (!ticket) {
    throw new AppError('Invalid QR Code. Ticket not found in records.', 404);
  }
  if (ticket.cancelled) {
    throw new AppError(`Ticket for ${ticket.name} is CANCELLED. Entry denied.`, 409);
  }
  if (ticket.entered_at) {
    const timeStr = new Date(ticket.entered_at).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    throw new AppError(
      `ALREADY USED! Checked in at ${timeStr} IST (Receipt #${ticket.receipt || 'CHECKED'}).`,
      409
    );
  }
  throw new AppError('Admission verification failed.', 400);
}
