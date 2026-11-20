import { robotsTag } from './seo.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

function websiteUrl(input) {
  if (!input) return '';
  try {
    const url = new URL(input);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}
const count = value => Math.max(0, Number.isSafeInteger(Number(value)) ? Number(value) : 0);

export function renderProductPage(product, origin, env = {}) {
  const id = Number(product.id);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Invalid product ID');
  const canonical = new URL('/p/' + id, origin).href;
  const image = new URL('/social.png', origin).href;
  const title = product.name + ' | PitchAdda';
  const questions = Array.isArray(product.questions) ? product.questions : [];
  const site = websiteUrl(product.url);
  const schema = {
    '@context': 'https://schema.org', '@type': 'WebPage', url: canonical,
    name: title, description: product.description, isPartOf: {'@type':'WebSite', name:'PitchAdda', url:new URL('/',origin).href},
    about: {'@type':'Thing', name:product.name, description:product.description, ...(site ? {url:site} : {})},
  };
  const policy = robotsTag('/p/' + id, env);
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)}</title><meta name="description" content="${escape(product.description)}">
<meta name="robots" content="${policy}"><link rel="canonical" href="${escape(canonical)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="PitchAdda">
<meta property="og:title" content="${escape(title)}"><meta property="og:url" content="${escape(canonical)}">
<meta property="og:description" content="${escape(product.description)}"><meta property="og:image" content="${escape(image)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${escape(image)}">
<meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(product.description)}">
<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script>
<style>
*{box-sizing:border-box}body{margin:0;background:#fafbf9;color:#17223d;font:1rem/1.6 Inter,Arial,sans-serif;overflow-wrap:anywhere}
header{background:white;border-bottom:1px solid #dbe0e8}header>div,main,footer{width:min(92%,1000px);margin:auto}
header>div{min-height:73px;display:flex;align-items:center;gap:26px}.brand{margin-right:auto;font-size:1.5rem;font-weight:800;letter-spacing:-.06em;display:flex;align-items:center;gap:9px}.mark{display:inline-flex;align-items:flex-end;justify-content:center;gap:2px;width:31px;height:31px;padding-bottom:9px;border-radius:8px;transform:rotate(-5deg);background:#304dcc}.mark i{width:4px;background:white;height:7px;transform:skewY(-20deg)}.mark i:nth-child(2){height:11px}.mark i:last-child{height:15px}a{color:#304dcc}header a{text-decoration:none;font-weight:600;color:#263452}a:focus-visible{outline:3px solid #7a9aff;outline-offset:4px}
main{padding:32px 0 46px}.hero{padding:clamp(24px,5vw,58px);border-radius:20px;background:radial-gradient(ellipse at top right,#354d92,transparent 64%),#182449;color:#fff}.tags{font-size:.875rem;display:flex;gap:13px;align-items:center;color:#e0e8ff}.tags span+span{border-left:1px solid #8897b6;padding-left:13px}h1{margin:12px 0 6px;font:500 clamp(2.7rem,6vw,4.3rem)/1.05 Georgia,serif;letter-spacing:-.055em}.hero p{color:#e2e8fa;max-width:65ch;margin:1rem 0 1.5rem}.actions{display:flex;align-items:center;gap:20px;flex-wrap:wrap}.actions a{color:#fff;font-weight:650}.actions .review{background:#fff;border-radius:8px;color:#213155;text-decoration:none;padding:.65rem 1rem}
.details{display:grid;grid-template-columns:minmax(0,2fr) minmax(200px,1fr);gap:16px;margin-top:16px}section.panel{border:1px solid #dbe0e8;border-radius:14px;background:#fff;padding:24px}h2{margin:0 0 12px;font:500 1.65rem Georgia,serif;letter-spacing:-.03em}ul{padding-left:1.2rem;margin:0}li+li{margin-top:10px}dl{margin:0}dl>div{display:flex;justify-content:space-between;gap:12px;border-top:1px solid #e3e7ef;padding:8px 0}dd{font-weight:750;margin:0}footer{padding:16px 0 28px;display:flex;gap:16px;flex-wrap:wrap;border-top:1px solid #dbe0e8;font-size:.875rem}footer a{color:#47566b}@media(max-width:610px){.details{grid-template-columns:1fr}.hero{padding:26px 22px}header>div{gap:16px}}
</style></head><body><header><div><a class="brand" href="/"><span class="mark" aria-hidden="true"><i></i><i></i><i></i></span>PitchAdda</a><a href="/#directory">Discover</a><a href="/account">Account</a></div></header>
<main><section class="hero"><div class="tags"><span>${escape(product.category)}</span>${product.stage ? '<span>'+escape(product.stage)+'</span>' : ''}</div>
<h1>${escape(product.name)}</h1><p>${escape(product.description)}</p>
<div class="actions"><a class="review" href="/?review=${id}#directory">Review product</a>${site ? '<a href="'+escape(site)+'" target="_blank" rel="ugc noopener noreferrer">Visit product website</a>' : ''}</div></section>
<div class="details">${questions.length ? '<section class="panel"><h2>Questions for reviewers</h2><ul>'+questions.map(q=>'<li>'+escape(q)+'</li>').join('')+'</ul></section>' : ''}
<section class="panel"><h2>Product activity</h2><dl><div><dt>Reviews</dt><dd>${count(product.total)}</dd></div><div><dt>On waitlist</dt><dd>${count(product.waits)}</dd></div>${product.votes == null ? '' : '<div><dt>Upvotes</dt><dd>'+count(product.votes)+'</dd></div>'}</dl></section></div></main>
<footer><a href="/about">About</a><a href="/help">Help</a><a href="/privacy">Privacy policy</a><a href="/terms">Terms</a><a href="/disclaimer">Disclaimer</a></footer></body></html>`;
}
