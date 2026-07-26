// 저장된 세션을 "현재 정답표" 기준으로 다시 채점(재산정)한다.
//
// 세션의 results[]는 응시 시점의 스냅샷이다 — 정답/정답률/정오가 그때 값으로 박혀 있다.
// 관리자가 나중에 정답표(정답·정답률)를 고쳐도 지난 결과는 옛 값 그대로다.
// 여기서는 저장본을 건드리지 않고(비파괴), 결과를 보여줄 때 현재 정답표로 다시 계산한다.
// - 응시 사실(userAnswer·timeSpentSec·status·번호)은 그대로 둔다.
// - 정답표에서 파생되는 값(answer·correctRate·correct)만 갱신한다.
// 정답표가 다시 바뀌거나 되돌려져도 매번 올바르게 재계산된다(self-healing).
import type { AnswerKeyItem, ProblemSet, QuestionResult, Session } from './types';

/** section+number → 현재 정답표 항목 */
function keyIndex(set: ProblemSet): Map<string, AnswerKeyItem> {
  const m = new Map<string, AnswerKeyItem>();
  for (const it of set.items) m.set(`${it.section}:${it.number}`, it);
  return m;
}

/**
 * 한 문항을 현재 정답표에 맞춰 재채점.
 * 응답/시간/상태는 그대로, 정답·정답률·정오만 갱신한다.
 * 정답표에서 사라진 문항이거나 바뀐 게 없으면 원본 참조를 그대로 돌려준다.
 */
export function recomputeResult(
  r: QuestionResult,
  idx: Map<string, AnswerKeyItem>,
): QuestionResult {
  const it = idx.get(`${r.section}:${r.number}`);
  if (!it) return r; // 정답표에서 사라진 문항 → 기존 스냅샷 유지
  // gradeCurrent와 동일한 규칙: 응답한 문항만 정오 판정, 패스/미착수는 null.
  const correct =
    r.status === 'answered' && r.userAnswer != null ? r.userAnswer === it.answer : null;
  if (it.answer === r.answer && it.correctRate === r.correctRate && correct === r.correct) {
    return r; // 변화 없음 → 동일 참조(호출부에서 값싸게 비교 가능)
  }
  return { ...r, answer: it.answer, correctRate: it.correctRate, correct };
}

/** results 전체를 현재 정답표로 재채점. */
export function recomputeResults(results: QuestionResult[], set: ProblemSet): QuestionResult[] {
  const idx = keyIndex(set);
  return results.map((r) => recomputeResult(r, idx));
}

/**
 * 세션을 현재 정답표에 맞춰 재산정.
 * 정답표가 없으면(미제공/삭제됨) 원본 세션을 그대로 반환한다.
 * 바뀐 문항이 하나도 없으면 원본 세션 참조를 그대로 반환한다(불필요한 리렌더 방지).
 */
export function recomputeSession(session: Session, set: ProblemSet | null | undefined): Session {
  if (!set) return session;
  const results = recomputeResults(session.results, set);
  const changed = results.some((r, i) => r !== session.results[i]);
  return changed ? { ...session, results } : session;
}
