'use client';
import { useState, useEffect } from 'react';
import {
  Music2,
  Calendar,
  MapPin,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  ExternalLink,
  Users,
  ChevronRight,
  ArrowRight,
  CreditCard,
  QrCode,
  Share2,
} from 'lucide-react';

export default function PublicHomePage() {
  const [event, setEvent] = useState({
    name: 'Dandiya Night 2026',
    date: '2026-10-24T18:30',
    venue: 'Royal Celebration Grounds, Main Arena',
    price: 49900,
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmedTickets, setConfirmedTickets] = useState<any[] | null>(null);

  // Fetch event details
  useEffect(() => {
    fetch('/api/manage')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.event) {
          setEvent(data.event);
        }
      })
      .catch(() => {});
  }, []);

  const unitPrice = event.price ? event.price / 100 : 499;
  const totalAmount = unitPrice * quantity;

  const formattedDate = event.date
    ? new Date(event.date).toLocaleString('en-IN', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      }) + ' IST'
    : 'Saturday, 24 October 2026 · 6:30 PM IST';

  // Handle Ticket Booking & Payment
  async function handleBooking(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Step 1: Create Order
      const orderRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-order',
          name,
          email,
          contact,
          quantity,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to initialize payment.');

      // Step 2: Handle Razorpay if keyId returned, or complete directly
      if (orderData.mode === 'razorpay' && orderData.keyId) {
        // Load Razorpay Script dynamically
        const loadScript = () =>
          new Promise((resolve) => {
            if ((window as any).Razorpay) return resolve(true);
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
          });

        const scriptLoaded = await loadScript();
        if (!scriptLoaded) throw new Error('Razorpay gateway failed to load. Please try again.');

        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: 'INR',
          name: event.name,
          description: `${quantity} Dandiya Night Entry Pass(es)`,
          order_id: orderData.orderId,
          prefill: {
            name,
            email,
            contact,
          },
          theme: { color: '#a32155' },
          handler: async function (response: any) {
            // Verify and complete
            await finalizePayment({
              ...response,
              name,
              email,
              contact,
              quantity,
            });
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // Demo / Instant test checkout mode
        await finalizePayment({
          action: 'complete-payment',
          name,
          email,
          contact,
          quantity,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Payment could not be processed.');
      setLoading(false);
    }
  }

  async function finalizePayment(payload: any) {
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete-payment',
          ...payload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ticket issuance failed.');

      setConfirmedTickets(data.tickets || []);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
      setLoading(false);
    }
  }

  return (
    <div className="shell">
      {/* Top Navbar */}
      <header>
        <a className="brand" href="/">
          <Music2 /> DANDIYA <span>NIGHT</span>
        </a>
        <div className="actions" style={{ alignItems: 'center' }}>
          <a href="#book" className="primary" style={{ padding: '8px 16px', fontSize: 14 }}>
            Get Passes
          </a>
          <a href="/manage" className="small-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
            <ShieldCheck size={14} /> Staff / Gate Scanner
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="intro">
        <div style={{ maxWidth: 620 }}>
          <p className="eyebrow">DANDIYA & GARBA UTSAV 2026</p>
          <h1>
            A rhythm in every step.<br />
            <em>A night full of celebration.</em>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: '#52435e' }}>
            Experience the grandest Dandiya night of the season. Live beats, traditional music,
            festive dress, and endless energy on the dance floor.
          </p>

          <div style={{ display: 'flex', gap: 16, marginTop: 24, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: '#42133e', fontWeight: 600 }}>
              <Calendar size={18} style={{ color: '#a32155' }} /> {formattedDate}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: '#42133e', fontWeight: 600 }}>
              <MapPin size={18} style={{ color: '#a32155' }} /> {event.venue}
            </div>
          </div>
        </div>

        {/* Visual Mini Pass Card */}
        <div className="mini-ticket">
          <span>EXCLUSIVE ENTRY PASS</span>
          <h2>{event.name}</h2>
          <div className="ticket-rule" />
          <p style={{ margin: '14px 0 6px' }}>₹{unitPrice} PER PASS</p>
          <strong>ONE QR · ONE ENTRY</strong>
        </div>
      </section>

      {/* Highlights Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, margin: '30px 0 50px' }}>
        <div className="panel" style={{ padding: 20 }}>
          <Sparkles style={{ color: '#a32155', marginBottom: 10 }} />
          <h3 style={{ fontSize: 17, marginBottom: 4 }}>Live Dhol & Garba DJ</h3>
          <p style={{ fontSize: 14, margin: 0 }}>Non-stop authentic Garba and modern festive fusion tracks all evening.</p>
        </div>
        <div className="panel" style={{ padding: 20 }}>
          <QrCode style={{ color: '#a32155', marginBottom: 10 }} />
          <h3 style={{ fontSize: 17, marginBottom: 4 }}>Instant QR Pass Delivery</h3>
          <p style={{ fontSize: 14, margin: 0 }}>Unique digital QR pass sent straight to your email via Resend.</p>
        </div>
        <div className="panel" style={{ padding: 20 }}>
          <Music2 style={{ color: '#a32155', marginBottom: 10 }} />
          <h3 style={{ fontSize: 17, marginBottom: 4 }}>Dandiya Sticks Provided</h3>
          <p style={{ fontSize: 14, margin: 0 }}>Complementary pair of dandiya sticks handed to every ticket holder at entrance.</p>
        </div>
        <div className="panel" style={{ padding: 20 }}>
          <Users style={{ color: '#a32155', marginBottom: 10 }} />
          <h3 style={{ fontSize: 17, marginBottom: 4 }}>Food & Refreshment Stalls</h3>
          <p style={{ fontSize: 14, margin: 0 }}>Delicious Chaat, festive delicacies, and beverage counters inside.</p>
        </div>
      </section>

      {/* Booking Form or Confirmation Section */}
      <section id="book" style={{ maxWidth: 680, margin: '0 auto 60px' }}>
        {confirmedTickets ? (
          <div className="panel stack" style={{ textAlign: 'center', border: '2px solid #10b981', background: '#f0fdf4' }}>
            <CheckCircle size={56} style={{ color: '#10b981', margin: '0 auto 10px' }} />
            <h2 style={{ color: '#065f46', fontSize: 28 }}>Payment Successful! 🎉</h2>
            <p style={{ fontSize: 16, color: '#047857', maxWidth: 480, margin: '0 auto' }}>
              Your {confirmedTickets.length} Dandiya Night entry pass(es) have been generated.
              We've also dispatched your ticket(s) with QR codes to <strong>{email}</strong> via email.
            </p>

            <div style={{ background: '#ffffff', borderRadius: 14, padding: 20, margin: '20px 0', border: '1px solid #d1fae5' }}>
              <h3 style={{ marginBottom: 12, fontSize: 18 }}>Your Digital Passes:</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {confirmedTickets.map((t, idx) => (
                  <div key={t.token} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f9f6fa', borderRadius: 8 }}>
                    <div>
                      <strong>{t.name}</strong>
                      <div className="muted" style={{ fontSize: 12 }}>Pass #{idx + 1}</div>
                    </div>
                    <a
                      href={t.ticketUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="primary"
                      style={{ padding: '8px 14px', fontSize: 13, textDecoration: 'none' }}
                    >
                      View QR Pass <ChevronRight size={14} />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <div className="actions" style={{ justifyContent: 'center' }}>
              <a
                href={confirmedTickets[0].ticketUrl}
                className="primary"
                style={{ textDecoration: 'none', padding: '14px 28px', fontSize: 16 }}
              >
                Open Main Ticket Now
              </a>
              <button
                className="secondary"
                onClick={() => {
                  setConfirmedTickets(null);
                  setName('');
                  setEmail('');
                  setContact('');
                  setQuantity(1);
                }}
              >
                Book More Passes
              </button>
            </div>
          </div>
        ) : (
          <div className="panel stack" style={{ border: '2px solid #e5dce7', boxShadow: '0 12px 36px rgba(66,19,62,0.08)' }}>
            <div>
              <p className="eyebrow">ONLINE TICKET COUNTER</p>
              <h2 style={{ fontSize: 28, margin: '4px 0 8px' }}>Book Your Dandiya Passes</h2>
              <p style={{ margin: 0 }}>
                Instant confirmation. Digital QR code pass generated on screen and sent to your email.
              </p>
            </div>

            {error && (
              <div role="alert" className="message" style={{ background: '#fef2f2', color: '#991b1b', margin: '10px 0' }}>
                {error}
              </div>
            )}

            <form className="form" onSubmit={handleBooking}>
              <label>
                Full Name of Guest *
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  autoComplete="name"
                />
              </label>

              <label>
                Email Address (where QR ticket will be sent) *
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </label>

              <label>
                Mobile Number / WhatsApp (for event updates) *
                <input
                  required
                  type="tel"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                />
              </label>

              <div>
                <label style={{ display: 'block', marginBottom: 8 }}>Number of Tickets</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <button
                    type="button"
                    className="secondary"
                    style={{ width: 44, height: 44, fontSize: 20, padding: 0 }}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    -
                  </button>
                  <span style={{ fontSize: 22, fontWeight: 700, minWidth: 36, textAlign: 'center' }}>
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className="secondary"
                    style={{ width: 44, height: 44, fontSize: 20, padding: 0 }}
                    onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  >
                    +
                  </button>
                  <span className="muted" style={{ marginLeft: 8 }}>
                    (₹{unitPrice} per person)
                  </span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div
                style={{
                  background: '#f9f6fa',
                  padding: '16px 20px',
                  borderRadius: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: '#716578' }}>Total Payable Amount:</div>
                  <strong style={{ fontSize: 26, color: '#42133e' }}>₹{totalAmount.toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ textAlign: 'right', fontSize: 13, color: '#716578' }}>
                  {quantity} Pass{quantity > 1 ? 'es' : ''} × ₹{unitPrice}
                </div>
              </div>

              <button
                type="submit"
                className="primary"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: 18,
                  justifyContent: 'center',
                  background: '#a32155',
                }}
              >
                <CreditCard size={20} />
                {loading ? 'Processing Payment…' : `Pay ₹${totalAmount.toLocaleString('en-IN')} & Get Tickets`}
              </button>

              <div style={{ textAlign: 'center', fontSize: 13, color: '#716578', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <ShieldCheck size={16} style={{ color: '#16a34a' }} />
                <span>100% Secure Checkout · UPI, Credit/Debit Cards, NetBanking</span>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', paddingTop: 30, textAlign: 'center', color: '#716578', fontSize: 14 }}>
        <p style={{ margin: '0 0 10px' }}>
          {event.name} · Celebration Entry Policy: One scannable QR pass per person.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
          <a href="/manage" style={{ color: '#a32155', fontWeight: 600, textDecoration: 'none' }}>
            Gate Volunteer Scanner & Portal
          </a>
        </div>
      </footer>
    </div>
  );
}
