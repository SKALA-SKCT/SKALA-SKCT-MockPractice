import assert from 'node:assert/strict';
import test from 'node:test';

import { appendDecimal, evaluate, finishCalculation } from '../src/components/calculatorLogic.ts';

test('소수 입력을 유지해 21.3을 10으로 나눈다', () => {
  let expression = '';
  expression += '2';
  expression += '1';
  expression = appendDecimal(expression, false);
  expression += '3';
  expression += '÷';
  expression += '1';
  expression += '0';

  assert.equal(expression, '21.3÷10');
  assert.equal(evaluate(expression), 2.13);
});

test('계산 결과를 현재 표시값과 히스토리 최신 줄에 즉시 남긴다', () => {
  const finished = finishCalculation('2+3', []);

  assert.deepEqual(finished, {
    expression: '5',
    history: ['2+3 = 5'],
    calculated: true,
  });
});

test('퍼센트 연산을 지원하지 않는다', () => {
  assert.throws(() => evaluate('50%'));
});
