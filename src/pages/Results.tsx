import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { store } from '../store';
import type { Session } from '../types';
import { analyze, fmtTime } from '../analytics';
import { recomputeSession } from '../recompute';
import { useAuth } from '../auth';
import ResultsBody from '../components/ResultsBody';
import { createShare, shareUrlFor } from '../share';

export default function Results() {
  const { sessionId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    (async () => {
      const s = await store.getSession(sessionId);
      if (!alive) return;
      if (!s) {
        setSession(null);
        return;
      }
      // 현재 정답표를 함께 불러와 재채점. 정답표가 없거나(삭제됨) 조회에 실패하면 저장된 스냅샷 그대로 표시.
      const ps = await store.getProblemSet(s.problemSetId).catch(() => null);
      if (!alive) return;
      setSession(recomputeSession(s, ps));
    })();
    return () => {
      alive = false;
    };
  }, [sessionId]);

  if (session === undefined) return <div className="page">불러오는 중…</div>;
  if (session === null)
    return (
      <div className="page">
        <Link to="/" className="back">
          ← 홈
        </Link>
        <h1>결과를 찾을 수 없어요</h1>
      </div>
    );

  const a = analyze(session);

  return (
    <div className="page results">
      <Link to="/" className="back">
        ← 홈
      </Link>
      <header className="results-head">
        <div>
          <h1>{session.problemSetName}</h1>
          <p className="muted">
            {new Date(session.finishedAt).toLocaleString('ko-KR')} · 총{' '}
            {fmtTime(a.overall.totalTimeSec)} 소요
          </p>
        </div>
        <div className="results-actions">
          <ShareButton session={session} nickname={user?.nickname ?? ''} />
          <button className="btn primary" onClick={() => nav(`/exam/${session.problemSetId}`)}>
            다시 응시
          </button>
          <Link className="btn ghost" to="/history">
            기록
          </Link>
        </div>
      </header>

      <ResultsBody session={session} />
    </div>
  );
}

function ShareButton({ session, nickname }: { session: Session; nickname: string }) {
  const [status, setStatus] = useState<'idle' | 'creating' | 'copied' | 'error'>('idle');
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');

  const onShare = async () => {
    setStatus('creating');
    setErr('');
    try {
      const shareId = await createShare(session, nickname);
      const link = shareUrlFor(shareId);
      setUrl(link);
      try {
        await navigator.clipboard.writeText(link);
        setStatus('copied');
      } catch {
        // 클립보드 권한이 없으면 링크를 노출해 직접 복사하게 한다.
        setStatus('idle');
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  };

  return (
    <div className="share-box">
      <button className="btn ghost" onClick={onShare} disabled={status === 'creating'}>
        {status === 'creating' ? '링크 생성 중…' : status === 'copied' ? '링크 복사됨 ✓' : '결과 공유'}
      </button>
      {url && (
        <input
          className="share-url"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
        />
      )}
      {status === 'error' && <p className="muted">{err}</p>}
    </div>
  );
}
