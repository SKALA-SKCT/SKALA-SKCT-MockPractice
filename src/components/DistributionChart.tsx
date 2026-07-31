import { useEffect, useRef, useState } from 'react';

type ChartPoint = { x: number; y: number };

/** MockTest와 동일한 10점 구간 곡선형 점수 분포. scores·myScore는 0~100(%). */
export default function DistributionChart({
  scores,
  myScore,
}: {
  scores: number[];
  myScore: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const height = 300;
  const margin = { top: 42, right: 18, bottom: 42, left: 38 };

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    setWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);

  const plotWidth = Math.max(10, width - margin.left - margin.right);
  const plotHeight = height - margin.top - margin.bottom;
  const counts = Array.from({ length: 10 }, () => 0);

  scores.forEach((score) => {
    const index = Math.min(9, Math.max(0, Math.floor(score / 10)));
    counts[index] += 1;
  });

  const maxCount = Math.max(4, ...counts);
  const average = scores.length
    ? scores.reduce((total, score) => total + score, 0) / scores.length
    : 0;
  const x = (score: number) => margin.left + (score / 100) * plotWidth;
  const y = (count: number) => margin.top + plotHeight - (count / maxCount) * plotHeight;
  const points = counts.map((count, index) => ({
    x: x(index * 10 + 5),
    y: y(count),
  }));
  const curve = smoothPath(points);
  const baseline = margin.top + plotHeight;
  const lastPoint = points[points.length - 1];
  const area = points.length
    ? `${curve} L ${lastPoint.x} ${baseline} L ${points[0].x} ${baseline} Z`
    : '';
  const yTicks = Array.from({ length: maxCount + 1 }, (_, index) => index).filter(
    (tick) => maxCount <= 5 || tick % Math.ceil(maxCount / 4) === 0 || tick === maxCount,
  );

  return (
    <div className="dist" ref={wrapRef}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="전체 시험자 점수 분포"
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={margin.left}
              x2={margin.left + plotWidth}
              y1={y(tick)}
              y2={y(tick)}
              className="dist-grid"
            />
            <text
              x={margin.left - 10}
              y={y(tick)}
              className="axis-tick"
              textAnchor="end"
              dy="0.32em"
            >
              {tick}
            </text>
          </g>
        ))}

        <path d={area} fill="#ef4444" fillOpacity={0.1} />
        <path
          d={curve}
          fill="none"
          stroke="#ef4444"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={counts[index] ? 4 : 3}
            className={`dist-point${counts[index] ? ' active' : ''}${
              hoveredIndex === index ? ' hovered' : ''
            }`}
          />
        ))}

        {hoveredIndex != null && (
          <line
            x1={points[hoveredIndex].x}
            x2={points[hoveredIndex].x}
            y1={margin.top}
            y2={baseline}
            className="dist-hover-line"
          />
        )}

        <line
          x1={x(myScore)}
          x2={x(myScore)}
          y1={margin.top}
          y2={baseline}
          className="dist-marker me"
        />
        <text
          x={x(myScore)}
          y={margin.top - 14}
          className="dist-marker-label me"
          textAnchor="middle"
        >
          나 {Math.round(myScore)}점
        </text>

        {Math.abs(average - myScore) > 2 && (
          <>
            <line
              x1={x(average)}
              x2={x(average)}
              y1={margin.top}
              y2={baseline}
              className="dist-marker average"
            />
            <text
              x={x(average)}
              y={margin.top - 14}
              className="dist-marker-label average"
              textAnchor="middle"
            >
              평균 {average.toFixed(1)}점
            </text>
          </>
        )}

        {counts.map((_, index) => (
          <text
            key={index}
            x={points[index].x}
            y={baseline + 22}
            className="axis-tick"
            textAnchor="middle"
          >
            {index === 9 ? '90–100점' : `${index * 10}–${index * 10 + 9}점`}
          </text>
        ))}

        {counts.map((_, index) => {
          const bandWidth = plotWidth / counts.length;
          return (
            <rect
              key={`hit-${index}`}
              x={margin.left + index * bandWidth}
              y={margin.top}
              width={bandWidth}
              height={plotHeight}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ cursor: 'crosshair' }}
            />
          );
        })}
      </svg>
      {hoveredIndex != null && (
        <div
          className="dist-tip"
          style={{
            left: Math.min(Math.max(points[hoveredIndex].x, 76), width - 76),
            top: Math.max(points[hoveredIndex].y - 12, margin.top),
          }}
        >
          <b>{hoveredIndex === 9 ? '90–100점' : `${hoveredIndex * 10}–${hoveredIndex * 10 + 9}점`}</b>
          <span>
            응시자 {counts[hoveredIndex]}명 (
            {scores.length ? Math.round((counts[hoveredIndex] / scores.length) * 100) : 0}%)
          </span>
        </div>
      )}
    </div>
  );
}

function smoothPath(points: ChartPoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midpointX = (current.x + next.x) / 2;
    const midpointY = (current.y + next.y) / 2;
    path += ` Q ${current.x} ${current.y} ${midpointX} ${midpointY}`;
  }

  const last = points[points.length - 1];
  return `${path} Q ${last.x} ${last.y} ${last.x} ${last.y}`;
}
