import { db, json, failure, body, str } from '@/lib/server';
import { sendTicketEmail } from '@/lib/email';
import QRCode from 'qrcode';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const b = await body(req);
    const action = b.action || 'pay';

    // Fetch active event details
    const eventRow = await db().execute({ sql: 'SELECT * FROM event WHERE id=1', args: [] });
    const event = (eventRow.rows[0] as any) || {
      name: 'Dandiya Night 2026',
      date: '2026-10-24T18:30',
      venue: 'Royal Celebration Grounds, Main Arena',
      price: 49900,
    };

    const name = str(b.name, 1, 100);
    const email = str(b.email, 3, 254).toLowerCase();
    const contact = str(b.contact || '', 0, 50);
    const quantity = Math.max(1, Math.min(10, Number(b.quantity) || 1));

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Please enter a valid email address.' }, 400);
    }

    const unitPrice = Number(event.price) || 49900;
    const totalAmount = unitPrice * quantity; // In paise

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    // STEP 1: Create Razorpay Order if requested and keys configured
    if (action === 'create-order') {
      if (razorpayKeyId && razorpayKeySecret) {
        const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: totalAmount,
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`,
            notes: { name, email, quantity: String(quantity) },
          }),
        });

        if (rzpRes.ok) {
          const rzpData = await rzpRes.json();
          return json({
            orderId: rzpData.id,
            amount: totalAmount,
            currency: 'INR',
            keyId: razorpayKeyId,
            mode: 'razorpay',
          });
        }
      }

      // If Razorpay keys are not configured, offer demo/test mode
      return json({
        orderId: `demo_order_${Date.now()}`,
        amount: totalAmount,
        currency: 'INR',
        keyId: null,
        mode: 'demo',
      });
    }

    // STEP 2: Verify and Issue Tickets
    if (action === 'complete-payment') {
      // If Razorpay was used and signature provided, verify it
      if (b.razorpay_payment_id && b.razorpay_order_id && b.razorpay_signature && razorpayKeySecret) {
        const expectedSignature = crypto
          .createHmac('sha256', razorpayKeySecret)
          .update(`${b.razorpay_order_id}|${b.razorpay_payment_id}`)
          .digest('hex');

        if (expectedSignature !== b.razorpay_signature) {
          return json({ error: 'Payment verification failed. Please contact support.' }, 400);
        }
      }

      const origin = new URL(req.url).origin;
      const createdTickets = [];
      let emailStatus: any = null;

      for (let i = 0; i < quantity; i++) {
        const token = crypto.randomUUID();
        const requestId = crypto.randomUUID();
        const guestName = quantity > 1 ? `${name} (Pass #${i + 1})` : name;
        const method = b.razorpay_payment_id ? 'Razorpay (Online)' : 'Online Card/UPI';

        await db().execute({
          sql: `INSERT INTO tickets (token, name, email, contact, method, amount, issued_by, created_at, request_id, cancelled)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          args: [
            token,
            guestName,
            email,
            contact,
            method,
            unitPrice,
            'Online Checkout',
            new Date().toISOString(),
            requestId,
          ],
        });

        const ticketUrl = `${origin}/t/${token}`;
        // Encode ticket URL into QR code data
        let qrDataUrl = '';
        try {
          qrDataUrl = await QRCode.toDataURL(ticketUrl, {
            width: 500,
            margin: 2,
            errorCorrectionLevel: 'M',
          });
        } catch (e) {
          console.error('Failed to generate ticket QR data URL:', e);
        }

        // Send email via Resend and await completion so serverless does not freeze before delivery
        try {
          emailStatus = await sendTicketEmail({
            to: email,
            name: guestName,
            event: {
              name: event.name,
              date: event.date,
              venue: event.venue,
            },
            ticketUrl,
            qrDataUrl,
            token,
          });
        } catch (err: any) {
          console.error('Email send failed:', err);
          emailStatus = { ok: false, error: err.message };
        }

        createdTickets.push({ token, name: guestName, ticketUrl });
      }

      return json({
        ok: true,
        message: `${quantity} ticket(s) issued successfully!`,
        tickets: createdTickets,
        primaryTicketUrl: createdTickets[0].ticketUrl,
        emailStatus,
      });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    return failure(err);
  }
}
