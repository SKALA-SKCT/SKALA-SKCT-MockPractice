import assert from 'node:assert/strict';
import test from 'node:test';

import { appendDecimal, evaluate } from '../src/components/calculatorLogic.ts';

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
