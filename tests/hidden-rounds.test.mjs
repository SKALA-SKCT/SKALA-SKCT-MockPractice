import assert from 'node:assert/strict';
import { test } from 'node:test';
import { onRequestGet as listSessions, onRequestPost as saveSession } from '../functions/api/sessions.ts';
import { onRequestGet as getSession, onRequestDelete as deleteSession } from '../functions/api/sessions/[id].ts';
import { onRequestPost as saveSet } from '../functions/api/problemsets.ts';
import { onRequestGet as getSet, onRequestDelete as deleteSet } from '../functions/api/problemsets/[id].ts';
import { onRequestPost as share } from '../functions/api/share.ts';
import { onRequestGet as getShare } from '../functions/api/share/[token].ts';
import { onRequestGet as getCohort, onRequestPost as saveCohort } from '../functions/api/cohort.ts';

test('공개 문항과 일치 여부를 확인할 수 없는 보관 기록을 숨기고 원본을 보존한다', async () => {
  for (let round = 10; round <= 12; round++) {
    for (let section = 1; section <= 5; section++) {
      const id = `mocktest-r${round}-s${section}`;
      const hidden = { id: 'hidden', problemSetId: id, results: [] };
      const visible = { id: 'visible', problemSetId: 'mocktest-r13-s1', results: [] };
      const token = 'a'.repeat(32);
      const entries = new Map([
        [`ps:${id}`, { id, owner: 'user' }],
        ['sess:user:hidden', hidden], ['sess:user:visible', visible],
        [`share:${token}`, { session: hidden }],
        [`cohort:${id}:user`, { scorePct: 90 }],
      ]);
      const before = structuredClone([...entries]);
      const kv = {
        get: async (key) => Array.isArray(key) ? new Map(key.map((k) => [k, entries.get(k) ?? null])) : entries.get(key) ?? null,
        list: async ({ prefix }) => ({ keys: [...entries.keys()].filter((key) => key.startsWith(prefix)).map((name) => ({ name })) }),
        put: async () => assert.fail('보관 데이터 쓰기 금지'),
        delete: async () => assert.fail('보관 데이터 삭제 금지'),
      };
      const context = (body = {}, params = {}) => ({ env: { SKCT_KV: kv }, data: { user: 'user' }, params,
        request: new Request(`https://example.com/api/cohort?set=${id}`, { method: 'POST', body: JSON.stringify(body) }) });
      assert.deepEqual(await (await listSessions(context())).json(), [visible]);
      assert.equal(await (await getSession(context({}, { id: 'hidden' }))).json(), null);
      assert.deepEqual(await (await getSession(context({}, { id: 'visible' }))).json(), visible);
      assert.equal(await (await getSet(context({}, { id }))).json(), null);
      const blocked = [
        saveSession(context(hidden)),
        saveSession(context({ ...visible, id: hidden.id })),
        deleteSession(context({}, { id: hidden.id })),
        saveSet(context({ id })), deleteSet(context({}, { id })),
        share(context({ sessionId: hidden.id })), getShare(context({}, { token })),
        getCohort(context()), saveCohort(context({ problemSetId: id, scorePct: 100 })),
      ];
      for (const response of await Promise.all(blocked)) assert.equal(response.status, 404);
      assert.deepEqual([...entries], before);
    }
  }
});
