import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalDatabase } from './local-db.mjs';
import app from './dist/server/index.js';

test('review exchange, listing eligibility, and private founder feedback', async () => {
  const db = createLocalDatabase();
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
  db.close();
});

test('information pages, account and private/public search settings', async t => {
  const db = createLocalDatabase();
  t.after(() => db.close());
  const origin = 'https://pitchadda.example';
  const page = (path, env = {}, headers = {}) => app.fetch(new Request(origin + path, {headers}), {DB:db, ...env});
  const paths = ['/', '/about', '/privacy', '/terms', '/disclaimer', '/help'];
  for (const path of paths) {
    const response = await page(path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('X-Robots-Tag'), /noindex/);
    const html = await response.text();
    assert.ok(html.includes('href="' + origin + path + '"'));
    assert.match(html, /application\/ld\+json/);
    assert.match(html, /og:image/);
  }
  const image = await page('/social.png');
  assert.equal(image.headers.get('content-type'), 'image/png');
  const png = Buffer.from(await image.arrayBuffer());
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.match(await (await page('/robots.txt')).text(), /Disallow: \//);
  const sitemap = await (await page('/sitemap.xml', {PUBLIC_INDEXING:'true'})).text();
  for (const path of paths) assert.ok(sitemap.includes('<loc>' + origin + path + '</loc>'));
  assert.doesNotMatch(sitemap, /\/account|\/api/);
  assert.match(await (await page('/account')).text(), /signin-with-chatgpt/);
  assert.match(await (await page('/account', {}, {'oai-authenticated-user-id':'member'})).text(), /Download my data/);
});

test('account export includes only the signed-in user’s submissions', async () => {
  const db = createLocalDatabase();
  const origin = 'https://pitchadda.example';
  const exportFor = (id) => app.fetch(new Request(origin+'/account/export', {
    headers: id ? {'oai-authenticated-user-id':id} : {},
  }), {DB:db});
  try {
    assert.equal((await exportFor()).status, 401);
    for (const name of ['a','b']) {
      await app.fetch(new Request(origin+'/api', {
        method:'POST', headers:{Origin:origin,'oai-authenticated-user-id':name},
        body:JSON.stringify({action:'review',id:1,rating:'4',intent:'Would use',note:'Review by '+name,a0:'Teams',a1:'Pricing'}),
      }), {DB:db});
    }
    const own = await exportFor('a');
    assert.match(own.headers.get('Cache-Control'), /no-store/);
    const data = await own.json();
    assert.deepEqual(data.reviews.map(item=>item.note), ['Review by a']);
    assert.deepEqual(data.reviews[0].answers, ['Teams','Pricing']);
  } finally { db.close(); }
});

test('email sign-in sends a PKCE challenge and verifies the resulting account with Supabase', async t => {
  const env = {SUPABASE_URL:'https://demo.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example'};
  const origin='https://pitchadda.example';
  let challenge;
  const verifierCookie='__Host-pitchadda-proof';
  t.mock.method(globalThis,'fetch',async (url, options) => {
    assert.equal(new URL(url).origin,env.SUPABASE_URL);
    if(url.includes('/otp?')) {
      const args=JSON.parse(options.body);
      challenge=args.code_challenge;
      assert.equal(args.code_challenge_method,'s256');
      assert.equal(new URL(url).searchParams.get('redirect_to'),origin+'/auth/confirm');
      return Response.json({});
    }
    if(url.includes('/token?')) {
      const args=JSON.parse(options.body);
      assert.equal(args.auth_code,'code123');
      const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(args.code_verifier));
      assert.equal(Buffer.from(hash).toString('base64url'),challenge);
      return Response.json({access_token:'signed.token.test',expires_in:3600});
    }
    assert.equal(options.headers.Authorization,'Bearer signed.token.test');
    return Response.json({id:'test-id',email:'reader@example.test'});
  });
  const start=await app.fetch(new Request(origin+'/auth/email',{
    method:'POST',headers:{Origin:origin},body:new URLSearchParams({email:'reader@example.test'})
  }),env);
  assert.equal(start.status,200);
  const proof=start.headers.get('set-cookie').split(';')[0];
  assert.ok(proof.startsWith(verifierCookie+'='));
  const confirm=await app.fetch(new Request(origin+'/auth/confirm?code=code123',{headers:{Cookie:proof}}),env);
  assert.equal(confirm.status,303);
  const session=confirm.headers.getSetCookie()[0].split(';')[0];
  const account=await app.fetch(new Request(origin+'/account',{headers:{Cookie:session}}),env);
  assert.match(await account.text(),/reader@example\.test/);
});

