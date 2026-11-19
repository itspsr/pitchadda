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

test('information pages, account and private/public search settings', async () => {
  const origin = 'https://pitchadda.example';
  const page = (path, env = {}, headers = {}) => app.fetch(new Request(origin + path, {headers}), env);
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
