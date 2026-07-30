import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { store } from '../store';
import type { ProblemSet } from '../types';
import { useExam, type ExamController } from '../exam/useExam';
import { fmtClock, fmtTime } from '../analytics';
import ToolDock from '../components/ToolDock';

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

export default function Exam() {
  const { setId } = useParams();
  const [set, setSet] = useState<ProblemSet | null | undefined>(undefined);

  useEffect(() => {
    if (!setId) return;
    store.getProblemSet(setId).then((s) => setSet(s));
  }, [setId]);

  if (set === undefined) return <div className="page">불러오는 중…</div>;
  if (set === null) {
    return (
      <div className="page">
        <Link to="/" className="back">
          ← 홈
        </Link>
        <h1>문제셋을 찾을 수 없어요</h1>
      </div>
    );
  }
  return <ExamRunner set={set} />;
}

function ExamRunner({ set }: { set: ProblemSet }) {
  const exam = useExam(set);
  const nav = useNavigate();
  const savedRef = useRef(false);

  // 완료 시 세션 저장 후 결과로 이동
  useEffect(() => {
    if (exam.phase !== 'done' || savedRef.current) return;
    savedRef.current = true;
    const session = exam.buildSession();
    store.saveSession(session).then(() => nav(`/results/${session.id}`, { replace: true }));
  }, [exam.phase]);

  if (exam.phase === 'section-intro') return <SectionIntro exam={exam} />;
  if (exam.phase === 'done') return <div className="page">결과 계산 중…</div>;
  return <Question exam={exam} />;
}

function SectionIntro({ exam }: { exam: ExamController }) {
  return (
    <div className="page exam-intro">
      <Link to="/" className="back">
        ← 나가기
      </Link>
      <p className="muted">
        영역 {exam.sectionIndex + 1} / {exam.sectionCount}
      </p>
      <h1>{exam.section}</h1>
      <div className="intro-meta">
        <div>
          <strong>{exam.questionsInSection}</strong>
          <span className="muted">문항</span>
        </div>
        <div>
          <strong>{fmtClock(exam.sectionRemainingSec)}</strong>
          <span className="muted">제한 시간</span>
        </div>
      </div>
      <p className="lead">
        외부 창(책·PDF)에서 <b>{exam.section}</b> 문제를 준비하세요. 시작하면 타이머가 흐르고,
        <b> 지나간 문제는 다시 볼 수 없습니다.</b>
      </p>
      <button className="btn primary lg" onClick={exam.startSection}>
        시작
      </button>
    </div>
  );
}

function Question({ exam }: { exam: ExamController }) {
  const [confirm, setConfirm] = useState<{ msg: string; run: () => void } | null>(null);
  const lowTime = exam.sectionRemainingSec <= 60;
  // 마지막 영역의 마지막 문항 → '다음' 대신 '제출'
  const isLastQuestion =
    exam.sectionIndex === exam.sectionCount - 1 &&
    exam.questionIndex === exam.questionsInSection - 1;
  // 문항이 바뀔 때마다 값이 달라져 도구(메모·그림·계산기)를 리마운트=초기화시킨다.
  const resetKey = `${exam.sectionIndex}:${exam.questionIndex}`;

  // 답 클릭 → 선택만 표시. 실제 이동은 '다음' 버튼을 눌러야 일어남.
  const pick = (c: number) => exam.select(c);
  const doNext = () => exam.submit(); // 선택이 없으면 no-op
  const doSkip = () => exam.skip();
  const doGiveUp = () => {
    setConfirm({
      msg: '남은 문항을 포기하고 다음 영역으로 넘어갑니다. 미착수로 기록돼요.',
      run: exam.endSection,
    });
  };
  // 답 선택은 마우스 클릭만(키보드 숫자는 계산기 입력과 충돌하므로 사용 안 함).

  return (
    <div className="exam-screen">
      <header className="exam-top">
        <div className="exam-top-left">
          <span className="sec-name">{exam.section}</span>
          <span className="q-count">
            {exam.questionNumber}
            <span className="muted"> / {exam.questionsInSection}</span>
          </span>
        </div>
        <div className={`exam-top-center${lowTime ? ' low' : ''}`}>
          <span className="muted">남은 시간</span>
          <b>{fmtClock(exam.sectionRemainingSec)}</b>
        </div>
        <div className="exam-top-right">
          <div className="q-timer">
            <span className="muted">이 문항</span>
            <b>{fmtTime(exam.questionElapsedSec)}</b>
          </div>
          <button className="btn ghost sm pause-btn" onClick={exam.pause} type="button" title="일시정지">
            ⏸ 일시정지
          </button>
        </div>
      </header>

      <div className="exam-progress">
        <div
          className="exam-progress-bar"
          style={{ width: `${(exam.questionIndex / exam.questionsInSection) * 100}%` }}
        />
      </div>

      <main className="exam-main">
        <div className="q-card">
          <p className="q-hint muted">외부 창의 아래 번호 문제를 풀고 답을 고르세요</p>
          <div className="q-number">{exam.questionNumber}번</div>
          <div className="choices">
            {Array.from({ length: exam.choices }, (_, i) => i + 1).map((c) => (
              <button
                key={c}
                className={`choice${exam.selected === c ? ' selected' : ''}`}
                onClick={() => pick(c)}
              >
                {CIRCLED[c - 1] ?? c}
              </button>
            ))}
          </div>
          <p className="q-hint muted auto-hint">
            답을 <b>클릭</b>해 고른 뒤 <b>다음</b>을 눌러 넘어가세요. 답 없이 넘길 땐 <b>패스</b>. (키보드
            숫자는 계산기 입력용)
          </p>
          <div className="q-controls">
            <button className="btn ghost" onClick={doGiveUp}>
              남은 문제 포기
            </button>
            <div className="spacer" />
            <button className="btn" onClick={doSkip}>
              패스
            </button>
            <button className="btn primary" onClick={doNext} disabled={exam.selected == null}>
              {isLastQuestion ? '제출' : '다음'}
            </button>
          </div>
          <p className="q-answered muted">이 영역 응답 {exam.answeredInSection}문항</p>
        </div>

        <ToolDock resetKey={resetKey} />
      </main>

      {confirm && (
        <div className="modal-backdrop" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p>{confirm.msg}</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setConfirm(null)}>
                취소
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  const run = confirm.run;
                  setConfirm(null);
                  run();
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {exam.paused && (
        <div className="pause-overlay">
          <div className="pause-box">
            <div className="pause-emoji">⏸</div>
            <h2>일시정지됨</h2>
            <p className="muted">타이머가 멈췄어요. 준비되면 재개를 눌러 계속하세요.</p>
            <button className="btn primary lg" onClick={exam.resume} type="button">
              재개
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
