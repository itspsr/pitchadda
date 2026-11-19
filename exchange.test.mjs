import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import app from './dist/server/index.js';

test('review exchange, listing eligibility, and private founder feedback', async () => {
  const sqlite = new DatabaseSync(':memory:');
  const db = {
    prepare(sql) {
      let bindings = [];
      const statement = () => sqlite.prepare(sql.replaceAll('?1', ':person'));
      const params = () => sql.includes('?1') ? [{person: bindings[0]}] : bindings;
      return {
        bind(...values) { bindings = values; return this; },
        run() { return statement().run(...params()); },
        all() { return {results: statement().all(...params())}; },
        first(key) {
          const result = statement().get(...params());
          return key ? result?.[key] : result;
        },
      };
    },
    batch(statements) { return statements.map(s => s.run()); },
  };
  const origin = 'https://pitchadda.example';
  function api(user, body) {
    const headers = {Origin: origin};
    if (user) headers['oai-authenticated-user-id'] = user;
    return app.fetch(new Request(origin + '/api', {
      headers, method: body ? 'POST' : 'GET', body: JSON.stringify(body),
    }), {DB: db});
  }
  const listing = {action:'list', name:'Pilot', category:'Finance', description:'Expense tracker', url:'https://example.com', q1:'What was clear?', q2:'What was confusing?'};
  const review = {action:'review', rating:'4', intent:'Would use', note:'Clear onboarding', a0:'Setup', a1:'Pricing'};
  assert.equal((await api('', listing)).status, 401);
  assert.equal((await api('founder', listing)).status, 403);
  for (const id of [1,1,2,3]) assert.equal((await api('founder', {...review,id})).status, 200);
  assert.equal((await (await api('founder')).json()).count, 3);
  assert.equal((await api('founder', listing)).status, 200);
  assert.equal((await api('founder', {...review,id:4})).status, 400);
  await api('peer', {...review,id:4});
  for (let i=0;i<2;i++) await api('peer', {action:'join',id:4});
  const product = (await (await api('founder')).json()).products[0];
  assert.equal(product.avg,4);
  assert.equal(product.waits,1);
  assert.equal(product.feedback[0].rating,4);
  assert.deepEqual((await (await api('peer')).json()).products[0].feedback,[]);
  sqlite.close();
});
