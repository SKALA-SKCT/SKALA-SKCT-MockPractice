import { useState } from 'react';

// 메모는 문항별로 초기화된다(ToolDock이 resetKey로 리마운트). 지속 저장하지 않음.
export default function Memo() {
  const [text, setText] = useState('');

  return (
    <div className="memo">
      <textarea
        className="memo-area"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="자유롭게 메모하세요… (계산 과정, 표 정리 등)"
        spellCheck={false}
      />
      <div className="memo-bar">
        <span className="muted">{text.length}자</span>
        <button className="btn ghost sm" onClick={() => setText('')} type="button">
          지우기
        </button>
      </div>
    </div>
  );
}
