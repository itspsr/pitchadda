import { seoHead } from "./seo.mjs";

const infoPages = new Map([
  ['/about', {
    title: 'About PitchAdda',
    intro: 'PitchAdda gives independent founders in India a place to test an idea with people who are building products of their own.',
    sections: [
      ['How the exchange works', 'Choose a product, answer the founder’s questions and share a rating. After reviewing three different products, you can list yours with a link, a short description and up to three questions.'],
      ['What founders learn', 'Your dashboard brings together ratings, written responses and waitlist interest. Read the answers alongside the numbers to understand what someone found useful, what confused them and what they would change.'],
      ['Start with a practice brief', 'Products marked “Practice brief” are sample concepts. Review the description and questions to try the exchange before posting your own listing.']
    ]
  }],
  ['/help', {
    title: 'Help',
    intro: 'Find answers about giving feedback, publishing your first product and managing your account.',
    sections: [
      ['Does PitchAdda charge for reviews?', 'The exchange is free to use. You earn eligibility to list your product by giving feedback on three different products.'],
      ['How do I unlock my listing?', 'Sign in, open Discover and choose Review product. Answer the founder’s questions, leave a rating and submit your feedback. Once you have reviewed three different products, select List a product to publish yours.'],
      ['Do practice reviews count?', 'Yes. Each distinct practice brief you review counts toward your first listing. Use the description and questions on the brief to give specific feedback about the concept.'],
      ['What happens when I join a waitlist?', 'The founder sees the waitlist count increase. You can register interest once per product. Joining a waitlist does not charge you or reserve a place in a paid product.'],
      ['Where can I read feedback on my listing?', 'Open Dashboard, choose your listing and select View feedback. The detail view shows the feedback you received alongside the average rating and waitlist count.'],
      ['How can I download my data?', 'Sign in with the account you used for the exchange. On the Account page, select Download my data to export your own exchange records.', '/account', 'Open account']
    ]
  }],
  ['/privacy', {
    title: 'Privacy policy',
    intro: 'This policy explains how information moves through PitchAdda when you sign in, list a product, write a review or join a waitlist.',
    sections: [
      ['Your account', 'Sites supports sign-in with ChatGPT. If email sign-in is enabled, Supabase uses your email address to send a sign-in link and verify the session. PitchAdda uses an account identifier to associate listings, reviews and waitlist choices with you, count completed reviews and prevent duplicate submissions. Signing out ends your session. Your submissions stay in the exchange.'],
      ['Product listings', 'People with access to the directory can see a product’s name, category, description, website link and questions. Include only information you have permission to share.'],
      ['Reviews and waitlists', 'The product’s founder can read your written feedback, answers, rating and stated interest in using or paying for the product. The exchange also calculates review totals, average ratings and waitlist counts. Personal information you type into a response can be visible to that founder.'],
      ['Hosting and sign-in services', 'Sites delivers the application. A Cloudflare D1 database stores product listings, reviews and waitlist records linked to account identifiers. Session credentials are used to recognize a signed-in visitor. Websites linked from a product listing have their own privacy practices.'],
      ['Exporting your data', 'Sign in to Account and choose Download my data to get a copy of your own exchange records.', '/account', 'Open account'],
      ['Questions about your data', 'For a question about a submission or a request concerning your account data, contact the operator who provided access to the exchange. Identify the relevant product and the type of request. Keep passwords, sign-in codes and private review text out of public project discussions.']
    ]
  }],
  ['/terms', {
    title: 'Terms and conditions',
    intro: 'These terms apply when you participate in the PitchAdda founder feedback exchange.',
    sections: [
      ['Using the exchange', 'Use an account you control. Complete three distinct product reviews before submitting a listing. Write from your own experience and use the practice label to distinguish sample concepts from live products.'],
      ['Your submissions', 'You retain ownership of the material you submit. You give PitchAdda permission to store it, display your listing in the directory, deliver feedback to the relevant founder and calculate aggregate results. Share content and links you have the right to submit.'],
      ['Community conduct', 'Keep feedback specific and respectful. Do not submit deceptive listings, manipulate ratings, impersonate other people, publish private information or post abusive content.'],
      ['External products', 'Founders are responsible for their product descriptions and websites. Review the provider’s terms before signing up, sharing information or making a purchase on an external site.'],
      ['Waitlists and interest', 'Joining a waitlist records interest in a product. A founder’s separate offer would need to describe any purchase, reservation or payment terms.']
    ]
  }],
  ['/disclaimer', {
    title: 'Disclaimer',
    intro: 'The exchange is designed for early product research. Read feedback in the context of the people who chose to participate.',
    sections: [
      ['Ratings and demand signals', 'Reviews reflect the opinions of individual participants. An average based on a few responses can change substantially as more people participate. A “would pay” answer describes stated interest at the time of review.'],
      ['Practice briefs', 'Practice briefs are illustrative concepts for trying the review process. Their ratings and waitlist counts reflect practice activity.'],
      ['Third-party products', 'Founders supply their own listings and links. Inclusion in the directory does not certify a product’s accuracy, security, availability or business viability. Check important claims with the provider before relying on them.']
    ]
  }]
]);

