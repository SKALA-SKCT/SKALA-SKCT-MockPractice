import { useEffect, useRef, useState } from 'react';
import type { Point, Outcome } from '../analytics';
import { fmtTime, DIFFICULTY } from '../analytics';

export const OUTCOME_META: Record<
  Outcome,
  { label: string; color: string; shape: 'circle' | 'diamond' | 'ring' | 'square' }
> = {
  correct: { label: '정답', color: '#0ca30c', shape: 'circle' },
  wrong: { label: '오답', color: '#d03b3b', shape: 'diamond' },
  skipped: { label: '패스', color: '#8a8f98', shape: 'ring' },
  untouched: { label: '미착수', color: '#e08700', shape: 'square' },
};

const ORDER: Outcome[] = ['correct', 'wrong', 'skipped', 'untouched'];

function Mark({
  x,
  y,
  outcome,
  r = 5.5,
}: {
  x: number;
  y: number;
  outcome: Outcome;
  r?: number;
}) {
  const { color, shape } = OUTCOME_META[outcome];
  const ring = { fill: 'none', stroke: color, strokeWidth: 2 };
  const solid = { fill: color, stroke: 'var(--surface)', strokeWidth: 1.5 };
  switch (shape) {
    case 'circle':
      return <circle cx={x} cy={y} r={r} {...solid} />;
    case 'diamond':
      return (
        <rect
          x={x - r}
          y={y - r}
          width={r * 2}
          height={r * 2}
          transform={`rotate(45 ${x} ${y})`}
          {...solid}
        />
      );
    case 'ring':
      return <circle cx={x} cy={y} r={r} {...ring} />;
    case 'square':
      return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} {...ring} />;
  }
}

export default function ScatterChart({
  points,
  targetSec,
  hardErrorRate = 100 - DIFFICULTY.hardBelowCorrectRate,
}: {
  points: Point[];
  targetSec: number;
  hardErrorRate?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [hover, setHover] = useState<{ p: Point; x: number; y: number } | null>(null);
  const H = 380;
  const M = { top: 16, right: 16, bottom: 44, left: 52 };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const plotW = Math.max(10, w - M.left - M.right);
  const plotH = H - M.top - M.bottom;
  const maxTime = Math.max(
    targetSec * 2,
    ...points.map((p) => p.timeSpentSec),
    30,
  );
  const yTop = niceCeil(maxTime);

  const sx = (er: number) => M.left + (er / 100) * plotW;
  const sy = (t: number) => M.top + plotH - (t / yTop) * plotH;

  const xTicks = [0, 25, 50, 75, 100];
  const yTicks = niceTicks(yTop, 4);

  return (
    <div className="scatter" ref={wrapRef}>
      <svg width={w} height={H} role="img" aria-label="오답률 대 소요시간 산점도">
        {/* 위험/주의 영역 옅은 배경 */}
        <rect
          x={sx(hardErrorRate)}
          y={M.top}
          width={M.left + plotW - sx(hardErrorRate)}
          height={plotH}
          fill="var(--danger)"
          opacity={0.05}
        />

        {/* y 그리드 + 눈금 */}
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={M.left} x2={M.left + plotW} y1={sy(t)} y2={sy(t)} stroke="var(--border)" />
            <text x={M.left - 8} y={sy(t)} className="axis-tick" textAnchor="end" dy="0.32em">
              {t}s
            </text>
          </g>
        ))}
        {/* x 눈금 */}
        {xTicks.map((t) => (
          <text key={`x${t}`} x={sx(t)} y={M.top + plotH + 20} className="axis-tick" textAnchor="middle">
            {t}
          </text>
        ))}

        {/* 기준선: 난이도(오답률) & 목표시간 */}
        <line
          x1={sx(hardErrorRate)}
          x2={sx(hardErrorRate)}
          y1={M.top}
          y2={M.top + plotH}
          className="guide"
        />
        <line
          x1={M.left}
          x2={M.left + plotW}
          y1={sy(targetSec)}
          y2={sy(targetSec)}
          className="guide"
        />
        <text x={M.left + plotW} y={sy(targetSec) - 5} className="guide-label" textAnchor="end">
          목표 {targetSec}s
        </text>
        <text x={sx(hardErrorRate) + 5} y={M.top + 11} className="guide-label">
          오답률 {hardErrorRate}%↑ 어려움
        </text>

        {/* 축 라벨 */}
        <text x={M.left + plotW / 2} y={H - 6} className="axis-label" textAnchor="middle">
          오답률 (%) →
        </text>
        <text
          x={-(M.top + plotH / 2)}
          y={14}
          className="axis-label"
          textAnchor="middle"
          transform="rotate(-90)"
        >
          소요시간 (초)
        </text>

        {/* 점 */}
        {points.map((p, i) => (
          <g
            key={i}
            onMouseEnter={() => setHover({ p, x: sx(p.errorRate), y: sy(p.timeSpentSec) })}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: 'pointer' }}
          >
            {/* 넉넉한 히트 영역 */}
            <circle cx={sx(p.errorRate)} cy={sy(p.timeSpentSec)} r={11} fill="transparent" />
            <Mark x={sx(p.errorRate)} y={sy(p.timeSpentSec)} outcome={p.outcome} />
          </g>
        ))}
      </svg>

      {hover && (
        <div
          className="scatter-tip"
          style={{ left: Math.min(hover.x + 12, w - 150), top: Math.max(hover.y - 10, 0) }}
        >
          <b>
            {hover.p.section} {hover.p.number}번
          </b>
          <div>오답률 {hover.p.errorRate}%</div>
          <div>소요 {fmtTime(hover.p.timeSpentSec)}</div>
          <div>
            {OUTCOME_META[hover.p.outcome].label}
            {hover.p.userAnswer != null && ` · 내답 ${hover.p.userAnswer} / 정답 ${hover.p.answer}`}
          </div>
        </div>
      )}

      <div className="scatter-legend">
        {ORDER.map((o) => (
          <span key={o} className="legend-item">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <Mark x={8} y={8} outcome={o} r={5} />
            </svg>
            {OUTCOME_META[o].label}
          </span>
        ))}
      </div>
    </div>
  );
}

function niceCeil(v: number): number {
  if (v <= 0) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * mag;
}

function niceTicks(top: number, count: number): number[] {
  const step = niceCeil(top / count);
  const ticks: number[] = [];
  for (let t = 0; t <= top + 0.001; t += step) ticks.push(Math.round(t));
  return ticks;
}