test('launch discovery preserves older listings, vote ownership and public-page privacy', async t => {
  const origin = 'https://pitchadda.example';
  const db = createLocalDatabase();
  t.after(() => db.close());

  // Reproduce a real listing saved by the previous release.
  db.prepare('CREATE TABLE products(id INTEGER PRIMARY KEY, owner TEXT, name TEXT, category TEXT, description TEXT, url TEXT, questions TEXT)').run();
  db.prepare('INSERT INTO products VALUES(?,?,?,?,?,?,?)')
    .bind(4, 'original-founder', 'Existing Project', 'Tools', 'A helpful tool', 'https://example.com', JSON.stringify(['First question?', 'Second question?'])).run();

  function request(path, { body, user, publicMode = false } = {}) {
    const headers = {Origin: origin};
    if (user) headers['oai-authenticated-user-id'] = user;
    return app.fetch(new Request(origin + path, {
      headers, method: body ? 'POST' : 'GET', body: JSON.stringify(body),
    }), {DB: db, PUBLIC_INDEXING: String(publicMode)});
  }

  async function product(id, user) {
    const response = await request('/api', {user});
    return (await response.json()).products.find(item => item.id === id);
  }
  const vote = (user, active) => request('/api', {user, body: {action:'vote', id:4, active}});
  assert.equal((await product(1)).stage, 'Practice brief');
  assert.equal((await product(4)).stage, 'Launched');
  assert.equal((await vote(undefined, true)).status, 401);
  assert.equal((await vote('original-founder', true)).ok, false);
  assert.equal((await vote('reader', 'true')).ok, false);
  for (const reader of ['reader', 'reader', 'another-reader']) {
    assert.equal((await vote(reader, true)).status, 200);
  }
  assert.equal((await product(4)).votes, 2);
  assert.equal(Boolean((await product(4)).voted), false);
  assert.equal(Boolean((await product(4,'reader')).voted), true);
  for (let attempt = 0; attempt < 2; attempt++) {
    assert.equal((await vote('reader', false)).status, 200);
  }
  assert.equal((await product(4)).votes, 1);
  assert.equal(Boolean((await product(4, 'reader')).voted), false);
  assert.equal(Boolean((await product(4, 'another-reader')).voted), true);
  const exported = await (await request('/account/export', {user:'reader'})).json();
  assert.deepEqual(exported.votes, []);

  const review = {action:'review', rating:'5', intent:'Would pay', note:'Private founder feedback', a0:'Private answer A', a1:'Private answer B'};
  for (const id of [1, 2, 4]) {
    assert.equal((await request('/api', {user:'reviewer', body:{...review,id}})).status, 200);
  }
  const listing = {action:'list', name:'Beta Product', category:'Tools', description:'Seeking early adopters',
    url:'https://example.com/beta', q1:'Who would use this?', q2:'What should change?', stage:'Early access'};
  assert.equal((await request('/api', {user:'reviewer',body:{...listing,stage:'Invalid stage'}})).ok, false);
  assert.equal((await request('/api', {user:'reviewer',body:listing})).status, 200);
  assert.equal((await product(5)).stage, 'Early access');

  for (const publicMode of [false,true]) {
    const response = await request('/p/4', {publicMode});
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes(origin + '/p/4'));
    assert.ok(html.includes('Existing Project'));
    assert.ok(html.includes('/?review=4#directory'));
    assert.match(html, publicMode ? /content="index, follow"/ : /content="noindex, nofollow"/);
    assert.doesNotMatch(html,/Private founder feedback|Private answer|original-founder|another-reader/);
  }
  const beta = await request('/p/5');
  assert.match(await beta.text(), /Early access/);

  const updateStage = user => request('/api', {
    user, body: {action:'set-stage', id:5, stage:'Launched'},
  });
  assert.equal((await updateStage()).status, 401);
  assert.equal((await updateStage('another-founder')).ok, false);
  assert.equal((await product(5)).stage, 'Early access');
  assert.equal((await updateStage('reviewer')).status, 200);
  assert.equal((await product(5)).stage, 'Launched');
  assert.match(await (await request('/p/5')).text(), /Launched/);

  assert.equal((await request('/p/98765')).status, 404);
  assert.equal((await request('/sitemap.xml')).status, 404);
  const publicSitemap = await (await request('/sitemap.xml', {publicMode:true})).text();
  for (const id of [4,5]) assert.ok(publicSitemap.includes('<loc>' + origin + '/p/' + id + '</loc>'));
});
