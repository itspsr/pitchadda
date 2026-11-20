const pageDetails = {
  '/': {
    title: 'PitchAdda | Founder feedback exchange for India',
    description: 'Discover independent products from India’s founders. Review three products, list your own, and learn from peer ratings, written feedback and waitlist interest.',
    type: 'WebPage',
  },
  '/demo': {
    title: 'Interactive demo | PitchAdda',
    description: 'Try a sample product review and see how a founder receives ratings, written feedback and interest signals.',
    type: 'WebPage',
  },
  '/about': {
    title: 'About PitchAdda | A feedback exchange for founders',
    description: 'Learn how PitchAdda helps India’s founders exchange structured product reviews, collect early interest and find out what to improve.',
    type: 'AboutPage',
  },
  '/help': {
    title: 'Help | PitchAdda',
    description: 'Find answers about signing in, reviewing products, publishing a listing and using the founder dashboard on PitchAdda.',
    type: 'WebPage',
  },
  '/privacy': {
    title: 'Privacy Policy | PitchAdda',
    description: 'Learn how PitchAdda handles account information, product listings, reviews and waitlist activity on the founder feedback exchange.',
    type: 'WebPage',
  },
  '/terms': {
    title: 'Terms and Conditions | PitchAdda',
    description: 'Read the terms for using PitchAdda, publishing product listings and participating in the founder feedback exchange.',
    type: 'WebPage',
  },
  '/disclaimer': {
    title: 'Disclaimer | PitchAdda',
    description: 'Understand the limits of peer feedback, practice briefs, waitlist interest and third-party product links on PitchAdda.',
    type: 'WebPage',
  },
};

const escapeMarkup = value => String(value).replace(/[<>&"']/g, char =>
  ({'<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&#39;'}[char]));

export function robotsTag(path, env = {}) {
  return env.PUBLIC_INDEXING === 'true' && (Object.hasOwn(pageDetails, path) || /^\/p\/[1-9]\d*$/.test(path))
    ? 'index, follow' : 'noindex, nofollow';
}

export function seoHead(path, origin, env = {}) {
  const info = pageDetails[path];
  const canonical = new URL(path, origin).href;
  const home = new URL('/', origin).href;
  const website = { '@id': home + '#website' };
  const publisher = { '@id': home + '#organization' };
  const graph = [
    { '@type': 'Organization', ...publisher, name: 'PitchAdda', url: home, founder: {'@type':'Person', name:'Pratik Kumar', sameAs:['https://github.com/itspsr','https://www.linkedin.com/in/databypratik/']} },
    { '@type': 'WebSite', ...website, name: 'PitchAdda', url: home, inLanguage: 'en', publisher },
    {
      '@type': info.type, '@id': canonical + '#page', url: canonical, name: info.title,
      description: info.description, inLanguage: 'en', isPartOf: website,
    },
  ];
  const schema = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('<', '\\u003c');
  const title = escapeMarkup(info.title);
  const description = escapeMarkup(info.description);
  const url = escapeMarkup(canonical);
  const image = escapeMarkup(new URL('/social.png', origin).href);
  return `<title>${title}</title>
<meta name="description" content="${description}">
<meta name="robots" content="${robotsTag(path, env)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="PitchAdda">
<meta property="og:locale" content="en_IN">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="PitchAdda founder feedback exchange with a folded paper plane">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${image}">
<meta name="twitter:image:alt" content="PitchAdda founder feedback exchange with a folded paper plane">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<script type="application/ld+json">${schema}</script>`;
}

export function applyHomeSeo(html, origin, env) {
  return html.replace('<!-- PAGE_METADATA -->', () => seoHead('/', origin, env));
}

export function seoRoute(path, origin, env = {}, productIds = []) {
  const published = env.PUBLIC_INDEXING === 'true';
  if (path === '/robots.txt') {
    const rules = published
      ? 'Allow: /\nDisallow: /api\nDisallow: /account\nDisallow: /auth/\nDisallow: /dashboard\nDisallow: /signin-with-chatgpt\nDisallow: /signout-with-chatgpt\nDisallow: /callback\nSitemap: ' + new URL('/sitemap.xml', origin).href
      : 'Disallow: /';
    return new Response('User-agent: *\n' + rules + '\n', {
      headers: {'Content-Type':'text/plain; charset=utf-8', 'X-Robots-Tag':'noindex'},
    });
  }
  if (path !== '/sitemap.xml') return null;
  if (!published) return new Response('Sitemap is available on public launch.', {
    status: 404, headers: {'X-Robots-Tag': 'noindex'},
  });
  const productPaths = productIds.filter(id => Number.isSafeInteger(id) && id > 0).map(id => '/p/' + id);
  const entries = [...new Set([...Object.keys(pageDetails), ...productPaths])].map(route =>
    '<url><loc>' + escapeMarkup(new URL(route, origin).href) + '</loc></url>');
  return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + entries.join('') + '</urlset>', {
    headers: {'Content-Type':'application/xml; charset=utf-8', 'X-Robots-Tag':'noindex'},
  });
}
