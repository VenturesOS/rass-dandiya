'use client';
import { useEffect, useState, useRef } from 'react';
import {
  Ticket,
  Users,
  ScanLine,
  Settings,
  Plus,
  Music2,
  Copy,
  Printer,
  RefreshCw,
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

type Guest = {
  token: string;
  name: string;
  email?: string;
  contact: string;
  method: string;
  amount: number;
  cancelled: number;
  entered_at: string | null;
  receipt: string | null;
  issued_by: string;
};

type EventData = {
  name: string;
  date: string;
  venue: string;
  price: number;
  gate_key?: string;
  gate_open: number;
};

type Data = {
  event: EventData;
  tickets: Guest[];
  team: { email: string }[];
  user: { email: string; isOwner: boolean };
};

const initial: EventData = {
  name: 'Dandiya Night 2026',
  date: '2026-10-24T18:30',
  venue: 'Royal Celebration Grounds, Main Arena',
  price: 49900,
  gate_open: 1,
};

export async function call(action: Record<string, unknown>) {
  const r = await fetch('/api/manage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action),
  });
  const d: any = await r.json();
  if (!r.ok) throw new Error(d.error || 'Please try again.');
  return d;
}

export function playAudioFeedback(success: boolean) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {}
}

export default function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [auth, setAuth] = useState(0);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('gate'); // Default to Gate Scanner for quick action
  const [open, setOpen] = useState(false);
  const [newTicket, setNewTicket] = useState<Guest | null>(null);
  const [form, setForm] = useState(initial);
  const [paid, setPaid] = useState(false);
  const [method, setMethod] = useState('Cash');
  const [requestId, setRequestId] = useState('');
  const [query, setQuery] = useState('');
  const [confirm, setConfirm] = useState<Guest | null>(null);
  const [loginPass, setLoginPass] = useState('');

  // Scanner state
  const [scannerActive, setScannerActive] = useState(false);
  const [scanStatus, setScanStatus] = useState<{
    type: 'success' | 'error';
    title: string;
    detail: string;
    timestamp: string;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerInstance = useRef<any>(null);
  const isProcessingScan = useRef(false);

  async function refresh(quiet = false) {
    if (!quiet) setLoading(true);
    try {
      const r = await fetch('/api/manage', { cache: 'no-store' });
      const d: any = await r.json();
      if (!r.ok) {
        setAuth(r.status);
        throw new Error(d.error);
      }
      setData(d);
      setAuth(0);
      return d as Data;
    } catch (e) {
      if (!quiet) setError((e as Error).message);
      return null;
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  useEffect(() => {
    void refresh().then((d) => {
      if (d) setForm({ ...d.event, price: d.event.price / 100 });
    });
  }, []);

  useEffect(() => {
    if (!data) return;
    const timer = setInterval(() => void refresh(true), 8000);
    return () => clearInterval(timer);
  }, [!!data]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function start() {
    setError('');
    setNewTicket(null);
    setPaid(false);
    setMethod('Cash');
    setRequestId(crypto.randomUUID());
    setOpen(true);
  }

  function link(t: Guest) {
    return typeof window !== 'undefined' ? `${window.location.origin}/t/${t.token}` : `/t/${t.token}`;
  }

  async function copy(t: Guest) {
    try {
      await navigator.clipboard.writeText(link(t));
      setMessage('Ticket link copied to clipboard.');
    } catch {
      setNewTicket(t);
      setOpen(true);
      setError('Copy was unavailable. Select and copy the link below.');
    }
  }

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPass }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setLoginPass('');
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function doLogout() {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      setData(null);
      setAuth(401);
      stopScanner();
    } catch {}
  }

  // Gate Scanner Logic
  async function handleScannedToken(raw: string) {
    if (isProcessingScan.current) return;
    isProcessingScan.current = true;

    let token = raw.trim();
    // Parse if JSON payload
    try {
      if (token.startsWith('{')) {
        const parsed = JSON.parse(token);
        if (parsed.token) token = parsed.token;
      }
    } catch {}

    // Extract token if URL
    if (token.includes('/t/')) {
      const parts = token.split('/t/')[1].split(/[?#]/)[0];
      if (parts) token = parts.trim();
    }

    try {
      const res = await call({ action: 'admit', token });
      playAudioFeedback(true);
      setScanStatus({
        type: 'success',
        title: `ADMITTED: ${res.ticket.name}`,
        detail: `Receipt #${res.ticket.receipt || 'CHECKED'} · Admitted Just Now`,
        timestamp: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
      });
      await refresh(true);
    } catch (err: any) {
      playAudioFeedback(false);
      setScanStatus({
        type: 'error',
        title: 'ENTRY DENIED',
        detail: err.message || 'Invalid ticket.',
        timestamp: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
      });
    } finally {
      // Allow next scan after 2.5 seconds
      setTimeout(() => {
        isProcessingScan.current = false;
      }, 2500);
    }
  }

  function startScanner() {
    setError('');
    setScanStatus(null);
    setScannerActive(true);
  }

  function stopScanner() {
    setScannerActive(false);
    if (scannerInstance.current) {
      scannerInstance.current.destroy();
      scannerInstance.current = null;
    }
  }

  useEffect(() => {
    if (!scannerActive || !videoRef.current) return;

    let destroyed = false;
    import('qr-scanner')
      .then(({ default: QrScanner }) => {
        if (destroyed || !videoRef.current) return;
        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            void handleScannedToken(result.data);
          },
          {
            preferredCamera: 'environment',
            highlightScanRegion: true,
            returnDetailedScanResult: true,
            maxScansPerSecond: 4,
          }
        );
        scannerInstance.current = scanner;
        scanner.start().catch((err) => {
          if (!destroyed) {
            setError('Camera permission denied or camera not found: ' + err.message);
            setScannerActive(false);
          }
        });
      })
      .catch(() => {
        setError('QR Scanner module failed to load.');
        setScannerActive(false);
      });

    return () => {
      destroyed = true;
      if (scannerInstance.current) {
        scannerInstance.current.destroy();
        scannerInstance.current = null;
      }
    };
  }, [scannerActive]);

  const tickets = data?.tickets || [];
  const ev = data?.event || initial;
  const active = tickets.filter((t) => !t.cancelled);
  const checked = active.filter((t) => t.entered_at);
  const visible = tickets.filter((t) =>
    (t.name + ' ' + t.contact + ' ' + (t.email || '') + ' ' + t.token)
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <main className="shell">
      <header>
        <a className="brand" href="/">
          <Music2 /> DANDIYA <span>NIGHT</span>
        </a>
        <div className="actions" style={{ alignItems: 'center' }}>
          <a href="/" className="small-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ExternalLink size={14} /> Public Website
          </a>
          <span className="pill">GATE MANAGEMENT</span>
          {data && (
            <button className="small-btn" onClick={doLogout}>
              Sign out
            </button>
          )}
        </div>
      </header>

      {error && <div role="alert" className="message no-print">{error}</div>}
      {message && <div role="status" className="message success no-print">{message}</div>}

      {!data ? (
        <section className="panel" style={{ maxWidth: 440, margin: '40px auto' }}>
          <h2>{loading ? 'Opening Portal…' : 'Organiser Sign In'}</h2>
          <p>Enter the management password to access the ticket list and camera gate scanner.</p>
          {!loading && (
            <form className="form" onSubmit={doLogin}>
              <label>
                Management Password
                <input
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  required
                  placeholder="Enter password (default: dandiya2026)"
                />
              </label>
              <button className="primary" disabled={busy}>
                {busy ? 'Verifying…' : 'Access Organiser Dashboard'}
              </button>
            </form>
          )}
        </section>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <nav className="no-print">
            <TabsList className="h-auto w-full justify-start bg-transparent p-0">
              <TabsTrigger value="gate">
                <ScanLine size={18} /> Gate Scanner
              </TabsTrigger>
              <TabsTrigger value="tickets">
                <Ticket size={18} /> Guest List ({active.length})
              </TabsTrigger>
              <TabsTrigger value="team">
                <Users size={18} /> Team
              </TabsTrigger>
              <TabsTrigger value="event">
                <Settings size={18} /> Event Details
              </TabsTrigger>
            </TabsList>
          </nav>

          <section className="stats">
            <div>
              <span>Total Active Passes</span>
              <strong>{active.length}</strong>
            </div>
            <div>
              <span>Admitted Guests</span>
              <strong style={{ color: '#16a34a' }}>{checked.length}</strong>
            </div>
            <div>
              <span>Remaining to Arrive</span>
              <strong style={{ color: '#d97706' }}>{active.length - checked.length}</strong>
            </div>
          </section>

          {/* TAB 1: GATE SCANNER */}
          <TabsContent value="gate">
            <div className="grid2">
              <section className="panel stack">
                <div className="row">
                  <div>
                    <h2>Live Camera Gate Scanner</h2>
                    <p>Point camera at guest's unique ticket QR code to verify admission.</p>
                  </div>
                  <button
                    className={ev.gate_open ? 'secondary' : 'primary'}
                    onClick={() =>
                      void run(async () => {
                        await call({ action: 'gate', open: !ev.gate_open });
                        await refresh(true);
                      })
                    }
                  >
                    Gate: {ev.gate_open ? 'Open (Active)' : 'Closed'}
                  </button>
                </div>

                {/* Scan Status Banner */}
                {scanStatus && (
                  <div
                    style={{
                      padding: '16px 20px',
                      borderRadius: 12,
                      background: scanStatus.type === 'success' ? '#ecfdf5' : '#fef2f2',
                      border: `2px solid ${scanStatus.type === 'success' ? '#10b981' : '#ef4444'}`,
                      color: scanStatus.type === 'success' ? '#065f46' : '#991b1b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                    }}
                  >
                    {scanStatus.type === 'success' ? (
                      <CheckCircle2 size={36} style={{ color: '#10b981', flexShrink: 0 }} />
                    ) : (
                      <XCircle size={36} style={{ color: '#ef4444', flexShrink: 0 }} />
                    )}
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>{scanStatus.title}</h3>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{scanStatus.detail}</p>
                    </div>
                  </div>
                )}

                {/* Camera Viewport */}
                <div style={{ textAlign: 'center', background: '#271237', borderRadius: 16, padding: 16, overflow: 'hidden' }}>
                  {scannerActive ? (
                    <div style={{ position: 'relative', width: '100%', maxWidth: 460, margin: '0 auto' }}>
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        style={{
                          width: '100%',
                          height: 'auto',
                          borderRadius: 12,
                          background: '#000',
                          display: 'block',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '65%',
                          height: '65%',
                          border: '3px dashed #edbd74',
                          borderRadius: 12,
                          pointerEvents: 'none',
                        }}
                      />
                      <button
                        className="secondary"
                        onClick={stopScanner}
                        style={{ marginTop: 14, background: '#ffffff', color: '#271237' }}
                      >
                        <CameraOff size={16} style={{ display: 'inline', marginRight: 6 }} /> Stop Camera
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '36px 20px', color: '#ffffff' }}>
                      <Camera size={48} style={{ margin: '0 auto 12px', color: '#f4cf87' }} />
                      <h3 style={{ color: '#ffffff', marginBottom: 6 }}>Camera Scanner Standby</h3>
                      <p style={{ color: '#e5dce7', fontSize: 14, maxWidth: 320, margin: '0 auto 18px' }}>
                        Ready to scan incoming guests at the entrance.
                      </p>
                      <button className="primary" onClick={startScanner} style={{ background: '#edbd74', color: '#271237' }}>
                        <Camera size={18} style={{ display: 'inline', marginRight: 6 }} /> Start Device Camera
                      </button>
                    </div>
                  )}
                </div>

                {/* Manual Fallback Entry */}
                <form
                  className="form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const raw = String(f.get('token')).trim();
                    void handleScannedToken(raw);
                    e.currentTarget.reset();
                  }}
                >
                  <label>
                    Manual Ticket Check-in (if guest phone screen is cracked)
                    <input name="token" required placeholder="Paste Ticket ID or Ticket Link URL" />
                  </label>
                  <button className="secondary" disabled={busy || !ev.gate_open}>
                    Verify & Check In
                  </button>
                </form>
              </section>

              {/* Right column: Recent Admissions */}
              <section className="panel stack">
                <div className="row">
                  <div>
                    <h2>Recent Admissions Stream</h2>
                    <p>Live stream of guests admitted through gate.</p>
                  </div>
                  <button className="secondary" onClick={() => void refresh(true)} aria-label="Refresh">
                    <RefreshCw size={16} />
                  </button>
                </div>

                {!checked.length ? (
                  <div className="empty">
                    <Ticket size={32} />
                    <p>No guests checked in yet. The gate is waiting for the first celebration entrant!</p>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Guest</TableHead>
                          <TableHead>Receipt</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {checked
                          .slice()
                          .sort((a, b) => (b.entered_at || '').localeCompare(a.entered_at || ''))
                          .slice(0, 15)
                          .map((t) => (
                            <TableRow key={t.token}>
                              <TableCell>
                                <strong>{t.name}</strong>
                                <div className="muted">{t.contact || t.email}</div>
                              </TableCell>
                              <TableCell>
                                <span className="badge" style={{ background: '#dcfce7', color: '#166534' }}>
                                  {t.receipt}
                                </span>
                              </TableCell>
                              <TableCell>
                                {new Date(t.entered_at!).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </section>
            </div>
          </TabsContent>

          {/* TAB 2: TICKETS */}
          <TabsContent value="tickets">
            <section className="panel">
              <div className="row">
                <div>
                  <h2>Guest List & Ticket Management</h2>
                  <p>All issued passes from online gateway purchases & in-person sales.</p>
                </div>
                <div className="actions">
                  <button className="secondary" onClick={() => void refresh()} aria-label="Refresh guest list">
                    <RefreshCw size={18} />
                  </button>
                  <button className="primary" onClick={start}>
                    <Plus size={18} /> Issue In-Person Pass
                  </button>
                </div>
              </div>

              <label className="muted" style={{ marginTop: 14 }}>
                Find a guest
                <input
                  className="search"
                  placeholder="Filter by name, phone, email or ticket ID…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>

              {!tickets.length ? (
                <div className="empty">
                  <Ticket size={36} />
                  <h3>No Tickets Issued Yet</h3>
                  <p>Passes purchased via online checkout or added manually will appear here.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Guest</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map((t) => (
                        <TableRow key={t.token}>
                          <TableCell>
                            <strong>{t.name}</strong>
                            <div className="muted">{t.contact}</div>
                            {t.email && <div className="muted">{t.email}</div>}
                            <div className="muted" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                              #{t.token.slice(0, 8).toUpperCase()}
                            </div>
                          </TableCell>
                          <TableCell>
                            ₹{(t.amount / 100).toLocaleString('en-IN')}
                            <div className="muted">{t.method}</div>
                          </TableCell>
                          <TableCell>
                            <span
                              className="badge"
                              style={{
                                background: t.cancelled ? '#fee2e2' : t.entered_at ? '#dcfce7' : '#f3f4f6',
                                color: t.cancelled ? '#991b1b' : t.entered_at ? '#166534' : '#374151',
                              }}
                            >
                              {t.cancelled ? 'Cancelled' : t.entered_at ? 'Admitted' : 'Valid'}
                            </span>
                            {t.entered_at && (
                              <div className="muted" style={{ fontSize: 12 }}>
                                {new Date(t.entered_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} ·{' '}
                                {t.receipt}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="actions">
                              <a className="small-btn" target="_blank" rel="noreferrer" href={'/t/' + t.token}>
                                View Pass
                              </a>
                              <button className="small-btn" onClick={() => void copy(t)}>
                                Copy Link
                              </button>
                              {!t.cancelled && !t.entered_at && (
                                <button className="small-btn" onClick={() => setConfirm(t)}>
                                  Cancel
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {!visible.length && <p>No matching guests found.</p>}
                </div>
              )}
            </section>
          </TabsContent>

          {/* TAB 3: TEAM */}
          <TabsContent value="team">
            <section className="panel stack">
              <div>
                <h2>Management Team</h2>
                <p>Volunteers who can issue tickets and operate the camera gate scanner.</p>
                <p className="muted">Signed in as {data.user.email} (Owner)</p>
              </div>
              <div className="row">
                <strong>{data.user.email}</strong>
                <span className="badge">Primary Owner</span>
              </div>
              {data.team.map((m) => (
                <div className="row" key={m.email}>
                  <span>{m.email}</span>
                  <button
                    disabled={busy}
                    className="small-btn"
                    onClick={() =>
                      void run(async () => {
                        await call({ action: 'member', email: m.email, remove: true });
                        await refresh(true);
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              <form
                className="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = e.currentTarget;
                  const email = new FormData(f).get('email');
                  void run(async () => {
                    await call({ action: 'member', email });
                    await refresh(true);
                    f.reset();
                    setMessage('Teammate access added.');
                  });
                }}
              >
                <label>
                  Teammate Email
                  <input required type="email" name="email" placeholder="friend@example.com" />
                </label>
                <button className="primary" disabled={busy || data.team.length >= 4}>
                  Add Teammate ({data.team.length}/4)
                </button>
              </form>
            </section>
          </TabsContent>

          {/* TAB 4: EVENT SETTINGS */}
          <TabsContent value="event">
            <section className="panel">
              <h2>Event Configuration</h2>
              <p>Event details appear on all generated tickets, the public booking page, and confirmation emails.</p>
              <form
                className="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await call({ action: 'event', ...form });
                    await refresh(true);
                    setMessage('Event details updated successfully.');
                  });
                }}
              >
                <label>
                  Event Name
                  <input
                    value={form.name}
                    maxLength={80}
                    required
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label>
                  Date and Time (IST)
                  <input
                    type="datetime-local"
                    value={form.date}
                    required
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </label>
                <label>
                  Venue & Address
                  <input
                    value={form.venue}
                    maxLength={200}
                    required
                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  />
                </label>
                <label>
                  Ticket Price (₹)
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    step="1"
                    value={form.price}
                    required
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  />
                </label>
                <button disabled={busy} className="primary">
                  Save Event Details
                </button>
              </form>
            </section>
          </TabsContent>
        </Tabs>
      )}

      {/* Manual Issue Dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }}>
        <DialogContent>
          <DialogTitle>{newTicket ? 'Pass Issued Successfully' : 'Issue In-Person Paid Pass'}</DialogTitle>
          <DialogDescription>
            {newTicket
              ? 'Send this digital pass link directly to the guest via WhatsApp or SMS.'
              : 'Record a pass issued after receiving cash or direct payment.'}
          </DialogDescription>
          {error && <div role="alert" className="message">{error}</div>}
          {newTicket ? (
            <div className="stack">
              <h3>{newTicket.name}</h3>
              <input
                aria-label="Ticket link"
                className="search"
                readOnly
                value={link(newTicket)}
                onFocus={(e) => e.target.select()}
              />
              <div className="actions">
                <button className="primary" onClick={() => void copy(newTicket)}>
                  <Copy size={16} /> Copy Pass Link
                </button>
                <a className="secondary" href={'/t/' + newTicket.token} target="_blank" rel="noreferrer">
                  Open Pass
                </a>
              </div>
            </div>
          ) : (
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void run(async () => {
                  const r = await call({
                    action: 'issue',
                    name: f.get('name'),
                    contact: f.get('contact'),
                    paid,
                    method,
                    requestId,
                  });
                  setNewTicket(r.ticket);
                  await refresh(true);
                });
              }}
            >
              <label>
                Guest Name
                <input required name="name" maxLength={100} autoComplete="name" />
              </label>
              <label>
                Phone or Contact (optional)
                <input name="contact" maxLength={100} />
              </label>
              <label>
                Payment Received Via
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Cash', 'UPI / personal transfer', 'Other'].map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <p>
                Amount: <strong>₹{(ev.price / 100).toLocaleString('en-IN')}</strong>
              </p>
              <div className="actions">
                <Checkbox id="paid" checked={paid} onCheckedChange={(v) => setPaid(v === true)} />
                <label htmlFor="paid">I confirm the payment has been collected.</label>
              </div>
              <button className="primary" disabled={busy || !paid}>
                {busy ? 'Creating Pass…' : 'Issue Pass'}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={!!confirm} onOpenChange={(v) => { if (!v) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogTitle>Cancel this ticket pass?</AlertDialogTitle>
          <AlertDialogDescription>
            {confirm?.name} will no longer be permitted to enter with this pass.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Pass</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const t = confirm;
                if (t) {
                  void run(async () => {
                    await call({ action: 'cancel', token: t.token });
                    await refresh(true);
                  });
                }
              }}
            >
              Cancel Pass
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
