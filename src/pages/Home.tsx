import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { store } from '../store';
import type { ProblemSet } from '../types';

export default function Home() {
  const [sets, setSets] = useState<ProblemSet[]>([]);
  const nav = useNavigate();

  const refresh = () => store.listProblemSets().then(setSets).catch(() => setSets([]));
  useEffect(() => {
    refresh();
  }, []);

  const official = sets.filter((s) => s.official);
  const custom = sets.filter((s) => !s.official);

  return (
    <div className="page home">
      {sets.length === 0 ? (
        <section className="card">
          <h2>문제셋</h2>
          <p className="muted">
            아직 문제셋이 없어요. <Link to="/admin">관리자</Link>에서 정답표를 등록해 만드세요.
          </p>
        </section>
      ) : (
        <>
          {official.length > 0 && (
            <section className="card">
              <h2>공식 문제셋</h2>
              <SetList sets={official} onStart={(id) => nav(`/exam/${id}`)} />
            </section>
          )}
          <section className="card">
            <h2>사용자 지정 문제셋</h2>
            {custom.length === 0 ? (
              <p className="muted">
                아직 없어요. 누구나 <Link to="/admin">관리자</Link>에서 추가할 수 있어요.
              </p>
            ) : (
              <SetList sets={custom} onStart={(id) => nav(`/exam/${id}`)} />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function SetList({ sets, onStart }: { sets: ProblemSet[]; onStart: (id: string) => void }) {
  return (
    <ul className="set-list">
      {sets.map((s) => (
        <li key={s.id}>
          <div className="set-meta">
            <strong>{s.name}</strong>
            <span className="muted">
              {s.items.length}문항 · {s.sections.join(', ')}
              {s.owner ? ` · ${s.owner}` : ''}
            </span>
          </div>
          <button className="btn primary sm" onClick={() => onStart(s.id)}>
            응시 시작
          </button>
        </li>
      ))}
    </ul>
  );
}
