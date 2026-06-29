# PROJCT Site — Deployment & Operations

## Architecture (current)

| Component | Host | URL |
|---|---|---|
| Public site | GitHub Pages | `https://projct-limited.github.io/projct-core/` |
| Sanity Studio | Sanity hosting | `https://projct-website.sanity.studio` |
| Content Lake | Sanity | Project `onhood8r`, dataset `production` |

The public site fetches **published** content from the Sanity CDN API in the
browser. No token, no server, no build step. Editors use the Studio to create
and edit case studies; clicking Publish makes content appear on the public site
on the next page load.

## CORS origins

Add these in **sanity.io/manage → project → API → CORS origins**:

| Origin | Credentials | Why |
|---|---|---|
| `https://projct-limited.github.io` | No | Public site reads from CDN |
| `http://localhost:8080` | No | Local development |
| `http://localhost:5500` | No | VS Code Live Server |

The Studio at `projct-website.sanity.studio` does NOT need a CORS entry — it
communicates with the Content Lake via its own authenticated session, not via
browser CORS.

## Adding a new case study

1. Open `https://projct-website.sanity.studio` and log in
2. Click **Structure** → the **+** button → **Case Study**
3. Fill in the header fields:
   - **Title**: the index list title, e.g. "Community Activation | Lightbox Gallery"
   - **Headline**: display headline with `\n` for line breaks, e.g. "Community\nActivation"
   - **Category**: client eyebrow, e.g. "Lightbox Gallery — 2025"
   - **Year**, **Standfirst**, **Tags**, **Kicker**, **Role**
4. Upload a **Hero Image** with alt text
5. Write the **Body** using the Portable Text editor:
   paragraphs, h3 subheadings, images, image pairs, pull quotes, bullet lists
6. Set **Filter Category** (Case Studies, Articles, Research, Practice)
7. Set **Order Rank** (lower numbers appear first)
8. Click **Publish**

The case study appears on the public site on the next page load. No commit or
deploy needed.

## Deploying the Studio

```bash
cd nextjs-projct-website/studio-projct-website
npx sanity deploy --yes
```

This deploys to `https://projct-website.sanity.studio`. The hosted runtime
auto-updates (currently sanity@6.2.0).

## Local development

```bash
# Serve the site locally
python3 -m http.server 8080
# or with preview API functions:
node dev-server.mjs 8080

# Run the Studio locally
cd nextjs-projct-website/studio-projct-website && npx sanity dev --port 3333
```

---

## Re-enabling draft preview (dormant)

The codebase includes a Vercel preview proxy and Presentation tool integration
that are currently disabled. To re-enable live draft preview with click-to-edit:

### What's already committed (dormant)

- `api/preview/enable.js` — validates preview secret, sets HMAC-signed httpOnly cookie
- `api/preview/disable.js` — clears preview cookie
- `api/preview/query.js` — GROQ proxy (adds token + stega + drafts perspective)
- `sanity-client.js` — preview branch gated on `?sanity-preview-perspective` URL param
- `@sanity/visual-editing@5.4.4` pinned in `package.json` (comlink v4, matches Studio runtime)
- `vercel.json` — builds the visual-editing bundle on Vercel deploy
- `presentation/resolve.ts` — document locations for Presentation tool

### Steps to activate

1. **Deploy preview site to Vercel**: import the repo, root directory `.`,
   framework "Other". Add env var `SANITY_API_READ_TOKEN` (Viewer token).

2. **Set up same-site subdomains** (recommended for reliable cookie auth):
   - `preview.projct.co` → CNAME to Vercel (DNS only / grey cloud in Cloudflare)
   - `studio.projct.co` → optional alias for the Studio

3. **Re-enable Presentation tool** in `sanity.config.ts`:
   ```ts
   import {presentationTool} from 'sanity/presentation'
   import {resolve} from './presentation/resolve'

   // Add to plugins array:
   presentationTool({
     resolve,
     previewUrl: {
       origin: 'https://preview.projct.co',
       preview: '/index3.html',
       previewMode: { enable: '/api/preview/enable' },
     },
   }),
   ```

4. **Add CORS origin**: `https://preview.projct.co` with credentials in sanity.io/manage.

5. **Redeploy Studio**: `npx sanity deploy --yes`

### Version pair (keep aligned)

| Package | Version | Comlink |
|---|---|---|
| `sanity` (Studio runtime) | 6.2.0 (auto-updates) | `@sanity/comlink@4.x` |
| `@sanity/visual-editing` | 5.4.4 (pinned) | `@sanity/comlink@^4.0.1` |

If the Studio runtime auto-updates to a new comlink major, update the
`@sanity/visual-editing` pin in `package.json` to match and redeploy.

### Cookie auth model

The preview proxy uses HMAC-SHA256 signed cookies (not Referer headers):
- `enable.js` signs `timestamp` with `HMAC(timestamp, SANITY_API_READ_TOKEN)`
- `query.js` verifies the signature and rejects expired cookies (1h TTL)
- Cookie: `HttpOnly; Secure; SameSite=Lax` (works because `studio.projct.co`
  and `preview.projct.co` are same-site)
