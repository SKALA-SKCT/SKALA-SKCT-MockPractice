import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { AnswerKeyItem, ProblemSet, QuestionResult, Section, Session } from '../types';
import { SECTIONS } from '../types';

interface Plan {
  sections: Section[];
  items: Record<string, AnswerKeyItem[]>;
}

function buildPlan(set: ProblemSet): Plan {
  const items: Record<string, AnswerKeyItem[]> = {};
  for (const it of set.items) {
    (items[it.section] ||= []).push(it);
  }
  for (const k of Object.keys(items)) items[k].sort((a, b) => a.number - b.number);
  const sections = SECTIONS.filter((s) => items[s]?.length);
  return { sections, items };
}

type Phase = 'section-intro' | 'question' | 'done';

interface ExamState {
  phase: Phase;
  secIdx: number;
  qIdx: number;
  selected: number | null;
  sectionStartMs: number;
  questionStartMs: number;
  results: QuestionResult[];
}

type Action =
  | { type: 'START_SECTION'; now: number }
  | { type: 'SELECT'; choice: number }
  | { type: 'ADVANCE'; now: number; status: 'answered' | 'skipped' }
  | { type: 'END_SECTION'; now: number }
  | { type: 'SHIFT_TIME'; delta: number }; // 일시정지 재개 시 멈춘 시간만큼 시작 시각을 밀어냄

function gradeCurrent(
  item: AnswerKeyItem,
  section: Section,
  selected: number | null,
  status: 'answered' | 'skipped',
  timeSpentSec: number,
): QuestionResult {
  const answered = status === 'answered' && selected != null;
  return {
    section,
    number: item.number,
    userAnswer: answered ? selected : null,
    status: answered ? 'answered' : 'skipped',
    timeSpentSec: Math.max(0, timeSpentSec),
    correct: answered ? selected === item.answer : null,
    answer: item.answer,
    correctRate: item.correctRate,
  };
}

function untouchedResult(item: AnswerKeyItem, section: Section): QuestionResult {
  return {
    section,
    number: item.number,
    userAnswer: null,
    status: 'untouched',
    timeSpentSec: 0,
    correct: null,
    answer: item.answer,
    correctRate: item.correctRate,
  };
}

function toNextSection(state: ExamState, results: QuestionResult[], plan: Plan): ExamState {
  if (state.secIdx + 1 < plan.sections.length) {
    return {
      ...state,
      phase: 'section-intro',
      secIdx: state.secIdx + 1,
      qIdx: 0,
      selected: null,
      results,
    };
  }
  return { ...state, phase: 'done', results };
}

function reducerFor(plan: Plan) {
  return function reducer(state: ExamState, action: Action): ExamState {
    const sec = plan.sections[state.secIdx];
    const list = sec ? plan.items[sec] : [];
    switch (action.type) {
      case 'START_SECTION':
        return {
          ...state,
          phase: 'question',
          qIdx: 0,
          selected: null,
          sectionStartMs: action.now,
          questionStartMs: action.now,
        };
      case 'SELECT':
        return { ...state, selected: action.choice };
      case 'SHIFT_TIME':
        // 멈춰 있던 시간(delta)만큼 두 시작 시각을 미래로 이동 → 경과/잔여 계산에서 그 구간이 제외됨
        return {
          ...state,
          sectionStartMs: state.sectionStartMs + action.delta,
          questionStartMs: state.questionStartMs + action.delta,
        };
      case 'ADVANCE': {
        const item = list[state.qIdx];
        const timeSpentSec = (action.now - state.questionStartMs) / 1000;
        const result = gradeCurrent(item, sec, state.selected, action.status, timeSpentSec);
        const results = [...state.results, result];
        if (state.qIdx + 1 < list.length) {
          return {
            ...state,
            results,
            qIdx: state.qIdx + 1,
            selected: null,
            questionStartMs: action.now,
          };
        }
        return toNextSection(state, results, plan); // 마지막 문항까지 완료
      }
      case 'END_SECTION': {
        // 시간 종료 또는 조기 제출: 현재 문항 기록 + 이후 미착수 처리
        const item = list[state.qIdx];
        const timeSpentSec = (action.now - state.questionStartMs) / 1000;
        const current = gradeCurrent(
          item,
          sec,
          state.selected,
          state.selected != null ? 'answered' : 'skipped',
          timeSpentSec,
        );
        const rest = list.slice(state.qIdx + 1).map((it) => untouchedResult(it, sec));
        const results = [...state.results, current, ...rest];
        return toNextSection(state, results, plan);
      }
    }
    return state;
  };
}

