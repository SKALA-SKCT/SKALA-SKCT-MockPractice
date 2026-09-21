import assert from 'node:assert/strict';
import test from 'node:test';

import { appendDecimal, evaluate, finishCalculation, startNextCalculation } from '../src/components/calculatorLogic.ts';

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

test('계산 결과는 다음 입력 전까지 현재 결과로 남고 이후 최신 기록의 아래에 쌓인다', () => {
  const finished = finishCalculation('2+3', []);

  assert.deepEqual(finished, {
    expression: '5',
    history: [],
    pendingRecord: '2+3 = 5',
    calculated: true,
  });
  assert.deepEqual(startNextCalculation(finished, '4'), {
    expression: '4',
    history: ['2+3 = 5'],
    pendingRecord: null,
    calculated: false,
  });
});
