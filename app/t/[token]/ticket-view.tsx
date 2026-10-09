'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, Music2, AlertCircle, Share2, Printer, Calendar } from 'lucide-react';
import QRCode from 'qrcode';

export default function TicketView({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);

  async function load() {
    try {
      const r = await fetch('/api/ticket/' + encodeURIComponent(token), { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to load ticket.');
      setData(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Load ticket on mount
  useEffect(() => {
    void load();
  }, [token]);

  // Polling check-in status every 5 seconds so when volunteer scans, screen updates live!
  useEffect(() => {
    if (!data?.ticket || data.ticket.entered_at || data.ticket.cancelled) return;
    const interval = setInterval(() => {
      void fetch('/api/ticket/' + encodeURIComponent(token), { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((fresh) => {
          if (fresh?.ticket?.entered_at) {
            setData(fresh);
          }
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [data?.ticket?.entered_at, data?.ticket?.cancelled, token]);

  // Generate QR code for the ticket
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const qrContent = JSON.stringify({
      site: window.location.origin,
      token,
      url: `${window.location.origin}/t/${token}`,
    });

    QRCode.toDataURL(qrContent, {
      width: 600,
      margin: 2,
      color: {
        dark: '#271237',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then(setQrCodeUrl)
      .catch(() => setError('Could not generate ticket QR code.'));
  }, [token]);

  const t = data?.ticket;
  const ev = data?.event;
  const formattedDate = ev?.date
    ? new Date(ev.date).toLocaleString('en-IN', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      }) + ' IST'
    : 'Date to be announced';

  function copyLink() {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <main className="ticket-page">
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Music2 style={{ color: '#a32155' }} />
          <span style={{ fontWeight: 800, letterSpacing: 2, fontSize: 16 }}>DANDIYA NIGHT</span>
        </a>
        <p className="eyebrow" style={{ marginTop: 8 }}>OFFICIAL DIGITAL PASS</p>
      </div>

      {error && (
        <div className="message" role="alert" style={{ background: '#fdf2f2', color: '#991b1b' }}>
          <AlertCircle size={18} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p>Opening your celebratory pass…</p>
        </div>
      ) : !data || !t ? (
        <div className="panel" style={{ textAlign: 'center' }}>
          <p>Ticket details unavailable.</p>
          <button className="primary" onClick={() => { setLoading(true); void load(); }}>Try again</button>
        </div>
      ) : (
        <>
          {t.entered_at ? (
            <section className="admitted" aria-live="polite">
              <CheckCircle size={52} style={{ margin: '0 auto 16px', color: '#a7f3d0' }} />
              <h2 style={{ color: '#ffffff', marginBottom: 6 }}>Entry Confirmed!</h2>
              <p style={{ fontSize: 20, fontWeight: 700, margin: '4px 0 16px' }}>{t.name}</p>
              <div className="gate-stamp">{t.receipt}</div>
              <p style={{ fontSize: 13, color: '#d1fae5', marginTop: 12 }}>
                Checked in on {new Date(t.entered_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
              </p>
              <p style={{ fontSize: 13, opacity: 0.9, marginTop: 8 }}>
                This pass has been admitted. Enjoy the celebration! 💃
              </p>
            </section>
          ) : (
            <section className="guest-ticket">
              <p className="eyebrow" style={{ color: '#edbd74' }}>MUSIC · MOVEMENT · CELEBRATION</p>
              <h1 style={{ margin: '10px 0', fontSize: 36 }}>{ev?.name || 'Dandiya Night'}</h1>
              <p style={{ letterSpacing: 3, fontWeight: 700, color: '#f4cf87', margin: '4px 0 16px' }}>ADMIT ONE</p>

              <div className="details">
                <p className="guest" style={{ fontWeight: 800 }}>{t.name}</p>
                <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Calendar size={16} /> {formattedDate}
                </p>
                <p>{ev?.venue}</p>
              </div>

              {t.cancelled ? (
                <div className="message" style={{ background: '#fef2f2', color: '#991b1b', fontWeight: 700 }}>
                  THIS TICKET HAS BEEN CANCELLED
                </div>
              ) : (
                <div style={{ textAlign: 'center', margin: '20px 0' }}>
                  {qrCodeUrl ? (
                    <div style={{ background: '#ffffff', padding: 16, borderRadius: 16, display: 'inline-block', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                      <img src={qrCodeUrl} alt="Your Unique Ticket QR Code" style={{ width: 220, height: 220, display: 'block' }} />
                      <p style={{ color: '#42133e', fontWeight: 800, fontSize: 13, letterSpacing: 2, margin: '8px 0 0' }}>
                        SCAN AT ENTRANCE
                      </p>
                    </div>
                  ) : (
                    <p>Generating your entrance QR…</p>
                  )}
                  <p style={{ fontSize: 13, color: '#f5d5e5', marginTop: 12 }}>
                    Show this QR code to the gate volunteer for scanning upon arrival.
                  </p>
                </div>
              )}

              <p className="token" style={{ fontSize: 12, opacity: 0.75, letterSpacing: 1 }}>
                PASS ID: {t.token.slice(0, 18).toUpperCase()}...
              </p>
            </section>
          )}

          <div className="actions no-print" style={{ justifyContent: 'center', marginTop: 20 }}>
            <button className="secondary" onClick={() => window.print()}>
              <Printer size={16} style={{ display: 'inline', marginRight: 6 }} /> Print / Save Pass
            </button>
            <button className="secondary" onClick={copyLink}>
              <Share2 size={16} style={{ display: 'inline', marginRight: 6 }} /> {copied ? 'Link Copied!' : 'Share Pass Link'}
            </button>
          </div>

          <p className="muted no-print" style={{ textAlign: 'center', marginTop: 18, fontSize: 13 }}>
            Keep this ticket link and QR code private. Each QR allows exactly one entry.
          </p>
        </>
      )}
    </main>
  );
}
