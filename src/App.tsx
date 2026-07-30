import { useState, type ReactNode } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import AuthScreen from './pages/AuthScreen';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Exam from './pages/Exam';
import Results from './pages/Results';
import History from './pages/History';

function Gate({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const motherUrl = import.meta.env.VITE_MOTHER_URL ?? 'https://www.skala-skct.com';
  const mockUrl = import.meta.env.VITE_MOCK_URL ?? 'https://mock.skala-skct.com';
  if (loading) return <div className="page">불러오는 중…</div>;
  if (!user) return <AuthScreen />;
  return (
    <div className="app-shell">
      <header className="site-header">
        <nav className="site-nav">
          <Link className="brand-mark" to="/" aria-label="SKALA-SKCT 홈">
            <img src="/assets/sk-logo.svg" alt="SK" />
            <span>SKALA-SKCT</span>
          </Link>
          <div className="site-tabs">
            <a href={motherUrl}>홈</a>
            <a href={mockUrl}>실전 모의고사</a>
            <Link className="active" aria-current="page" to="/">모의고사 문제 연습</Link>
            <button type="button" onClick={() => window.alert('서비스 준비 중입니다!')}>
              유형별 문제 연습
            </button>
          </div>
          <div className="site-account">
            <div
              className="account-menu"
              onMouseEnter={() => setAccountOpen(true)}
              onMouseLeave={() => setAccountOpen(false)}
            >
              <button
                className="header-button"
                type="button"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((open) => !open)}
              >
                {user.nickname}님
              </button>
              <div className={`account-dropdown${accountOpen ? ' open' : ''}`} role="menu">
                <button type="button" role="menuitem" onClick={() => logout()}>
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </nav>
      </header>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Gate>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/exam/:setId" element={<Exam />} />
          <Route path="/results/:sessionId" element={<Results />} />
          <Route path="/history" element={<History />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Gate>
    </AuthProvider>
  );
}
