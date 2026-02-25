import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const BELT_COLORS = {
  white: '#f5f5f0', blue: '#1a5fb4', purple: '#7b2d8e', brown: '#8b5e3c', black: '#1a1a1a',
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function StatsPage() {
  const { user, gym, profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [badges, setBadges] = useState([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && gym) loadStats();
  }, [user, gym]);

  async function loadStats() {
    // All-time stats
    const { data: allTime } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .eq('gym_id', gym.id)
      .single();

    // This month's checkins
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: monthCheckins } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', user.id)
      .eq('gym_id', gym.id)
      .not('checked_out_at', 'is', null)
      .gte('checked_in_at', monthStart.toISOString())
      .order('checked_in_at', { ascending: false });

    // Last 10 checkins
    const { data: recent } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', user.id)
      .eq('gym_id', gym.id)
      .not('checked_out_at', 'is', null)
      .order('checked_in_at', { ascending: false })
      .limit(10);

    // Badges
    const { data: userBadges } = await supabase
      .from('user_badges')
      .select('*, badges(*)')
      .eq('user_id', user.id)
      .eq('gym_id', gym.id);

    // Compute weekly data (current week)
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // Mon=0
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    const weekly = DAY_LABELS.map((label, i) => {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + i);
      const dayStr = dayDate.toISOString().split('T')[0];
      const daySessions = (monthCheckins || []).filter((c) => c.checked_in_at.startsWith(dayStr));
      const totalMin = daySessions.reduce((sum, c) => sum + (c.duration_minutes || 0), 0);
      return { label, sessions: daySessions.length, minutes: totalMin };
    });

    // Compute streak
    let currentStreak = 0;
    const checkinDates = [...new Set((recent || []).map((c) => c.checked_in_at.split('T')[0]))].sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (checkinDates[0] === today || checkinDates[0] === yesterday) {
      let checkDate = new Date(checkinDates[0]);
      for (const d of checkinDates) {
        const cd = checkDate.toISOString().split('T')[0];
        if (d === cd) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Month stats
    const monthSessions = (monthCheckins || []).length;
    const monthMinutes = (monthCheckins || []).reduce((s, c) => s + (c.duration_minutes || 0), 0);
    const monthGi = (monthCheckins || []).filter((c) => c.session_type === 'gi').length;
    const monthNogi = (monthCheckins || []).filter((c) => c.session_type === 'nogi').length;
    const monthOpenMat = (monthCheckins || []).filter((c) => c.session_type === 'open_mat').length;

    setStats({ allTime, monthSessions, monthMinutes, monthGi, monthNogi, monthOpenMat });
    setRecentCheckins(recent || []);
    setWeeklyData(weekly);
    setBadges(userBadges || []);
    setStreak(currentStreak);
    setLoading(false);
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading stats...</div>;

  const maxMin = Math.max(...weeklyData.map((d) => d.minutes), 1);

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ fontSize: 36 }}>{profile?.avatar_emoji || '🥋'}</div>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, margin: 0 }}>
            {profile?.display_name}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <div className="belt-dot" style={{ background: BELT_COLORS[profile?.belt] || '#888', border: profile?.belt === 'white' ? '1px solid #555' : 'none' }} />
            <span style={{ fontSize: 13, color: 'var(--text-dim)', textTransform: 'capitalize' }}>
              {profile?.belt} belt — {profile?.stripes} stripe{profile?.stripes !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Month stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Sessions', value: stats?.monthSessions || 0, color: 'var(--blue)' },
          { label: 'Hours', value: ((stats?.monthMinutes || 0) / 60).toFixed(1), color: '#ce93d8' },
          { label: 'Streak', value: `${streak}d`, color: streak > 0 ? '#ff6b35' : 'var(--text-dim)' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: 28, fontFamily: 'var(--font-display)', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Session type breakdown */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontWeight: 600 }}>
          This Month by Type
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { label: 'Gi', val: stats?.monthGi, emoji: '🥋' },
            { label: 'No-Gi', val: stats?.monthNogi, emoji: '🩳' },
            { label: 'Open Mat', val: stats?.monthOpenMat, emoji: '🤼' },
          ].map((t, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 20 }}>{t.emoji}</div>
              <div style={{ fontSize: 20, fontFamily: 'var(--font-display)', color: '#f0ece2', marginTop: 4 }}>{t.val || 0}</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{t.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly chart */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontWeight: 600 }}>
          This Week
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
          {weeklyData.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              {d.minutes > 0 && <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{Math.round(d.minutes)}m</span>}
              <div style={{
                width: '100%',
                height: d.minutes > 0 ? `${(d.minutes / maxMin) * 60}px` : 3,
                background: d.minutes > 0 ? 'linear-gradient(to top, #5a1f6e, #7b2d8e)' : 'rgba(255,255,255,0.05)',
                borderRadius: 4,
              }} />
              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontWeight: 600 }}>
            Badges
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {badges.map((b, i) => (
              <div key={i} className="badge-pill" title={b.badges?.description}>
                <span>{b.badges?.emoji}</span>
                <span>{b.badges?.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent sessions */}
      <div className="card">
        <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontWeight: 600 }}>
          Recent Sessions
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recentCheckins.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No sessions yet. Hit that Check In button!</div>
          ) : (
            recentCheckins.map((c, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 8,
                }}
              >
                <div>
                  <span style={{ fontSize: 13, color: '#ddd', textTransform: 'capitalize' }}>
                    {c.session_type.replace('_', ' ')}
                  </span>
                  {c.energy_rating && (
                    <span style={{ marginLeft: 8, fontSize: 14 }}>
                      {['', '😵', '😮‍💨', '😐', '😊', '🔥'][c.energy_rating]}
                    </span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                    {c.duration_minutes ? `${Math.round(c.duration_minutes)}min` : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {new Date(c.checked_in_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
