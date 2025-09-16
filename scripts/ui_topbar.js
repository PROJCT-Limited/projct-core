/* ui_topbar.js — styled info panel (desktop: left, mobile: bottom)
   Fully null-safe (does not read UI.* or COLORS.* directly) and avoids color() at load time. */



   (function () {
    // ----- SAFE LOCAL SETTINGS (do not depend on global UI/COLORS) -----
    const G = (typeof window !== "undefined") ? window : {};
    const inputUI  = (G && G.UI      && typeof G.UI      === "object") ? G.UI      : null;
    const inputCOL = (G && G.COLORS  && typeof G.COLORS  === "object") ? G.COLORS  : null;
  
    // Copy values to locals; NEVER access UI.* or COLORS.* later
    const THEME = {
      blue:  Array.isArray(inputCOL?.blue) ? inputCOL.blue : [18, 79, 199],
      white: Array.isArray(inputCOL?.white)? inputCOL.white: [255],
      lime:  Array.isArray(inputCOL?.lime) ? inputCOL.lime : [206, 224, 0],
      line:  Array.isArray(inputCOL?.line) ? inputCOL.line : [255, 180],
    };
    const TYPE = {
      title: Number.isFinite(inputUI?.fontTitle) ? inputUI.fontTitle : 34,
      body:  Number.isFinite(inputUI?.fontBody)  ? inputUI.fontBody  : 16,
    };
  
    // Helpers
    const clamp    = (n, a, b) => Math.max(a, Math.min(b, n));
    const isBottom = () => (typeof LAYOUT !== "undefined" && LAYOUT === "bottom");
    const isLeft   = () => (typeof LAYOUT !== "undefined" && LAYOUT === "left");
    const setFill   = (rgb) => fill(...rgb);
    const setStroke = (rgb) => stroke(...rgb);
    const rrect = (x, y, w, h, r) => rect(x, y, w, h, r, r, r, r);
  
    function drawPill(x, y, label, h, padX) {
      textSize(h * 0.45);
      const tw = textWidth(label);
      const w  = tw + padX * 2;
      noStroke(); setFill(THEME.lime);
      rrect(x, y, w, h, h / 2);
      setFill(THEME.blue);
      textAlign(CENTER, CENTER);
      text(label, x + w / 2, y + h / 2 + 1);
      return w;
    }
  
    function drawRule(x, y, w) { setStroke(THEME.line); strokeWeight(1); line(x, y, x + w, y); noStroke(); }
    function drawKVRow(x, y, w, key, value, rowH) {
      textSize(14);
      textAlign(LEFT,  CENTER); setFill(THEME.white); text(key,  x,      y + rowH / 2);
      textAlign(RIGHT, CENTER);                       text(value || "—", x + w, y + rowH / 2);
    }
  
    const currentNode = () =>
      (typeof hoveredNode !== "undefined" && hoveredNode) ||
      (typeof activeNode   !== "undefined" && activeNode) || null;
  
    function nodeText(n) {
      const title = n?.title || n?.label || "PROJECT NAME";
      const desc  = n?.info?.desc || "Although fluid, we focus much energy on product, innovation, and growth with our ecosystem of clients, investors, founders.";
      const year  = n?.info?.year || "2025";
      const cat   = n?.info?.category || "PROJECT";
      const type  = n?.info?.type || "ONE";
      const tags  = (n?.tags && n.tags.length) ? n.tags : ["TAG 1", "TAG 2", "TAG 3"];
      return { title, desc, year, cat, type, tags };
    }
    const nodeImage = (n) => (n?.image || n?.img || n?.info?.image || null);
  
    function metrics(usableW) {
      const outerPad  = clamp(Math.round(usableW * 0.035), 16, 28);
      const titleY    = outerPad + 10;
      const tagGap    = clamp(Math.round(usableW * 0.018), 8, 16);
      const tagH      = clamp(Math.round(usableW * 0.072), 18, 40);
      const imageW    = clamp(Math.round(usableW * 0.55), 240, 460);
      const imageH    = Math.round(imageW * 0.66); // ~3:2
      const bodyGap   = clamp(Math.round(usableW * 0.04), 18, 32);
      const ruleGap   = clamp(Math.round(usableW * 0.045), 18, 28);
      const rowH      = clamp(Math.round(usableW * 0.055), 16, 24);
      const titleSize = clamp(Math.round(usableW * 0.065), 24, 40);
      const bodySize  = clamp(Math.round(usableW * 0.045), 14, 20);
      return { outerPad, titleY, tagGap, tagH, imageW, imageH, bodyGap, ruleGap, rowH, titleSize, bodySize };
    }
 
    function useRegularFont() { if (typeof acuminRegular !== 'undefined' && acuminRegular) textFont(acuminRegular); }
    function useLightFont()  { if (typeof acuminLight   !== 'undefined' && acuminLight)   textFont(acuminLight); }
    
// ~48% of the screen height for the mobile bottom panel (can be tuned via UI.mobilePanelRatio)
const MOBILE_RATIO_DEFAULT = 0.48;

// Mobile metrics (smaller paddings; image sized to a right column)
function metricsMobile(usableW, usableH) {
  const outerPad  = 12;
  const titleY    = outerPad + 6;
  const tagGap    = Math.max(6, Math.round(usableW * 0.01));
  const tagH      = Math.max(16, Math.round(usableW * 0.05));
  const imageW    = Math.min(Math.round(usableW * 0.40), 180);
  const imageH    = Math.round(imageW * 0.86); // ~3:2
  const bodyGap   = 40;
  const ruleGap   = 80;
  const rowH      = Math.max(14, Math.round(usableW * 0.04));
  const titleSize = Math.max(20, Math.round(usableW * 0.05));
  const bodySize  = Math.max(13, Math.round(usableW * 0.025));
  const colGap    = 5;  // gap between body and image columns
  const gapAfterTags = 5;
  return { outerPad, titleY, tagGap, tagH, imageW, imageH, bodyGap, ruleGap, rowH, titleSize, bodySize, colGap, gapAfterTags };
}

// Draw tag pills in multiple rows using your drawPill()
function layoutTagPillsWrapped(tags, startX, startY, maxW, tagH, gapX, gapY, padX) {
  let x = startX, y = startY, rows = 0;
  for (let i = 0; i < (tags?.length || 0); i++) {
    const label = String(tags[i]).toUpperCase();
    textSize(tagH * 0.0001);
    const pillW = textWidth(label) + padX * 2;

    if (rows === 0) rows = 1;
    if (x + pillW > startX + maxW) { // wrap
      rows++;
      x = startX;
      y += tagH + gapY;
    }
    const used = drawPill(x, y, label, tagH, padX);
    x += used + gapX;
  }
  return { rows, nextY: rows ? (y + tagH) : startY };
}

// Measure wrapped text using current textFont/textSize settings.
function measureWrappedHeight(txt, maxW, fontSize, leadingMul = 1.15) {
  if (!txt) return { lines: 0, lineH: Math.round(fontSize * leadingMul), height: 0 };
  textSize(fontSize);
  const words = String(txt).split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (textWidth(test) <= maxW) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      if (textWidth(w) > maxW) { // hard-wrap very long words
        let chunk = "";
        for (const ch of w) {
          const t2 = chunk + ch;
          if (textWidth(t2) <= maxW) chunk = t2;
          else { lines.push(chunk); chunk = ch; }
        }
        cur = chunk;
      } else {
        cur = w;
      }
    }
  }
  if (cur) lines.push(cur);
  const lineH = Math.round(fontSize * leadingMul);
  return { lines: lines.length, lineH, height: lines.length * lineH };
}


    // -------- MAIN DRAW (always defined) --------
    window.drawTopBar = function drawTopBar() {
      // Original panel bounds supplied by world.js
// ----- PANEL BOUNDS -----
const isMobileBottom = (LAYOUT === 'bottom');

// Use full width and ~half height on mobile bottom; keep your old calc on desktop/left
let panelW, panelH, margin, headerOffset = 0;

if (isMobileBottom) {
  panelW = width;
  panelH = Math.round(height * (G.UI?.mobilePanelRatio || MOBILE_RATIO_DEFAULT));
  margin = 0;                // no margins from edges
  headerOffset = 0;          // ignore DOM header on mobile bottom
} else {
  panelW = (typeof sideBarW !== 'undefined' && LAYOUT === 'left') ? sideBarW : width + 70;
  panelH = (LAYOUT === 'left') ? height : topBarH;
  margin = 24;

  // Measure DOM header (your previous logic)
  function __measureHeader() {
    try {
      const sels = ['header', '.header', '#header', '.site-header', '.topbar', '.navbar', '.app-header', '.nav'];
      let h = 0;
      for (const s of sels) {
        const el = document.querySelector(s);
        if (el) {
          const r = el.getBoundingClientRect();
          h = Math.max(h, (r && (r.height || (r.bottom - r.top))) || 0);
        }
      }
      return h;
    } catch (e) { return 0; }
  }
  const domHeaderH = (typeof window.getHeaderHeight === 'function') ? window.getHeaderHeight() : __measureHeader();
  const applyHeaderOffset = (LAYOUT === 'left' || LAYOUT === 'top');
  headerOffset = applyHeaderOffset ? domHeaderH : 0;
}

// Inner rect (blue area)
const innerW = isMobileBottom ? panelW : (panelW + 70 - margin);
const innerH = isMobileBottom ? panelH : (panelH - headerOffset - margin * 2);

// Screen origin
const originX = 0;
const originY = isMobileBottom ? (height - panelH) : 0;

push();
translate(originX, originY);

// Blue background flush to edges on mobile; with margins on desktop
noStroke();
setFill(THEME.blue);
rect(isMobileBottom ? 0 : margin, headerOffset + (isMobileBottom ? 0 : margin), innerW, innerH);

// Move drawing origin into the blue panel
translate(isMobileBottom ? 0 : margin, headerOffset + (isMobileBottom ? 0 : margin));


     // Metrics (desktop vs mobile)
const M = isMobileBottom ? metricsMobile(innerW, innerH) : metrics(innerW);
const {
  outerPad, titleY, tagGap, tagH, imageW, imageH, bodyGap, ruleGap, rowH, titleSize, bodySize
} = M;
const colGap       = M.colGap || 16;
const gapAfterTags = M.gapAfterTags ?? Math.max(12, Math.round((titleSize || TYPE.title) * 0.30));

const node = currentNode();
let title = "PROJECT NAME";
let desc  = "Although fluid, we focus much energy on product, innovation, and growth with our ecosystem of clients, investors, founders.";
let year  = "2025", cat = "PROJECT", type = "ONE";
let tags  = ["TAG 1", "TAG 2", "TAG 3"];
let img   = null;

if (node) {
  const t = nodeText(node);
  title = t.title; desc = t.desc; year = t.year; cat = t.cat; type = t.type; tags = t.tags;
  img = nodeImage(node);
}

// Content frame
const contentX = outerPad;
const contentW = innerW - outerPad * 2;

// Title (wrap-aware)
useLightFont();
textAlign(LEFT, TOP);
setFill(THEME.white);
const _titleSize = (titleSize || TYPE.title);
const titleStr   = `“${title.toUpperCase()}“`;

textSize(_titleSize);
const titleM = measureWrappedHeight(titleStr, contentW, _titleSize, 1.15);
textLeading(titleM.lineH);
text(titleStr, contentX, titleY, contentW, titleM.height + 2);

// Tags (wrap to rows)
useLightFont();
const tagStartY = titleY + titleM.height + gapAfterTags;
const padX = Math.max(14, Math.round(tagH * 0.6));
const gapX = tagGap;
const gapY = Math.round(tagH * 0.40);
const tagLayout = layoutTagPillsWrapped(tags, contentX, tagStartY, contentW, tagH, gapX, gapY, padX);

const contentTopY = tagLayout.nextY + Math.max(8, bodyGap);

// ---------- IMAGE + BODY (mobile: two columns; desktop: stack as before) ----------
let imageX, imageY, bodyX, bodyY, bodyW;

// MOBILE BOTTOM: two-column when feasible; else stack
if (isMobileBottom) {
  const rightImgW = imageW;
  const leftBodyW = contentW - rightImgW - colGap;

  if (leftBodyW >= 220) {
    // two columns
    bodyX = contentX;
    bodyY = contentTopY;
    bodyW = leftBodyW;

    imageX = contentX + leftBodyW + colGap;
    imageY = contentTopY;
  } else {
    // fallback: stack image then body
    imageX = contentX;
    imageY = contentTopY;

    bodyX = contentX;
    bodyY = imageY + imageH + Math.max(8, bodyGap);
    bodyW = contentW;
  }
} else {
  // DESKTOP/LEFT: keep your previous stacked flow (image first, then body)
  imageX = contentX;
  imageY = contentTopY+150;

  bodyX  = contentX;
  bodyY  = imageY + 50+imageH + Math.max(12, bodyGap);
  bodyW  = contentW;
}

// Draw image
if (img && typeof img === "object") {
  imageMode(CORNER);
  image(img, imageX, imageY, imageW, imageH);
} else {
  noFill(); setStroke(THEME.white); strokeWeight(2); rrect(imageX, imageY, imageW, imageH, 6); noStroke();
}

// Body (wrap-aware)
useLightFont();
const _bodySize = (bodySize || TYPE.body);
textSize(_bodySize);
const bodyM = measureWrappedHeight(desc, bodyW, _bodySize, 1.25);
textAlign(LEFT);
textLeading(bodyM.lineH);
setFill(THEME.white);
text(desc, bodyX, bodyY, bodyW);

// Meta block — sits under whichever (image or body) ends lower
const contentBottom = Math.max(imageY + imageH, bodyY + bodyM.height);
const blockTop = contentBottom + Math.max(10, ruleGap);
const blockH   = rowH * 3 + 18;
const blockY   = Math.min(blockTop, innerH - blockH - outerPad);

useRegularFont();
drawRule(contentX, blockY, contentW);
drawKVRow(contentX, blockY + 4,              contentW, "YEAR",     year, rowH);

drawRule(contentX, blockY + rowH + 6,        contentW);
drawKVRow(contentX, blockY + rowH + 9,       contentW, "CATEGORY", cat,  rowH);

drawRule(contentX, blockY + rowH * 2 + 12,   contentW);
drawKVRow(contentX, blockY + rowH * 2 + 15,  contentW, "TYPE",     type, rowH);
drawRule(contentX, blockY + rowH * 2 + 40,   contentW);

pop();

    };
  })();
  

  // --- word-wrap measurer (uses current textFont/textSize) ---
function measureWrappedHeight(txt, maxW, fontSize, leadingMul = 1.25) {
  if (!txt) return { lines: 0, lineH: Math.round(fontSize * leadingMul), height: 0 };
  textSize(fontSize);
  const words = String(txt).split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (textWidth(test) <= maxW) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      // if a single word is wider than maxW, hard-wrap by characters
      if (textWidth(w) > maxW) {
        let chunk = "";
        for (const ch of w) {
          const t2 = chunk + ch;
          if (textWidth(t2) <= maxW) chunk = t2;
          else { lines.push(chunk); chunk = ch; }
        }
        cur = chunk;
      } else {
        cur = w;
      }
    }
  }
  if (cur) lines.push(cur);
  const lineH = Math.round(fontSize * leadingMul);
  return { lines: lines.length, lineH, height: lines.length * lineH };
}


