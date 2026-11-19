# PitchAdda

A founder feedback exchange with structured product reviews, waitlists, a founder dashboard, and a three-review listing requirement.

## Development

Use Node.js 24 or later. Run `npm ci`, then `npm run dev`. The local server uses an in-memory database and a development-only signed-in founder. Run `npm test` for the workflow, account, privacy and SEO checks. `npm run build` produces the deployable Worker in `dist/server/index.js`.

## Account and storage

Hosted accounts use the identity supplied by the Sites gateway. Product listings, feedback and waitlists are stored in the existing D1 binding named `DB`. Signed-in founders can download their own contributions at `/account/export`.

To enable optional email sign-in, configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the Site's runtime environment. Enable the email provider in Supabase, configure email delivery to your intended recipients, and allow the exact deployed origin followed by `/auth/confirm` in Authentication → URL Configuration → Redirect URLs. Deploy the Site with the updated environment. Test by requesting a link at `/account` and opening it in the same browser. Email sign-in is offered to anonymous visitors. Sites controls who can access the website before application authentication runs.

## Search and sharing

The home, About, Help, Privacy, Terms and Disclaimer pages have server-rendered HTML, canonical URLs, JSON-LD and a social preview image. Private deployments use noindex and disallow crawling. On a public deployment, set `PUBLIC_INDEXING=true` and redeploy to publish the indexable page metadata and sitemap at `/sitemap.xml`. This setting controls crawler instructions. Site audience is managed separately through hosting access controls.
