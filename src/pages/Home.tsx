import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { store } from '../store';
import type { ProblemSet, Session } from '../types';

export default function Home() {
  const [sets, setSets] = useState<ProblemSet[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [manageOpen, setManageOpen] = useState(false);
  const nav = useNavigate();
  const { user } = useAuth();

  const refresh = async () => {
    try {
      const [storedSets, nextSessions] = await Promise.all([
        store.listProblemSets(),
        store.listSessions(),
      ]);
      setSets(storedSets);
      setSessions(nextSessions);
    } catch {
      setSets([]);
      setSessions([]);
    }
  };
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    if (!manageOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setManageOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [manageOpen]);

  const official = sets.filter((s) => s.official);
  const custom = sets.filter((s) => !s.official);
  const ownedSets = sets.filter((set) => set.owner === user?.nickname);
  const removeSet = async (id: string) => {
    if (!window.confirm('이 문제셋을 삭제할까요?')) return;
    try {
      await store.deleteProblemSet(id);
      await refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '문제셋을 삭제하지 못했습니다.');
    }
  };

  return (
    <div className="mx-auto min-h-[calc(100vh-68px)] w-full max-w-[1248px] px-6 pb-10 pt-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-ink">
            모의고사 문제 연습
          </h1>
          <p className="mb-0 mt-2 text-sm leading-6 text-zinc-500">
            원하는 문제셋을 선택해 답안을 입력하고 문항별 풀이 시간과 오답
            유형을 확인하며 연습할 수 있습니다.
          </p>
        </div>
        <Link
          className="shrink-0 whitespace-nowrap rounded-lg border border-hairline bg-white px-3.5 py-2 text-sm font-semibold text-ink no-underline transition hover:bg-page"
          to="/history"
        >
          지난 응시 기록
        </Link>
      </div>
      <div className="grid min-h-[calc(100vh-216px)] grid-cols-2 gap-5 max-[900px]:grid-cols-1">
        <ProblemSetPanel
          title="공식 문제셋"
          sets={official}
          sessions={sessions}
          onStart={(id) => nav(`/exam/${id}`)}
        />
        <ProblemSetPanel
          title="사설 문제셋"
          sets={custom}
          sessions={sessions}
          onStart={(id) => nav(`/exam/${id}`)}
        />
      </div>
      <div className="fixed bottom-7 right-7 z-40">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={manageOpen}
          onClick={() => setManageOpen(true)}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-5 text-sm font-bold text-white shadow-[0_10px_26px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:bg-[#c90026]"
        >
          <span className="text-lg leading-none">+</span>
          문제 추가 / 관리
        </button>
      </div>
      {manageOpen && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/35 px-5 py-8"
          role="presentation"
          onClick={() => setManageOpen(false)}
        >
          <section
            aria-labelledby="problem-set-manager-title"
            aria-modal="true"
            className="flex h-[min(506px,calc(100vh-64px))] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_24px_70px_rgba(0,0,0,0.2)]"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
              <h2 className="m-0 text-lg font-bold text-ink" id="problem-set-manager-title">
                문제 추가 / 관리
              </h2>
              <div className="flex items-center gap-2">
                {user?.isAdmin && (
                  <Link
                    className="rounded-lg bg-brand px-3 py-2 text-[11px] font-bold text-white no-underline hover:bg-[#c90026]"
                    onClick={() => setManageOpen(false)}
                    to="/admin?type=official"
                  >
                    공식 문제셋 추가
                  </Link>
                )}
                <Link
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[11px] font-bold text-ink no-underline hover:bg-page"
                  onClick={() => setManageOpen(false)}
                  to="/admin?type=private"
                >
                  사설 문제셋 추가
                </Link>
                <button
                  aria-label="닫기"
                  className="grid h-8 w-8 place-items-center rounded-full border border-hairline bg-white text-lg leading-none text-zinc-500 hover:bg-page"
                  onClick={() => setManageOpen(false)}
                  type="button"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5">
              {ownedSets.length === 0 ? (
                <div className="grid min-h-48 place-items-center text-sm text-zinc-400">
                  내가 만든 문제셋이 없습니다.
                </div>
              ) : (
                <ol className="m-0 list-none p-0">
                  {ownedSets.map((set, index) => (
                    <li
                      className="grid min-h-[64px] grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 border-b border-hairline last:border-b-0"
                      key={set.id}
                    >
                      <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-page text-xs font-bold text-zinc-500">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {set.official && (
                            <span className="rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-brand">
                              공식
                            </span>
                          )}
                          <strong className="truncate text-[13px] font-semibold text-ink">{set.name}</strong>
                        </div>
                        <p className="mt-1 text-[11px] text-zinc-400">{set.items.length}문항</p>
                      </div>
                      <button
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        onClick={() => removeSet(set.id)}
                        type="button"
                      >
                        삭제
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function ProblemSetPanel({
  title,
  sets,
  sessions,
  onStart,
}: {
  title: string;
  sets: ProblemSet[];
  sessions: Session[];
  onStart: (id: string) => void;
}) {
  const description =
    title === '공식 문제셋'
      ? '운영진이 검수한 문제셋입니다. 공식 문제셋 추가는 관리자만 가능합니다.'
      : '사용자가 직접 만든 문제셋입니다. 누구나 새 문제셋을 추가할 수 있습니다.';

  return (
    <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-white shadow-[0_8px_28px_rgba(32,32,32,0.055)]">
      <div className="flex min-h-14 items-center justify-between gap-4 border-b border-hairline px-5 py-3">
        <h2 className="m-0 text-base font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          <div className="group relative">
            <button
              type="button"
              aria-label={`${title} 안내`}
              className="grid h-7 w-7 cursor-help place-items-center rounded-full border border-hairline bg-white text-xs font-bold text-ink-2 hover:bg-page"
            >
              ?
            </button>
            <div role="tooltip" className="pointer-events-none invisible absolute right-0 top-full z-20 mt-2 w-60 translate-y-[-4px] rounded-xl border border-black/10 bg-white p-3 text-xs font-normal leading-5 text-ink-2 opacity-0 shadow-[0_14px_32px_rgba(0,0,0,0.14)] transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              {description}
            </div>
          </div>
        </div>
      </div>
      <ol className="m-0 flex flex-1 list-none flex-col px-5 py-0">
        {sets.length === 0 && (
          <li className="grid flex-1 place-items-center text-base font-light text-zinc-400">
            <span className="-translate-y-2">아직 문제셋이 없어요.</span>
          </li>
        )}
        {sets.map((set, index) => (
          <li className="grid min-h-[62px] grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 border-b border-hairline last:border-b-0" key={set.id}>
            <span className="grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-page text-[13px] font-bold text-zinc-500">{index + 1}</span>
            <div className="min-w-0">
              <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold">{set.name}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              {sessions.find((session) => session.problemSetId === set.id) ? (
                <>
                  <button className="rounded-lg border-0 bg-brand px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#c90026]" onClick={() => onStart(set.id)}>
                    재응시
                  </button>
                  <Link
                    className="rounded-lg border border-hairline bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink no-underline hover:bg-page"
                    to={`/results/${
                      sessions.find((session) => session.problemSetId === set.id)!.id
                    }`}
                  >
                    결과
                  </Link>
                </>
              ) : (
                <button className="rounded-lg border-0 bg-brand px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#c90026]" onClick={() => onStart(set.id)}>
                  응시
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
