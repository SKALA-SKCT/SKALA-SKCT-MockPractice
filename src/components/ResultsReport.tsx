import { useState, type ReactNode } from 'react';
import type { QuestionResult, Session } from '../types';
import {
  analyze,
  difficultyBands,
  fmtTime,
  prescribe,
  type Analysis,
  type BandStat,
  type Point,
} from '../analytics';
import ScatterChart, { OUTCOME_META } from './ScatterChart';

/** 결과 분석 리포트 본문. 내 결과 페이지와 공유 페이지에서 함께 사용한다. */
export default function ResultsReport({
  session,
  rankSlot,
  showPersonalNotes = true,
}: {
  session: Session;
  rankSlot?: ReactNode;
  showPersonalNotes?: boolean; // 별표·메모는 개인 복기용 → 공유 페이지에선 숨긴다
}) {
  const a = analyze(session);
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <>
      <div className="tiles">
        <Tile label="총점" value={`${a.overall.correct}`} sub={`/${a.overall.total}`} accent />
        <Tile label="응답 문항" value={`${a.overall.answered}`} sub={`/${a.overall.total}문항`} />
        <Tile label="정답률" value={pct(a.overall.accuracy)} />
        <Tile label="패스" value={`${a.overall.skipped}`} />
        <Tile
          label="미착수"
          value={`${a.overall.untouched}`}
          tone={a.overall.untouched ? 'warn' : undefined}
        />
      </div>

      <SectionSummary analysis={a} />

      {a.wastedTimeSec > 30 && (
        <div className="banner">
          어려운 문제(오답)에 <b>{fmtTime(a.wastedTimeSec)}</b>를 썼어요. 전략적으로 넘겼다면
          아꼈을 시간이에요.
        </div>
      )}

      <PrescriptionCard a={a} targetSec={session.config.targetPerQuestionSec} />

      {rankSlot}

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
        grid
      />

      <UntouchedCard analysis={a} />

      {showPersonalNotes && <FlaggedCard results={session.results} />}
      {showPersonalNotes && <MemoCard results={session.results} />}

      <PerQuestionTimes analysis={a} />
    </>
  );
}