function escapeInfo(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
}

export function renderInfo(path, origin, env = {}) {
  const page = infoPages.get(path);
  if (!page) return null;
  const label = escapeInfo(page.title);
  const links = [...infoPages].map(([href, item]) =>
    '<a href="' + href + '"' + (href === path ? ' aria-current="page"' : '') + '>' + escapeInfo(item.title) + '</a>'
  ).join('');
  const sections = page.sections.map(([heading, content, href, linkLabel]) =>
    '<section><h2>' + escapeInfo(heading) + '</h2><p>' + escapeInfo(content) + '</p>' +
    (href ? '<a href="' + escapeInfo(href) + '">' + escapeInfo(linkLabel) + '</a>' : '') + '</section>'
  ).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${seoHead(path, origin, env)}
<meta name="theme-color" content="#182449">
<style>
*{box-sizing:border-box}body{margin:0;background:#fafbf9;color:#16213d;font:1rem/1.65 Inter,Arial,sans-serif;-webkit-font-smoothing:antialiased}.wrap{width:min(1120px,91%);margin:auto}
header{border-bottom:1px solid #dbe0e8;background:white}.head{display:flex;align-items:center;min-height:74px;gap:1.5rem}.brand{display:inline-flex;align-items:center;gap:.6rem;color:#16213d;font-size:1.55rem;font-weight:800;letter-spacing:-.075em;margin-right:auto}.brand span{width:32px;height:32px;display:flex;align-items:center;justify-content:center;gap:2px;background:#324fd0;border-radius:9px;transform:rotate(-5deg)}.brand i{height:12px;width:4px;background:white;transform:skewY(-26deg)}.brand i:first-child{height:8px}.brand i:last-child{height:17px}
a{color:#304dcc;text-decoration:none}a:hover{text-decoration:underline}a:focus-visible{outline:3px solid #6179ff;outline-offset:4px}.head>a:not(.brand){font-size:.94rem;font-weight:600}
.layout{display:grid;grid-template-columns:210px minmax(0,720px);gap:clamp(32px,6vw,88px);padding-block:clamp(35px,6vw,78px)}nav{display:flex;align-items:flex-start;flex-direction:column;gap:.2rem}nav a{padding:6px 12px;color:#546178;border-radius:7px}nav a[aria-current]{font-weight:700;color:#273fab;background:#e8ecff}
h1,h2{font-family:Georgia,serif;font-weight:500;line-height:1.15;letter-spacing:-.045em}h1{font-size:clamp(2.65rem,5vw,4.25rem);margin:0 0 18px}.intro{font-size:1.18rem;color:#49566e;margin:0 0 30px}section{border-top:1px solid #dbe0e8;padding:22px 0}h2{font-size:1.6rem;margin:0 0 8px}p{margin:0;color:#37445c}.action{display:inline-block;margin-top:10px;padding:9px 17px;background:#304dcc;color:white;border-radius:8px;font-weight:650}
@media(max-width:700px){.layout{display:flex;flex-direction:column;gap:28px;padding-top:22px}nav{flex-direction:row;flex-wrap:wrap;gap:4px}nav a{font-size:.9rem;padding:4px 8px}.head{gap:.7rem;min-height:62px;flex-wrap:wrap;padding-block:8px}.brand{font-size:1.3rem}.head>a:not(.brand){font-size:.86rem}}
</style></head><body><header><div class="wrap head"><a class="brand" href="/" aria-label="PitchAdda home"><span aria-hidden="true"><i></i><i></i><i></i></span>PitchAdda</a><a href="/#discover">Discover</a><a href="/#dashboard">Dashboard</a><a href="/account">Account</a></div></header>
<div class="wrap layout"><nav aria-label="Help and information">${links}</nav><main><h1>${label}</h1><p class="intro">${escapeInfo(page.intro)}</p>${sections}${path === '/about' ? '<a class="action" href="/#directory">Explore products</a>' : ''}</main></div></body></html>`;
}
