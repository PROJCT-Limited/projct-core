#!/usr/bin/env node
/**
 * One-time migration: parse index3.html case studies → Sanity documents.
 *
 * Usage:
 *   SANITY_AUTH_TOKEN=<token> node migrate.mjs            # migrate all
 *   SANITY_AUTH_TOKEN=<token> node migrate.mjs --dry-run   # preview only
 *   SANITY_AUTH_TOKEN=<token> node migrate.mjs --only 0    # migrate one by index
 */

import {createClient} from '@sanity/client'
import {JSDOM} from 'jsdom'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// ── Config ──
const PROJECT_ID = 'onhood8r'
const DATASET = 'production'
const API_VERSION = '2025-06-01'
const HTML_PATH = path.resolve(import.meta.dirname, '../../index3.html')
const IMAGES_ROOT = path.resolve(import.meta.dirname, '../..')

const DRY_RUN = process.argv.includes('--dry-run')
const ONLY_INDEX = process.argv.includes('--only')
  ? parseInt(process.argv[process.argv.indexOf('--only') + 1], 10)
  : null

// Read auth token from Sanity CLI config (same token used by `npx sanity`)
function getSanityAuthToken() {
  const configPath = path.join(process.env.HOME || '', '.config', 'sanity', 'config.json')
  if (!fs.existsSync(configPath)) return process.env.SANITY_AUTH_TOKEN
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  return config.authToken || process.env.SANITY_AUTH_TOKEN
}

const token = getSanityAuthToken()
if (!token && !DRY_RUN) {
  console.error('No auth token found. Run `npx sanity login` first.')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: API_VERSION,
  token,
  useCdn: false,
})

// ── Parse HTML ──
const html = fs.readFileSync(HTML_PATH, 'utf-8')
const dom = new JSDOM(html)
const doc = dom.window.document

// Each case study is: <p class="list-projects1"> → <div class="mini-preview"> → <div class="index-item">
const headers = Array.from(doc.querySelectorAll('.list-projects.editorial > .list-projects1'))

console.log(`Found ${headers.length} case study headers\n`)

// ── Helpers ──
function makeKey() {
  return crypto.randomBytes(6).toString('hex')
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
}

// Walk sibling elements after a header to find its mini-preview and index-item
function findCaseStudyParts(headerEl) {
  let el = headerEl.nextElementSibling
  let miniPreview = null
  let indexItem = null

  while (el) {
    if (el.tagName === 'HR') break
    if (el.classList.contains('mini-preview')) miniPreview = el
    if (el.classList.contains('index-item')) {
      indexItem = el
      break
    }
    el = el.nextElementSibling
  }
  return {miniPreview, indexItem}
}

// ── Image upload cache (avoid re-uploading the same file) ──
const uploadedImages = new Map()

