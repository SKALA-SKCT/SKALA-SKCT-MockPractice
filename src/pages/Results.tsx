import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { store } from '../store';
import type { Session, SessionReview } from '../types';
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
  const [attempts, setAttempts] = useState<Session[]>([]);
  // 복기 메모: 재채점 전 원본 세션(rawRef)에 저장해 스냅샷 비파괴 원칙을 지킨다.
  const rawRef = useRef<Session | null>(null);
  const reviewRef = useRef<SessionReview>({});
  const [review, setReview] = useState<SessionReview>({});
  const [reviewStatus, setReviewStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    (async () => {
      setSession(undefined);
      rawRef.current = null;
      reviewRef.current = {};
      setReview({});
      setReviewStatus('idle');
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
      rawRef.current = s;
      reviewRef.current = s.review ?? {};
      setReview(reviewRef.current);
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

  const applyReview = (next: SessionReview) => {
    reviewRef.current = next;
    setReview(next);
  };
  const setOverall = (value: string) => applyReview({ ...reviewRef.current, overall: value });
  const setQuestionMemo = (key: string, value: string) =>
    applyReview({
      ...reviewRef.current,
      perQuestion: { ...(reviewRef.current.perQuestion ?? {}), [key]: value },
    });
  const saveReview = async () => {
    const raw = rawRef.current;
    if (!raw) return;
    const current = reviewRef.current;
    const overall = current.overall?.trim();
    const perQuestion: Record<string, string> = {};
    for (const [key, value] of Object.entries(current.perQuestion ?? {})) {
      if (value.trim()) perQuestion[key] = value;
    }
    const cleaned: SessionReview = {
      ...(overall ? { overall } : {}),
      ...(Object.keys(perQuestion).length ? { perQuestion } : {}),
    };
    const updated: Session = { ...raw, review: cleaned };
    setReviewStatus('saving');
    try {
      await store.saveSession(updated);
      rawRef.current = updated;
      setSession((prev) => (prev ? { ...prev, review: cleaned } : prev));
      setReviewStatus('saved');
    } catch {
      setReviewStatus('idle');
    }
  };

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

      <OverallReviewNote
        value={review.overall ?? ''}
        onChange={setOverall}
        onBlur={saveReview}
        status={reviewStatus}
      />

      <ResultsReport
        session={session}
        rankSlot={<RankCard key={session.id} session={session} />}
        questionMemo={review.perQuestion}
        onQuestionMemoChange={setQuestionMemo}
        onQuestionMemoBlur={saveReview}
      />
    </div>
  );
}

function OverallReviewNote({
  value,
  onChange,
  onBlur,
  status,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  status: 'idle' | 'saving' | 'saved';
}) {
  return (
    <section className="card review-card">
      <div className="review-head">
        <h2>총평 메모</h2>
        <span className="review-status muted" aria-live="polite">
          {status === 'saving' ? '저장 중…' : status === 'saved' ? '저장됨' : ''}
        </span>
      </div>
      <p className="muted card-desc">
        이번 회차를 보며 깨달은 점을 적어두면 다음 응시 때 다시 볼 수 있어요. 입력하면 자동
        저장돼요. 문항별 메모는 아래 &lsquo;영역별 문항 소요 시간&rsquo;의 각 문항에서 열 수
        있어요.
      </p>
      <textarea
        className="review-textarea"
        value={value}
        placeholder="이번 회차 전체 총평 — 잘한 점, 아쉬운 점, 다음에 고칠 점 등"
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
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
