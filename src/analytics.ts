import type { Section, Session, QuestionResult } from './types';
import { SECTIONS } from './types';

/** 정답률 기준 난이도 경계. 정답률이 낮을수록(=오답률 높을수록) 어렵다. */
export const DIFFICULTY = {
  hardBelowCorrectRate: 40, // 정답률 < 40 → 어려움 (오답률 > 60%)
  easyMinCorrectRate: 70, // 정답률 ≥ 70 → 쉬움 (오답률 ≤ 30%)
};

export type Outcome = 'correct' | 'wrong' | 'skipped' | 'untouched';
export type Difficulty = 'easy' | 'medium' | 'hard';

export function outcomeOf(r: QuestionResult): Outcome {
  if (r.status === 'untouched') return 'untouched';
  if (r.status === 'skipped') return 'skipped';
  return r.correct ? 'correct' : 'wrong';
}

export function difficultyOf(correctRate: number): Difficulty {
  if (correctRate < DIFFICULTY.hardBelowCorrectRate) return 'hard';
  if (correctRate >= DIFFICULTY.easyMinCorrectRate) return 'easy';
  return 'medium';
}

/** 오답률 = 100 - 정답률 */
export function errorRateOf(correctRate: number): number {
  return Math.round((100 - correctRate) * 10) / 10;
}

/** 산점도 한 점 = 한 문항 */
export interface Point {
  section: Section;
  number: number;
  errorRate: number; // x축
  timeSpentSec: number; // y축
  correctRate: number;
  outcome: Outcome;
  difficulty: Difficulty;
  overTarget: boolean; // 목표 시간 초과 여부
  answer: number;
  userAnswer: number | null;
}

export interface SectionStat {
  section: Section;
  total: number;
  answered: number;
  correct: number;
  wrong: number;
  skipped: number;
  untouched: number;
  untouchedNumbers: number[];
  accuracy: number; // 정답 / 응답 (0-1)
  score: number; // 정답 / 전체 (0-1)
  avgTimeSec: number; // 방문한 문항 평균 소요
  totalTimeSec: number;
}

export interface Overall {
  total: number;
  answered: number;
  correct: number;
  wrong: number;
  skipped: number;
  untouched: number;
  accuracy: number;
  score: number;
  totalTimeSec: number;
}

export interface Analysis {
  points: Point[];
  sections: SectionStat[];
  overall: Overall;
  /** 오답률 높은데 안 넘긴(응답한) 문제 — 시간 관리 누수. 오답·시간초과 우선. */
  timeSink: Point[];
  /** 오답률 낮은데 틀린 문제 — 아까운 실수. 최우선 보완. */
  carelessMiss: Point[];
  /** 시간이 부족해 손도 못 댄 문제. */
  untouched: Point[];
  /** 오답률 높은 문제를 잘 넘긴 것(전략적 패스) — 잘한 점. */
  goodSkips: Point[];
  /** 어렵지 않은데(정답률 40%↑) 패스한 문제 — 넘기지 말았어야 할 패스. */
  riskySkips: Point[];
  /** timeSink 중 오답에 쓴 시간 합(초) — 넘겼으면 아꼈을 시간. */
  wastedTimeSec: number;
}

function pointOf(r: QuestionResult, targetSec: number): Point {
  return {
    section: r.section,
    number: r.number,
    errorRate: errorRateOf(r.correctRate),
    timeSpentSec: r.timeSpentSec,
    correctRate: r.correctRate,
    outcome: outcomeOf(r),
    difficulty: difficultyOf(r.correctRate),
    overTarget: r.timeSpentSec > targetSec,
    answer: r.answer,
    userAnswer: r.userAnswer,
  };
}

/** timeSink 정렬: 오답 먼저, 그 안에서 시간 내림차순 */
function severity(p: Point): number {
  return (p.outcome === 'wrong' ? 1000 : 0) + p.timeSpentSec;
}

