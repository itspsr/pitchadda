import { seoHead } from './seo.mjs';

const demoStyles = `
:root { --demo-bg:#f6f7f9; --demo-surface:#fff; --demo-ink:#17181b; --demo-muted:#505864; --demo-line:#d8dce3; --demo-accent:#155ac6; --demo-soft:#e8f0ff; --demo-field:#fafbfd; color-scheme:light; }
[data-theme="dark"] { --demo-bg:#101114; --demo-surface:#1b1d22; --demo-ink:#f4f5f8; --demo-muted:#b1b6c2; --demo-line:#424651; --demo-accent:#9cc1ff; --demo-soft:#283956; --demo-field:#22252b; color-scheme:dark; }
*{box-sizing:border-box}body{margin:0;background:var(--demo-bg);color:var(--demo-ink);font:1rem/1.52 -apple-system,BlinkMacSystemFont,"Inter","Helvetica Neue",sans-serif;-webkit-font-smoothing:antialiased}
.wrap{width:min(1100px,92%);margin-inline:auto}header{background:var(--demo-surface);border-bottom:1px solid var(--demo-line)}.head{min-height:70px;display:flex;align-items:center;gap:22px;flex-wrap:wrap;padding-block:12px}.brand{display:inline-flex;align-items:center;gap:9px;margin-right:auto;font-size:1.38rem;font-weight:770;letter-spacing:-.065em;color:var(--demo-ink)}.brand span{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:8px;background:#20242d;color:#fff;font:italic bold 23px Georgia,serif}
a{color:var(--demo-accent);text-underline-offset:3px}.head a{text-decoration:none}.head a:not(.brand){color:var(--demo-muted);font-size:.91rem;font-weight:600}main{padding:clamp(36px,6vw,72px) 0 36px}h1,h2,h3,p{margin:0}.intro{max-width:52rem;margin-bottom:28px}h1{font-size:clamp(2.45rem,5.6vw,4.25rem);line-height:1.05;letter-spacing:-.065em;font-weight:670}.intro p{margin-top:14px;max-width:49rem;color:var(--demo-muted);font-size:1.075rem}
.desk{display:grid;grid-template-columns:minmax(0,1.02fr) minmax(0,.98fr);gap:20px;align-items:start}.form-card,.dashboard{border-radius:20px;padding:clamp(20px,3.4vw,34px);min-width:0;box-shadow:0 12px 36px #111a3010}.form-card{background:var(--demo-surface);border:1px solid var(--demo-line)}.brief{display:flex;align-items:center;gap:16px;margin-bottom:8px}.brief-art{display:grid;place-items:center;position:relative;flex-shrink:0;border-radius:14px;width:62px;height:62px;background:radial-gradient(ellipse at 12% 15%,#e9ecff,#a5b4e5);overflow:hidden}.book{width:33px;height:41px;transform:perspective(100px) rotateY(-19deg) rotateX(12deg) rotateZ(-19deg);background:linear-gradient(90deg,#2b3b68 0 11%,#7e92c4 12% 15%,#536b9f 16%,#364d81);border-radius:2px 5px 4px 3px;box-shadow:0 2px 0 #cbd4e6,0 3px 0 #5d7298,3px 7px 8px #30406f59}.book:after{content:'';position:absolute;inset:27% 16% auto 28%;height:5px;border-block:1px solid #c5d3ee}
.brief small,.notice{font-size:.84rem;color:var(--demo-muted)}.brief h2,.dashboard h2{font-size:1.6rem;letter-spacing:-.048em;line-height:1.22}.form-card>p{color:var(--demo-muted);margin-bottom:19px}fieldset{border:0;margin:0;padding:0;min-width:0}legend,.question{display:block;font-weight:620;margin-bottom:7px}.rating,.question{margin-top:17px}.ratings{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}.ratings label{position:relative;cursor:pointer}.ratings input{position:absolute;opacity:0;inset:0}.ratings label span{display:grid;place-items:center;border-radius:8px;border:1px solid var(--demo-line);background:var(--demo-field);color:var(--demo-ink);padding:6px}.ratings input:checked+span{background:var(--demo-soft);border-color:var(--demo-accent);color:var(--demo-accent);font-weight:700}.ratings input:focus-visible+span,:is(button,a,select,textarea):focus-visible{outline:3px solid #638fe6;outline-offset:3px}
#demo-intent,#demo-note{display:block;width:100%;padding:9px 12px;border:1px solid var(--demo-line);border-radius:8px;color:var(--demo-ink);background:var(--demo-field);font:inherit}#demo-note{resize:vertical}.controls{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin:19px 0 8px}button{font:inherit;cursor:pointer}.apply{border:0;color:white;background:#195bc0;border-radius:999px;padding:10px 17px;font-weight:650}.reset{border:none;text-decoration:underline;text-underline-offset:3px;background:none;color:var(--demo-muted);padding:8px 0}.apply:disabled,.reset:disabled{cursor:default;opacity:.55}
.dashboard{background:radial-gradient(ellipse at top right,#29344c 0,transparent 62%),linear-gradient(140deg,#181d28,#101216);border:1px solid #363b46;color:#f6f7fb;box-shadow:inset 0 1px 0 #6b718044,0 14px 32px #0c111c22}.dashboard h2{margin:0 0 5px}.dashboard>p{color:#b7c1d1}.metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:24px 0}.metrics div{border:1px solid #404755;background:#ffffff05;border-radius:10px;padding:13px 10px}.metrics dt{color:#bdc8da;font-size:.84rem}.metrics dd{margin:2px 0 0;font-weight:600;font-size:clamp(1.45rem,3vw,2.05rem);letter-spacing:-.055em}.response{padding:18px;border:1px solid #424958;border-radius:12px;background:#ffffff06}.response h3{font-size:.94rem;color:#e1e6ef}.response p{margin-top:6px;color:#d0d7e3;overflow-wrap:anywhere;white-space:pre-wrap}.response .intent{color:#b1cafa;font-size:.9rem}.dashboard .status{min-height:1.5em;margin:14px 0 0;color:#bef3d3;font-size:.9rem}
footer{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;border-top:1px solid var(--demo-line);padding:20px 0;color:var(--demo-muted);font-size:.9rem}footer a{font-weight:600}
@media(max-width:750px){.desk{grid-template-columns:1fr}.dashboard{scroll-margin-top:1rem}.head{gap:12px}.head a:not(.brand){font-size:.85rem}}
`;

