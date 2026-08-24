import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Session } from '../types';
import { analyze, fmtTime } from '../analytics';
import { fetchSharedSession } from '../share';
import ResultsReport from '../components/ResultsReport';

/** 공유 링크로 들어온 사람이 보는 읽기 전용 결과 페이지. 로그인 없이 접근 가능. */
export default function SharedResults() {
  const { token } = useParams();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!token) {
      setSession(null);
      return;
    }
    let alive = true;
    fetchSharedSession(token)
      .then((s) => {
        if (alive) setSession(s);
      })
      .catch(() => {
        if (alive) setSession(null);
      });
    return () => {
      alive = false;
    };
  }, [token]);

  if (session === undefined) return <div className="page">불러오는 중…</div>;
  if (session === null)
    return (
      <div className="page results results-empty">
        <h1>공유된 결과를 찾을 수 없어요</h1>
        <p className="muted">링크가 잘못되었거나 만료된 결과예요. 공유한 사람에게 다시 요청해 주세요.</p>
      </div>
    );

  const a = analyze(session);

  return (
    <div className="page results">
      <header className="results-head">
        <div>
          <h1>{session.problemSetName}</h1>
          <p className="results-meta">
            {new Date(session.finishedAt).toLocaleString('ko-KR')} · 총{' '}
            {fmtTime(a.overall.totalTimeSec)} 소요 · 공유된 결과
          </p>
        </div>
      </header>
      <ResultsReport session={session} showPersonalNotes={false} />
    </div>
  );
}
