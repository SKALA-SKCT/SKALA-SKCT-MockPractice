import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { store } from '../store';
import type { Session } from '../types';
import {
  analyze,
  difficultyBands,
  fmtTime,
  prescribe,
  type Analysis,
  type BandStat,
  type Point,
} from '../analytics';
import { recomputeSession } from '../recompute';
import { computeRank, fetchScores, scorePctOf, submitCohort, type RankResult } from '../cohort';
import { useAuth } from '../auth';
import ScatterChart, { OUTCOME_META } from '../components/ScatterChart';
import DistributionChart from '../components/DistributionChart';

export default function Results() {
  const { sessionId } = useParams();
  const nav = useNavigate();
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
  const pct = (v: number) => `${Math.round(v * 100)}%`;

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
          <button className="btn primary" onClick={() => nav(`/exam/${session.problemSetId}`)}>
            다시 응시
          </button>
          <Link className="btn ghost" to="/history">
            기록
          </Link>
        </div>
      </header>

      <div className="tiles">
        <Tile label="정답" value={`${a.overall.correct}`} sub={`/ ${a.overall.total}문항`} />
        <Tile label="푼 문제" value={`${a.overall.answered}`} sub={`/ ${a.overall.total}문항`} />
        <Tile label="정답률(응답 중)" value={pct(a.overall.accuracy)} />
        <Tile label="패스" value={`${a.overall.skipped}`} />
        <Tile label="미착수" value={`${a.overall.untouched}`} tone={a.overall.untouched ? 'warn' : undefined} />
      </div>

      {a.wastedTimeSec > 30 && (
        <div className="banner">
          어려운 문제(오답)에 <b>{fmtTime(a.wastedTimeSec)}</b>를 썼어요. 전략적으로 넘겼다면
          아꼈을 시간이에요.
        </div>
      )}

      <PrescriptionCard a={a} targetSec={session.config.targetPerQuestionSec} />

      <RankCard session={session} a={a} />

      <section className="card">
        <h2>오답률 × 소요시간</h2>
        <p className="muted card-desc">
          점 하나가 문항 하나. 오른쪽(어려움)일수록 오답률이 높고, 위로 갈수록 오래 걸렸어요. 붉은
          점이 오른쪽·위에 몰리면 시간 관리, 왼쪽에 있으면 아까운 실수예요.
        </p>
        <ScatterChart points={a.points} targetSec={session.config.targetPerQuestionSec} />
      </section>

      <div className="focus-grid">
        <FocusCard
          title="아까운 실수"
          desc="쉬운 문제(오답률 낮음)인데 틀렸어요. 여기부터 잡으면 점수가 바로 올라요."
          points={a.carelessMiss}
          emptyMsg="쉬운 문제는 다 맞혔어요. 좋습니다!"
        />
        <FocusCard
          title="시간 관리 누수"
          desc="어려운 문제(오답률 높음)를 넘기지 않고 붙잡았어요. 오답·장시간부터 표시돼요."
          points={a.timeSink}
          emptyMsg="어려운 문제에 시간을 낭비하지 않았어요."
        />
      </div>

      <FocusCard
        title="어렵지 않은데 패스"
        desc="정답률 40% 이상(어렵지 않은) 문제인데 패스했어요. 풀었다면 맞힐 가능성이 높았어요."
        points={a.riskySkips}
        emptyMsg="어렵지 않은 문제는 넘기지 않았어요. 좋습니다!"
      />

      <UntouchedCard analysis={a} />

      <PerQuestionTimes analysis={a} />

      <section className="card">
        <h2>영역별</h2>
        <div className="table-wrap">
          <table className="sec-table">
            <thead>
              <tr>
                <th>영역</th>
                <th>정답/전체</th>
                <th>정답/푼 문제</th>
                <th>정답률</th>
                <th>평균 시간</th>
                <th>패스</th>
                <th>미착수</th>
              </tr>
            </thead>
            <tbody>
              {a.sections.map((s) => (
                <tr key={s.section}>
                  <td>{s.section}</td>
                  <td>
                    {s.correct}/{s.total}
                  </td>
                  <td>
                    {s.correct}/{s.answered}
                  </td>
                  <td>{pct(s.accuracy)}</td>
                  <td>{fmtTime(s.avgTimeSec)}</td>
                  <td>{s.skipped}</td>
                  <td className={s.untouched ? 'warn-text' : ''}>{s.untouched}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'warn';
}) {
  return (
    <div className={`tile${tone === 'warn' ? ' tile-warn' : ''}`}>
      <div className="tile-value">
        {value}
        {sub && <span className="tile-sub"> {sub}</span>}
      </div>
      <div className="tile-label">{label}</div>
    </div>
  );
}

function PrescriptionCard({ a, targetSec }: { a: Analysis; targetSec: number }) {
  const rx = prescribe(a, targetSec);
  const bands = difficultyBands(a);

  const headline =
    rx.top.kind === 'careless' ? (
      <>
        쉬운 문제 <b>실수</b>부터 잡으세요 — 최대 <b>+{rx.recoverablePoints}점</b> 회복
      </>
    ) : rx.top.kind === 'untouched' ? (
      <>
        <b>시간 부족(미착수)</b>부터 잡으세요 — 착수만 해도 기대 <b>+{rx.untouchedExpectedPoints}점</b>
      </>
    ) : (
      <>
        점수 누수가 거의 없어요. 이제 <b>정확도 자체</b>를 올리는 단계예요.
      </>
    );
  return (
    <section className="card rx-card">
      <h2>무엇을 고치면 점수가 오르나</h2>
      <div className={`rx-top rx-${rx.top.kind}`}>
        <span>{headline}</span>
      </div>
      {rx.potentialGain > 0 && (
        <p className="rx-potential">
          지금 습관만 고쳐도 잠재 향상 <b>+{rx.potentialGain}점</b>{' '}
          <span className="muted">
            (실수 {rx.recoverablePoints} + 미착수 {rx.untouchedExpectedPoints})
          </span>
        </p>
      )}
      <ul className="rx-leaks">
        <li>
          쉬운데 틀림 {rx.carelessCount}개 → 실수만 없애면 <b>+{rx.recoverablePoints}점</b>
        </li>
        <li>
          미착수 {rx.untouchedCount}개 → 착수 시 기대 <b>+{rx.untouchedExpectedPoints}점</b>
        </li>
        <li>
          어려운 오답에 {fmtTime(rx.wastedTimeSec)} 씀 = 약 {rx.reclaimableQuestions}문항 시간 →
          미착수에 재배분하면 회수 가능
        </li>
      </ul>
      <div className="rx-bands">
        <h3>난이도별 정확도</h3>
        {bands.map((b) => (
          <BandBar key={b.band} b={b} />
        ))}
      </div>
    </section>
  );
}

function BandBar({ b }: { b: BandStat }) {
  const pct = Math.round(b.accuracy * 100);
  return (
    <div className="band-row">
      <span className="band-label">{b.label}</span>
      <div className="band-track">
        <div className="band-fill" style={{ width: `${b.total ? pct : 0}%` }} />
      </div>
      <span className="band-val">
        {b.total ? `${pct}%` : '—'}{' '}
        <span className="muted">
          ({b.correct}/{b.total})
        </span>
      </span>
    </div>
  );
}

function RankCard({ session, a }: { session: Session; a: Analysis }) {
  const { user } = useAuth();
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
      <h2>
        내 등수 <span className="muted">· {session.problemSetName}</span>
      </h2>
      {status === 'loading' && <p className="muted">집계 중…</p>}
      {status === 'error' && (
        <p className="muted">
          등수를 불러오지 못했어요
          {import.meta.env.DEV ? ' (개발 서버는 인메모리 — 재시작 시 초기화)' : ''}. {err}
        </p>
      )}
      {status === 'done' && rank && (
        <>
          <div className="rank-head">
            <div className="rank-big">
              <b>{rank.rank}</b>
              <span className="muted">위 / {rank.n}명</span>
            </div>
            <div className="rank-top">
              상위 <b>{rank.topPercent}%</b> <span className="muted">· 백분위 {rank.percentile}</span>
            </div>
          </div>
          {rank.n < 5 && (
            <p className="muted card-desc">
              아직 표본이 적어요({rank.n}명). 응시자가 늘면 분포가 정확해져요.
            </p>
          )}
          <DistributionChart scores={scores} myScore={myScore} />
          <p className="muted handle-note">
            <b>{user?.nickname}</b> · 같은 문제셋 최고기록 기준.
          </p>
        </>
      )}
    </section>
  );
}

function FocusCard({
  title,
  desc,
  points,
  emptyMsg,
}: {
  title: string;
  desc: string;
  points: Point[];
  emptyMsg: string;
}) {
  return (
    <section className="card focus-card">
      <h2>
        {title} <span className="count-badge">{points.length}</span>
      </h2>
      <p className="muted card-desc">{desc}</p>
      {points.length === 0 ? (
        <p className="empty-msg">{emptyMsg}</p>
      ) : (
        <ul className="q-rows">
          {points.slice(0, 12).map((p, i) => (
            <QRow key={i} p={p} />
          ))}
        </ul>
      )}
    </section>
  );
}

function QRow({ p }: { p: Point }) {
  const meta = OUTCOME_META[p.outcome];
  return (
    <li className="q-row">
      <span className="q-row-id">
        {p.section} <b>{p.number}번</b>
      </span>
      <span className="q-row-tags">
        <span className="tag">오답률 {p.errorRate}%</span>
        <span className="tag">{fmtTime(p.timeSpentSec)}</span>
        {p.userAnswer != null && (
          <span className="tag" style={{ color: meta.color }}>
            내답 {p.userAnswer} / 정답 {p.answer}
          </span>
        )}
      </span>
    </li>
  );
}

function UntouchedCard({ analysis }: { analysis: Analysis }) {
  if (analysis.overall.untouched === 0) return null;
  const bySection = analysis.sections.filter((s) => s.untouched > 0);
  return (
    <section className="card">
      <h2>
        ⏳ 시간이 부족해 손도 못 댄 문제{' '}
        <span className="count-badge">{analysis.overall.untouched}</span>
      </h2>
      <p className="muted card-desc">한 번도 도달하지 못한 문항이에요. 페이스 조절이 필요해요.</p>
      <ul className="untouched-list">
        {bySection.map((s) => (
          <li key={s.section}>
            <b>{s.section}</b> — {s.untouched}문제:{' '}
            <span className="mono">{s.untouchedNumbers.join(', ')}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PerQuestionTimes({ analysis }: { analysis: Analysis }) {
  return (
    <section className="card">
      <h2>영역별 문항 소요 시간</h2>
      <p className="muted card-desc">문항마다 걸린 시간과 정답률이에요. 색: 정답·오답·패스·미착수.</p>
      {analysis.sections.map((s) => {
        const ps = analysis.points
          .filter((p) => p.section === s.section)
          .sort((a, b) => a.number - b.number);
        return (
          <div key={s.section} className="qt-group">
            <h3>
              {s.section} <span className="muted">· 총 {fmtTime(s.totalTimeSec)}</span>
            </h3>
            <ul className="qt-list">
              {ps.map((p) => {
                const meta = OUTCOME_META[p.outcome];
                return (
                  <li key={p.number} className="qt-row">
                    <span className="qt-dot" style={{ background: meta.color }} title={meta.label} />
                    <span className="qt-num">{p.number}번</span>
                    <span className="qt-time">{fmtTime(p.timeSpentSec)}</span>
                    <span className="qt-rate muted">정답률 {p.correctRate}%</span>
                    <span className="qt-ans" style={{ color: meta.color }}>
                      {p.userAnswer != null
                        ? `내답 ${p.userAnswer} · 정답 ${p.answer}`
                        : `${meta.label} · 정답 ${p.answer}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
