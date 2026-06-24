# PROJCT Site — Deployment & Operations

## Architecture

| Component | Host | Role |
|---|---|---|
| Public site | GitHub Pages | Serves published content from Sanity CDN. No token. |
| Preview site + API | Vercel | Preview proxy + visual editing for logged-in editors only. Token in env vars. |
| Sanity Studio | Vercel (or sanity.studio) | Content editor. Deployed via `npx sanity deploy` or Vercel. |
| Content Lake | Sanity (`onhood8r` / `production`) | Source of truth for all case study content. |

One push to `main` deploys both GitHub Pages and Vercel from the same commit.

## Version pair (keep aligned)

| Package | Pinned version | Comlink protocol |
|---|---|---|
| `sanity` (Studio runtime) | 6.2.0 (auto-updates) | `@sanity/comlink@4.x`, `@sanity/presentation-comlink@2.x` |
| `@sanity/visual-editing` | **5.4.4** (pinned in `package.json`) | `@sanity/comlink@^4.0.1`, `@sanity/presentation-comlink@^2.1.0` |

The hosted Studio runtime auto-updates. If a future runtime ships a new comlink
major, `@sanity/visual-editing` will need re-aligning: update the pin in
`package.json`, run `npm install`, and Vercel rebuilds the bundle on next deploy.

## Vercel setup

1. Import the GitHub repo in Vercel. Root directory: `.` Framework: Other.
2. Vercel auto-detects `vercel.json` (builds the visual-editing bundle) and the
   `api/` directory (deploys as serverless functions).
3. Add environment variables in the Vercel dashboard:

| Variable | Value | Notes |
|---|---|---|
| `SANITY_API_READ_TOKEN` | A Viewer (read-only) token from sanity.io/manage | Never a write token |
| `SANITY_STUDIO_URL` | The deployed Studio URL, e.g. `https://projct-website.sanity.studio` | Used by stega to build intent links |

4. Note the Vercel deployment URL (e.g. `https://projct-preview.vercel.app`).
5. Set `SANITY_STUDIO_PREVIEW_ORIGIN` in the Studio's deployment to this URL.

## Preview mode — how it works and why

The Presentation tool (in the Studio) loads the Vercel preview site in an iframe.

1. Studio navigates iframe to `/api/preview/enable?sanity-preview-secret=...&sanity-preview-pathname=/index3.html&sanity-preview-perspective=drafts`
2. The enable endpoint validates the secret against the Sanity dataset, sets cookies, redirects to `/index3.html?sanity-preview-perspective=drafts`
3. `sanity-client.js` detects the URL parameter (NOT the cookie — cookies are blocked in cross-origin iframes) and switches to the preview fetch path
4. The preview path fetches through `/api/preview/query`, which adds the token and `perspective: drafts` server-side, and returns stega-encoded content
5. `@sanity/visual-editing` decodes stega characters in the DOM and renders click-to-edit overlays

The token never reaches the browser. The public GitHub Pages site never has
the URL parameter, so `IS_PREVIEW` is always false and the CDN path runs.

### Cross-site cookie note

On `vercel.app` URLs, the Studio and preview site are cross-site (vercel.app
is on the Public Suffix List). Third-party cookies do not work. Mode detection
uses the URL parameter instead. If you move to custom subdomains of `projct.co`
(e.g. `studio.projct.co` and `preview.projct.co`), they become same-site and
cookies work normally.

## CORS origins

Add these in the Sanity dashboard (sanity.io/manage → project → API → CORS):

| Origin | Credentials | Purpose |
|---|---|---|
| `https://<your-github-pages-domain>` | No | Public site CDN reads |
| `https://projct.co` | No | Public site (if custom domain) |
| `https://www.projct.co` | No | Public site (www) |
| `https://<vercel-preview>.vercel.app` | Yes | Preview proxy + Studio iframe |
| `http://localhost:8080` | No | Local dev |
| `http://localhost:3333` | Yes | Local Studio |
| `http://localhost:5500` | No | VS Code Live Server |

## Adding a new case study

1. Open the Studio → Structure → Case Study → Create new
2. Fill in the header fields: title, headline (use `\n` for line breaks), category eyebrow, year, standfirst, tags, kicker, role
3. Upload a hero image with alt text
4. Write the body using the Portable Text editor: paragraphs, h3 subheadings, images, image pairs, pull quotes, bullet lists
5. Set the filter category (Case Studies, Articles, Research, Practice)
6. Set orderRank to control position in the index
7. Click Publish — the case study appears on the public site on next page load, no deploy needed

## Local development

```bash
# Start the preview dev server (static files + API functions)
node dev-server.mjs 8080

# Start the Studio
cd nextjs-projct-website/studio-projct-website && npx sanity dev --port 3333
```

The dev server reads `SANITY_API_READ_TOKEN` from `.env.local` in the repo root.
