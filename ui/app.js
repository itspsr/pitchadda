const page = document.querySelector('#page');
const modal = document.querySelector('#modal');
const message = document.querySelector('#message');
const covers = [...document.querySelector('#covers').content.children];
const flight = document.querySelector('#flight').innerHTML;
let state;
let category = '';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const dashboard = () => location.hash === '#dashboard';
async function sync() {
  const response = await fetch('/api');
  if (!response.ok) throw Error('The exchange could not load. Please refresh.');
  state = await response.json();
  render();
}
function card(p) {
  const art = p.seed ? covers[p.id - 1] : null;
  const image = art?.outerHTML ?? `<div class="generic-cover" aria-hidden="true"><i>${esc(p.name.slice(0, 1))}</i></div>`;
  return `<article class="card">${image}<div class="card-content">
    <div class="card-meta"><span class="category">${esc(p.category)}</span>${p.seed ? 'Practice brief' : ''}</div>
    <h3>${esc(p.name)}</h3><p>${esc(p.description)}</p>
    <button data-product="${p.id}">${p.mine ? 'View feedback' : p.done ? 'View product' : 'Review product'}</button></div></article>`;
}
function progress() {
  const count = Math.min(3, state.count);
  return `<section class="progress" aria-label="Listing eligibility">
    <span class="progress-icon" aria-hidden="true">✦</span><div><strong>${count === 3 ? 'Your listing is unlocked' : 'Unlock your product listing'}</strong>
    <small>${count === 3 ? 'Add your product and questions for reviewers.' : 'Review three different products to share your own.'}</small></div>
    <div class="progress-end"><span>${count} / 3 reviews</span><span class="segments" aria-hidden="true">${[0,1,2].map(i => `<i class="${i<count?'on':''}"></i>`).join('')}</span></div></section>`;
}
function render() {
  if (!state) return;
  const mine = dashboard();
  document.querySelectorAll('nav a').forEach(a => {
    if (a.hash === (mine ? '#dashboard' : '#discover')) a.setAttribute('aria-current','page');
    else a.removeAttribute('aria-current');
  });
  const categories = ['', ...new Set(state.products.map(p => p.category))];
  const list = state.products.filter(p => mine ? p.mine : !category || p.category === category);
  const hero = `<section class="hero"><div class="hero-copy"><p class="kicker">FOUNDER FEEDBACK EXCHANGE</p>
    <h1>Your next idea,<br><em>peer reviewed.</em></h1>
    <p>Get fresh eyes on your product from India’s founder community. Start by giving feedback of your own.</p>
    <a class="hero-button" href="#directory">Explore products</a></div>${flight}</section>`;
  page.innerHTML = (mine ? '<section class="dash"><h1>Founder dashboard</h1></section>' : hero) + progress() +
    `<section id="directory"><div class="directory-head"><h2>${mine?'Your products':'Product directory'}</h2>
    <span>${list.length} ${list.length===1?'product':'products'}</span></div>` +
    (mine ? '' : `<div class="filters" role="group" aria-label="Filter products by category">${categories.map((c,i)=>
      `<button data-category="${i}" aria-pressed="${category===c}">${esc(c || 'All products')}</button>`).join('')}</div>`) +
    `<div class="grid ${mine?'dashboard-grid':''}">${list.map(card).join('')}</div>` +
    (list.length ? '' : '<p class="empty">Your listings and their feedback will appear here.</p>') + '</section>';
}
function openBox(title, body) {
  document.querySelector('#dialog-title').textContent = title;
  document.querySelector('#dialog-content').innerHTML = body;
  message.textContent = '';
  if (!modal.open) modal.showModal();
}
function field(name, label, type='text', max=300) {
  return `<label>${esc(label)}<input required name="${name}" type="${type}" maxlength="${max}"></label>`;
}
function listing() {
  if (!state) return;
  if (state.count < 3) {
    const left = 3 - state.count;
    openBox('Unlock your listing', `<p>Review ${left} more ${left===1?'product':'products'} to publish your own brief.</p><button class="primary" data-explore>Explore products</button>`);
    return;
  }
  openBox('List your product', `<form data-action="list">${field('name','Product name','text',80)}${field('url','Website URL','url')}
    ${field('category','Category','text',40)}${field('description','One-line description')}${field('q1','First question for reviewers')}${field('q2','Second question for reviewers')}
    <label>Third question (optional)<input name="q3" maxlength="300"></label><button class="primary">Publish listing</button></form>`);
}
function detail(id) {
  const p = state.products.find(product => product.id === id);
  if (!p) return;
  const introduction = `<p>${esc(p.description)}</p>` + (p.url ? `<a target="_blank" rel="noopener noreferrer" href="${esc(p.url)}">Visit product website</a>` : '<p class="tag">Practice brief · Review the concept described above.</p>');
  if (p.mine) {
    const comments = p.feedback.map(f => `<div class="feedback"><strong>${esc(f.note)}</strong><p><small>${esc(f.rating)} / 5 · ${esc(f.intent)}</small></p>
      ${JSON.parse(f.answers).map((answer,i) => `<p><b>${esc(p.questions[i])}</b><br>${esc(answer)}</p>`).join('')}</div>`).join('');
    openBox(p.name, introduction + `<div class="stats">${p.total} reviews · ${p.avg??'—'} / 5 · ${p.waits} on waitlist</div>${comments}`);
    return;
  }
  openBox(p.name, introduction + `<p><button data-join="${id}" ${p.joined?'disabled':''}>${p.joined?'Joined waitlist':'Join waitlist'}</button></p>` +
    (p.done ? '<p>Your review has been recorded.</p>' :
    `<form data-action="review" data-id="${id}">${p.questions.map((q,i) => field('a'+i,q)).join('')}
    <label>Overall rating<select name="rating">${[5,4,3,2,1].map(n=>`<option>${n}</option>`).join('')}</select></label>${field('note','One-line feedback')}
    <label>Would you use it?<select name="intent"><option>Would use</option><option>Would pay</option><option>Would pass</option></select></label>
    <button class="primary">Submit review</button></form>`));
}
async function post(payload) {
  const response = await fetch('/api', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
  if (!response.ok) throw Error(await response.text());
  await sync();
}
document.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-list')) return listing();
  if (button.hasAttribute('data-product')) return detail(Number(button.dataset.product));
  if (button.hasAttribute('data-category')) {
    category = ['', ...new Set(state.products.map(p=>p.category))][Number(button.dataset.category)];
    render();
    page.querySelector(`[data-category="${button.dataset.category}"]`).focus({preventScroll:true});
  }
  if (button.hasAttribute('data-explore')) {
    modal.close();
    location.hash='directory';
    render();
    document.querySelector('#directory').scrollIntoView();
  }
  if (button.hasAttribute('data-join')) {
    const id = Number(button.dataset.join);
    button.disabled = true;
    try { await post({action:'join',id}); detail(id); }
    catch(error) { message.textContent = error.message; button.disabled = false; }
  }
});
modal.addEventListener('submit',async event => {
  event.preventDefault();
  const form=event.target;
  const action=form.dataset.action;
  const button=form.querySelector('button');
  button.disabled=true;
  try {
    await post({...Object.fromEntries(new FormData(form)),action,id:Number(form.dataset.id)});
    modal.close();
    if (action==='list') location.hash='dashboard';
    else detail(Number(form.dataset.id));
  } catch(error) { message.textContent=error.message; button.disabled=false; }
});
window.addEventListener('hashchange', () => {
  render();
  if (location.hash==='#directory') document.querySelector('#directory')?.scrollIntoView();
  else window.scrollTo(0,0);
});
const motion = matchMedia('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)');
page.addEventListener('pointermove', event => {
  if (!motion.matches) return;
  const hero = event.target.closest('.hero');
  if (!hero) return;
  const rect = hero.getBoundingClientRect();
  hero.style.setProperty('--flight-ry', ((event.clientX-rect.left)/rect.width*16-8)+'deg');
  hero.style.setProperty('--flight-rx', (6-(event.clientY-rect.top)/rect.height*12)+'deg');
});
page.addEventListener('pointerout', event => {
  const hero = event.target.closest('.hero');
  if (hero && !hero.contains(event.relatedTarget)) {
    hero.style.removeProperty('--flight-rx'); hero.style.removeProperty('--flight-ry');
  }
});
sync().catch(error=>page.textContent=error.message);
