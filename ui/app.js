const page = document.querySelector('#page');
const modal = document.querySelector('#modal');
const message = document.querySelector('#message');
const covers = [...document.querySelector('#covers').content.children];
const homeHero = page.querySelector('.studio-hero').outerHTML;
let state;
const feedDefaults = {query:'', stage:'', category:'', sort:'latest'};
const feedOptions = {...feedDefaults};
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
  document.querySelector('[data-account]').textContent = state.signedIn ? 'Account' : 'Log in';
  document.querySelectorAll('nav a').forEach(a => {
    if (a.hash === (mine ? '#dashboard' : '#discover')) a.setAttribute('aria-current','page');
    else a.removeAttribute('aria-current');
  });
  if (mine && !state.signedIn) {
    page.innerHTML='<section class="dash"><h1>Founder dashboard</h1><p>Log in to see your listings, reviews and waitlist activity.</p><a class="primary account-cta" href="/account">Log in</a></section>';
    return;
  }
  if (mine) {
    const owned = state.products.filter(p => p.mine);
    page.innerHTML = '<section class="dash"><h1>Founder dashboard</h1></section>' + progress() +
      '<section><div class="directory-head"><h2>Your products</h2></div><div class="grid dashboard-grid">' +
      owned.map(card).join('') + '</div>' + (owned.length ? '' : '<p class="empty">Your listings and their feedback will appear here.</p>') + '</section>';
    return;
  }
  page.innerHTML = homeHero + '<div class="discovery-layout"><div id="feed-root"></div>' +
    '<aside class="board-aside" aria-label="Founder resources">' + progress() +
    '<div class="board-guide"><h2>Who is PitchAdda for?</h2><p><strong>For founders</strong><br>Find out what early users understand, where they get stuck and whether they would pay.</p><p><strong>For early adopters</strong><br>Discover new products from India, try them early and help shape what gets built.</p><a href="/demo">Try a sample review</a></div></aside></div>';
  renderFeed();
}
function renderFeed() {
  document.querySelector('#feed-root').innerHTML = discoveryFeed(state.products, {...feedOptions,signedIn:state.signedIn});
}
function restoreFeedFocus(selector) {
  page.querySelector(selector)?.focus({preventScroll:true});
}
page.addEventListener('input', event => {
  if (!event.target.matches('[data-feed-query]') || event.isComposing) return;
  feedOptions.query = event.target.value;
  const caret = event.target.selectionStart;
  renderFeed();
  const field = page.querySelector('[data-feed-query]');
  field.focus({preventScroll:true});
  if (caret !== null) field.setSelectionRange(caret, caret);
});
page.addEventListener('change', event => {
  const control = event.target;
  if (!control.matches('[data-feed-sort],[data-feed-category]')) return;
  const isSort = control.hasAttribute('data-feed-sort');
  feedOptions[isSort ? 'sort' : 'category'] = control.value;
  renderFeed();
  restoreFeedFocus(isSort ? '[data-feed-sort]' : '[data-feed-category]');
});
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
  if (!state.signedIn) {
    openBox('List your product', '<p>Log in to track review credit and publish your listing.</p><a class="primary account-cta" href="/account">Log in</a>');
    return;
  }
  if (state.count < 3) {
    const left = 3 - state.count;
    openBox('Unlock your listing', `<p>Review ${left} more ${left===1?'product':'products'} to publish your own brief.</p><button class="primary" data-explore>Explore products</button>`);
    return;
  }
  openBox('List your product', `<form data-action="list">${field('name','Product name','text',80)}${field('url','Website URL','url')}
    <label>Launch stage<select name="stage"><option>Early access</option><option>Launched</option></select></label>${field('category','Category','text',40)}${field('description','One-line description')}${field('q1','First question for reviewers')}${field('q2','Second question for reviewers')}
    <label>Third question (optional)<input name="q3" maxlength="300"></label><button class="primary">Publish listing</button></form>`);
}
function detail(id) {
  const p = state.products.find(product => product.id === id);
  if (!p) return;
  const introduction = `<p>${esc(p.description)}</p>` + (p.url ? `<a target="_blank" rel="noopener noreferrer" href="${esc(p.url)}">Visit product website</a>` : '<p class="tag">Practice brief · Review the concept described above.</p>');
  if (!state.signedIn) {
    openBox(p.name,introduction + '<p>Log in to write a review or join the waitlist.</p><a class="primary account-cta" href="/account">Log in</a>');
    return;
  }
  if (p.mine) {
    const comments = p.feedback.map(f => `<div class="feedback"><strong>${esc(f.note)}</strong><p><small>${esc(f.rating)} / 5 · ${esc(f.intent)}</small></p>
      ${JSON.parse(f.answers).map((answer,i) => `<p><b>${esc(p.questions[i])}</b><br>${esc(answer)}</p>`).join('')}</div>`).join('');
    openBox(p.name, introduction + `<p><a href="/p/${id}">Open product page</a></p><form data-action="set-stage" data-id="${id}"><label>Launch stage<select name="stage">${['Early access','Launched'].map(s=>'<option '+(p.stage===s?'selected':'')+'>'+s+'</option>').join('')}</select></label><button>Save launch stage</button></form><div class="stats">${p.votes} upvotes · ${p.total} reviews · ${p.avg??'—'} / 5 · ${p.waits} on waitlist</div>${comments}`);
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
  if (button.hasAttribute('data-feed-stage')) {
    feedOptions.stage = button.dataset.feedStage;
    renderFeed();
    restoreFeedFocus('[data-feed-stage][aria-pressed="true"]');
  }
  if (button.hasAttribute('data-feed-clear')) {
    Object.assign(feedOptions,feedDefaults);
    renderFeed();
    restoreFeedFocus('[data-feed-query]');
  }
  if (button.hasAttribute('data-vote')) {
    if (!state.signedIn) return openBox('Upvote a product','<p>Log in to support a product you’d like other founders to discover.</p><a class="primary account-cta" href="/account">Log in</a>');
    const id = Number(button.dataset.vote);
    const product = state.products.find(p=>p.id===id);
    button.disabled = true;
    try {
      await post({action:'vote',id,active:!product.voted});
      restoreFeedFocus('[data-vote="'+id+'"]');
    } catch(error) {
      button.disabled=false;
      openBox('Couldn’t update your vote','<p>'+esc(error.message)+'</p>');
    }
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
  const hero = event.target.closest('.studio-hero');
  if (!hero) return;
  const rect = hero.getBoundingClientRect();
  hero.style.setProperty('--flight-ry', ((event.clientX-rect.left)/rect.width*16-8)+'deg');
  hero.style.setProperty('--flight-rx', (6-(event.clientY-rect.top)/rect.height*12)+'deg');
});
page.addEventListener('pointerout', event => {
  const hero = event.target.closest('.studio-hero');
  if (hero && !hero.contains(event.relatedTarget)) {
    hero.style.removeProperty('--flight-rx'); hero.style.removeProperty('--flight-ry');
  }
});
sync().then(() => {
  const url=new URL(location.href);
  const reviewId=url.searchParams.get('review');
  if (reviewId && /^[1-9][0-9]*$/.test(reviewId)) {
    detail(Number(reviewId));
    url.searchParams.delete('review');
    history.replaceState(null,'',url.pathname+url.search+url.hash);
  }
  if (location.hash==='#directory') document.querySelector('#directory')?.scrollIntoView();
}).catch(error => {
  const status = document.createElement('p');
  status.setAttribute('role','alert');
  status.textContent = error.message;
  page.append(status);
});
