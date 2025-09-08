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
      const titleY    = outerPad + 60;
      const tagGap    = clamp(Math.round(usableW * 0.018), 8, 16);
      const tagH      = clamp(Math.round(usableW * 0.072), 26, 44);
      const imageW    = clamp(Math.round(usableW * 0.55), 240, 460);
      const imageH    = Math.round(imageW * 0.66); // ~3:2
      const bodyGap   = clamp(Math.round(usableW * 0.04), 18, 32);
      const ruleGap   = clamp(Math.round(usableW * 0.045), 18, 28);
      const rowH      = clamp(Math.round(usableW * 0.055), 16, 24);
      const titleSize = clamp(Math.round(usableW * 0.055), 20, 40);
      const bodySize  = clamp(Math.round(usableW * 0.045), 14, 20);
      return { outerPad, titleY, tagGap, tagH, imageW, imageH, bodyGap, ruleGap, rowH, titleSize, bodySize };
    }
  
    // -------- MAIN DRAW (always defined) --------
    window.drawTopBar = function drawTopBar() {
      // Original panel bounds supplied by world.js
      const panelW = (typeof sideBarW !== 'undefined' && isLeft()) ? sideBarW : width;
      const panelH = isLeft() ? height : topBarH;
  
      // Margins we want: left + top + bottom (right stays flush)
      const margin  = 24;
      const innerW  = panelW - margin;      // subtract LEFT only → right is flush
      const innerH  = panelH - margin * 2;  // subtract TOP + BOTTOM
  
      // Screen origin
      const originX = 0;
      const originY = isBottom() ? height - panelH : 0;
  
      push();
      translate(originX, originY);
  
      // Draw the blue background inside margins
      noStroke();
      setFill(THEME.blue);
      rect(margin, margin, innerW, innerH);
  
      // Move local origin to the inside of the blue panel
      translate(margin, margin);
  
      // Use the inner width for all layout math so content fits
      const {
        outerPad, titleY, tagGap, tagH, imageW, imageH, bodyGap, ruleGap, rowH, titleSize, bodySize
      } = metrics(innerW);
  
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
  
      // Content frame inside inner rect
      const contentX = outerPad;
      const contentW = innerW - outerPad * 2;
  
      // Title
      textAlign(LEFT, TOP);
      setFill(THEME.white);
      textSize(titleSize|| TYPE.title);
      text(`“${title.toUpperCase()}“`, contentX, titleY, contentW, (titleSize || TYPE.title) * 2.2);
  
      // Tags
      let tagX = contentX;
      const tagY = titleY + (titleSize || TYPE.title) + 22;
      for (let i = 0; i < tags.length; i++) {
        const used = drawPill(tagX, tagY, tags[i].toUpperCase(), tagH, Math.max(14, Math.round(tagH * 0.6)));
        tagX += used + tagGap;
        if (tagX > contentX + contentW) break;
      }
  
      // Image
      const imgY = tagY + tagH + 28;
      if (img && typeof img === "object") {
        imageMode(CORNER); image(img, contentX, imgY, imageW, imageH);
      } else {
        noFill(); setStroke(THEME.white); strokeWeight(2); rrect(contentX, imgY, imageW, imageH, 6); noStroke();
      }
  
      // Body
      const bodyY = imgY + imageH + bodyGap*2;
      textSize(bodySize || TYPE.body);
      textAlign(LEFT);
      textLeading(Math.round((bodySize || TYPE.body) * 1.25));
      setFill(THEME.white);
      text(desc, contentX, bodyY, contentW);
  
      // Bottom meta block — measure against innerH (not panelH)
      const blockTop = bodyY + Math.max(Math.round((bodySize || TYPE.body) * 3.2), 72) + ruleGap;
      const blockH   = rowH * 3 + 18;
      const blockY   = Math.min(blockTop, innerH - blockH - outerPad);
  
      drawRule(contentX, blockY, contentW);
      drawKVRow(contentX, blockY + 6,  contentW, "YEAR",      year, rowH);
  
      drawRule(contentX, blockY + rowH + 6, contentW);
      drawKVRow(contentX, blockY + rowH + 12, contentW, "CATEGORY",  cat,  rowH);
  
      drawRule(contentX, blockY + rowH * 2 + 12, contentW);
      drawKVRow(contentX, blockY + rowH * 2 + 18, contentW, "TYPE",      type, rowH);
  
      pop();
    };
  })();
  