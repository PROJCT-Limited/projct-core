/**
 * Sanity CMS client for the PROJCT static site.
 *
 * Public path:  reads published content from CDN API. No token.
 * Presentation: when inside the Studio iframe, reads drafts with a
 *               Viewer (read-only) token + stega for click-to-edit.
 */
(function () {
  'use strict';

  var PROJECT_ID = 'onhood8r';
  var DATASET = 'production';
  var API_VERSION = '2025-06-01';
  var CDN_HOST = 'https://' + PROJECT_ID + '.apicdn.sanity.io';
  var IMAGE_CDN = 'https://cdn.sanity.io/images/' + PROJECT_ID + '/' + DATASET + '/';
  var STUDIO_URL = 'https://projct-website.sanity.studio';
  var PREVIEW_TOKEN = 'skQs9UbebVzo6Gc8O33egCn8UKTyCqtMl5MVWmQ4VjcUX054oxMCNI4cKdX5hFhoesVdviHKTrtYS7669TCB3OAPNTV6lwAnYmfIPmyvs4aA0ssS276RNxdLkDuHPERFNvFIXcPB7vCecNFKnTtyPmOeCVDO17VIe9WM0Bgv2rUp3OnzhRio';

  // ── Presentation mode: detect Studio iframe ──
  var IS_PREVIEW = window.parent !== window;

  if (IS_PREVIEW) {
    import('./sanity-visual-editing.bundle.js')
      .then(function (mod) {
        mod.enableVisualEditing();
      })
      .catch(function () {});
  }

  // ── GROQ fetch ──

  function groqFetchPublished(query, params) {
    var url = CDN_HOST + '/v' + API_VERSION + '/data/query/' + DATASET +
      '?query=' + encodeURIComponent(query);

    if (params) {
      Object.keys(params).forEach(function (key) {
        url += '&$' + key + '=' + encodeURIComponent(JSON.stringify(params[key]));
      });
    }

    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Sanity API error: ' + res.status);
        return res.json();
      })
      .then(function (data) { return data.result; });
  }

  var _previewClient = null;

  function getPreviewClient() {
    if (_previewClient) return Promise.resolve(_previewClient);
    return import('./sanity-live.bundle.js').then(function (mod) {
      _previewClient = mod.createClient({
        projectId: PROJECT_ID,
        dataset: DATASET,
        apiVersion: API_VERSION,
        useCdn: false,
        token: PREVIEW_TOKEN,
        stega: { enabled: true, studioUrl: STUDIO_URL },
      });
      return _previewClient;
    });
  }

  function groqFetchDrafts(query, params) {
    return getPreviewClient().then(function (client) {
      return client.fetch(query, params || {}, { perspective: 'drafts' });
    });
  }

  function groqFetch(query, params) {
    return IS_PREVIEW ? groqFetchDrafts(query, params) : groqFetchPublished(query, params);
  }

  // ── Image URL builder ──

  function imageRef(image) {
    if (!image || !image.asset || !image.asset._ref) return null;
    // _ref format: image-<id>-<WxH>-<ext>
    var parts = image.asset._ref.replace('image-', '').split('-');
    var id = parts[0];
    var dimensions = parts[1]; // e.g. "1962x2600"
    var ext = parts[2];
    return {
      id: id,
      width: parseInt(dimensions.split('x')[0], 10),
      height: parseInt(dimensions.split('x')[1], 10),
      ext: ext,
      path: id + '-' + dimensions + '.' + ext,
    };
  }

  function imageUrl(image, opts) {
    var ref = imageRef(image);
    if (!ref) return '';
    var params = [];
    if (opts.w) params.push('w=' + opts.w);
    if (opts.h) params.push('h=' + opts.h);
    params.push('fm=' + (opts.fm || 'webp'));
    params.push('q=' + (opts.q || 80));
    if (opts.fit) params.push('fit=' + opts.fit);
    return IMAGE_CDN + ref.path + (params.length ? '?' + params.join('&') : '');
  }

  function imageSrcset(image, widths) {
    return widths.map(function (w) {
      return imageUrl(image, {w: w}) + ' ' + w + 'w';
    }).join(', ');
  }

  // ── Portable Text → HTML ──

  function renderSpan(span, markDefs) {
    var text = escapeHtml(span.text || '');
    if (!span.marks || !span.marks.length) return text;

    span.marks.forEach(function (mark) {
      if (mark === 'strong') {
        text = '<b>' + text + '</b>';
      } else if (mark === 'em') {
        text = '<em>' + text + '</em>';
      } else if (mark === 'highlightedText') {
        text = '<b class="highlighted-text">' + text + '</b>';
      } else {
        // annotation mark — find in markDefs
        var def = markDefs.find(function (d) { return d._key === mark; });
        if (def && def._type === 'link') {
          var rel = def.blank ? ' target="_blank" rel="noopener noreferrer"' : '';
          text = '<a href="' + escapeAttr(def.href) + '"' + rel + '>' + text + '</a>';
        }
      }
    });
    return text;
  }

  function renderBlock(block) {
    if (block._type === 'block') {
      var html = (block.children || []).map(function (span) {
        return renderSpan(span, block.markDefs || []);
      }).join('');

      if (block.listItem === 'bullet') {
        return '<li>' + html + '</li>';
      }

      var tag = 'p';
      if (block.style === 'h2') tag = 'h2';
      else if (block.style === 'h3') tag = 'h3';
      else if (block.style === 'lead') tag = 'p';

      var cls = block.style === 'lead' ? ' class="lead"' : '';
      if (block.style === 'h3') cls = ' class="survey-section-head"';

      return '<' + tag + cls + '>' + html + '</' + tag + '>';
    }

    if (block._type === 'figure') {
      var src = imageUrl(block.image, {w: 1200});
      var srcsetStr = imageSrcset(block.image, [600, 900, 1200, 1800]);
      var alt = escapeAttr(block.alt || '');
      var captionHtml = block.caption
        ? '<figcaption class="survey-fig-label">' + escapeHtml(block.caption) + '</figcaption>'
        : '';
      return '<figure class="cs-figure">' +
        '<img loading="lazy" src="' + src + '" srcset="' + srcsetStr + '" sizes="(max-width: 768px) 100vw, 800px" alt="' + alt + '">' +
        captionHtml +
        '</figure>';
    }

    if (block._type === 'figurePair') {
      var leftSrc = imageUrl(block.imageLeft, {w: 900});
      var leftSrcset = imageSrcset(block.imageLeft, [400, 600, 900]);
      var rightSrc = imageUrl(block.imageRight, {w: 900});
      var rightSrcset = imageSrcset(block.imageRight, [400, 600, 900]);
      var leftAlt = escapeAttr((block.imageLeft && block.imageLeft.alt) || '');
      var rightAlt = escapeAttr((block.imageRight && block.imageRight.alt) || '');
      return '<figure class="cs-figure-pair">' +
        '<img loading="lazy" src="' + leftSrc + '" srcset="' + leftSrcset + '" sizes="(max-width: 768px) 100vw, 400px" alt="' + leftAlt + '">' +
        '<img loading="lazy" src="' + rightSrc + '" srcset="' + rightSrcset + '" sizes="(max-width: 768px) 100vw, 400px" alt="' + rightAlt + '">' +
        '</figure>';
    }

    if (block._type === 'pullQuote') {
      var attribution = block.attribution
        ? '<cite>' + escapeHtml(block.attribution) + '</cite>'
        : '';
      return '<blockquote class="survey-quote">' +
        escapeHtml(block.text || '') +
        attribution +
        '</blockquote>';
    }

    if (block._type === 'gallery') {
      var items = (block.items || []).map(function (item) {
        var s = imageUrl(item, {w: 600});
        var ss = imageSrcset(item, [300, 600, 900]);
        var a = escapeAttr(item.alt || '');
        return '<img loading="lazy" src="' + s + '" srcset="' + ss + '" sizes="300px" alt="' + a + '">';
      }).join('');
      return '<div class="cs-gallery">' + items + '</div>';
    }

    return '';
  }

  function renderBody(body) {
    if (!body || !body.length) return '';

    var html = '';
    var inList = false;

    body.forEach(function (block) {
      var isBullet = block._type === 'block' && block.listItem === 'bullet';

      if (isBullet && !inList) {
        html += '<ul>';
        inList = true;
      } else if (!isBullet && inList) {
        html += '</ul>';
        inList = false;
      }

      html += renderBlock(block);
    });

    if (inList) html += '</ul>';
    return html;
  }

  // ── Render case study into DOM ──

  function renderHeroImage(cs) {
    if (!cs.heroImage) return '';
    var src = imageUrl(cs.heroImage, {w: 1200});
    var srcsetStr = imageSrcset(cs.heroImage, [600, 900, 1200, 1800]);
    var alt = escapeAttr(cs.heroImage.alt || cs.title);
    return '<figure class="cs-figure cs-figure--lead">' +
      '<img loading="lazy" src="' + src + '" srcset="' + srcsetStr + '" sizes="(max-width: 768px) 100vw, 800px" alt="' + alt + '">' +
      '</figure>';
  }

  function renderRowImage(cs) {
    if (!cs.heroImage) return '';
    var src = imageUrl(cs.heroImage, {w: 600});
    var srcsetStr = imageSrcset(cs.heroImage, [300, 450, 600, 900]);
    var alt = escapeAttr(cs.heroImage.alt || cs.title);
    return '<span class="row-image">' +
      '<img loading="lazy" src="' + src + '" srcset="' + srcsetStr + '" sizes="(max-width: 600px) 160px, 260px" alt="' + alt + '">' +
      '</span>';
  }

  function renderCaseStudyListItem(cs) {
    var dataTag = escapeAttr(cs.filterCategory || '');
    var yearText = escapeHtml(cs.year || '');
    var tagsHtml = (cs.tags || []).map(function (t) {
      return '<span class="meta-tag">' + escapeHtml(t) + '</span>';
    }).join('');

    var headlineHtml = escapeHtml(cs.headline || '')
      .replace(/\n/g, '<br>');

    return '<hr>' +
      '<p class="list-projects1" data-tag="' + dataTag + '">' +
        '<span class="list-title"><span class="title-text">' + escapeHtml(cs.title) + '</span></span>' +
        renderRowImage(cs) +
        '<span class="list-year">' + yearText + '</span>' +
      '</p>' +
      '<div class="mini-preview is-hidden">' +
        '<div class="preview-content">' +
          '<p class="mini-preview-text">' + escapeHtml(cs.standfirst || '') + '</p>' +
          '<button class="read-more">Read More</button>' +
        '</div>' +
      '</div>' +
      '<div class="index-item is-hidden cs-feature">' +
        '<div class="index-item-meta">' +
          '<div class="meta-sticky">' +
            '<div class="meta-feature">' +
              '<h1 class="meta-headline">' + headlineHtml + '</h1>' +
              '<p class="meta-client">' + escapeHtml(cs.category || '') + '</p>' +
              '<p class="meta-intro">' + escapeHtml(cs.standfirst || '') + '</p>' +
              '<div class="meta-tags">' + tagsHtml + '</div>' +
            '</div>' +
            '<span class="meta-kicker">' + escapeHtml(cs.kicker || '') + '</span>' +
            '<p class="meta-role">' + escapeHtml(cs.role || '') + '</p>' +
            '<span class="meta-year">' + escapeHtml(cs.year || '') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="index-item-text">' +
          renderHeroImage(cs) +
          renderBody(cs.body) +
        '</div>' +
      '</div>';
  }

  // ── HTML helpers ──

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeAttr(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── GROQ queries ──

  var CASE_STUDIES_QUERY = [
    '*[_type == "caseStudy"] | order(orderRank asc) {',
    '  _id,',
    '  title,',
    '  slug,',
    '  headline,',
    '  category,',
    '  year,',
    '  standfirst,',
    '  tags,',
    '  kicker,',
    '  role,',
    '  collaborators,',
    '  heroImage,',
    '  filterCategory,',
    '  featured,',
    '  orderRank,',
    '  body',
    '}',
  ].join('\n');

  // ── Boot ──

  function renderCaseStudies(container, caseStudies) {
    var children = Array.from(container.children);
    children.forEach(function (child) {
      if (child.classList.contains('list-projects1') ||
          child.classList.contains('mini-preview') ||
          child.classList.contains('index-item') ||
          child.tagName === 'HR') {
        container.removeChild(child);
      }
    });

    var fragment = document.createDocumentFragment();
    var temp = document.createElement('div');

    caseStudies.forEach(function (cs) {
      temp.innerHTML = renderCaseStudyListItem(cs);
      while (temp.firstChild) {
        fragment.appendChild(temp.firstChild);
      }
    });

    container.appendChild(fragment);

    if (typeof window.wirePageToggles === 'function') window.wirePageToggles();
    if (typeof window.initReveal === 'function') window.initReveal();
    if (typeof window.applyNoImageMode === 'function') window.applyNoImageMode();
    document.dispatchEvent(new CustomEvent('sanity:loaded'));
  }

  function init() {
    var container = document.querySelector('.list-projects.editorial');
    if (!container) return;

    groqFetch(CASE_STUDIES_QUERY)
      .then(function (caseStudies) {
        if (!caseStudies || !caseStudies.length) {
          console.warn('[sanity] No case studies found');
          return;
        }

        renderCaseStudies(container, caseStudies);

        console.log('[sanity] Rendered ' + caseStudies.length + ' case studies');

        // In Presentation mode: listen for changes and re-render with drafts
        if (IS_PREVIEW) {
          getPreviewClient().then(function (client) {
            client.listen('*[_type == "caseStudy"]').subscribe(function () {
              client.fetch(CASE_STUDIES_QUERY, {}, { perspective: 'drafts' })
                .then(function (updated) {
                  if (updated && updated.length) {
                    renderCaseStudies(container, updated);
                  }
                });
            });
          });
        }
      })
      .catch(function (err) {
        console.error('[sanity] Fetch failed, keeping static content:', err);
      });
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for debugging
  window.sanityClient = {
    groqFetch: groqFetch,
    imageUrl: imageUrl,
    imageSrcset: imageSrcset,
    isPreview: IS_PREVIEW,
  };
})();
