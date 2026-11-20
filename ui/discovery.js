function discoveryFeed(products, options = {}) {
  const {query = '', category = '', stage = '', sort = 'latest', signedIn = false} = options;
  const stages = [['', 'All products'], ['Early access', 'Early access'], ['Launched', 'Launched'], ['Practice brief', 'Practice briefs']];
  const stageOf = p => p.seed ? 'Practice brief' : p.stage || 'Launched';
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  const search = query.trim().toLocaleLowerCase();
  const matches = products.filter(p => {
    const haystack = [p.name, p.description, p.category].join(' ').toLocaleLowerCase();
    return (!category || p.category === category) && (!stage || stageOf(p) === stage) && haystack.includes(search);
  });
  matches.sort((a,b) => {
    if (sort === 'votes' && a.votes !== b.votes) return (b.votes || 0) - (a.votes || 0);
    return Number(Boolean(a.seed)) - Number(Boolean(b.seed)) || b.id - a.id;
  });
  function row(p) {
    const id = Number(p.id);
    const link = '/p/' + id;
    const artwork = p.seed ? covers[id - 1]?.outerHTML : '';
    const title = esc(p.name);
    const votes = Number(p.votes || 0);
    const reviews = Number(p.total || 0);
    const stageLabel = stageOf(p);
    const voteAction = p.mine ? 'Votes on your listing' : p.voted ? 'Remove your upvote' : signedIn ? 'Upvote' : 'Sign in to upvote';
    return `<article class="lb-row">
      <div class="lb-art" aria-hidden="true">${artwork || '<span class="lb-monogram">'+esc(Array.from(p.name.trim())[0] || 'P')+'</span>'}</div>
      <div class="lb-copy"><div class="lb-byline"><span>${esc(p.category)}</span><span class="lb-stage">${esc(stageLabel)}</span></div>
        <h3><a href="${link}">${title}</a></h3><p>${esc(p.description)}</p>
        <div class="lb-details"><button type="button" class="lb-review" data-product="${id}">${p.mine?'View feedback':p.done?'View your review status':'Review product'}</button><span>${reviews} ${reviews===1?'review':'reviews'}</span></div>
      </div><button type="button" class="lb-vote" data-vote="${id}" aria-pressed="${Boolean(p.voted)}" aria-label="${voteAction} ${title}, ${votes} votes" title="${voteAction}" ${p.mine?'disabled':''}><span class="lb-chevron" aria-hidden="true"></span><strong>${votes}</strong></button>
    </article>`;
  }
  const filtered = Boolean(search || category || stage);
  return `<section id="directory" class="launch-board" aria-labelledby="launch-board-title">
    <div class="lb-heading"><h2 id="launch-board-title">Launch board</h2>
      <label class="lb-search"><span class="lb-glass" aria-hidden="true"></span><input type="search" aria-label="Search products" placeholder="Search products" data-feed-query value="${esc(query)}"></label></div>
    <div class="lb-filters"><div class="lb-tabs" role="group" aria-label="Filter by launch stage">${stages.map(([value,label]) => `<button type="button" data-feed-stage="${value}" aria-pressed="${stage===value}">${label}</button>`).join('')}</div>
    <div class="lb-selects"><select aria-label="Filter by category" data-feed-category><option value="">All categories</option>${categories.map(c=>`<option value="${esc(c)}" ${c===category?'selected':''}>${esc(c)}</option>`).join('')}</select>
    <select aria-label="Sort products" data-feed-sort><option value="latest" ${sort!=='votes'?'selected':''}>Latest</option><option value="votes" ${sort==='votes'?'selected':''}>Top voted</option></select></div></div>
    <div class="lb-results"><span aria-live="polite">${matches.length} ${matches.length===1?'product':'products'}</span>${filtered?'<button type="button" data-feed-clear>Clear filters</button>':''}</div>
    <div class="lb-list">${matches.map(row).join('') || '<div class="lb-empty"><h3>No products found</h3><p>'+ (filtered?'Try another search or clear the filters.':'New listings will appear here.') +'</p></div>'}</div>
  </section>`;
}
