import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Session } from '../types';
import { analyze, fmtTime } from '../analytics';
import ResultsBody from '../components/ResultsBody';
import { fetchShared } from '../share';

/** 공유된 결과 보기(공개). 소유자 닉네임을 함께 보여준다. */
export default function SharedResults() {
  const { shareId } = useParams();
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'notfound' } | { kind: 'error' } | { kind: 'ok'; session: Session; nickname: string }
  >({ kind: 'loading' });

  useEffect(() => {
    if (!shareId) return;
    let alive = true;
    (async () => {
      try {
        const rec = await fetchShared(shareId);
        if (!alive) return;
        setState(rec ? { kind: 'ok', session: rec.session, nickname: rec.nickname } : { kind: 'notfound' });
      } catch {
        if (alive) setState({ kind: 'error' });
      }
    })();
    return () => {
      alive = false;
    };
  }, [shareId]);

  if (state.kind === 'loading') return <div className="page">불러오는 중…</div>;
  if (state.kind === 'notfound')
    return (
      <div className="page">
        <h1>공유된 결과를 찾을 수 없어요</h1>
        <p className="muted">링크가 만료되었거나 잘못된 주소예요.</p>
      </div>
    );
  if (state.kind === 'error')
    return (
      <div className="page">
        <h1>결과를 불러오지 못했어요</h1>
        <p className="muted">잠시 후 다시 시도해 주세요.</p>
      </div>
    );

  const { session, nickname } = state;
  const a = analyze(session);

  return (
    <div className="page results">
      <header className="results-head">
        <div>
          <p className="shared-owner">
            <b>{nickname}</b>님의 결과
          </p>
          <h1>{session.problemSetName}</h1>
          <p className="muted">
            {new Date(session.finishedAt).toLocaleString('ko-KR')} · 총{' '}
            {fmtTime(a.overall.totalTimeSec)} 소요
          </p>
        </div>
      </header>

      <ResultsBody session={session} shared />
    </div>
  );
}
