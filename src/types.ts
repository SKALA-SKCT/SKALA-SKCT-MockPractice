// SKCT 인지역량 5개 영역
export const SECTIONS = ['언어이해', '자료해석', '창의수리', '언어추리', '수열추리'] as const;
export type Section = (typeof SECTIONS)[number];

/** 정답표 한 문항 — OCR 또는 수동 입력으로 채워진다. */
export interface AnswerKeyItem {
  section: Section;
  number: number; // 영역 내 문항 번호 (1-base)
  answer: number; // 정답 선택지 (1..choices)
  correctRate: number; // 정답률 % (0-100). 오답률 = 100 - correctRate
}

export interface ProblemSetConfig {
  choices: number; // 선택지 수 (SKCT 기본 5지선다)
  perSectionTimeSec: number; // 영역별 제한시간 (기본 900초 = 15분)
  targetPerQuestionSec: number; // 문항당 목표 시간 (기본 45초)
}

export const DEFAULT_CONFIG: ProblemSetConfig = {
  choices: 5,
  perSectionTimeSec: 15 * 60,
  targetPerQuestionSec: 45,
};

/** 관리자가 만든 하나의 시험지(정답표 묶음). */
export interface ProblemSet {
  id: string;
  name: string;
  createdAt: string; // ISO
  sections: Section[]; // 포함된 영역(정답표에 존재하는 영역들)
  items: AnswerKeyItem[];
  config: ProblemSetConfig;
  owner?: string; // 만든 사람(닉네임). 프로덕션에선 서버가 결정.
  official?: boolean; // 관리자가 만든 공식 문제셋 → 상단 표시
}

/** 응시 중 한 문항이 어떻게 처리됐는지. */
export type QuestionStatus =
  | 'answered' // 답을 제출함
  | 'skipped' // 봤지만 건너뜀(패스)
  | 'untouched'; // 시간이 부족해 한 번도 도달하지 못함

export interface QuestionResult {
  section: Section;
  number: number;
  userAnswer: number | null;
  status: QuestionStatus;
  timeSpentSec: number; // 이 문항에 머문 시간(untouched면 0)
  correct: boolean | null; // 채점 결과(미응답이면 null)
  answer: number; // 정답(복기용)
  correctRate: number; // 정답률(분석용)
}

export interface Session {
  id: string;
  problemSetId: string;
  problemSetName: string;
  startedAt: string; // ISO
  finishedAt: string; // ISO
  config: ProblemSetConfig;
  results: QuestionResult[];
}
