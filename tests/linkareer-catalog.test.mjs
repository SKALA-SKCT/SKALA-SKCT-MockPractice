import assert from 'node:assert/strict';
import { test } from 'node:test';
import { correctProblemSet, getProblemSet, sourceSetId } from '../src/linkareer-catalog.ts';
import { onRequestGet as listSets } from '../functions/api/problemsets.ts';
import { onRequestGet as singleSet } from '../functions/api/problemsets/[id].ts';
import { onRequestGet as sharedResult } from '../functions/api/share/[token].ts';

test('2025년 600문항을 원본 회차로 연결하고 기록과 다른 문제셋을 보존한다', async () => {
  const sections = ['언어이해', '자료해석', '창의수리', '언어추리', '수열추리'];
  const sets = new Map();
  for (let round = 1; round <= 17; round++) {
    for (let section = 1; section <= 5; section++) {
      const id = `mocktest-r${String(round).padStart(2, '0')}-s${section}`;
      sets.set(`ps:${id}`, { id, name: id, owner: 'owner', official: true,
        sections: [sections[section - 1]], config: { choices: 5 },
        items: Array.from({ length: 20 }, (_, i) => ({ section: sections[section - 1],
          number: i + 1, answer: (round + section + i) % 5 + 1, correctRate: round })) });
    }
  }
  const before = JSON.stringify([...sets]);
  const kv = { get: async (key) => sets.get(key) ?? null,
    list: async () => ({ keys: [...sets.keys()].map((name) => ({ name })) }) };
  const listed = await (await listSets({ env: { SKCT_KV: kv } })).json();
  let corrected = 0;
  for (const original of sets.values()) {
    const source = sourceSetId(original.id);
    const expected = source ? sets.get(`ps:${source}`).items : original.items;
    const actual = await getProblemSet(kv, original.id);
    assert.deepEqual(actual, { ...original, items: expected });
    assert.deepEqual(listed.find((set) => set.id === original.id), actual);
    const single = await singleSet({ env: { SKCT_KV: kv }, params: { id: original.id } });
    assert.deepEqual(await single.json(), actual);
    if (source) corrected += actual.items.length;
  }
  assert.equal(corrected, 600);
  assert.equal(JSON.stringify([...sets]), before);
  const target = sets.get('ps:mocktest-r07-s1');
  assert.throws(() => correctProblemSet(target, null));
  assert.equal(await getProblemSet(kv, 'missing'), null);
  const custom = { ...target, id: 'custom' };
  assert.equal(correctProblemSet(custom, null), custom);

  const token = 'a'.repeat(32);
  const item = sets.get('ps:mocktest-r04-s1').items[0];
  const session = { problemSetId: target.id, results: [{ section: item.section, number: 1,
    status: 'answered', userAnswer: item.answer, answer: 5, correct: false, timeSpentSec: 42 }] };
  sets.set(`share:${token}`, { session });
  const shared = await sharedResult({ env: { SKCT_KV: kv }, params: { token } });
  const result = (await shared.json()).session.results[0];
  assert.equal(result.correct, true);
  assert.equal(result.answer, item.answer);
  assert.equal(result.timeSpentSec, 42);
  assert.equal(session.results[0].correct, false);
});