export function analyze(session: Session): Analysis {
  const target = session.config.targetPerQuestionSec;
  const points = session.results.map((r) => pointOf(r, target));

  const sections: SectionStat[] = SECTIONS.filter((sec) =>
    points.some((p) => p.section === sec),
  ).map((sec) => {
    const ps = points.filter((p) => p.section === sec);
    const answered = ps.filter((p) => p.outcome === 'correct' || p.outcome === 'wrong');
    const correct = ps.filter((p) => p.outcome === 'correct');
    const wrong = ps.filter((p) => p.outcome === 'wrong');
    const skipped = ps.filter((p) => p.outcome === 'skipped');
    const untouched = ps.filter((p) => p.outcome === 'untouched');
    const visited = ps.filter((p) => p.outcome !== 'untouched');
    const totalTimeSec = ps.reduce((a, p) => a + p.timeSpentSec, 0);
    return {
      section: sec,
      total: ps.length,
      answered: answered.length,
      correct: correct.length,
      wrong: wrong.length,
      skipped: skipped.length,
      untouched: untouched.length,
      untouchedNumbers: untouched.map((p) => p.number).sort((a, b) => a - b),
      accuracy: answered.length ? correct.length / answered.length : 0,
      score: ps.length ? correct.length / ps.length : 0,
      avgTimeSec: visited.length ? totalTimeSec / visited.length : 0,
      totalTimeSec,
    };
  });

  const overall: Overall = sections.reduce(
    (acc, s) => {
      acc.total += s.total;
      acc.answered += s.answered;
      acc.correct += s.correct;
      acc.wrong += s.wrong;
      acc.skipped += s.skipped;
      acc.untouched += s.untouched;
      acc.totalTimeSec += s.totalTimeSec;
      return acc;
    },
    {
      total: 0,
      answered: 0,
      correct: 0,
      wrong: 0,
      skipped: 0,
      untouched: 0,
      accuracy: 0,
      score: 0,
      totalTimeSec: 0,
    } as Overall,
  );
  overall.accuracy = overall.answered ? overall.correct / overall.answered : 0;
  overall.score = overall.total ? overall.correct / overall.total : 0;

  const answeredPts = points.filter((p) => p.outcome === 'correct' || p.outcome === 'wrong');

  const timeSink = answeredPts
    .filter((p) => p.difficulty === 'hard')
    .sort((a, b) => severity(b) - severity(a));

  const carelessMiss = points
    .filter((p) => p.outcome === 'wrong' && p.difficulty === 'easy')
    .sort((a, b) => b.correctRate - a.correctRate); // 가장 쉬운(정답률 높은) 것부터 = 가장 아까운 실수

  const untouched = points
    .filter((p) => p.outcome === 'untouched')
    .sort((a, b) => a.errorRate - b.errorRate); // 쉬운(오답률 낮은) 미착수부터 = 아쉬운 순

  const goodSkips = points
    .filter((p) => p.outcome === 'skipped' && p.difficulty === 'hard')
    .sort((a, b) => a.errorRate - b.errorRate);

  const riskySkips = points
    .filter((p) => p.outcome === 'skipped' && p.difficulty !== 'hard')
    .sort((a, b) => b.correctRate - a.correctRate); // 쉬운(정답률 높은) 것부터

  const wastedTimeSec = timeSink
    .filter((p) => p.outcome === 'wrong')
    .reduce((a, p) => a + p.timeSpentSec, 0);

  return {
    points,
    sections,
    overall,
    timeSink,
    carelessMiss,
    untouched,
    goodSkips,
    riskySkips,
    wastedTimeSec,
  };
}

export function fmtTime(sec: number): string {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}분 ${r}초` : `${r}초`;
}

export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

/** "무엇을 고치면 점수가 오르나" — 점수 언어로 환산한 처방. */
export interface Prescription {
  carelessCount: number; // 쉬운데 틀린 문항 수
  recoverablePoints: number; // 실수만 없애면 회복되는 점수(= carelessCount)
  untouchedCount: number;
  untouchedExpectedPoints: number; // 미착수에 도달했다면 기대 정답 수(문항 정답률 기준)
  wastedTimeSec: number; // 어려운 오답에 쓴 시간
  reclaimableQuestions: number; // 그 시간으로 더 풀 수 있던 문항 수(목표시간 기준)
  potentialGain: number; // recoverable + untouchedExpected
  top: { kind: 'careless' | 'untouched' | 'good'; points: number };
}

export function prescribe(a: Analysis, targetSec: number): Prescription {
  const recoverablePoints = a.carelessMiss.length;
  const untouchedExpectedPoints = Math.round(
    a.untouched.reduce((s, p) => s + p.correctRate / 100, 0),
  );
  const reclaimableQuestions = targetSec > 0 ? Math.floor(a.wastedTimeSec / targetSec) : 0;

  let top: Prescription['top'];
  if (recoverablePoints === 0 && untouchedExpectedPoints === 0) top = { kind: 'good', points: 0 };
  else if (recoverablePoints >= untouchedExpectedPoints)
    top = { kind: 'careless', points: recoverablePoints };
  else top = { kind: 'untouched', points: untouchedExpectedPoints };

  return {
    carelessCount: a.carelessMiss.length,
    recoverablePoints,
    untouchedCount: a.untouched.length,
    untouchedExpectedPoints,
    wastedTimeSec: a.wastedTimeSec,
    reclaimableQuestions,
    potentialGain: recoverablePoints + untouchedExpectedPoints,
    top,
  };
}

export interface BandStat {
  band: Difficulty;
  label: string;
  total: number; // 응답한 문항 수
  correct: number;
  accuracy: number; // correct / total
}

/** 난이도 구간별 정확도(응답한 문항 기준). 단일 세션에서도 견고한 지표. */
export function difficultyBands(a: Analysis): BandStat[] {
  const labels: Record<Difficulty, string> = { easy: '쉬움', medium: '중간', hard: '어려움' };
  const order: Difficulty[] = ['easy', 'medium', 'hard'];
  return order.map((band) => {
    const inBand = a.points.filter(
      (p) => p.difficulty === band && (p.outcome === 'correct' || p.outcome === 'wrong'),
    );
    const correct = inBand.filter((p) => p.outcome === 'correct').length;
    return {
      band,
      label: labels[band],
      total: inBand.length,
      correct,
      accuracy: inBand.length ? correct / inBand.length : 0,
    };
  });
}
