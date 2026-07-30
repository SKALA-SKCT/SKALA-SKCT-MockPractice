import { useState } from 'react';
import Calculator from './Calculator';
import Memo from './Memo';
import DrawPad from './DrawPad';

type Tab = 'memo' | 'draw';

const TABS: { id: Tab; label: string }[] = [
  { id: 'memo', label: '메모장' },
  { id: 'draw', label: '그림판' },
];

export default function ToolDock({ resetKey }: { resetKey?: string | number }) {
  const [tab, setTab] = useState<Tab>('memo');
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button className="tool-reopen" onClick={() => setOpen(true)} type="button">
        도구 열기 ▸
      </button>
    );
  }

  return (
    <aside className="tool-dock">
      <div className="tool-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tool-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
            type="button"
          >
            {t.label}
          </button>
        ))}
        <button className="tool-collapse" onClick={() => setOpen(false)} type="button" title="접기">
          ✕
        </button>
      </div>
      <div className="tool-body">
        {/* 항상 마운트한 채 표시만 토글 → 탭 전환에도 내용 유지.
            단, resetKey(문항)가 바뀌면 리마운트되어 내용이 초기화된다. */}
        <div hidden={tab !== 'memo'}>
          <Memo key={resetKey} />
        </div>
        <div hidden={tab !== 'draw'}>
          <DrawPad key={resetKey} />
        </div>
      </div>

      {/* 계산기는 분리해 항상 아래에 표시 */}
      <div className="tool-calc">
        <div className="tool-calc-label">계산기</div>
        <Calculator key={resetKey} />
      </div>
    </aside>
  );
}
