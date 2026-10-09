import { Resend } from 'resend';

export async function sendTicketEmail({
  to,
  name,
  event,
  ticketUrl,
  qrDataUrl,
  token,
}: {
  to: string;
  name: string;
  event: { name: string; date: string; venue: string };
  ticketUrl: string;
  qrDataUrl?: string;
  token: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `[Resend Notice] RESEND_API_KEY not configured. Simulated ticket email to ${to}: ${ticketUrl}`
    );
    return { ok: false, notice: 'RESEND_API_KEY not configured' };
  }

  const resend = new Resend(apiKey);
  // Default to onboarding domain provided by Resend, or custom domain if configured
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Dandiya Night <onboarding@resend.dev>';

  const formattedDate = event.date
    ? new Date(event.date).toLocaleString('en-IN', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      }) + ' IST'
    : 'Date to be announced';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Dandiya Night Ticket</title>
      <style>
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fcfafc; color: #271237; }
        .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 18px; border: 1px solid #e5dce7; overflow: hidden; }
        .header { background: #42133e; color: #ffffff; padding: 36px 30px; text-align: center; border-bottom: 4px solid #edbd74; }
        .eyebrow { color: #f4cf87; font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 10px; }
        .title { font-size: 32px; margin: 0; font-weight: 700; }
        .content { padding: 32px 30px; text-align: center; }
        .ticket-badge { background: #fdf6ec; border: 2px dashed #edbd74; border-radius: 14px; padding: 24px; margin: 24px 0; text-align: center; }
        .guest-name { font-size: 24px; font-weight: 800; color: #a32155; margin: 0 0 8px; }
        .token { font-family: monospace; font-size: 15px; color: #716578; letter-spacing: 1px; margin: 0 0 16px; }
        .qr-box { margin: 20px auto; max-width: 240px; padding: 12px; background: #fff; border-radius: 12px; border: 1px solid #e5dce7; }
        .qr-box img { width: 100%; height: auto; display: block; }
        .meta { text-align: left; background: #f9f6fa; border-radius: 10px; padding: 16px 20px; margin: 20px 0; font-size: 15px; line-height: 1.6; }
        .meta strong { color: #42133e; }
        .btn { display: inline-block; background: #a32155; color: #ffffff !important; text-decoration: none; font-weight: 700; padding: 15px 32px; border-radius: 10px; font-size: 16px; margin: 16px 0; }
        .footer { text-align: center; font-size: 13px; color: #8e8396; padding: 20px; border-top: 1px solid #f0edf3; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <p class="eyebrow">Dandiya Night · Official Admission Ticket</p>
          <h1 class="title">${event.name}</h1>
        </div>
        <div class="content">
          <p style="font-size: 17px; margin-top: 0;">Namaste <strong>${name}</strong>, your ticket is confirmed! 🎉</p>
          <div class="ticket-badge">
            <div class="guest-name">${name}</div>
            <div class="token">TICKET #${token.slice(0, 8).toUpperCase()}</div>
            ${qrDataUrl ? `<div class="qr-box"><img src="${qrDataUrl}" alt="Ticket QR Code" /></div>` : ''}
            <p style="font-size: 14px; color: #5a4f63; margin: 10px 0 0;">
              Show this QR code at the entrance gate volunteer for check-in.
            </p>
          </div>
          <div class="meta">
            <div><strong>🗓 Date & Time:</strong> ${formattedDate}</div>
            <div style="margin-top: 8px;"><strong>📍 Venue:</strong> ${event.venue}</div>
            <div style="margin-top: 8px;"><strong>🎫 Pass Type:</strong> General Admission (Admit 1)</div>
          </div>
          <div>
            <a href="${ticketUrl}" class="btn">View Digital Pass Online</a>
          </div>
        </div>
        <div class="footer">
          One ticket · One entry. Please do not share your private ticket QR code with anyone else.<br/>
          See you on the dance floor! 💃🕺
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `🪔 Your Ticket for ${event.name} - ${name}`,
      html,
    });
    return { ok: true, data };
  } catch (error) {
    console.error('Failed to send Resend email:', error);
    return { ok: false, error };
  }
}