function SectionSummary({ analysis }: { analysis: Analysis }) {
  const pct = (value: number) => `${Math.round(value * 100)}%`;
  return (
    <section className="card section-summary">
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
            {analysis.sections.map((section) => (
              <tr key={section.section}>
                <td>{section.section}</td>
                <td>
                  {section.correct}/{section.total}
                </td>
                <td>
                  {section.correct}/{section.answered}
                </td>
                <td>{pct(section.accuracy)}</td>
                <td>{fmtTime(section.avgTimeSec)}</td>
                <td>{section.skipped}</td>
                <td className={section.untouched ? 'warn-text' : ''}>{section.untouched}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Tile({
  label,
  value,
  sub,
  tone,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'warn';
  accent?: boolean;
}) {
  return (
    <div className={`tile${tone === 'warn' ? ' tile-warn' : ''}`}>
      <div className={`tile-value${accent ? ' tile-value-accent' : ''}`}>
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
      <div className="rx-stack">
        <div className={`rx-panel rx-panel-core rx-${rx.top.kind}`}>
          <h3>핵심 진단</h3>
          <p>{headline}</p>
          {rx.potentialGain > 0 && (
            <div className="rx-potential">
              <span>잠재 향상</span>
              <b>+{rx.potentialGain}점</b>
              <small>
                실수 {rx.recoverablePoints}점 · 미착수 {rx.untouchedExpectedPoints}점
              </small>
            </div>
          )}
        </div>

        <div className="rx-panel rx-panel-priority">
          <h3>우선 개선할 점</h3>
          <ul>
            <li>
              쉬운데 틀린 {rx.carelessCount}개 문항의 실수를 줄이면{' '}
              <b>+{rx.recoverablePoints}점</b>을 회복할 수 있어요.
            </li>
            <li>
              미착수 {rx.untouchedCount}개 문항에 착수하면{' '}
              <b>+{rx.untouchedExpectedPoints}점</b>을 기대할 수 있어요.
            </li>
          </ul>
        </div>

        <div className="rx-panel rx-panel-action">
          <h3>다음 응시 행동</h3>
          <ul>
            <li>
              어려운 오답에 쓴 {fmtTime(rx.wastedTimeSec)}을 줄여 약{' '}
              {rx.reclaimableQuestions}문항의 풀이 시간을 확보하세요.
            </li>
            <li>문항별 목표 시간을 넘기면 다음 문항으로 이동해 미착수를 줄이세요.</li>
          </ul>
        </div>
      </div>
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

function FocusCard({
  title,
  desc,
  points,
  emptyMsg,
  grid = false,
}: {
  title: string;
  desc: string;
  points: Point[];
  emptyMsg: string;
  grid?: boolean;
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
        <ul className={`q-rows${grid ? ' q-rows-grid' : ''}`}>
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
        시간이 부족해 손도 못 댄 문제{' '}
        <span className="count-badge">{analysis.overall.untouched}</span>
      </h2>
      <p className="muted card-desc">한 번도 도달하지 못한 문항이에요. 페이스 조절이 필요해요.</p>
      <div className="untouched-groups">
        {bySection.map((s) => (
          <div className="untouched-group" key={s.section}>
            <div className="untouched-group-head">
              <b>{s.section}</b>
              <span>{s.untouched}문제</span>
            </div>
            <div className="untouched-tags">
              {s.untouchedNumbers.map((questionNumber) => (
                <span className="untouched-tag" key={questionNumber}>
                  {questionNumber}번
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** 복기 카드에서 한 문항의 처리 결과를 라벨·색으로 표현. */
function outcomeMeta(r: QuestionResult): { label: string; color: string } {
  if (r.status === 'untouched') return { label: '미착수', color: '#a1a1aa' };
  if (r.status === 'skipped') return { label: '패스', color: '#f59e0b' };
  return r.correct ? { label: '정답', color: '#16a34a' } : { label: '오답', color: '#dc2626' };
}

function FlaggedCard({ results }: { results: QuestionResult[] }) {
  const flagged = results.filter((r) => r.flagged);
  if (flagged.length === 0) return null;
  return (
    <section className="card focus-card">
      <h2>
        아리까리 표시한 문제 <span className="count-badge">{flagged.length}</span>
      </h2>
      <p className="muted card-desc">
        응시 중 헷갈려서 별표한 문항이에요. 정답과 함께 다시 확인해 보세요.
      </p>
      <ul className="q-rows q-rows-grid">
        {flagged.map((r) => {
          const meta = outcomeMeta(r);
          return (
            <li className="q-row" key={`${r.section}:${r.number}`}>
              <span className="q-row-id">
                {r.section} <b>{r.number}번</b>
              </span>
              <span className="q-row-tags">
                <span className="tag" style={{ color: meta.color }}>
                  {meta.label}
                </span>
                <span className="tag">{fmtTime(r.timeSpentSec)}</span>
                <span className="tag">
                  {r.userAnswer != null ? `내답 ${r.userAnswer} / 정답 ${r.answer}` : `정답 ${r.answer}`}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MemoCard({ results }: { results: QuestionResult[] }) {
  const memoed = results.filter((r) => r.memo && r.memo.trim());
  if (memoed.length === 0) return null;
  return (
    <section className="card">
      <h2>
        문제별 메모 <span className="count-badge">{memoed.length}</span>
      </h2>
      <p className="muted card-desc">
        응시 중 문항마다 남긴 메모예요. 어떤 식으로 풀었는지 되짚어 보세요.
      </p>
      <ul className="memo-list">
        {memoed.map((r) => {
          const meta = outcomeMeta(r);
          return (
            <li className="memo-item" key={`${r.section}:${r.number}`}>
              <div className="memo-item-head">
                <span className="q-row-id">
                  {r.section} <b>{r.number}번</b>
                </span>
                <span className="tag" style={{ color: meta.color }}>
                  {meta.label}
                </span>
              </div>
              <p className="memo-item-text">{r.memo}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PerQuestionTimes({ analysis }: { analysis: Analysis }) {
  const [openSections, setOpenSections] = useState(
    () => new Set<string>(analysis.sections.map((section) => section.section)),
  );

  const toggleSection = (section: string) => {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  return (
    <section className="card per-question-card">
      <div className="qt-card-head">
        <h2>영역별 문항 소요 시간</h2>
        <div className="qt-legend" aria-label="문항 상태 색상">
          {Object.entries(OUTCOME_META).map(([outcome, meta]) => (
            <span key={outcome} className="qt-legend-tag">
              <span style={{ background: meta.color }} />
              {meta.label}
            </span>
          ))}
        </div>
      </div>
      {analysis.sections.map((s) => {
        const ps = analysis.points
          .filter((p) => p.section === s.section)
          .sort((a, b) => a.number - b.number);
        const isOpen = openSections.has(s.section);
        return (
          <div key={s.section} className="qt-group">
            <button
              type="button"
              className="qt-toggle"
              aria-expanded={isOpen}
              onClick={() => toggleSection(s.section)}
            >
              <span className="qt-toggle-title">
                <span className={`qt-chevron${isOpen ? ' open' : ''}`} aria-hidden="true">
                  ▶
                </span>
                <b>{s.section}</b>
                <span className="muted">
                  {s.answered}/{s.total}
                </span>
              </span>
              <span className="qt-total-time">풀이 {fmtTime(s.totalTimeSec)}</span>
            </button>
            <ul className="qt-list" hidden={!isOpen}>
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
