import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';

export default function AuthScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [invite, setInvite] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      if (mode === 'login') await login(nickname.trim(), password);
      else await signup(nickname.trim(), password, invite.trim());
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = nickname.trim() && password && (mode === 'login' || invite.trim());

  return (
    <div className="auth-screen">
      <form className="auth-box" onSubmit={submit}>
        <h1>SKCT 연습 도구</h1>
        <p className="muted">{mode === 'login' ? '로그인' : '회원가입 · 조직 초대코드 필요'}</p>
        <input
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={20}
          autoFocus
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        {mode === 'signup' && (
          <input
            type="password"
            placeholder="조직 초대코드"
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
          />
        )}
        {err && <div className="auth-err">{err}</div>}
        <button className="btn primary" disabled={busy || !canSubmit} type="submit">
          {busy ? '처리 중…' : mode === 'login' ? '로그인' : '가입하고 시작'}
        </button>
        <button
          type="button"
          className="linklike auth-switch"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setErr('');
          }}
        >
          {mode === 'login' ? '계정이 없어요 · 회원가입' : '이미 계정이 있어요 · 로그인'}
        </button>
      </form>
    </div>
  );
}
