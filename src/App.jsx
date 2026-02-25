import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import GymSetup from './pages/GymSetup';
import CheckInPage from './pages/CheckInPage';
import StatsPage from './pages/StatsPage';
import GymPage from './pages/GymPage';
import ProfilePage from './pages/ProfilePage';

const TABS = [
  { id: 'checkin', label: 'Check In', icon: '🤙' },
  { id: 'stats', label: 'My Stats', icon: '📊' },
  { id: 'gym', label: 'Gym', icon: '🏟️' },
  { id: 'profile', label: 'Profile', icon: '⚙️' },
];

function AppContent() {
  const { user, profile, gym, loading } = useAuth();
  const [tab, setTab] = useState('checkin');

  if (loading) {
    return (
      <div className="page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🥋</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 14 }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;
  if (!gym) return <GymSetup />;

  return (
    <div className="page">
      <div style={{ flex: 1, paddingBottom: 70 }}>
        {tab === 'checkin' && <CheckInPage />}
        {tab === 'stats' && <StatsPage />}
        {tab === 'gym' && <GymPage />}
        {tab === 'profile' && <ProfilePage />}
      </div>
      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