function demoInteraction() {
  const form = document.getElementById('demo-form');
  const note = document.getElementById('demo-note');
  const preview = document.getElementById('demo-dashboard');
  const output = (id, value) => { document.getElementById(id).textContent = value; };
  form.elements.demoControls.disabled = false;
  note.addEventListener('input', () => note.setCustomValidity(''));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const submittedNote = note.value.trim();
    if (!submittedNote) {
      note.setCustomValidity('Enter a short piece of feedback.');
      note.reportValidity();
      return;
    }
    const values = new FormData(form);
    output('demo-count', '1');
    output('demo-score', values.get('rating') + ' / 5');
    output('demo-interest', values.get('intent') === 'Would pay' ? '1' : '0');
    output('demo-response', submittedNote);
    output('demo-selection', values.get('intent'));
    output('demo-status', 'Sample dashboard updated.');
    output('demo-apply', 'Update sample review');
    preview.focus({preventScroll: true});
    if (matchMedia('(max-width:750px)').matches) preview.scrollIntoView({block:'start'});
  });
  form.addEventListener('reset', () => {
    note.setCustomValidity('');
    output('demo-count', '0');
    output('demo-score', '—');
    output('demo-interest', '0');
    output('demo-response', 'Your written feedback will appear here.');
    output('demo-selection', '');
    output('demo-status', 'Demo reset.');
    output('demo-apply', 'Preview founder dashboard');
  });
}

export function renderDemo(origin, env = {}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${seoHead('/demo', origin, env)}<style>${demoStyles}</style></head><body>
<header><div class="wrap head"><a class="brand" href="/" aria-label="PitchAdda home"><span aria-hidden="true">P</span>PitchAdda</a><a href="/#directory">Launch board</a><a href="/account">Account</a></div></header>
<main class="wrap"><div class="intro"><h1>Try the feedback exchange.</h1><p>Review a sample product and see what its founder would learn. This demo runs in your tab and clears when you reload.</p></div>
<div class="desk"><section class="form-card" aria-labelledby="demo-product"><div class="brief"><div class="brief-art" aria-hidden="true"><i class="book"></i></div><div><small>Practice brief · Fintech</small><h2 id="demo-product">KhataKit</h2></div></div>
<p>A pocket ledger that reminds independent shopkeepers which invoices are overdue.</p>
<form id="demo-form" autocomplete="off"><fieldset name="demoControls" disabled>
<fieldset class="rating"><legend>How clear is the idea? (1–5)</legend><div class="ratings">${[1,2,3,4,5].map(n=>'<label><input type="radio" required name="rating" value="'+n+'"><span>'+n+'</span></label>').join('')}</div></fieldset>
<label for="demo-intent" class="question">Would you use it?</label><select id="demo-intent" required name="intent"><option value="">Choose a response</option><option>Would use</option><option>Would pay</option><option>Would pass</option></select>
<label for="demo-note" class="question">What would you want the founder to know?</label><textarea id="demo-note" name="note" required maxlength="300" rows="3" placeholder="What feels useful or unclear?"></textarea>
<div class="controls"><button class="apply" type="submit" id="demo-apply">Preview founder dashboard</button><button class="reset" type="reset">Reset demo</button></div></fieldset></form>
<noscript><p>Enable JavaScript to try the interactive review.</p></noscript></section>
<section class="dashboard" id="demo-dashboard" tabindex="-1" aria-labelledby="demo-heading"><h2 id="demo-heading">Sample founder dashboard</h2><p>KhataKit</p>
<dl class="metrics"><div><dt>Reviews</dt><dd id="demo-count">0</dd></div><div><dt>Avg. clarity</dt><dd id="demo-score">—</dd></div><div><dt>Would pay</dt><dd id="demo-interest">0</dd></div></dl>
<div class="response"><h3>Reviewer feedback</h3><p id="demo-response">Your written feedback will appear here.</p><p id="demo-selection" class="intent"></p></div><p id="demo-status" class="status" role="status"></p></section>
</div></main><footer class="wrap"><span>Made by Pratik Kumar</span><a href="/#directory">Explore the launch board</a></footer>
<script>(${demoInteraction.toString()})();</script></body></html>`;
}
