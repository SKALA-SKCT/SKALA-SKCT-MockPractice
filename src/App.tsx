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
    <div className="app-shell min-h-screen bg-page font-sans text-ink">
      <header className="site-header">
        <nav className="mx-auto grid h-[68px] w-[min(1200px,calc(100vw-48px))] grid-cols-[1fr_auto_1fr] items-center gap-6">
          <Link className="inline-flex h-5 items-center justify-self-start gap-1.5 text-ink no-underline" to="/" aria-label="SKALA-SKCT 홈">
            <img className="h-full w-auto" src="https://mock.skala-skct.com/assets/sk-logo.svg" alt="SK" />
            <span className="whitespace-nowrap text-[17px] font-bold leading-none">SKALA-SKCT</span>
          </Link>
          <div className="flex items-center gap-[34px] text-base font-normal leading-[1.7]">
            <a className="text-ink no-underline transition hover:text-brand" href={motherUrl}>홈</a>
            <a className="text-ink no-underline transition hover:text-brand" href={mockUrl}>실전 모의고사</a>
            <Link className="text-brand no-underline" aria-current="page" to="/">모의고사 문제 연습</Link>
            <button className="cursor-pointer border-0 bg-transparent p-0 font-sans text-base font-normal text-ink transition hover:text-brand" type="button" onClick={() => window.alert('서비스 준비 중입니다!')}>
              유형별 문제 연습
            </button>
          </div>
          <div className="flex items-center justify-self-end gap-2 text-sm font-semibold">
            <div
              className="relative"
              onMouseEnter={() => setAccountOpen(true)}
              onMouseLeave={() => setAccountOpen(false)}
            >
              <button
                className="cursor-pointer rounded-lg border border-hairline bg-white px-3 py-1.5 text-sm font-semibold text-ink transition hover:bg-page"
                type="button"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((open) => !open)}
              >
                {user.nickname}님
              </button>
              <div
                className={`absolute right-0 top-full z-[70] min-w-36 pt-2 text-sm transition ${
                  accountOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0'
                }`}
                role="menu"
              >
                <div className="rounded-xl border border-black/10 bg-white p-1 shadow-[0_14px_32px_rgba(0,0,0,0.14)]">
                  <button className="block w-full rounded-lg px-3 py-2 text-left text-ink-2 hover:bg-black/[0.04]" type="button" role="menuitem" onClick={() => logout()}>
                    로그아웃
                  </button>
                  <a className="block w-full rounded-lg px-3 py-2 text-left text-red-600 no-underline hover:bg-red-50" href={`${motherUrl.replace(/\/$/, '')}/settings`} role="menuitem">
                    회원탈퇴
                  </a>
                </div>
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
