export function formatResult(value: number): string {
  if (!isFinite(value)) return 'Error';
  const rounded = parseFloat(value.toPrecision(12));
  return String(rounded);
}

// 재귀 하강 파서. 지원: 숫자(소수), + − × ÷ %, 괄호, 단항 +/−.
// 우선순위: (+ −) < (× ÷ %). % 는 나머지(modulo) 연산.
type Token =
  | { type: 'number'; value: number }
  | { type: 'operator'; value: '+' | '−' | '×' | '÷' | '%' }
  | { type: 'leftParenthesis' }
  | { type: 'rightParenthesis' };

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (character === ' ') {
      index++;
      continue;
    }
    if ((character >= '0' && character <= '9') || character === '.') {
      let end = index;
      while (end < source.length && ((source[end] >= '0' && source[end] <= '9') || source[end] === '.')) {
        end++;
      }
      const number = source.slice(index, end);
      if (number === '.' || (number.match(/\./g)?.length ?? 0) > 1) {
        throw new Error('bad number');
      }
      tokens.push({ type: 'number', value: parseFloat(number) });
      index = end;
      continue;
    }
    if (character === '(') tokens.push({ type: 'leftParenthesis' });
    else if (character === ')') tokens.push({ type: 'rightParenthesis' });
    else if (character === '+') tokens.push({ type: 'operator', value: '+' });
    else if (character === '-' || character === '−') {
      tokens.push({ type: 'operator', value: '−' });
    } else if (character === '*' || character === '×') {
      tokens.push({ type: 'operator', value: '×' });
    } else if (character === '/' || character === '÷') {
      tokens.push({ type: 'operator', value: '÷' });
    } else if (character === '%') tokens.push({ type: 'operator', value: '%' });
    else throw new Error('bad char: ' + character);
    index++;
  }
  return tokens;
}

export function evaluate(source: string): number {
  const tokens = tokenize(source);
  let position = 0;
  const peek = () => tokens[position];

  function parseExpression(): number {
    let value = parseTerm();
    for (;;) {
      const token = peek();
      if (token?.type === 'operator' && (token.value === '+' || token.value === '−')) {
        position++;
        const right = parseTerm();
        value = token.value === '+' ? value + right : value - right;
      } else break;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    for (;;) {
      const token = peek();
      if (token?.type === 'operator' && (token.value === '×' || token.value === '÷' || token.value === '%')) {
        position++;
        const right = parseFactor();
        if (token.value === '×') value *= right;
        else if (token.value === '÷') {
          if (right === 0) throw new Error('divide by zero');
          value /= right;
        } else {
          if (right === 0) throw new Error('modulo by zero');
          value %= right;
        }
      } else break;
    }
    return value;
  }

  function parseFactor(): number {
    const token = peek();
    if (!token) throw new Error('unexpected end');
    if (token.type === 'operator' && token.value === '−') {
      position++;
      return -parseFactor();
    }
    if (token.type === 'operator' && token.value === '+') {
      position++;
      return parseFactor();
    }
    if (token.type === 'leftParenthesis') {
      position++;
      const value = parseExpression();
      if (peek()?.type !== 'rightParenthesis') throw new Error('missing )');
      position++;
      return value;
    }
    if (token.type === 'number') {
      position++;
      return token.value;
    }
    throw new Error('unexpected token');
  }

  const result = parseExpression();
  if (position !== tokens.length) throw new Error('trailing tokens');
  if (!isFinite(result)) throw new Error('not finite');
  return result;
}

export function appendDecimal(expression: string, justEvaluated: boolean): string {
  if (justEvaluated) return '0.';
  const currentNumber = expression.match(/[0-9.]*$/)?.[0] ?? '';
  if (currentNumber.includes('.')) return expression;
  return expression + (currentNumber === '' ? '0.' : '.');
}
