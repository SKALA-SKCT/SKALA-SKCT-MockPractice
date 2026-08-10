import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// 로그인/회원가입은 마더(관문)에서만. 이 앱은 공유 세션을 확인하고, 없으면 관문으로 보낸다.
// 기본값은 운영 마더 URL. Git 빌드는 .env.production(gitignore)을 못 읽으므로 fallback이 곧 운영값이어야 한다.
// 로컬 서브도메인 테스트가 필요하면 VITE_MOTHER_URL 로 override.
const MOTHER_URL = (import.meta.env.VITE_MOTHER_URL as string | undefined) ?? 'https://www.skala-skct.com';

export interface AuthUser {
  /** 데이터 키로 쓰는 handle. 카카오만 쓰는 계정은 `kakao:<id>` 형태라 화면에 노출하지 않는다. */
  nickname: string;
  /** 화면에 보여줄 이름(카카오 닉네임 등). */
  displayName: string;
  isAdmin: boolean;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
}

/** 마더(관문)의 로그인 페이지로 이동(로그인 후 이 앱으로 복귀). sso=1로 무한 루프 방지. */
export function goToMotherLogin(): void {
  const here = new URL(window.location.href);
  here.searchParams.set('sso', '1');
  const back = encodeURIComponent(here.toString());
  window.location.href = `${MOTHER_URL.replace(/\/$/, '')}/login?redirect=${back}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 개발 서버(npm run dev)에는 인증 백엔드가 없어 자동 로그인(관리자로).
    if (import.meta.env.DEV) {
      setUser({ nickname: '개발자', displayName: '개발자', isAdmin: true });
      setLoading(false);
      return;
    }
    fetch('/api/auth/me')
      .then(async (r) => {
        if (r.ok) {
          const d = await r.json();
          setUser({ nickname: d.nickname, displayName: d.displayName || d.nickname, isAdmin: !!d.isAdmin });
        } else setUser(null);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    if (import.meta.env.DEV) return; // 개발 모드에선 로그아웃 없음
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* 무시 */
    }
    setUser(null);
    goToMotherLogin();
  };

  return <Ctx.Provider value={{ user, loading, logout }}>{children}</Ctx.Provider>;
}
