import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import AuthScreen from './pages/AuthScreen';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Exam from './pages/Exam';
import Results from './pages/Results';
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
