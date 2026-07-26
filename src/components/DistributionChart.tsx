import { useEffect, useRef, useState } from 'react';

/** 점수 분포 히스토그램 + 적합 정규곡선 + 내 위치 마커. scores·myScore는 0~100(%). */
export default function DistributionChart({
  scores,
  myScore,
}: {
  scores: number[];
  myScore: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(560);
  const H = 220;
  const M = { top: 14, right: 12, bottom: 34, left: 34 };

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

  // 0~100 구간 10칸 히스토그램
  const BINS = 10;
  const binW = 100 / BINS;
  const counts = new Array(BINS).fill(0);
  for (const s of scores) {
    const idx = Math.min(BINS - 1, Math.max(0, Math.floor(s / binW)));
    counts[idx] += 1;
  }
  const maxCount = Math.max(1, ...counts);

  const sx = (score: number) => M.left + (score / 100) * plotW;
  const sy = (count: number) => M.top + plotH - (count / maxCount) * plotH;

  // 적합 정규곡선(표본 ≥ 5, 표준편차 > 0)
  const n = scores.length;
  const mean = n ? scores.reduce((a, b) => a + b, 0) / n : 0;
  const variance = n > 1 ? scores.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  const std = Math.sqrt(variance);
  let curve = '';
  if (n >= 5 && std > 0.5) {
    const pdf = (x: number) =>
      Math.exp(-((x - mean) ** 2) / (2 * std * std)) / (std * Math.sqrt(2 * Math.PI));
    const pts: string[] = [];
    for (let x = 0; x <= 100; x += 2) {
      const expected = n * binW * pdf(x); // 기대 도수
      pts.push(`${x === 0 ? 'M' : 'L'} ${sx(x)} ${sy(expected)}`);
    }
    curve = pts.join(' ');
  }

  const xTicks = [0, 25, 50, 75, 100];

  return (
    <div className="dist" ref={wrapRef}>
      <svg width={w} height={H} role="img" aria-label="점수 분포와 내 위치">
        {/* 히스토그램 막대 */}
        {counts.map((c, i) => {
          const x = sx(i * binW) + 1;
          const bw = (plotW / BINS) - 2;
          const y = sy(c);
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={Math.max(1, bw)}
              height={M.top + plotH - y}
              rx={2}
              fill="var(--primary)"
              opacity={0.28}
            />
          );
        })}

        {/* 정규곡선 */}
        {curve && <path d={curve} fill="none" stroke="var(--primary)" strokeWidth={2} opacity={0.8} />}

        {/* 내 위치 마커 */}
        <line x1={sx(myScore)} x2={sx(myScore)} y1={M.top} y2={M.top + plotH} stroke="var(--danger)" strokeWidth={2} />
        <circle cx={sx(myScore)} cy={M.top} r={4} fill="var(--danger)" />
        <text x={sx(myScore)} y={M.top - 4} className="dist-me" textAnchor="middle">
          나 {Math.round(myScore)}
        </text>

        {/* x축 */}
        {xTicks.map((t) => (
          <text key={t} x={sx(t)} y={M.top + plotH + 20} className="axis-tick" textAnchor="middle">
            {t}
          </text>
        ))}
        <text x={M.left + plotW / 2} y={H - 4} className="axis-label" textAnchor="middle">
          점수(정답률 %)
        </text>
      </svg>
    </div>
  );
}
