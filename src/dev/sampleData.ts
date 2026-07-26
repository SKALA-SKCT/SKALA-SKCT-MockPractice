// 개발용 더미 데이터. 로컬(npm run dev)에서 응시 흐름을 바로 테스트하기 위한
// 샘플 모의고사(ProblemSet)를 만들고 스토어(localStorage)에 넣는다.
// 프로덕션 빌드에서는 Home의 dev 전용 분기에서만 참조되므로 트리셰이킹으로 제거된다.
import type { AnswerKeyItem, ProblemSet } from '../types';
import { DEFAULT_CONFIG, SECTIONS } from '../types';
import { store } from '../store';

// 고정 id → 버튼을 여러 번 눌러도 같은 셋을 덮어쓴다(중복 생성 방지, store.upsert 참고).
const SAMPLE_ID = 'dev-sample-a';
const PER_SECTION = 20; // 영역당 문항 수 (20 × 45초 = 900초 = 15분 제한과 일치)

// 재현 가능한 더미 데이터를 위한 작은 결정론적 PRNG(mulberry32).
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildItems(): AnswerKeyItem[] {
  const rand = mulberry32(20260725); // 고정 시드 → 매번 동일한 정답표
  const items: AnswerKeyItem[] = [];
  for (const section of SECTIONS) {
    for (let number = 1; number <= PER_SECTION; number++) {
      const answer = 1 + Math.floor(rand() * DEFAULT_CONFIG.choices); // 1..choices
      const correctRate = Math.round(30 + rand() * 65); // 30~95% (난이도 분포)
      items.push({ section, number, answer, correctRate });
    }
  }
  return items;
}

/** 샘플 모의고사 한 벌을 구성한다(저장은 하지 않음). */
export function buildSampleProblemSet(): ProblemSet {
  return {
    id: SAMPLE_ID,
    name: 'SKCT 모의고사 샘플 A',
    createdAt: new Date().toISOString(),
    sections: [...SECTIONS],
    items: buildItems(),
    config: { ...DEFAULT_CONFIG },
    owner: '개발자', // dev 자동 로그인 닉네임과 맞춰 편집/삭제 가능하게
    official: true,
  };
}

/** 샘플 모의고사를 스토어에 저장하고 저장된 셋을 반환한다. */
export async function seedSampleProblemSet(): Promise<ProblemSet> {
  const set = buildSampleProblemSet();
  await store.saveProblemSet(set);
  return set;
}
