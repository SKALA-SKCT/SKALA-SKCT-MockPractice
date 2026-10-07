import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareSessions, mergeSession } from '../src/session-history.ts';
import { onRequestGet as listSessions, onRequestPost as saveSession } from '../functions/api/sessions.ts';
import { onRequestGet as getSession } from '../functions/api/sessions/[id].ts';
import { onRequestGet as cohort } from '../functions/api/cohort.ts';
import { onRequestGet as shared } from '../functions/api/share/[token].ts';

test('동일 문항의 숨긴 기록을 합치고 실제 시작 시각으로 차수를 정하며 원본을 보존한다', async () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ section: '언어이해', number: i + 1, answer: i % 5 + 1, correctRate: 50 }));
  const old = { id: 'mocktest-r10-s1', name: '과거 이름', items, config: { choices: 5 }, sections: ['언어이해'] };
  const current = { ...old, id: 'mocktest-r13-s1', name: '현재 공개 회차' };
  const sets = new Map([[old.id, old], [current.id, current]]);
  const session = (id, setId, startedAt, correct) => ({ id, problemSetId: setId, problemSetName: '이름으로 합치면 안 됨', startedAt,
    finishedAt: '2026-10-07T04:00:00Z', results: items.map((item, i) => ({ ...item, userAnswer: i < correct ? item.answer : null,
      status: i < correct ? 'answered' : 'untouched', correct: i < correct, timeSpentSec: 11 })) });
  const first = session('z', current.id, '2026-10-07T01:00:00Z', 10);
  const second = session('a', old.id, '2026-10-07T02:00:00Z', 15);
  const third = session('b', current.id, '2026-10-07T03:00:00Z', 5);
  const onlyHidden = session('alone', old.id, '2026-10-07T00:00:00Z', 4);
  const rows = [third, second, first].map((s) => mergeSession(s, sets)).sort(compareSessions);
  assert.deepEqual(rows.map((s) => s.id), ['z', 'a', 'b']);
  assert.ok(rows.every((s) => s.problemSetId === current.id));
  assert.equal(mergeSession(onlyHidden, sets).problemSetId, current.id);
  assert.equal(mergeSession({ ...second, results: second.results.slice(1) }, sets), null);
  assert.equal(mergeSession({ ...second, results: second.results.map((r) => ({ ...r, answer: 6 })) }, sets), null);
  const token = 'b'.repeat(32);
  const entries = new Map([[`ps:${old.id}`, old], [`ps:${current.id}`, current], ['sess:user:z', first], ['sess:user:a', second],
    ['sess:user:b', third], ['sess:other:alone', onlyHidden], [`share:${token}`, { session: second }]]);
  const before = structuredClone([...entries]);
  const kv = {
    get: async (key) => Array.isArray(key) ? new Map(key.map((k) => [k, entries.get(k) ?? null])) : entries.get(key) ?? null,
    list: async ({ prefix, cursor }) => {
      const keys = [...entries.keys()].filter((key) => key.startsWith(prefix));
      const start = Number(cursor ?? 0);
      return { keys: keys.slice(start, start + 2).map((name) => ({ name })), list_complete: start + 2 >= keys.length, cursor: String(start + 2) };
    },
    put: async (key, value) => entries.set(key, JSON.parse(value)),
  };
  const context = (params = {}, body = {}) => ({ env: { SKCT_KV: kv }, data: { user: 'user', isAdmin: true }, params,
    request: new Request(`https://example.com/api/cohort?set=${current.id}&audit=1`, { method: 'POST', body: JSON.stringify(body) }) });
  assert.deepEqual((await (await listSessions(context())).json()).map((s) => s.id), ['b', 'a', 'z']);
  assert.equal((await (await getSession(context({ id: 'a' }))).json()).problemSetId, current.id);
  const scores = await (await cohort(context())).json();
  assert.deepEqual(scores.scores.sort((a, b) => a - b), [20, 75]);
  assert.equal(scores.audit.mergedCount, 2);
  assert.equal(scores.audit.unmatchedCount, 0);
  const share = await (await shared(context({ token }))).json();
  assert.equal(share.session.problemSetId, current.id);
  assert.deepEqual([...entries], before);
  await saveSession(context({}, { ...rows[1], review: { overall: '메모' } }));
  assert.deepEqual(entries.get('sess:user:a'), { ...second, review: { overall: '메모' } });
});
