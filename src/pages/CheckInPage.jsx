import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const SESSION_TYPES = [
  { id: 'gi', label: 'Gi', emoji: '🥋' },
  { id: 'nogi', label: 'No-Gi', emoji: '🩳' },
  { id: 'open_mat', label: 'Open Mat', emoji: '🤼' },
  { id: 'comp_class', label: 'Comp Class', emoji: '🏆' },
  { id: 'private', label: 'Private', emoji: '🎯' },
];

const ENERGY_LEVELS = [
  { val: 1, emoji: '😵', label: 'Dead' },
  { val: 2, emoji: '😮‍💨', label: 'Tough' },
  { val: 3, emoji: '😐', label: 'OK' },
  { val: 4, emoji: '😊', label: 'Good' },
  { val: 5, emoji: '🔥', label: 'Great' },
];

export default function CheckInPage() {
  const { user, gym, profile } = useAuth();
  const [activeCheckin, setActiveCheckin] = useState(null);
  const [selectedType, setSelectedType] = useState('gi');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDebrief, setShowDebrief] = useState(false);
  const [energy, setEnergy] = useState(null);
  const [note, setNote] = useState('');
  const [elapsed, setElapsed] = useState('');

  // Load active check-in
  useEffect(() => {
    loadActiveCheckin();
  }, [user, gym]);

  // Timer for active check-in
  useEffect(() => {
    if (!activeCheckin) return;
    const tick = () => {
      const start = new Date(activeCheckin.checked_in_at);
      const diff = Math.floor((Date.now() - start.getTime()) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [activeCheckin]);

  async function loadActiveCheckin() {
    if (!user || !gym) { setLoading(false); return; }
    const { data } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', user.id)
      .eq('gym_id', gym.id)
      .is('checked_out_at', null)
      .order('checked_in_at', { ascending: false })
      .limit(1)
      .single();
    setActiveCheckin(data || null);
    setLoading(false);
  }

  async function checkIn() {
    setActionLoading(true);
    const { data, error } = await supabase
      .from('checkins')
      .insert({
        user_id: user.id,
        gym_id: gym.id,
        session_type: selectedType,
      })
      .select()
      .single();
    if (!error) setActiveCheckin(data);
    setActionLoading(false);
  }

  async function checkOut() {
    setShowDebrief(true);
  }

  async function submitCheckout() {
    setActionLoading(true);
    const updates = { checked_out_at: new Date().toISOString() };
    if (energy) updates.energy_rating = energy;
    if (note.trim()) updates.note = note.trim();

    await supabase
      .from('checkins')
      .update(updates)
      .eq('id', activeCheckin.id);

    setActiveCheckin(null);
    setShowDebrief(false);
    setEnergy(null);
    setNote('');
    setActionLoading(false);
  }

  async function skipDebrief() {
    setActionLoading(true);
    await supabase
      .from('checkins')
      .update({ checked_out_at: new Date().toISOString() })
      .eq('id', activeCheckin.id);
    setActiveCheckin(null);
    setShowDebrief(false);
    setActionLoading(false);
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;
  }

  // Debrief modal
  if (showDebrief) {
    return (
      <div className="container" style={{ paddingTop: 40, paddingBottom: 100 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, marginBottom: 8 }}>
          How was the roll?
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 24 }}>
          Optional — skip if you want.
        </p>

        <div className="card" style={{ marginBottom: 16 }}>
          <label className="label">Energy Level</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {ENERGY_LEVELS.map((e) => (
              <button
                key={e.val}
                onClick={() => setEnergy(e.val)}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  background: energy === e.val ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
                  border: energy === e.val ? '1px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 22 }}>{e.emoji}</span>
                <span style={{ fontSize: 10, color: energy === e.val ? 'white' : 'var(--text-dim)' }}>{e.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <label className="label">Quick Note</label>
          <textarea
            className="input"
            placeholder="What did you work on? How did it go?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            style={{ resize: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-primary" onClick={submitCheckout} disabled={actionLoading}>
            {actionLoading ? '...' : '✓ Save & Check Out'}
          </button>
          <button className="btn btn-secondary" onClick={skipDebrief} disabled={actionLoading}>
            Skip — Just Check Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 100 }}>
      {/* Greeting */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, marginTop: 4 }}>
          {activeCheckin ? "You're on the mat 💪" : `Hey ${profile?.display_name?.split(' ')[0] || 'there'}`}
        </h1>
      </div>

      {activeCheckin ? (
        /* CHECKED IN STATE */
        <div>
          <div
            className="card checkin-active"
            style={{
              textAlign: 'center',
              padding: 32,
              border: '1px solid var(--accent)',
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 14, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600, marginBottom: 8 }}>
              Checked In — {SESSION_TYPES.find((t) => t.id === activeCheckin.session_type)?.label}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, color: '#f0ece2', margin: '12px 0' }}>
              {elapsed}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              Since {new Date(activeCheckin.checked_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <button className="btn btn-danger" onClick={checkOut} disabled={actionLoading}>
            🛑 Check Out
          </button>
        </div>
      ) : (
        /* CHECK IN STATE */
        <div>
          {/* Session type selector */}
          <div style={{ marginBottom: 24 }}>
            <label className="label">What are you training?</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {SESSION_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  style={{
                    padding: '16px 8px',
                    background: selectedType === t.id ? 'var(--accent)' : 'rgba(255,255,255,0.03)',
                    border: selectedType === t.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 24 }}>{t.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: selectedType === t.id ? 'white' : 'var(--text-dim)' }}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* BIG CHECK IN BUTTON */}
          <button
            className="btn btn-primary"
            onClick={checkIn}
            disabled={actionLoading}
            style={{ padding: '20px 24px', fontSize: 18 }}
          >
            {actionLoading ? '...' : '🤙 Check In'}
          </button>
        </div>
      )}
    </div>
  );
}
