import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { store } from '../store';
import type { ProblemSet } from '../types';

const OFFICIAL_MOCKS = [
  '2023년 하반기 온라인 1회',
  '2023년 하반기 온라인 2회',
  '2024년 상반기',
  '2024년 하반기 1회',
  '2024년 하반기 2회',
  '2024년 하반기 3회',
];

const PRIVATE_MOCKS = [
  '언어이해 집중 연습',
  '자료해석 집중 연습',
  '창의수리 집중 연습',
  '종합 문제 연습',
];

export default function Home() {
  const [sets, setSets] = useState<ProblemSet[]>([]);
  const nav = useNavigate();
  const { user } = useAuth();

  const refresh = () => store.listProblemSets().then(setSets).catch(() => setSets([]));
  useEffect(() => {
    refresh();
  }, []);

  const official = sets.filter((s) => s.official);
  const custom = sets.filter((s) => !s.official);

  return (
    <div className="page home">
      <div className="problem-set-grid">
        <ProblemSetPanel
          title="공식 문제셋"
          sets={official}
          mockNames={OFFICIAL_MOCKS}
          canAdd={!!user?.isAdmin}
          addTo="/admin?type=official"
          onStart={(id) => nav(`/exam/${id}`)}
        />
        <ProblemSetPanel
          title="사설 문제셋"
          sets={custom}
          mockNames={PRIVATE_MOCKS}
          canAdd
          addTo="/admin?type=private"
          onStart={(id) => nav(`/exam/${id}`)}
        />
      </div>
    </div>
  );
}

function ProblemSetPanel({
  title,
  sets,
  mockNames,
  canAdd,
  addTo,
  onStart,
}: {
  title: string;
  sets: ProblemSet[];
  mockNames: string[];
  canAdd: boolean;
  addTo: string;
  onStart: (id: string) => void;
}) {
  const rows = [
    ...sets.map((set) => ({ name: set.name, set })),
    ...mockNames
      .filter((name) => !sets.some((set) => set.name === name))
      .map((name) => ({ name, set: null })),
  ];

  return (
    <section className="card problem-set-panel">
      <div className="problem-set-head">
        <h2>{title}</h2>
        {canAdd && (
          <Link className="btn add-set-button" to={addTo}>
            추가하기
          </Link>
        )}
      </div>
      <ol className="problem-set-list">
        {rows.map((row, index) => (
          <li key={row.set?.id ?? `${title}-${row.name}`}>
            <span className="set-index">{index + 1}</span>
            <div className="set-row-copy">
              <strong>{row.name}</strong>
              {row.set && (
                <span>
                  {row.set.items.length}문항 · {row.set.sections.join(', ')}
                </span>
              )}
            </div>
            {row.set ? (
              <button className="btn primary sm" onClick={() => onStart(row.set!.id)}>
                응시
              </button>
            ) : (
              <span className="set-locked">준비중</span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
