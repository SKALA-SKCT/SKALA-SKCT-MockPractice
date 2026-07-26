import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { store } from '../store';
import type { ProblemSet, Session } from '../types';
import { analyze, fmtTime } from '../analytics';
import { recomputeSession } from '../recompute';

export default function History() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sets, setSets] = useState<Record<string, ProblemSet>>({});
  const nav = useNavigate();

  // 세션과 함께 현재 정답표들도 불러온다 → 각 결과를 현재 정답 기준으로 재산정해 표시.
  // 정답표 조회가 실패해도 세션 목록은 유지하고, 재산정만 생략(스냅샷 그대로)한다.
  const refresh = async () => {
    setSessions(await store.listSessions().catch(() => []));
    const ps = await store.listProblemSets().catch(() => []);
    setSets(Object.fromEntries(ps.map((p) => [p.id, p])));
  };
  useEffect(() => {
    refresh();
  }, []);

  const rows = useMemo(
    () =>
      sessions.map((s) => {
        const recomputed = recomputeSession(s, sets[s.problemSetId]);
        return { s: recomputed, a: analyze(recomputed) };
      }),
    [sessions, sets],
  );

  // 오래된→최신 순 맞춘 문제 수 추이
  const trend = useMemo(() => [...rows].reverse().map((r) => r.a.overall.correct), [rows]);

  const del = async (id: string) => {
    await store.deleteSession(id);
    refresh();
  };

  return (
    <div className="page">
      <Link to="/" className="back">
        ← 홈
      </Link>
      <h1>결과 기록</h1>

      {rows.length === 0 ? (
        <p className="muted">
          아직 응시 기록이 없어요. <Link to="/">홈</Link>에서 문제셋을 골라 시작하세요.
        </p>
      ) : (
        <>
          {trend.length >= 2 && (
            <section className="card">
              <h2>맞춘 문제 수 추이</h2>
              <Trend values={trend} />
            </section>
          )}

          <ul className="hist-list">
            {rows.map(({ s, a }) => (
              <li key={s.id} className="hist-item" onClick={() => nav(`/results/${s.id}`)}>
                <div className="hist-main">
                  <strong>{s.problemSetName}</strong>
                  <span className="muted">{new Date(s.finishedAt).toLocaleString('ko-KR')}</span>
                </div>
                <div className="hist-metrics">
                  <span className="tag">
                    정답 {a.overall.correct}/{a.overall.total}
                  </span>
                  <span className="tag">정답률 {Math.round(a.overall.accuracy * 100)}%</span>
                  {a.overall.untouched > 0 && (
                    <span className="tag warn-text">미착수 {a.overall.untouched}</span>
                  )}
                  <span className="tag">{fmtTime(a.overall.totalTimeSec)}</span>
                </div>
                <button
                  className="btn ghost sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    del(s.id);
                  }}
                  type="button"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Trend({ values }: { values: number[] }) {
  const W = 560;
  const H = 120;
  const pad = { l: 34, r: 12, t: 12, b: 22 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;
  const n = values.length;
  const maxY = niceMax(Math.max(1, ...values));
  const x = (i: number) => pad.l + (n === 1 ? pw / 2 : (i / (n - 1)) * pw);
  const y = (v: number) => pad.t + ph - (v / maxY) * ph;
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  const ticks = Array.from(new Set([0, Math.round(maxY / 2), maxY]));

  return (
    <svg
      className="trend"
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label="맞춘 문제 수 추이"
    >
      {ticks.map((g) => (
        <g key={g}>
          <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke="var(--border)" />
          <text x={pad.l - 8} y={y(g)} className="axis-tick" textAnchor="end" dy="0.32em">
            {g}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth={2} />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill="var(--primary)" />
      ))}
    </svg>
  );
}

function niceMax(v: number): number {
  if (v <= 5) return 5;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const s = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return s * mag;
}
