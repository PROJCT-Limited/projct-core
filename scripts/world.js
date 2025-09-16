// Layout controls
let LAYOUT = 'top'; // 'top' | 'left' | 'bottom'
let sideBarW = 0; // width of the left panel when LAYOUT==='left'


function computeTopBar() {
  if (isMobileViewport()) {
  // Mobile: put panel at BOTTOM
  LAYOUT = 'bottom';
  topBarH = constrain(round(windowHeight * UI.topBarRatio), UI.topBarMin, UI.topBarMax);
  sideBarW = 0;
  } else {
  // Desktop: move panel to the LEFT
  LAYOUT = 'left';
  // Tunable: how wide the left bar should be
  sideBarW = constrain(round(windowWidth * 0.28), 260, 420);
  topBarH = 0;
  }
  }

  function computeTransform() {
    let availW, availH;
    if (LAYOUT === 'top') {
    availW = windowWidth;
    availH = Math.max(100, windowHeight - topBarH);
    } else {
    availW = Math.max(100, windowWidth - sideBarW);
    availH = windowHeight;
    }
    
    const sx = availW / baseWidth;
    const sy = availH / baseHeight;
    scaleFactor = Math.min(sx, sy);
    
    const worldW = baseWidth * scaleFactor;
    const worldH = baseHeight * scaleFactor;
    
    worldOffsetX = (LAYOUT === 'left' ? sideBarW : 0) + (availW - worldW) * 0.5;
    worldOffsetY = (LAYOUT === 'top' ? topBarH : 0) + (availH - worldH) * 0.5;
    }

    function screenToWorld(sx, sy) {
      const sc = (typeof scaleFactor === "number" ? scaleFactor : 1);
      const ox = (typeof worldOffsetX === "number" ? worldOffsetX : 0);
      const oy = (typeof worldOffsetY === "number" ? worldOffsetY : 0);
      return { x: (sx - ox) / sc, y: (sy - oy) / sc };
    }


    /* ====== PANEL/HEADER AWARE BOUNDS (SCREEN & WORLD) ====== */

// Optional knobs
const NODE_EDGE_PAD_SCR = (UI?.nodeEdgePad ?? 12);        // screen px padding from edges
const MOBILE_PANEL_RATIO = (UI?.mobilePanelRatio ?? 0.48); // must match ui_topbar.js

// Read the DOM header height (same selectors as ui_topbar)
function __measureHeaderHeight() {
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

// Compute the blue panel rectangle in SCREEN pixels
function getPanelRectScreen() {
  const W = width, H = height;
  const layout = (typeof LAYOUT === "string" ? LAYOUT : "left");
  if (layout === "left") {
    const w = (typeof sideBarW === "number" ? sideBarW : 0);
    return { x: 0, y: 0, w, h: H };
  }
  if (layout === "top") {
    const h = (typeof topBarH === "number" ? topBarH : 0);
    return { x: 0, y: 0, w: W, h };
  }
  if (layout === "bottom") {
    const h = Math.round(H * MOBILE_PANEL_RATIO);
    return { x: 0, y: H - h, w: W, h };
  }
  return { x: 0, y: 0, w: 0, h: 0 };
}

// Compute the playable SCREEN rect (where nodes are allowed)
function getPlayableScreenRect() {
  const W = width, H = height;
  const layout = (typeof LAYOUT === "string" ? LAYOUT : "left");
  const panel = getPanelRectScreen();

  // Header height (top overlay). In your ui_topbar, header offset applies for left/top; we can apply it globally.
  const headerH = (typeof window.getHeaderHeight === "function")
    ? window.getHeaderHeight()
    : __measureHeaderHeight();

  if (layout === "left") {
    return { x: panel.w, y: headerH, w: W - panel.w, h: H - headerH };
  }
  if (layout === "top") {
    const topClear = Math.max(panel.h, headerH);
    return { x: 0, y: topClear, w: W, h: H - topClear };
  }
  if (layout === "bottom") {
    const bottomH = panel.h;
    return { x: 0, y: headerH, w: W, h: H - headerH - bottomH };
  }
  // fallback: whole canvas minus header
  return { x: 0, y: headerH, w: W, h: H - headerH };
}

// Convert a SCREEN rect to a WORLD rect with current camera/scale
function screenRectToWorldRect(scr) {
  const sc = (typeof scaleFactor === "number" ? scaleFactor : 1);
  const ox = (typeof worldOffsetX === "number" ? worldOffsetX : 0);
  const oy = (typeof worldOffsetY === "number" ? worldOffsetY : 0);
  return {
    x: (scr.x - ox) / sc,
    y: (scr.y - oy) / sc,
    w: scr.w / sc,
    h: scr.h / sc
  };
}

// Get playable WORLD rect (for clamping node positions)
function getPlayableWorldRect() {
  const pad = NODE_EDGE_PAD_SCR;
  const playScr = getPlayableScreenRect();
  const padded = { x: playScr.x + pad, y: playScr.y + pad, w: Math.max(0, playScr.w - 2*pad), h: Math.max(0, playScr.h - 2*pad) };
  return screenRectToWorldRect(padded);
}

// Clamp a node to the playable rect (WORLD coords)
function clampNodeToPlayableRect(n) {
  if (!n) return;
  const R = getPlayableWorldRect();
  // If your nodes have a radius in *world*, keep them inside by radius:
  const r = (n.baseR || n.r || UI?.rNode || 16);
  const minX = R.x + r, maxX = R.x + R.w - r;
  const minY = R.y + r+10, maxY = R.y + R.h - r-10;

  const nx = Math.max(minX, Math.min(maxX, n.x));
  const ny = Math.max(minY, Math.min(maxY, n.y));

  if (nx !== n.x) { n.x = nx; n.vx = 0; }
  if (ny !== n.y) { n.y = ny; n.vy = 0; }
}

// Clamp an arbitrary WORLD point to the playable rect (useful in drag)
function clampPointWorld(xw, yw, rWorld = 0) {
  const R = getPlayableWorldRect();
  const minX = R.x + rWorld, maxX = R.x + R.w - rWorld;
  const minY = R.y + rWorld, maxY = R.y + R.h - rWorld;
  return { x: Math.max(minX, Math.min(maxX, xw)), y: Math.max(minY, Math.min(maxY, yw)) };
}



// // spacing knobs for mobile (bottom layout)
// function applyMobileSpacing() {
//   if (typeof UI !== "object" || typeof LAYOUT !== "string") return;
//   if (LAYOUT !== "bottom") return;

//   // Keep node size; just spread them out
//   UI.childRest    = Math.round((UI.childRest    || 140) * 1.95); // longer springs center↔child/related
//   UI.spawnRadius  = Math.round((UI.spawnRadius  || 180) * 1.20); // initial ring farther out
//   UI.repulsionMul = (UI.repulsionMul || 1) * 1.25;               // a bit more push between nodes
//   UI.crossRestMul = 1.15;                                        // long-ish cross-links too
// }
