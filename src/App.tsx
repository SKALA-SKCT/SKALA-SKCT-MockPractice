import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import AuthScreen from './pages/AuthScreen';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Exam from './pages/Exam';
import Results from './pages/Results';
import SharedResults from './pages/SharedResults';
import History from './pages/History';

function Gate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page">불러오는 중…</div>;
  if (!user) return <AuthScreen />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* 공유 결과는 로그인 없이 링크만으로 열 수 있다(인증 게이트 밖). */}
        <Route path="/shared/:shareId" element={<SharedResults />} />
        <Route path="/" element={<Gate><Home /></Gate>} />
        <Route path="/admin" element={<Gate><Admin /></Gate>} />
        <Route path="/exam/:setId" element={<Gate><Exam /></Gate>} />
        <Route path="/results/:sessionId" element={<Gate><Results /></Gate>} />
        <Route path="/history" element={<Gate><History /></Gate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
