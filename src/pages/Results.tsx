import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { store } from '../store';
import type { Session } from '../types';
import { analyze, fmtTime } from '../analytics';
import { recomputeSession } from '../recompute';
import { computeRank, fetchScores, scorePctOf, submitCohort, type RankResult } from '../cohort';
import { createShareLink } from '../share';
import { useAuth } from '../auth';
import DistributionChart from '../components/DistributionChart';
import ResultsReport from '../components/ResultsReport';

export default function Results() {
  const { sessionId } = useParams();
  const nav = useNavigate();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // 재채점 전 원본 세션 — 복기 메모는 여기에 저장해 스냅샷 비파괴 원칙을 지킨다.
  const [rawSession, setRawSession] = useState<Session | null>(null);
  const [attempts, setAttempts] = useState<Session[]>([]);

  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    (async () => {
      setSession(undefined);
      setRawSession(null);
      const [s, allSessions] = await Promise.all([
        store.getSession(sessionId),
        store.listSessions().catch(() => []),
      ]);
      if (!alive) return;
      if (!s) {
        setSession(null);
        setAttempts([]);
        return;
      }
      setRawSession(s);
      setAttempts(
        allSessions
          .filter((candidate) => candidate.problemSetId === s.problemSetId)
          .sort((a, b) => a.finishedAt.localeCompare(b.finishedAt)),
      );
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
      <div className="page results results-empty">
        <Link to="/" className="back">
          ← 목록으로
        </Link>
        <h1>결과를 찾을 수 없어요</h1>
      </div>
    );

  const a = analyze(session);
  const attemptIndex = attempts.findIndex((attempt) => attempt.id === session.id);
  const attemptNo = attemptIndex >= 0 ? attemptIndex + 1 : attempts.length;

  const removeAttempt = async () => {
    const confirmed = window.confirm(
      `${attemptNo}회차 응시 기록을 삭제할까요? 삭제하면 되돌릴 수 없어요.`,
    );
    if (!confirmed) return;
    try {
      await store.deleteSession(session.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '기록을 삭제하지 못했어요.');
      return;
    }
    const remaining = attempts.filter((attempt) => attempt.id !== session.id);
    if (remaining.length === 0) {
      nav('/', { replace: true });
      return;
    }
    // 삭제한 회차 바로 앞 회차(없으면 첫 회차)로 이동한다.
    const nextAttempt = remaining[Math.max(0, attemptIndex - 1)];
    nav(`/results/${nextAttempt.id}`, { replace: true });
  };

  return (
    <div className="page results">
      <Link to="/" className="back">
        ← 목록으로
      </Link>
      <header className="results-head">
        <div>
          <h1>{session.problemSetName}</h1>
          <p className="results-meta">
            {new Date(session.finishedAt).toLocaleString('ko-KR')} · 총{' '}
            {fmtTime(a.overall.totalTimeSec)} 소요
          </p>
        </div>
        <div className="results-actions">
          <ShareButton key={session.id} sessionId={session.id} />
          <button className="btn primary" onClick={() => nav(`/exam/${session.problemSetId}`)}>
            재응시
          </button>
          <button className="btn danger" onClick={removeAttempt}>
            이 회차 삭제
          </button>
        </div>
      </header>

      <nav className="attempt-tabs" aria-label="응시 회차">
        {attempts.map((attempt, index) => (
          <button
            key={attempt.id}
            type="button"
            className={`attempt-tab${attempt.id === session.id ? ' active' : ''}`}
            aria-current={attempt.id === session.id ? 'page' : undefined}
            onClick={() => nav(`/results/${attempt.id}`)}
          >
            {index + 1}회차
          </button>
        ))}
      </nav>

      {rawSession && (
        <ReviewNotes
          key={rawSession.id}
          rawSession={rawSession}
          onSaved={(updated) => {
            setRawSession(updated);
            setSession((current) =>
              current ? { ...current, review: updated.review } : current,
            );
          }}
        />
      )}

      <ResultsReport session={session} rankSlot={<RankCard key={session.id} session={session} />} />
    </div>
  );
}

function ReviewNotes({
  rawSession,
  onSaved,
}: {
  rawSession: Session;
  onSaved: (updated: Session) => void;
}) {
  const [overall, setOverall] = useState(rawSession.review?.overall ?? '');
  const [perQ, setPerQ] = useState<Record<string, string>>(() => ({
    ...(rawSession.review?.perQuestion ?? {}),
  }));
  const [showOverall, setShowOverall] = useState(true);
  const [showPerQ, setShowPerQ] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const persist = async (nextOverall: string, nextPerQ: Record<string, string>) => {
    const overallTrimmed = nextOverall.trim();
    const perQuestion: Record<string, string> = {};
    for (const [key, value] of Object.entries(nextPerQ)) {
      if (value.trim()) perQuestion[key] = value;
    }
    const review = {
      ...(overallTrimmed ? { overall: overallTrimmed } : {}),
      ...(Object.keys(perQuestion).length ? { perQuestion } : {}),
    };
    const updated: Session = { ...rawSession, review };
    setStatus('saving');
    try {
      await store.saveSession(updated);
      onSaved(updated);
      setStatus('saved');
    } catch {
      setStatus('idle');
    }
  };

  const groups: { section: string; numbers: number[] }[] = [];
  for (const r of rawSession.results) {
    let group = groups.find((g) => g.section === r.section);
    if (!group) {
      group = { section: r.section, numbers: [] };
      groups.push(group);
    }
    if (!group.numbers.includes(r.number)) group.numbers.push(r.number);
  }

  return (
    <section className="card review-card">
      <div className="review-head">
        <h2>복기 메모</h2>
        <span className="review-status muted" aria-live="polite">
          {status === 'saving' ? '저장 중…' : status === 'saved' ? '저장됨' : ''}
        </span>
      </div>
      <p className="muted card-desc">
        결과를 보며 깨달은 점을 적어두면 다음 응시 때 다시 볼 수 있어요. 입력하면 자동 저장돼요.
      </p>

      <div className="review-block">
        <button
          type="button"
          className="review-toggle"
          aria-expanded={showOverall}
          onClick={() => setShowOverall((value) => !value)}
        >
          <span className={`qt-chevron${showOverall ? ' open' : ''}`} aria-hidden="true">
            ▶
          </span>
          <b>총평</b>
        </button>
        {showOverall && (
          <textarea
            className="review-textarea"
            value={overall}
            placeholder="이번 회차 전체 총평 — 잘한 점, 아쉬운 점, 다음에 고칠 점 등"
            onChange={(event) => setOverall(event.target.value)}
            onBlur={() => persist(overall, perQ)}
          />
        )}
      </div>

      <div className="review-block">
        <button
          type="button"
          className="review-toggle"
          aria-expanded={showPerQ}
          onClick={() => setShowPerQ((value) => !value)}
        >
          <span className={`qt-chevron${showPerQ ? ' open' : ''}`} aria-hidden="true">
            ▶
          </span>
          <b>문제별 메모</b>
        </button>
        {showPerQ && (
          <div className="review-groups">
            {groups.map((group) => (
              <div className="review-group" key={group.section}>
                <div className="review-group-head">{group.section}</div>
                {group.numbers.map((number) => {
                  const key = `${group.section}:${number}`;
                  return (
                    <label className="review-q-row" key={key}>
                      <span className="review-q-label">{number}번</span>
                      <textarea
                        className="review-textarea review-textarea-sm"
                        value={perQ[key] ?? ''}
                        placeholder="이 문항 복기 메모"
                        onChange={(event) =>
                          setPerQ((prev) => ({ ...prev, [key]: event.target.value }))
                        }
                        onBlur={() => persist(overall, perQ)}
                      />
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const SHARE_COPIED_RESET_MS = 2000;

function ShareButton({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'copied' | 'manual' | 'error'>('idle');
  const [shareUrl, setShareUrl] = useState('');
  const [err, setErr] = useState('');

  const share = async () => {
    setState('busy');
    try {
      const url = await createShareLink(sessionId);
      try {
        await navigator.clipboard.writeText(url);
        setState('copied');
        setTimeout(() => setState('idle'), SHARE_COPIED_RESET_MS);
      } catch {
        // 클립보드 접근이 막힌 환경 — 링크를 보여주고 직접 복사하게 한다.
        setShareUrl(url);
        setState('manual');
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setState('error');
    }
  };

  return (
    <div className="share-action">
      <button className="btn" onClick={share} disabled={state === 'busy'}>
        {state === 'busy' ? '링크 만드는 중…' : state === 'copied' ? '링크 복사됨!' : '공유하기'}
      </button>
      {state === 'manual' && (
        <input
          className="share-url"
          readOnly
          value={shareUrl}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="공유 링크"
        />
      )}
      {state === 'error' && (
        <p className="muted share-error">
          공유 링크를 만들지 못했어요. 다시 시도해 주세요.
          {import.meta.env.DEV ? ' (개발 서버에는 공유 백엔드가 없어요)' : ''} {err}
        </p>
      )}
    </div>
  );
}

function RankCard({ session }: { session: Session }) {
  const { user } = useAuth();
  const a = analyze(session);
  const myScore = scorePctOf(a.overall.correct, a.overall.total);
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [rank, setRank] = useState<RankResult | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [err, setErr] = useState('');
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!user || submittedRef.current) return;
    submittedRef.current = true;
    (async () => {
      try {
        await submitCohort({
          handle: user.nickname,
          problemSetId: session.problemSetId,
          problemSetName: session.problemSetName,
          score: a.overall.correct,
          total: a.overall.total,
          scorePct: myScore,
          finishedAt: session.finishedAt,
        });
        const sc = await fetchScores(session.problemSetId);
        setScores(sc);
        setRank(computeRank(sc, myScore));
        setStatus('done');
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    })();
  }, [user]);

  return (
    <section className="card rank-card">
      <div className="rank-title-row">
        <div>
          <h2>전체 시험자 점수 분포</h2>
        </div>
        {status === 'done' && scores.length > 0 && (
          <p className="muted rank-summary">
            평균 {(scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)}점 ·
            최고 {Math.max(...scores)}점
          </p>
        )}
      </div>
      {status === 'loading' && <p className="muted">집계 중…</p>}
      {status === 'error' && (
        <p className="muted">
          등수를 불러오지 못했어요
          {import.meta.env.DEV ? ' (개발 서버는 인메모리 — 재시작 시 초기화)' : ''}. {err}
        </p>
      )}
      {status === 'done' && rank && (
        <>
          <div className="rank-visual">
            <DistributionChart scores={scores} myScore={myScore} />
            <aside className="rank-head" aria-label="내 등수 요약">
              <div className="rank-side-label">내 등수</div>
              <div className="rank-big">
                <b>{rank.rank}</b>
                <span className="muted">위 / {rank.n}명</span>
              </div>
              <div className="rank-divider" />
              <div className="rank-top">
                <span>상위</span>
                <b>{rank.topPercent}%</b>
              </div>
              <div className="rank-percentile">백분위 {rank.percentile}</div>
              <p className="muted handle-note">
                <b>{user?.displayName}</b>
                <span>같은 문제셋 최고기록 기준</span>
              </p>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
