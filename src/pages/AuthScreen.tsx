import { useEffect, useState } from 'react';
import { goToMotherLogin } from '../auth';

// 미인증 시 마더(관문) 로그인으로 이동. 관문을 다녀왔는데도(?sso=1) 미인증이면
// 무한 루프를 막고 수동 링크를 보여준다(쿠키/도메인 설정 점검 필요).
export default function AuthScreen() {
  const [looped, setLooped] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('sso') === '1') {
      setLooped(true);
      return;
    }
    goToMotherLogin();
  }, []);

  return (
    <div className="auth-screen">
      <div className="auth-box">
        <h1>SKCT 연습 도구</h1>
        {looped ? (
          <>
            <p className="muted">
              로그인 세션을 확인하지 못했어요. 공유 도메인·쿠키 설정을 확인하거나 다시 시도해주세요.
            </p>
            <button className="btn primary" onClick={() => goToMotherLogin()}>
              로그인하러 가기
            </button>
          </>
        ) : (
          <p className="muted">로그인 페이지로 이동 중…</p>
        )}
      </div>
    </div>
  );
}
