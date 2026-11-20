import { injectTheme } from './theme.mjs';
const ACCOUNT_PATH = '/account';
const SESSION_COOKIE = '__Host-pitchadda-access';
const PROOF_COOKIE = '__Host-pitchadda-proof';

function supabaseSettings(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) return null;
  try {
    const url = new URL(env.SUPABASE_URL);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return {origin: url.origin, key: env.SUPABASE_PUBLISHABLE_KEY};
  } catch {
    return null;
  }
}

function getCookie(req, name) {
  for (const chunk of (req.headers.get('cookie') || '').split(';')) {
    const [key, ...value] = chunk.trim().split('=');
    if (key === name) return value.join('=');
  }
  return '';
}

function cookie(name, value, seconds) {
  return name + '=' + value + '; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=' + seconds;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
}

function accountPage(title, body, status = 200) {
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex,nofollow"><title>${escapeHtml(title)} · PitchAdda</title>
    <style>*{box-sizing:border-box}body{margin:0;color:#19233c;background:#f7f8fc;font:1rem/1.55 Inter,Arial,sans-serif}.wrap{width:min(92%,1080px);margin:auto}header{border-bottom:1px solid #dce1ea;background:white;padding:16px 0}.brand{color:#19233c;text-decoration:none;font-size:1.5rem;letter-spacing:-1px;font-weight:800}.card{background:white;border:1px solid #dce1ea;border-radius:18px;max-width:480px;margin:9vh auto 3rem;padding:clamp(22px,5vw,40px);box-shadow:0 10px 36px #2633550c}.card h1{font:500 2.5rem/1.12 Georgia,serif;letter-spacing:-.05em;margin:0 0 .8rem}.card p{color:#4d596e;overflow-wrap:anywhere}.action,button{display:inline-block;padding:.65rem 1rem;background:#304dcc;border:0;border-radius:8px;color:white;text-decoration:none;font:600 1rem/1.4 Inter,Arial,sans-serif;cursor:pointer}a{color:#304dcc}form{margin-top:1.3rem}label{font-weight:650}input{display:block;width:100%;padding:.65rem;border:1px solid #a4aec2;border-radius:7px;margin:.4rem 0 .75rem;font:inherit}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #758aff;outline-offset:3px}.links{display:flex;gap:1rem;flex-wrap:wrap;font-size:.9rem;margin-top:1.5rem}</style></head>
    <body><header><div class="wrap"><a class="brand" href="/">PitchAdda</a></div></header><main class="wrap"><section class="card"><h1>${escapeHtml(title)}</h1>${body}
    <div class="links"><a href="/">Discover products</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div></section></main></body></html>`;
  return new Response(injectTheme(page), {status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'private, no-store','referrer-policy':'no-referrer'}});
}

function proofValue(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
}

async function authFetch(settings, path, options = {}) {
  return fetch(settings.origin + '/auth/v1/' + path, {
    ...options, redirect:'error',
    headers:{apikey:settings.key, 'Content-Type':'application/json', ...options.headers}
  });
}

export async function resolveAccount(req, env) {
  const siteId = req.headers.get('oai-authenticated-user-id');
  if (siteId) return {id:siteId, provider:'ChatGPT', email:req.headers.get('oai-authenticated-user-email')};
  const token = getCookie(req, SESSION_COOKIE);
  const settings = supabaseSettings(env);
  if (!token || !settings) return null;
  const result = await authFetch(settings, 'user', {headers:{Authorization:'Bearer ' + token}});
  if ([401,403].includes(result.status)) return null;
  if (!result.ok) throw Error('Email sign-in service is unavailable.');
  const user = await result.json();
  if (!user.id) return null;
  return {id:'supabase:' + user.id, provider:'email', email:user.email};
}

function redirectToAccount(cookies) {
  const headers = new Headers({location:ACCOUNT_PATH,'cache-control':'no-store','referrer-policy':'no-referrer'});
  for (const value of cookies) headers.append('Set-Cookie', value);
  return new Response(null,{status:303,headers});
}

async function requestMagicLink(req, settings, origin) {
  const fields = await req.formData();
  const email = String(fields.get('email') || '').trim();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return accountPage('Check your email address','<p>Enter a valid email address and <a href="/account">try again</a>.</p>',400);
  }
  const verifier = proofValue(crypto.getRandomValues(new Uint8Array(48)));
  const hash = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
  const redirect = encodeURIComponent(origin + '/auth/confirm');
  const upstream = await authFetch(settings, 'otp?redirect_to=' + redirect, {method:'POST',body:JSON.stringify({
    email, create_user:true, code_challenge:proofValue(new Uint8Array(hash)), code_challenge_method:'s256'
  })});
  if (!upstream.ok) return accountPage('Email sign-in unavailable','<p>Please wait a moment, then <a href="/account">try again</a>.</p>',upstream.status===429?429:503);
  const response = accountPage('Check your inbox','<p>Open the latest sign-in link in this browser to continue. You can close this page.</p>');
  response.headers.append('Set-Cookie',cookie(PROOF_COOKIE,verifier,3600));
  return response;
}

async function finishMagicLink(req, settings, url) {
  const code = url.searchParams.get('code');
  const verifier = getCookie(req,PROOF_COOKIE);
  const failed = () => accountPage('Link unavailable','<p><a href="/account">Request a fresh sign-in link</a> and open it in the browser where you requested it.</p>',400);
  if (!code || code.length > 1024 || !/^[A-Za-z0-9_-]{64}$/.test(verifier)) return failed();
  const result = await authFetch(settings,'token?grant_type=pkce',{method:'POST',body:JSON.stringify({auth_code:code,code_verifier:verifier})});
  if (!result.ok) return failed();
  const session = await result.json();
  if (!session.access_token || !/^[A-Za-z0-9_.-]+$/.test(session.access_token) || !(session.expires_in > 0)) return failed();
  return redirectToAccount([cookie(SESSION_COOKIE,session.access_token,Math.min(Math.floor(session.expires_in),86400)),cookie(PROOF_COOKIE,'',0)]);
}

export async function accountRoute(req, env) {
  const url = new URL(req.url);
  const path = url.pathname;
  if (![ACCOUNT_PATH,'/auth/email','/auth/confirm','/auth/logout'].includes(path)) return null;
  const post = path === '/auth/email' || path === '/auth/logout';
  if (req.method !== (post ? 'POST' : 'GET')) return new Response('Method not allowed',{status:405,headers:{Allow:post?'POST':'GET'}});
  if (post && req.headers.get('Origin') !== url.origin) return new Response('Invalid origin',{status:403});
  const settings = supabaseSettings(env);
  try {
    if (path === '/auth/logout') return redirectToAccount([cookie(SESSION_COOKIE,'',0),cookie(PROOF_COOKIE,'',0)]);
    if (path === '/auth/email' || path === '/auth/confirm') {
      if (!settings) return accountPage('Sign in with ChatGPT','<p>Email sign-in is unavailable. <a target="_top" href="/signin-with-chatgpt">Continue with ChatGPT</a>.</p>',503);
      return path === '/auth/email' ? await requestMagicLink(req,settings,url.origin) : await finishMagicLink(req,settings,url);
    }
    const account = await resolveAccount(req,env);
    if (account) {
      const label = account.email ? ' as <strong>' + escapeHtml(account.email) + '</strong>' : ' with ' + account.provider;
      const signout = account.provider === 'ChatGPT' ? '<a target="_top" href="/signout-with-chatgpt">Sign out</a>' : '<form method="post" action="/auth/logout"><button>Sign out</button></form>';
      return accountPage('Your account','<p>Signed in' + label + '.</p><p><a class="action" href="/#dashboard">Open founder dashboard</a></p><p><a href="/account/export" download>Download my data</a></p>' + signout);
    }
    const emailForm = settings ? '<form method="post" action="/auth/email"><label>Email address<input required name="email" type="email" maxlength="254" autocomplete="email"></label><button>Send sign-in link</button></form>' : '';
    return accountPage('Sign in','<p>Sign in to review products, join waitlists and publish your own listing.</p><a class="action" target="_top" href="/signin-with-chatgpt">Continue with ChatGPT</a>' + emailForm);
  } catch {
    return accountPage('Account temporarily unavailable','<p>Please <a href="/account">try again</a> in a moment.</p>',503);
  }
}