export interface ExamController {
  plan: Plan;
  phase: Phase;
  section: Section;
  sectionIndex: number;
  sectionCount: number;
  questionNumber: number; // 영역 내 문항 번호
  questionIndex: number; // 0-base
  questionsInSection: number;
  selected: number | null;
  choices: number;
  sectionRemainingSec: number;
  questionElapsedSec: number;
  answeredInSection: number;
  paused: boolean;
  select: (choice: number) => void;
  submit: () => void;
  commitAnswer: () => void; // 대기 후 자동 확정(항상 최신 상태로 dispatch)
  skip: () => void;
  pause: () => void;
  resume: () => void;
  startSection: () => void;
  endSection: () => void;
  buildSession: () => Session;
}

export function useExam(set: ProblemSet): ExamController {
  const plan = useMemo(() => buildPlan(set), [set]);
  const reducer = useMemo(() => reducerFor(plan), [plan]);
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    phase: 'section-intro' as Phase,
    secIdx: 0,
    qIdx: 0,
    selected: null,
    sectionStartMs: 0,
    questionStartMs: 0,
    results: [],
  }));

  const [now, setNow] = useState(() => Date.now());
  const [paused, setPaused] = useState(false); // 일시정지 중이면 타이머 정지
  const startedAtRef = useRef<string | null>(null);
  const armedRef = useRef(false); // 현재 영역 타임아웃 1회만 처리
  const pauseStartRef = useRef<number | null>(null); // 일시정지 시작 시각

  // 250ms 틱: 문항 경과·영역 잔여 시간을 실시간 갱신 (일시정지 중엔 멈춤)
  useEffect(() => {
    if (state.phase !== 'question' || paused) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [state.phase, state.secIdx, paused]);

  const perSection = set.config.perSectionTimeSec;
  const sectionRemainingSec =
    state.phase === 'question' ? perSection - (now - state.sectionStartMs) / 1000 : perSection;
  const questionElapsedSec =
    state.phase === 'question' ? (now - state.questionStartMs) / 1000 : 0;

  // 영역 시간 종료 → 자동 마감 (영역당 1회, 일시정지 중엔 마감 안 함)
  useEffect(() => {
    if (state.phase === 'question' && !paused && armedRef.current && sectionRemainingSec <= 0) {
      armedRef.current = false;
      dispatch({ type: 'END_SECTION', now: Date.now() });
    }
  }, [sectionRemainingSec, state.phase, paused]);

  const sec = plan.sections[state.secIdx];
  const list = sec ? plan.items[sec] : [];
  const answeredInSection = state.results.filter(
    (r) => r.section === sec && r.status === 'answered',
  ).length;

  const startSection = () => {
    if (!startedAtRef.current) startedAtRef.current = new Date().toISOString();
    armedRef.current = true;
    const t = Date.now();
    setNow(t);
    dispatch({ type: 'START_SECTION', now: t });
  };
  const select = (choice: number) => dispatch({ type: 'SELECT', choice });
  const submit = () => {
    if (state.selected == null) return;
    dispatch({ type: 'ADVANCE', now: Date.now(), status: 'answered' });
  };
  // 클릭 후 디바운스 자동 넘김용: 렌더 시점 state가 아니라 리듀서의 최신 selected를 사용.
  const commitAnswer = () => dispatch({ type: 'ADVANCE', now: Date.now(), status: 'answered' });
  const skip = () => dispatch({ type: 'ADVANCE', now: Date.now(), status: 'skipped' });
  const pause = () => {
    if (paused || state.phase !== 'question') return;
    pauseStartRef.current = Date.now();
    setNow(Date.now()); // 표시 시간을 현재로 고정
    setPaused(true);
  };
  const resume = () => {
    if (!paused) return;
    const delta = Date.now() - (pauseStartRef.current ?? Date.now()); // 멈춰 있던 시간
    pauseStartRef.current = null;
    dispatch({ type: 'SHIFT_TIME', delta }); // 그만큼 시작 시각을 밀어 경과/잔여에서 제외
    setNow(Date.now());
    setPaused(false);
  };
  const endSection = () => {
    armedRef.current = false;
    dispatch({ type: 'END_SECTION', now: Date.now() });
  };

  const buildSession = (): Session => ({
    id: crypto.randomUUID(),
    problemSetId: set.id,
    problemSetName: set.name,
    startedAt: startedAtRef.current ?? new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    config: set.config,
    results: state.results,
  });

  return {
    plan,
    phase: state.phase,
    section: sec,
    sectionIndex: state.secIdx,
    sectionCount: plan.sections.length,
    questionNumber: list[state.qIdx]?.number ?? 0,
    questionIndex: state.qIdx,
    questionsInSection: list.length,
    selected: state.selected,
    choices: set.config.choices,
    sectionRemainingSec: Math.max(0, sectionRemainingSec),
    questionElapsedSec,
    answeredInSection,
    paused,
    select,
    submit,
    commitAnswer,
    skip,
    pause,
    resume,
    startSection,
    endSection,
    buildSession,
  };
}