async function uploadImage(src) {
  if (!src) return null

  // Decode URL-encoded path and resolve relative to project root
  const decoded = decodeURIComponent(src).replace(/^\.\//, '')
  const absPath = path.join(IMAGES_ROOT, decoded)

  if (uploadedImages.has(absPath)) return uploadedImages.get(absPath)

  if (!fs.existsSync(absPath)) {
    console.warn(`  ⚠ Image not found: ${absPath}`)
    return null
  }

  if (DRY_RUN) {
    const placeholder = {_type: 'image', asset: {_type: 'reference', _ref: `image-placeholder-${makeKey()}`}}
    uploadedImages.set(absPath, placeholder)
    return placeholder
  }

  console.log(`  ↑ Uploading ${decoded}`)
  const buffer = fs.readFileSync(absPath)
  const ext = path.extname(absPath).replace('.', '')
  const asset = await client.assets.upload('image', buffer, {
    filename: path.basename(absPath),
    contentType: ext === 'jpg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : `image/${ext}`,
  })

  const ref = {_type: 'image', asset: {_type: 'reference', _ref: asset._id}}
  uploadedImages.set(absPath, ref)
  return ref
}

// ── Portable Text conversion ──

// Convert inline nodes (text, <b>, <em>, <a>, etc.) into Portable Text spans
function inlineToSpans(node) {
  const spans = []
  const markDefs = []

  function walk(n, marks) {
    if (n.nodeType === 3) {
      // text node
      const text = n.textContent
      if (text) {
        spans.push({_type: 'span', _key: makeKey(), text, marks: [...marks]})
      }
      return
    }
    if (n.nodeType !== 1) return

    const tag = n.tagName.toLowerCase()
    let newMarks = [...marks]

    if (tag === 'strong' || (tag === 'b' && !n.classList.contains('highlighted-text'))) {
      newMarks.push('strong')
    } else if (tag === 'b' && n.classList.contains('highlighted-text')) {
      newMarks.push('strong')
    } else if (tag === 'em' || tag === 'i') {
      newMarks.push('em')
    } else if (tag === 'a') {
      const key = makeKey()
      const href = n.getAttribute('href') || ''
      const blank = n.getAttribute('target') === '_blank'
      markDefs.push({_type: 'link', _key: key, href, blank})
      newMarks.push(key)
    }

    for (const child of n.childNodes) {
      walk(child, newMarks)
    }
  }

  walk(node, [])
  return {spans, markDefs}
}

function makeBlock(node, style = 'normal') {
  const {spans, markDefs} = inlineToSpans(node)
  if (!spans.length) return null
  return {
    _type: 'block',
    _key: makeKey(),
    style,
    markDefs,
    children: spans,
  }
}

function makeListItem(liNode) {
  const {spans, markDefs} = inlineToSpans(liNode)
  if (!spans.length) return null
  return {
    _type: 'block',
    _key: makeKey(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    markDefs,
    children: spans,
  }
}

async function bodyToPortableText(textDiv) {
  const blocks = []

  for (const child of textDiv.children) {
    const tag = child.tagName.toLowerCase()

    // Skip the lead figure — it becomes heroImage, not a body block
    if (tag === 'figure' && child.classList.contains('cs-figure--lead')) {
      continue
    }

    // Single image
    if (tag === 'figure' && child.classList.contains('cs-figure')) {
      const img = child.querySelector('img')
      if (img) {
        const imageRef = await uploadImage(img.getAttribute('src'))
        if (imageRef) {
          const figcaption = child.querySelector('figcaption')
          blocks.push({
            _type: 'figure',
            _key: makeKey(),
            image: imageRef,
            alt: img.getAttribute('alt') || '',
            caption: figcaption ? figcaption.textContent.trim() : undefined,
            layout: 'full',
          })
        }
      }
      continue
    }

    // Image pair
    if (tag === 'figure' && child.classList.contains('cs-figure-pair')) {
      const imgs = child.querySelectorAll('img')
      if (imgs.length >= 2) {
        const leftRef = await uploadImage(imgs[0].getAttribute('src'))
        const rightRef = await uploadImage(imgs[1].getAttribute('src'))
        if (leftRef && rightRef) {
          blocks.push({
            _type: 'figurePair',
            _key: makeKey(),
            imageLeft: {...leftRef, alt: imgs[0].getAttribute('alt') || ''},
            imageRight: {...rightRef, alt: imgs[1].getAttribute('alt') || ''},
          })
        }
      }
      continue
    }

    // Survey figure pairs (div wrapper with two figures)
    if (tag === 'div' && (child.classList.contains('survey-figures-pair') || child.classList.contains('survey-callout-pair'))) {
      // Extract figures inside
      const figures = child.querySelectorAll('figure')
      for (const fig of figures) {
        const img = fig.querySelector('img')
        if (img) {
          const imageRef = await uploadImage(img.getAttribute('src'))
          if (imageRef) {
            const figcaption = fig.querySelector('figcaption')
            blocks.push({
              _type: 'figure',
              _key: makeKey(),
              image: imageRef,
              alt: img.getAttribute('alt') || '',
              caption: figcaption ? figcaption.textContent.trim() : undefined,
              layout: 'full',
            })
          }
        }
      }
      // Extract text content from callouts
      const callouts = child.querySelectorAll('.survey-callout')
      for (const callout of callouts) {
        const stat = callout.querySelector('.survey-callout-stat')
        const body = callout.querySelector('.survey-callout-body')
        const sub = callout.querySelector('.survey-callout-sub')
        const quote = callout.querySelector('.survey-quote')

        if (stat) {
          const block = makeBlock(stat, 'lead')
          if (block) blocks.push(block)
        }
        if (body) {
          const block = makeBlock(body)
          if (block) blocks.push(block)
        }
        if (sub) {
          const block = makeBlock(sub)
          if (block) blocks.push(block)
        }
        if (quote) {
          blocks.push({
            _type: 'pullQuote',
            _key: makeKey(),
            text: quote.textContent.trim(),
          })
        }
        // Images inside callouts
        const calloutFigs = callout.querySelectorAll('figure')
        for (const fig of calloutFigs) {
          const img = fig.querySelector('img')
          if (img) {
            const imageRef = await uploadImage(img.getAttribute('src'))
            if (imageRef) {
              const figcaption = fig.querySelector('figcaption')
              blocks.push({
                _type: 'figure',
                _key: makeKey(),
                image: imageRef,
                alt: img.getAttribute('alt') || '',
                caption: figcaption ? figcaption.textContent.trim() : undefined,
                layout: 'full',
              })
            }
          }
        }
      }
      continue
    }

    // Survey quotes pair
    if (tag === 'div' && child.classList.contains('survey-quotes-pair')) {
      const quotes = child.querySelectorAll('blockquote')
      for (const q of quotes) {
        blocks.push({
          _type: 'pullQuote',
          _key: makeKey(),
          text: q.textContent.trim(),
        })
      }
      continue
    }

    // Blockquote / pull quote
    if (tag === 'blockquote') {
      blocks.push({
        _type: 'pullQuote',
        _key: makeKey(),
        text: child.textContent.trim(),
      })
      continue
    }

    // Heading h3
    if (tag === 'h3') {
      const block = makeBlock(child, 'h3')
      if (block) blocks.push(block)
      continue
    }

    // Paragraph
    if (tag === 'p') {
      // Check if this is a "highlighted-text" subheading (entire <p> is a single <b class="highlighted-text">)
      const firstChild = child.firstElementChild
      const isHighlightedHeading =
        firstChild &&
        firstChild.tagName.toLowerCase() === 'b' &&
        firstChild.classList.contains('highlighted-text') &&
        child.childNodes.length === 1

      const block = makeBlock(child, isHighlightedHeading ? 'h3' : 'normal')
      if (block) blocks.push(block)
      continue
    }

    // Unordered list
    if (tag === 'ul') {
      const items = child.querySelectorAll('li')
      for (const li of items) {
        const block = makeListItem(li)
        if (block) blocks.push(block)
      }
      continue
    }

    // Survey figure (standalone, not in a pair wrapper)
    if (tag === 'figure' && child.classList.contains('survey-figure')) {
      const img = child.querySelector('img')
      if (img) {
        const imageRef = await uploadImage(img.getAttribute('src'))
        if (imageRef) {
          const figcaption = child.querySelector('figcaption')
          blocks.push({
            _type: 'figure',
            _key: makeKey(),
            image: imageRef,
            alt: img.getAttribute('alt') || '',
            caption: figcaption ? figcaption.textContent.trim() : undefined,
            layout: 'full',
          })
        }
      }
      continue
    }

    // Fallback: any div with text content we haven't handled
    if (tag === 'div') {
      // Recurse into divs that contain p, h3, etc.
      const innerBlocks = await bodyToPortableText(child)
      blocks.push(...innerBlocks)
      continue
    }
  }

  return blocks
}

// ── Extract one case study ──
async function extractCaseStudy(headerEl, index) {
  const {miniPreview, indexItem} = findCaseStudyParts(headerEl)
  if (!indexItem) {
    console.warn(`  ⚠ No index-item found for header #${index}`)
    return null
  }

  const title = headerEl.textContent.trim()
  const filterCategory = headerEl.getAttribute('data-tag') || ''

  // Meta fields
  const meta = indexItem.querySelector('.index-item-meta')
  const headline = meta?.querySelector('.meta-headline')?.innerHTML
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .trim() || ''
  const categoryRaw = meta?.querySelector('.meta-client')?.textContent?.trim() || ''
  const standfirst = meta?.querySelector('.meta-intro')?.textContent?.trim() || ''
  const tagEls = meta?.querySelectorAll('.meta-tag') || []
  const tags = Array.from(tagEls).map((t) => t.textContent.trim())
  const kicker = meta?.querySelector('.meta-kicker')?.textContent?.trim() || ''
  const role = meta?.querySelector('.meta-role')?.textContent?.trim() || ''
  const yearText = meta?.querySelector('.meta-year')?.textContent?.trim() || ''

  // Split category eyebrow: "Lightbox Gallery — 2025" → category + year
  // But year field is already in .meta-year, so category = the full eyebrow text
  const category = categoryRaw

  // Hero image (first cs-figure--lead)
  const textDiv = indexItem.querySelector('.index-item-text')
  const leadFigure = textDiv?.querySelector('.cs-figure--lead img')
  const heroSrc = leadFigure?.getAttribute('src')
  const heroAlt = leadFigure?.getAttribute('alt') || title
  const heroImage = heroSrc ? await uploadImage(heroSrc) : null

  // Body
  const body = textDiv ? await bodyToPortableText(textDiv) : []

  const slug = slugify(title)

  const document = {
    _type: 'caseStudy',
    title,
    slug: {_type: 'slug', current: slug},
    headline,
    category,
    year: yearText,
    standfirst,
    tags,
    kicker,
    role,
    filterCategory,
    featured: false,
    orderRank: index + 1,
    publishedAt: new Date().toISOString(),
    body,
  }

  if (heroImage) {
    document.heroImage = {
      ...heroImage,
      alt: heroAlt,
    }
  }

  return document
}

// ── Main ──
async function main() {
  const indices = ONLY_INDEX !== null ? [ONLY_INDEX] : headers.map((_, i) => i)

  for (const i of indices) {
    if (i >= headers.length) {
      console.error(`Index ${i} out of range (0–${headers.length - 1})`)
      continue
    }

    const title = headers[i].textContent.trim()
    console.log(`\n[${i}] ${title}`)

    const document = await extractCaseStudy(headers[i], i)
    if (!document) continue

    if (DRY_RUN) {
      console.log(`  → ${document.body.length} body blocks, slug: ${document.slug.current}`)
      console.log(`  → tags: [${document.tags.join(', ')}]`)
      console.log(`  → hero: ${document.heroImage ? 'yes' : 'no'}`)
      const figCount = document.body.filter((b) => b._type === 'figure').length
      const pairCount = document.body.filter((b) => b._type === 'figurePair').length
      const quoteCount = document.body.filter((b) => b._type === 'pullQuote').length
      console.log(`  → figures: ${figCount}, pairs: ${pairCount}, quotes: ${quoteCount}`)
    } else {
      const created = await client.create(document)
      console.log(`  ✓ Created ${created._id}`)
    }
  }

  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
