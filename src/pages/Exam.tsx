import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { store } from '../store';
import type { ProblemSet } from '../types';
import { useExam, type ExamController } from '../exam/useExam';
import { fmtClock } from '../analytics';
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
  const allowLeaveRef = useRef(false);
  const [leaveTarget, setLeaveTarget] = useState<string | null>(null);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowLeaveRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const handleDocumentClick = (event: MouseEvent) => {
      if (allowLeaveRef.current || event.defaultPrevented || !(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.href === window.location.href) return;
      event.preventDefault();
      event.stopPropagation();
      setLeaveTarget(destination.href);
    };
    const handlePopState = () => {
      if (allowLeaveRef.current) return;
      window.history.pushState({ practiceExamGuard: true }, '', window.location.href);
      setLeaveTarget('__back__');
    };

    window.history.pushState({ practiceExamGuard: true }, '', window.location.href);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, []);

  // 완료 시 세션 저장 후 결과로 이동
  useEffect(() => {
    if (exam.phase !== 'done' || savedRef.current) return;
    savedRef.current = true;
    const session = exam.buildSession();
    store.saveSession(session).then(() => nav(`/results/${session.id}`, { replace: true }));
  }, [exam.phase]);

  const requestExit = (target = '/') => {
    setLeaveTarget(new URL(target, window.location.href).href);
  };
  const confirmLeave = () => {
    if (!leaveTarget) return;
    const target = leaveTarget;
    allowLeaveRef.current = true;
    setLeaveTarget(null);
    if (target === '__back__') window.history.go(-2);
    else window.location.assign(target);
  };

  let content;
  if (exam.phase === 'section-intro') {
    content = <SectionIntro exam={exam} setName={set.name} onRequestExit={() => requestExit('/')} />;
  } else if (exam.phase === 'done') {
    content = <div className="page">결과 계산 중…</div>;
  } else {
    content = <Question exam={exam} setName={set.name} />;
  }

  return (
    <>
      {content}
      {leaveTarget && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/40 px-4" onClick={() => setLeaveTarget(null)}>
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <p className="text-lg font-bold text-zinc-900">응시를 중단할까요?</p>
            <p className="mt-3 text-sm leading-6 text-zinc-600">지금 나가면 이번 응시 기록과 저장된 답안이 모두 초기화됩니다.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50" type="button" onClick={() => setLeaveTarget(null)}>
                취소
              </button>
              <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-[#c90026]" type="button" onClick={confirmLeave}>
                나가기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SectionIntro({
  exam,
  setName,
  onRequestExit,
}: {
  exam: ExamController;
  setName: string;
  onRequestExit: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-6 pb-24">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-medium text-zinc-400">
          {setName} · {exam.sectionIndex + 1}/{exam.sectionCount}교시
        </p>
        <h1 className="mt-2 text-3xl font-bold">{exam.section}</h1>
        <p className="mt-3 text-sm text-zinc-500">
          {exam.questionsInSection}문항 · {Math.round(exam.sectionRemainingSec / 60)}분
        </p>
        <ul className="mx-auto mt-4 max-w-xs space-y-1 text-left text-xs text-zinc-400">
          <li>· 다음 문항으로 이동하면 이전 문항으로 돌아갈 수 없습니다.</li>
          <li>· 메모장/그림판은 문제를 넘기면 지워집니다.</li>
          <li>· 시간이 끝나면 자동 제출됩니다.</li>
        </ul>
        <button
          type="button"
          onClick={exam.startSection}
          className="mt-6 w-full rounded-[10px] bg-brand py-3 text-sm font-medium text-white transition hover:-translate-y-px hover:bg-[#c90026]"
        >
          시작하기
        </button>
        <button
          type="button"
          onClick={onRequestExit}
          className="mt-3 text-xs text-zinc-400 hover:text-zinc-600 hover:underline"
        >
          나가기
        </button>
      </div>
    </div>
  );
}

function Question({ exam, setName }: { exam: ExamController; setName: string }) {
  const nav = useNavigate();
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    confirmText: string;
    tone?: 'danger';
    run: () => void;
  } | null>(null);
  const [zoom, setZoom] = useState(100);
  const lowTime = exam.sectionRemainingSec <= 60;
  // 마지막 영역의 마지막 문항 → '다음' 대신 '제출'
  const isLastQuestion =
    exam.sectionIndex === exam.sectionCount - 1 &&
    exam.questionIndex === exam.questionsInSection - 1;
  // 문항이 바뀔 때마다 값이 달라져 도구(메모·그림·계산기)를 리마운트=초기화시킨다.
  const resetKey = `${exam.sectionIndex}:${exam.questionIndex}`;

  // 답 클릭 → 선택만 표시. 실제 이동은 '다음' 버튼을 눌러야 일어남.
  const pick = (c: number) => exam.select(exam.selected === c ? null : c);
  const doNext = () => {
    if (exam.selected == null) {
      setConfirm({
        title: '미응답으로 넘어갈까요?',
        message: '다음 문제로 이동하면 이 문제에는 다시 돌아올 수 없습니다.',
        confirmText: '넘어가기',
        tone: 'danger',
        run: exam.skip,
      });
      return;
    }
    exam.submit();
  };
  const doGiveUp = () => {
    setConfirm({
      title: '유형을 제출할까요?',
      message: `${exam.section} 유형을 제출하면 이 유형은 다시 풀 수 없습니다.`,
      confirmText: '제출하기',
      run: exam.endSection,
    });
  };
  const doExit = () => {
    setConfirm({
      title: '응시를 중단할까요?',
      message: '지금 나가면 이번 응시 기록과 저장된 답안이 모두 초기화됩니다.',
      confirmText: '나가기',
      tone: 'danger',
      run: () => nav('/'),
    });
  };
  // 답 선택은 마우스 클릭만(키보드 숫자는 계산기 입력과 충돌하므로 사용 안 함).
  useEffect(() => {
    document.body.classList.add('practice-exam-active');
    return () => document.body.classList.remove('practice-exam-active');
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 mb-5 border-b border-zinc-200 bg-page/95 backdrop-blur">
        <div className="mx-auto grid h-16 w-[min(1200px,calc(100vw-48px))] grid-cols-[1fr_auto_1fr] items-center">
          <p className="justify-self-start text-sm font-bold text-zinc-800">{setName}</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={exam.paused ? exam.resume : exam.pause}
              className={`h-8 min-w-[76px] rounded-lg border px-3 text-xs font-semibold transition ${
                exam.paused
                  ? 'border-brand bg-brand text-white hover:bg-[#c90026]'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              {exam.paused ? '재개' : '일시정지'}
            </button>
            <div className={`min-w-[76px] text-center ${lowTime ? 'text-brand' : 'text-zinc-900'}`}>
              <p className="text-[10px] font-semibold text-zinc-400">남은 시간</p>
              <p className="font-mono text-2xl font-bold tabular-nums">{fmtClock(exam.sectionRemainingSec)}</p>
            </div>
            <div className="min-w-[64px] border-l border-zinc-200 pl-4 text-center">
              <p className="text-[10px] font-semibold text-zinc-400">이 문항</p>
              <p className="font-mono text-sm font-bold tabular-nums text-zinc-700">
                {Math.floor(exam.questionElapsedSec)}초
              </p>
            </div>
          </div>
          <div className="justify-self-end">
            <div className="flex items-center rounded-lg border border-zinc-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setZoom((value) => Math.max(80, value - 10))}
                disabled={zoom <= 80}
                aria-label="화면 축소"
                className="flex h-7 w-8 items-center justify-center rounded-md text-base font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-30"
              >
                −
              </button>
              <span className="w-11 text-center text-[11px] font-semibold tabular-nums text-zinc-500">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom((value) => Math.min(120, value + 10))}
                disabled={zoom >= 120}
                aria-label="화면 확대"
                className="flex h-7 w-8 items-center justify-center rounded-md text-base font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </header>

      <main
        className="mx-auto grid w-[min(1200px,calc(100vw-48px))] origin-top grid-cols-[minmax(0,1fr)_400px] items-start gap-4"
        style={{ zoom: `${zoom}%` }}
      >
        <section className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm max-[760px]:p-2">
          <p className="mb-3 text-sm font-bold text-red-600 max-[760px]:hidden">
            {exam.section} 영역 {exam.questionIndex + 1}{' '}
            <span className="text-xs font-normal text-zinc-400">/ {exam.questionsInSection}</span>
          </p>
          <div className="grid min-h-[260px] min-w-0 place-content-center overflow-hidden rounded-xl bg-zinc-50 text-center max-[760px]:min-h-28">
            <p className="m-0 text-sm text-zinc-500 max-[760px]:hidden">외부 문제지의 문항을 확인하고 답을 선택하세요.</p>
            <strong className="mt-3 whitespace-nowrap text-[42px] text-zinc-900 max-[760px]:mt-0 max-[760px]:text-2xl">
              {exam.questionNumber}번
            </strong>
          </div>
          <div className="mt-5 flex min-w-0 flex-col gap-2 max-[760px]:mt-2 max-[760px]:gap-1">
            {Array.from({ length: exam.choices }, (_, i) => i + 1).map((c) => (
              <button
                key={c}
                aria-label={`${c}번`}
                className={`min-w-0 rounded-lg border px-4 py-2.5 text-left text-sm transition max-[760px]:px-1 max-[760px]:py-2 max-[760px]:text-center ${
                  exam.selected === c
                    ? 'border-red-500 bg-red-50 font-semibold text-red-700'
                    : 'border-zinc-200 hover:border-zinc-400'
                }`}
                onClick={() => pick(c)}
              >
                <span className="mr-2 max-[760px]:mr-0">{CIRCLED[c - 1] ?? c}</span>
                <span className="max-[760px]:sr-only">{c}번</span>
              </button>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-end max-[760px]:mt-2">
            <button
              type="button"
              onClick={doNext}
              className={`rounded-lg px-6 py-2.5 text-sm font-semibold text-white max-[760px]:w-full max-[760px]:px-1 max-[760px]:py-2 ${
                isLastQuestion ? 'bg-ink hover:bg-brand' : 'bg-brand hover:bg-[#c90026]'
              }`}
            >
              {isLastQuestion ? '제출' : '다음'}
            </button>
          </div>
        </section>

        <aside className="sticky top-20 w-[400px]">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <ToolDock resetKey={resetKey} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={doExit}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                나가기
              </button>
              <button
                type="button"
                onClick={doGiveUp}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-700"
              >
                다음 유형
              </button>
            </div>
          </div>
        </aside>
      </main>

      {confirm && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/40 px-4" onClick={() => setConfirm(null)}>
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold text-zinc-900">{confirm.title}</p>
            <p className="mt-3 text-sm leading-6 text-zinc-600">{confirm.message}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50" onClick={() => setConfirm(null)}>
                취소
              </button>
              <button
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                  confirm.tone === 'danger' ? 'bg-brand hover:bg-[#c90026]' : 'bg-ink hover:bg-brand'
                }`}
                onClick={() => {
                  const run = confirm.run;
                  setConfirm(null);
                  run();
                }}
              >
                {confirm.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
