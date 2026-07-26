import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { store } from '../store';
import { useAuth } from '../auth';
import { seedSampleProblemSet } from '../dev/sampleData';
import type { ProblemSet } from '../types';

export default function Home() {
  const [sets, setSets] = useState<ProblemSet[]>([]);
  const nav = useNavigate();
  const { user, logout } = useAuth();

  const refresh = () => store.listProblemSets().then(setSets).catch(() => setSets([]));
  useEffect(() => {
    refresh();
  }, []);

  // 개발 모드에서만: 응시 흐름을 바로 테스트할 수 있게 샘플 모의고사를 넣는다.
  const seedSample = async () => {
    await seedSampleProblemSet();
    refresh();
  };

  const official = sets.filter((s) => s.official);
  const custom = sets.filter((s) => !s.official);

  return (
    <div className="page home">
      <div className="user-bar">
        <span className="muted">
          <b>{user?.nickname}</b>님
        </span>
        <button className="linklike" type="button" onClick={() => logout()}>
          로그아웃
        </button>
      </div>
      <header className="hero">
        <h1>SKCT 연습 도구</h1>
        <p className="lead">
          문제는 외부 창(책·PDF)에서 보고, 여기엔 <b>답만</b> 적습니다. 지나간 문제는 다시 못 푸는 실전처럼,
          문항별 걸린 시간과 오답 패턴을 끝나고 분석해 줍니다.
        </p>
      </header>

      <div className="actions">
        <Link className="btn primary" to="/admin">
          관리자 · 문제셋 만들기
        </Link>
        <Link className="btn ghost" to="/history">
          결과 기록 보기
        </Link>
        {import.meta.env.DEV && (
          <button className="btn ghost" type="button" onClick={seedSample}>
            🧪 샘플 문제셋 넣기
          </button>
        )}
      </div>

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
              <h2>
                공식 문제셋 <span className="muted">· 관리자</span>
              </h2>
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
