import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const BELT_COLORS = {
  white: '#f5f5f0', blue: '#1a5fb4', purple: '#7b2d8e', brown: '#8b5e3c', black: '#1a1a1a',
};

const SORT_OPTIONS = [
  { id: 'total_sessions', label: 'Sessions' },
  { id: 'total_minutes', label: 'Hours' },
  { id: 'unique_days', label: 'Days' },
];

export default function GymPage() {
  const { user, gym, gymRole } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [members, setMembers] = useState([]);
  const [sortBy, setSortBy] = useState('total_sessions');
  const [loading, setLoading] = useState(true);
  const [showCode, setShowCode] = useState(false);
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    if (gym) {
      loadData();
    }
  }, [gym, sortBy]);

  async function loadData() {
    // Leaderboard (this month)
    const { data: lb } = await supabase
      .from('gym_leaderboard')
      .select('*')
      .eq('gym_id', gym.id);

    const sorted = (lb || []).sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
    setLeaderboard(sorted);

    // Total members
    const { data: mem } = await supabase
      .from('gym_members')
      .select('user_id, profiles(display_name, belt, avatar_emoji)')
      .eq('gym_id', gym.id);
    setMembers(mem || []);

    // Currently checked in
    const { data: live } = await supabase
      .from('checkins')
      .select('id')
      .eq('gym_id', gym.id)
      .is('checked_out_at', null);
    setLiveCount((live || []).length);

    setLoading(false);
  }

  const medals = ['🥇', '🥈', '🥉'];

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 100 }}>
      {/* Gym header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, margin: 0 }}>
          {gym?.name}
        </h2>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: 'var(--text-dim)' }}>
          <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
          {liveCount > 0 && <span style={{ color: 'var(--success)' }}>🟢 {liveCount} on the mat</span>}
        </div>
      </div>

      {/* Invite code */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
            Invite Code
          </div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 4,
            color: showCode ? '#f0ece2' : 'var(--text-muted)',
            marginTop: 4,
          }}>
            {showCode ? gym?.invite_code : '••••••'}
          </div>
        </div>
        <button
          className="btn btn-secondary btn-small"
          onClick={() => {
            if (showCode) {
              navigator.clipboard?.writeText(gym?.invite_code);
            }
            setShowCode(!showCode);
          }}
        >
          {showCode ? '📋 Copy' : '👁️ Show'}
        </button>
      </div>

      {/* Sort */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSortBy(opt.id)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: sortBy === opt.id ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
              color: sortBy === opt.id ? 'white' : 'var(--text-dim)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Leaderboard title */}
      <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 12 }}>
        Leaderboard — {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </div>

      {/* Leaderboard list */}
      {leaderboard.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
          No sessions logged this month yet. Be the first!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {leaderboard.map((entry, i) => {
            const isMe = entry.user_id === user.id;
            const hours = (entry.total_minutes / 60).toFixed(1);
            return (
              <div
                key={entry.user_id}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  border: isMe ? '1px solid var(--accent)' : '1px solid var(--border)',
                }}
              >
                {/* Rank */}
                <div style={{ width: 28, textAlign: 'center', fontSize: i < 3 ? 20 : 14, color: 'var(--text-dim)', fontWeight: 700 }}>
                  {i < 3 ? medals[i] : i + 1}
                </div>

                {/* Avatar + belt */}
                <div style={{ position: 'relative' }}>
                  <span style={{ fontSize: 28 }}>{entry.avatar_emoji || '🥋'}</span>
                  <div
                    className="belt-dot"
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      background: BELT_COLORS[entry.belt] || '#888',
                      border: entry.belt === 'white' ? '1px solid #555' : '2px solid var(--bg)',
                      width: 12,
                      height: 12,
                    }}
                  />
                </div>

                {/* Name */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: isMe ? 700 : 500, color: isMe ? '#f0ece2' : '#ccc' }}>
                    {entry.display_name} {isMe && <span style={{ fontSize: 11, color: 'var(--accent)' }}>(you)</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {entry.gi_sessions}🥋 {entry.nogi_sessions}🩳 {entry.open_mat_sessions}🤼
                  </div>
                </div>

                {/* Stats */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontFamily: 'var(--font-display)', color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : '#f0ece2' }}>
                    {sortBy === 'total_minutes' ? `${hours}h` : sortBy === 'unique_days' ? `${entry.unique_days}d` : entry.total_sessions}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {SORT_OPTIONS.find((o) => o.id === sortBy)?.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
