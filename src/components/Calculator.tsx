import { useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';

function KeyButton({
  label,
  onClick,
  cls = 'border border-zinc-200 bg-white',
}: {
  label: string;
  onClick: () => void;
  cls?: string;
}) {
  return (
    <button
      className={`rounded-md py-2 text-sm font-medium transition hover:brightness-95 ${cls}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function fmt(n: number): string {
  if (!isFinite(n)) return 'Error';
  const r = parseFloat(n.toPrecision(12));
  return String(r);
}

// ───────────────────────── 수식 평가기 ─────────────────────────
// 재귀 하강 파서. 지원: 숫자(소수), + − × ÷ %, 괄호, 단항 +/−.
// 우선순위: (+ −) < (× ÷ %). % 는 나머지(modulo) 연산.
type Tok =
  | { t: 'num'; v: number }
  | { t: 'op'; v: '+' | '−' | '×' | '÷' | '%' }
  | { t: 'lp' }
  | { t: 'rp' };

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ') {
      i++;
      continue;
    }
    if ((c >= '0' && c <= '9') || c === '.') {
      let j = i;
      while (j < src.length && ((src[j] >= '0' && src[j] <= '9') || src[j] === '.')) j++;
      const num = src.slice(i, j);
      if (num === '.' || (num.match(/\./g)?.length ?? 0) > 1) throw new Error('bad number');
      toks.push({ t: 'num', v: parseFloat(num) });
      i = j;
      continue;
    }
    if (c === '(') toks.push({ t: 'lp' });
    else if (c === ')') toks.push({ t: 'rp' });
    else if (c === '+') toks.push({ t: 'op', v: '+' });
    else if (c === '-' || c === '−') toks.push({ t: 'op', v: '−' });
    else if (c === '*' || c === '×') toks.push({ t: 'op', v: '×' });
    else if (c === '/' || c === '÷') toks.push({ t: 'op', v: '÷' });
    else if (c === '%') toks.push({ t: 'op', v: '%' });
    else throw new Error('bad char: ' + c);
    i++;
  }
  return toks;
}

function evaluate(src: string): number {
  const toks = tokenize(src);
  let pos = 0;
  const peek = () => toks[pos];

  // expr := term (('+'|'−') term)*
  function parseExpr(): number {
    let v = parseTerm();
    for (;;) {
      const p = peek();
      if (p?.t === 'op' && (p.v === '+' || p.v === '−')) {
        pos++;
        const rhs = parseTerm();
        v = p.v === '+' ? v + rhs : v - rhs;
      } else break;
    }
    return v;
  }

  // term := factor (('×'|'÷'|'%') factor)*
  function parseTerm(): number {
    let v = parseFactor();
    for (;;) {
      const p = peek();
      if (p?.t === 'op' && (p.v === '×' || p.v === '÷' || p.v === '%')) {
        pos++;
        const rhs = parseFactor();
        if (p.v === '×') v = v * rhs;
        else if (p.v === '÷') {
          if (rhs === 0) throw new Error('divide by zero');
          v = v / rhs;
        } else {
          if (rhs === 0) throw new Error('modulo by zero');
          v = v % rhs;
        }
      } else break;
    }
    return v;
  }

  // factor := ('+'|'−') factor | '(' expr ')' | number
  function parseFactor(): number {
    const p = peek();
    if (!p) throw new Error('unexpected end');
    if (p.t === 'op' && p.v === '−') {
      pos++;
      return -parseFactor();
    }
    if (p.t === 'op' && p.v === '+') {
      pos++;
      return parseFactor();
    }
    if (p.t === 'lp') {
      pos++;
      const v = parseExpr();
      if (peek()?.t !== 'rp') throw new Error('missing )');
      pos++;
      return v;
    }
    if (p.t === 'num') {
      pos++;
      return p.v;
    }
    throw new Error('unexpected token');
  }

  const result = parseExpr();
  if (pos !== toks.length) throw new Error('trailing tokens');
  if (!isFinite(result)) throw new Error('not finite');
  return result;
}

const OP_GLYPHS = '×÷+−%';

export default function Calculator() {
  const [expr, setExpr] = useState(''); // 입력 중인 수식(표시 글리프 그대로)
  const [justEvaluated, setJustEvaluated] = useState(false); // = 직후 상태
  const [error, setError] = useState(false); // 마지막 평가 실패
  const [history, setHistory] = useState<string[]>([]); // 최근 2개 '식=결과'

  // 오류 상태에서는 빈 수식처럼 취급해 다음 입력이 새로 시작되게 함
  const eff = error ? '' : expr;
  const evaluated = error ? false : justEvaluated;

  // 실시간 미리보기: 완성된 유효 수식이고, 결과가 입력과 다를 때만 표시
  let preview: string | null = null;
  if (eff && !evaluated) {
    try {
      const out = fmt(evaluate(eff));
      if (out !== 'Error' && out !== eff) preview = out;
    } catch {
      /* 미완성 수식 → 미리보기 없음 */
    }
  }

  const inputDigit = (d: string) => {
    setError(false);
    if (evaluated) {
      setExpr(d);
      setJustEvaluated(false);
      return;
    }
    setExpr(eff + d);
  };

  const inputDot = () => {
    setError(false);
    if (evaluated) {
      setExpr('0.');
      setJustEvaluated(false);
      return;
    }
    const tail = eff.match(/[0-9.]*$/)?.[0] ?? '';
    if (tail.includes('.')) return; // 현재 숫자에 이미 소수점
    setExpr(eff + (tail === '' ? '0.' : '.')); // 연산자/괄호 뒤면 0. 으로 시작
  };

  const inputOp = (op: string) => {
    setError(false);
    if (evaluated) {
      setExpr(eff + op); // 결과에서 이어 계산
      setJustEvaluated(false);
      return;
    }
    const last = eff.slice(-1);
    if (eff === '' || last === '(') {
      if (op === '−' || op === '+') setExpr(eff + op); // 선두 단항만 허용
      return;
    }
    if (OP_GLYPHS.includes(last)) {
      if (op === '−' && '×÷%'.includes(last)) {
        setExpr(eff + op); // ×,÷,% 뒤의 − 는 단항으로 허용
        return;
      }
      setExpr(eff.slice(0, -1) + op); // 그 외엔 마지막 연산자 교체
      return;
    }
    setExpr(eff + op);
  };

  const inputParen = (p: '(' | ')') => {
    setError(false);
    if (p === '(') {
      if (evaluated) {
        setExpr('(');
        setJustEvaluated(false);
        return;
      }
      const last = eff.slice(-1);
      setExpr(eff + (last && /[0-9.)]/.test(last) ? '×(' : '(')); // 값 뒤엔 암묵적 곱
      return;
    }
    // p === ')'
    if (evaluated) return;
    const opens = (eff.match(/\(/g) || []).length;
    const closes = (eff.match(/\)/g) || []).length;
    if (opens <= closes) return; // 닫을 괄호 없음
    const last = eff.slice(-1);
    if (!last || '×÷+−%('.includes(last)) return; // 값 뒤에서만 닫기
    setExpr(eff + ')');
  };

  const backspace = () => {
    if (error) {
      setError(false);
      setExpr('');
      return;
    }
    if (evaluated) setJustEvaluated(false); // 결과를 편집 시작
    setExpr(eff.slice(0, -1));
  };

  const clearAll = () => {
    setExpr('');
    setJustEvaluated(false);
    setError(false);
  };

  const equals = () => {
    if (error || evaluated || eff === '') return;
    let out: string;
    try {
      out = fmt(evaluate(eff));
    } catch {
      out = 'Error';
    }
    setHistory((h) => [...h, `${eff}=${out}`].slice(-2)); // 최근 2개만 유지
    if (out === 'Error') {
      setError(true);
      setExpr('');
      setJustEvaluated(false);
    } else {
      setExpr(out);
      setJustEvaluated(true);
    }
  };

  // 계산기가 포커스된 동안 키보드 입력 처리(답 선택과 분리)
  const handleKey = (e: ReactKeyboardEvent) => {
    const k = e.key;
    if (k >= '0' && k <= '9') inputDigit(k);
    else if (k === '.') inputDot();
    else if (k === '+') inputOp('+');
    else if (k === '-') inputOp('−');
    else if (k === '*') inputOp('×');
    else if (k === '/') inputOp('÷');
    else if (k === '%') inputOp('%');
    else if (k === '(') inputParen('(');
    else if (k === ')') inputParen(')');
    else if (k === 'Enter' || k === '=') equals();
    else if (k === 'Backspace') backspace();
    else if (k === 'Escape' || k === 'c' || k === 'C') clearAll();
    else return;
    e.preventDefault();
  };

  const B = KeyButton;
  const shown = error ? 'Error' : eff === '' ? '0' : eff;

  return (
    <div className="rounded-lg border border-zinc-200 p-2.5 outline-none" tabIndex={0} onKeyDown={handleKey}>
      <div className="mb-2 flex h-11 flex-col items-end justify-start overflow-hidden rounded-md bg-zinc-50 px-2.5 py-1.5 text-right">
        {history.length === 0 && <p className="text-[11px] leading-4 text-zinc-300">최근 계산 기록</p>}
        {history.map((line, i) => (
          <div className="max-w-full truncate font-mono text-[11px] leading-4 text-zinc-400" key={i}>
            {line}
          </div>
        ))}
      </div>
      <div className="mb-2 flex min-h-12 flex-col justify-center overflow-x-auto whitespace-nowrap rounded-md bg-zinc-50 px-2.5 py-2 text-right font-mono tabular-nums">
        <span className="text-xl font-semibold">{shown}</span>
        <span className="min-h-[14px] text-[11px] text-zinc-400">{preview != null ? `= ${preview}` : ' '}</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        <B label="C" cls="col-span-3 bg-zinc-100" onClick={clearAll} />
        <B label="(" cls="bg-zinc-100" onClick={() => inputParen('(')} />
        <B label=")" cls="bg-zinc-100" onClick={() => inputParen(')')} />

        <B label="7" onClick={() => inputDigit('7')} />
        <B label="8" onClick={() => inputDigit('8')} />
        <B label="9" onClick={() => inputDigit('9')} />
        <B label="÷" cls="bg-zinc-100" onClick={() => inputOp('÷')} />
        <B label="×" cls="bg-zinc-100" onClick={() => inputOp('×')} />

        <B label="4" onClick={() => inputDigit('4')} />
        <B label="5" onClick={() => inputDigit('5')} />
        <B label="6" onClick={() => inputDigit('6')} />
        <B label="−" cls="bg-zinc-100" onClick={() => inputOp('−')} />
        <B label="+" cls="bg-zinc-100" onClick={() => inputOp('+')} />

        <B label="1" onClick={() => inputDigit('1')} />
        <B label="2" onClick={() => inputDigit('2')} />
        <B label="3" onClick={() => inputDigit('3')} />
        <B label="%" cls="bg-zinc-100" onClick={() => inputOp('%')} />
        <B label="=" cls="row-span-2 h-full bg-brand text-white" onClick={equals} />
        <B label="0" cls="col-span-3 border border-zinc-200 bg-white" onClick={() => inputDigit('0')} />
        <B label="." cls="border border-zinc-200 bg-white" onClick={inputDot} />
      </div>
    </div>
  );
}
