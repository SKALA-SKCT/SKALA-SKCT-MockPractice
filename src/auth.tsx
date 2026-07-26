import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface AuthUser {
  nickname: string;
  isAdmin: boolean;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (nickname: string, password: string) => Promise<void>;
  signup: (nickname: string, password: string, invite: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
}

async function postJson(url: string, body: unknown): Promise<any> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON */
  }
  if (!r.ok) throw new Error(data?.error || `요청 실패 (${r.status})`);
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 개발 서버(npm run dev)에는 인증 백엔드가 없어 자동 로그인(관리자로).
    if (import.meta.env.DEV) {
      setUser({ nickname: '개발자', isAdmin: true });
      setLoading(false);
      return;
    }
    fetch('/api/auth/me')
      .then(async (r) => {
        if (r.ok) {
          const d = await r.json();
          setUser({ nickname: d.nickname, isAdmin: !!d.isAdmin });
        } else setUser(null);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (nickname: string, password: string) => {
    const d = await postJson('/api/auth/login', { nickname, password });
    setUser({ nickname: d.nickname, isAdmin: !!d.isAdmin });
  };
  const signup = async (nickname: string, password: string, invite: string) => {
    const d = await postJson('/api/auth/signup', { nickname, password, invite });
    setUser({ nickname: d.nickname, isAdmin: !!d.isAdmin });
  };
  const logout = async () => {
    if (import.meta.env.DEV) return; // 개발 모드에선 로그아웃 없음
    try {
      await postJson('/api/auth/logout', {});
    } catch {
      /* 무시 */
    }
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, signup, logout }}>{children}</Ctx.Provider>;
}
