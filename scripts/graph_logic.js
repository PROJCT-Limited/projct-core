// graph_logic.js (near top)



// current camera offset in world space
worldOffsetX = 0;
worldOffsetY = 0;

// camera target we ease toward
let cam = {
  tx: worldOffsetX,
  ty: worldOffsetY,
  easing: 0.18 // 0..1 (higher = faster)
};

// === Normalization helpers (added) ===
const _canonTag = (typeof canonicalizeTag === "function")
  ? canonicalizeTag
  : (t => String(t || "").trim());

const _canonTags = (arr) => {
  const seen = new Set(); const out = [];
  (arr || []).forEach(t => { const k = _canonTag(t); if (k && !seen.has(k)) { seen.add(k); out.push(k); } });
  return out;
};


// Build a flat registry from config.js ONLY (projects + children), tags canonicalized
function buildTagRegistry() {
  const list = [];

  for (const p of (Array.isArray(PROJECTS) ? PROJECTS : [])) {
    list.push({
      kind: "project",
      title: p.title,
      tags: _canonTags(p.tags),
      info: p.info || { category: "Project" },
      parent: null
    });

    if (Array.isArray(p.children)) {
      for (const c of p.children) {
        list.push({
          kind: "child",
          title: c.title,
          tags: _canonTags(c.tags),
          info: c.info || { category: "Subnode" },
          parent: p.title
        });
      }
    }
  }

  return list;
}

const TAG_REGISTRY = buildTagRegistry();




function tagsIntersect(a, b) {
  const A = new Set(_canonTags(a));
  for (const t of _canonTags(b)) if (A.has(t)) return true;
  return false;
}



// Title → definitive node (merged tags/children) from config.js only
function buildNodeRegistry() {
  const reg = new Map();

  function upsert(def) {
    if (!def || !def.title) return;
    if (!reg.has(def.title)) {
      reg.set(def.title, {
        title: def.title,
        tags: _canonTags(def.tags),
        info: def.info || {},
        children: Array.isArray(def.children) ? def.children.slice() : []
      });
    } else {
      const cur = reg.get(def.title);
      const tagSet = new Set(cur.tags);
      _canonTags(def.tags).forEach(t => tagSet.add(t));
      cur.tags = Array.from(tagSet);
      if (Array.isArray(def.children)) {
        const have = new Set(cur.children.map(c => c.title));
        def.children.forEach(c => { if (!have.has(c.title)) cur.children.push(c); });
      }
      if (def.info) cur.info = { ...cur.info, ...def.info };
    }
  }

  for (const p of (Array.isArray(PROJECTS) ? PROJECTS : [])) {
    upsert(p);
    (p.children || []).forEach(upsert);
  }

  return reg;
}

const NODE_REGISTRY = buildNodeRegistry();



function getDirectRelatives(centerTitle) {
  const def = NODE_REGISTRY.get(centerTitle);
  if (!def) return { center: { title: centerTitle, tags: [], info: { category: "Node" } }, children: [] };
  const center = { title: def.title, tags: def.tags || [], info: def.info || { category: "Node" } };
  const children = Array.isArray(def.children) ? def.children.map(c => ({
    title: c.title, tags: c.tags || [], info: c.info || { category: "Subnode" }
  })) : [];
  return { center, children };
}


function getRelativesByTags(centerNode) {
  const centerTags = _canonTags(centerNode.tags);
  const parents = [];
  const children = [];

  // Parents: all projects sharing at least one tag
  for (const p of PROJECTS) {
    const pt = _canonTags(p.tags);
    if (tagsIntersect(centerTags, pt)) {
      parents.push({ title: p.title, tags: pt, info: p.info || { category: "Project" }, parent: null });
    }
  }

  // Children: prefer definitional children from NODE_REGISTRY
  const def = NODE_REGISTRY.get(centerNode.title);
  if (def && Array.isArray(def.children)) {
    def.children.forEach(c => {
      children.push({ title: c.title, tags: _canonTags(c.tags), info: c.info || { category: "Subnode" } });
    });
  } else {
    // Otherwise, include other defined nodes by tag match (excluding parents & center)
    const parentTitles = new Set(parents.map(p => p.title));
    for (const n of TAG_REGISTRY) {
      if ((n.title || "") === centerNode.title) continue;
      if (parentTitles.has(n.title)) continue;
      const nt = _canonTags(n.tags);
      if (tagsIntersect(centerTags, nt)) {
        children.push({ title: n.title, tags: nt, info: n.info || { category: n.kind === 'project' ? 'Project' : 'Subnode' } });
      }
    }
  }

  const MAX_CHILDREN = 18;
  return { parents, children: children.slice(0, MAX_CHILDREN) };
}




// Choose best project (prefer AND; fallback to best OR)
// Prefer AND match (all selected tags). Fallback to best OR overlap.
function pickBestProject(selectedTags) {
  const sel = new Set(_canonTags(selectedTags));
  if (sel.size === 0) return null;

  // Strict AND
  let candidates = PROJECTS.filter(p => {
    const ptags = new Set(_canonTags(p.tags));
    for (const t of sel) if (!ptags.has(t)) return false;
    return true;
  });

  if (candidates.length === 0) {
    candidates = PROJECTS
      .map(p => {
        const ptags = new Set(_canonTags(p.tags));
        let overlap = 0; for (const t of sel) if (ptags.has(t)) overlap++;
        return { p, overlap };
      })
      .filter(x => x.overlap > 0)
      .sort((a, b) => (b.overlap - a.overlap) || a.p.title.localeCompare(b.p.title))
      .map(x => x.p);
  }
  return candidates[0] || null;
}


  // Build an expanded subgraph for a focus node:
// - center node
// - its explicit .children (from PROJECTS dataset)
// - plus "related" nodes that share at least one tag with the focus or its children.
// Build an expanded subgraph using only config.js
function buildExpandedForFocus(focusInput) {
  // accept a title string, GraphNode, or project object
  let title = null;
  if (typeof focusInput === "string") title = focusInput;
  else if (focusInput && typeof focusInput.title === "string") title = focusInput.title;

  const byTitle = new Map(PROJECTS.map(p => [p.title, p]));
  const focus = byTitle.get(title);
  if (!focus) return { center: null, children: [], related: [] };

  const tagPool = new Set(_canonTags(focus.tags));

  const explicitChildren = (focus.children || []).map(c => ({
    title: c.title,
    tags: _canonTags(c.tags),
    info: c.info || { category: "Subnode" }
  }));

  // include children tags
  for (const c of explicitChildren) for (const t of (c.tags || [])) tagPool.add(t);

  // related = other projects sharing a tag in the pool (exclude focus)
  const related = [];
  for (const p of PROJECTS) {
    if (p.title === focus.title) continue;
    const pt = _canonTags(p.tags);
    if ([...pt].some(t => tagPool.has(t))) {
      related.push({ title: p.title, tags: pt, info: p.info || { category: "Project" } });
    }
  }

  // De-dupe related by title
  const relSeen = new Set();
  const relatedUnique = [];
  for (const r of related) {
    if (!relSeen.has(r.title)) { relSeen.add(r.title); relatedUnique.push(r); }
  }

  return { center: focus, children: explicitChildren, related: relatedUnique };
}



// Recenter and enlarge the given node, rebuild nodes/links around it.
function focusNodeGraph(targetNode) {
  if (!targetNode || !targetNode.title) return;

  // Recompute subgraph content
  const sub = buildExpandedForFocus(targetNode.title);

  // Rebuild nodes/links array
  nodes = [];
  links = [];

  // Center node

  centerNode = new GraphNode(sub.center?.title || targetNode.title,
                             baseWidth/2, baseHeight/2,
                             (sub.center?.tags || targetNode.tags || []),
                             true, false,
                             sub.center?.info || targetNode.info || { category: "Project" });
  centerNode.fixed = true;
  nodes.push(centerNode);
  activeNode = centerNode;

  // Place children + related around
  const payload = [...sub.children, ...sub.related];
  const N = payload.length;
  const off = random(TWO_PI);

  for (let i = 0; i < N; i++) {
    const a = off + (TWO_PI * i) / Math.max(1, N);
    const r = new GraphNode(payload[i].title,
                            centerNode.x + cos(a) * UI.spawnRadius,
                            centerNode.y + sin(a) * UI.spawnRadius,
                            payload[i].tags,
                            false, true,
                            payload[i].info || { category: "Node" });
    r.spawned = true;
    r.spawnT = 0;
    nodes.push(r);
    links.push(new GraphLink(centerNode, r));
  }

  // Extra links between children if they share a tag
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      if (a === centerNode || b === centerNode) continue;
      if (a.sharesTagWith(b)) {
        const L = new GraphLink(a, b);
        L.restLength = UI.childRest;
        L.strength   = 0.018;
        links.push(L);
      }
    }
  }
}



  
  // Build clear, predictable children for the chosen project
  // function buildChildrenForProject(project, selectedTags) {
  //   const kids = [];
  
  //   if (project.children && project.children.length) {
  //     for (const c of project.children) kids.push({ title: c.title, tags: c.tags || [], category: "Child" });
  //   }
  
  //   for (const t of project.tags) {
  //     if (!selectedTags.includes(t)) kids.push({ title: `Tag: ${t}`, tags: [t], category: "Tag" });
  //   }
  
  //   kids.push({ title: "Context",     tags: ["Context"], category: "Info", desc: "High-level context about this project." });
  //   kids.push({ title: "Description", tags: ["Purpose"], category: "Info", desc: project.info?.desc || "Project overview." });
  //   kids.push({ title: "Tools",       tags: ["Process"], category: "Info", desc: project.info?.tools || "Methods & tools used." });
  
  //   return kids;
  // }
  
  // Build graph from current selection
  function launchGraphFromSelection() {
    // Flip mode/UI FIRST so draw() shows the panel no matter what
    mode = "graph";
    showBluePanel = true;
    entryCircleFading = true;
  
    // Safe defaults
    const maxSel = UI?.maxSelected ?? 3;
    const startX = (playCircle && Number.isFinite(playCircle.x)) ? playCircle.x : baseWidth * 0.5;
    const startY = (playCircle && Number.isFinite(playCircle.y)) ? playCircle.y : baseHeight * 0.5;
    const ringR  = UI?.spawnRadius ?? 140;
  
    // Build a flat list of tags from the selection
    const selTags = [];
    if (Array.isArray(selected)) {
      for (const s of selected) {
        if (!s) continue;
        if (Array.isArray(s.tags)) selTags.push(...s.tags);
        else if (typeof s.label === "string") selTags.push(s.label);
      }
    }
  
    // Reset graph containers
    nodes = []; links = [];
    centerNode = null; activeNode = null;
  
    // Try to pick a focus item if a helper exists
    let focus = null;
    try { if (typeof pickBestProject === "function") focus = pickBestProject(selTags); } catch (e) {}
  
    // Create center node no matter what
    const centerTitle = (focus && (focus.title || focus.name)) || "Your selection";
    const centerInfo  = (focus && focus.info) || {};
    const centerTags  = (focus && Array.isArray(focus.tags)) ? focus.tags.slice() : selTags.slice();
  
    centerNode = new GraphNode(centerTitle, startX, startY, centerTags, true, false, centerInfo);
    nodes.push(centerNode);
    activeNode = centerNode;
  
    // Collect expansion payload
    let payload = [];
    try {
      if (typeof buildExpandedForFocus === "function") {
        const ex = buildExpandedForFocus(focus || centerNode, selTags) || {};
        if (Array.isArray(ex.children)) payload = payload.concat(ex.children);
        if (Array.isArray(ex.related))  payload = payload.concat(ex.related);
      } else if (focus && Array.isArray(focus.children)) {
        payload = payload.concat(focus.children);
      }
    } catch (e) {
      // fall back silently
    }
  
    // Absolute fallback: if nothing to expand, use the selected tags as children
    if (payload.length === 0 && selTags.length) {
      payload = selTags.map((t, i) => ({ title: String(t), tags: [t], info: { category: "Tag" }}));
    }
  
    // Spawn children in a ring around the circle
    const N   = payload.length;
    const off = Math.random() * Math.PI * 2;
    for (let i = 0; i < N; i++) {
      const p = payload[i] || {};
      const a = off + (i / Math.max(1, N)) * Math.PI * 2;
      const x = startX + Math.cos(a) * ringR;
      const y = startY + Math.sin(a) * ringR;
  
      const child = new GraphNode(
        p.title || p.name || `Node ${i + 1}`,
        x, y,
        Array.isArray(p.tags) ? p.tags.slice() : [],
        false, true,
        p.info || {}
      );
      child.spawned = true;
      child.spawnT  = 0;
  
      nodes.push(child);
      if (typeof GraphLink === "function") links.push(new GraphLink(centerNode, child));
    }
  
    // Nudge layout & camera if helpers exist
    try { if (typeof restartLayout === "function") restartLayout(); } catch(e){}
    try { if (typeof centerCameraOnNode === "function") centerCameraOnNode(centerNode, false); } catch(e){}
  }
  


  
  function refocusToByTags(clicked) {
    if (!clicked) return;
  
    const center = {
      title: clicked.title || clicked.label,
      tags: Array.isArray(clicked.tags) ? clicked.tags : [],
      info: clicked.info || { category: "Node" }
    };
  
    const { parents, children } = getRelativesByTags(center);
  
    // Keep set: center + all relatives (by title label only; titles are labels, tags drive relationships)
    const keep = new Set([center.title, ...parents.map(p => p.title), ...children.map(c => c.title)]);
  
    // Prune nodes
    nodes = nodes.filter(n => keep.has(n.title || n.label));
  
    // Prune links (GraphLink uses a/b in your code)
    links = links.filter(L => {
      const s = (L.a && (L.a.title || L.a.label)) || L.a;
      const t = (L.b && (L.b.title || L.b.label)) || L.b;
      return keep.has(s) && keep.has(t);
    });
  
    // Reuse clicked object as center if present; else create one at its current position
    let centerExisting = nodes.find(n => (n.title || n.label) === center.title);
    if (!centerExisting) {
      centerExisting = new GraphNode(center.title, clicked.x, clicked.y, center.tags || [], true, false, center.info);
      nodes.push(centerExisting);
    }
    centerNode = centerExisting;
    activeNode = centerExisting;
  
    // Map for quick lookup
    const byTitle = new Map(nodes.map(n => [n.title || n.label, n]));
  
    // Spawn parents around the center (inner ring)
    const Rpar = UI.spawnRadiusParent || (UI.spawnRadius ? UI.spawnRadius * 0.65 : 120);
    const offP = random(TWO_PI);
    for (let i = 0; i < parents.length; i++) {
      const p = parents[i];
      let par = byTitle.get(p.title);
      if (!par) {
        const a = offP + (TWO_PI * i) / Math.max(1, parents.length);
        par = new GraphNode(
          p.title,
          centerNode.x + Math.cos(a) * Rpar,
          centerNode.y + Math.sin(a) * Rpar,
          p.tags || [],
          false, true,
          p.info || { category: "Project" }
        );
        par.spawned = true; par.spawnT = 0;
        nodes.push(par);
        byTitle.set(p.title, par);
      }
      if (!links.some(L => (L.a === par && L.b === centerNode) || (L.a === centerNode && L.b === par))) {
        const Lnk = new GraphLink(par, centerNode);
        Lnk.restLength = (UI.childRest || 140) * 0.9;
        Lnk.strength   = 0.06;
        links.push(Lnk);
      }
    }
  
    // Spawn tag-related children (outer ring)
    const Rchild = UI.spawnRadius || 180;
    const offC   = random(TWO_PI);
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      let child = byTitle.get(c.title);
      if (!child) {
        const a = offC + (TWO_PI * i) / Math.max(1, children.length);
        child = new GraphNode(
          c.title,
          centerNode.x + Math.cos(a) * Rchild,
          centerNode.y + Math.sin(a) * Rchild,
          c.tags || [],
          false, true,
          c.info || { category: c.kind === "project" ? "Project" : "Subnode" }
        );
        child.spawned = true; child.spawnT = 0;
        nodes.push(child);
        byTitle.set(c.title, child);
      }
      if (!links.some(L => (L.a === centerNode && L.b === child) || (L.a === child && L.b === centerNode))) {
        const L2 = new GraphLink(centerNode, child);
        L2.restLength = UI.childRest || 140;
        L2.strength   = 0.06;
        links.push(L2);
      }
    }
  
    // Optional cross-links among non-center nodes by tag overlap
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        if (a === centerNode || b === centerNode) continue;
        if (a.sharesTagWith && a.sharesTagWith(b)) {
          if (!links.some(L => (L.a === a && L.b === b) || (L.a === b && L.b === a))) {
            const Lx = new GraphLink(a, b);
            Lx.restLength = (UI.childRest || 140) * 0.9;
            Lx.strength   = 0.018;
            links.push(Lx);
          }
        }
      }
    }
  
    // Smoothly center camera on the clicked node (accounts for blue panel offset)
    centerCameraOnNode(centerNode, false);
  }
  









function runGraph() {
  if (entryCircleFading && entryCircleAlpha > 0) {
    entryCircleAlpha = max(0, entryCircleAlpha - 18); // ~14 frames to disappear
  }
  // --- HOVER PICK (for the blue panel) ---
  hoveredNode = null;
  const hitR = Math.max(24, (UI.rNode || 19) * (scaleFactor || 1) * 1.25);
  let best = null, bestD = Infinity;
  for (const n of nodes) {
    const d = dist(pointer.worldX, pointer.worldY, n.x, n.y);
    if (d <= hitR && d < bestD) { best = n; bestD = d; }
  }
  hoveredNode = best;    // don't set active here

// --- PHYSICS ---
for (const n of nodes) n.resetForces();
for (const n of nodes) n.applyRepulsion(nodes);
for (const l of links) l.applyAttraction();
for (const n of nodes) n.updateInGraph();

// --- CAMERA EASING (do this every frame) ---
worldOffsetX = lerp(worldOffsetX, cam.tx, cam.easing);
worldOffsetY = lerp(worldOffsetY, cam.ty, cam.easing);

// --- DRAW ---
push();
translate(worldOffsetX, worldOffsetY);
scale(scaleFactor);
for (const l of links) l.display();
for (const n of nodes) n.display();
pop();

}





// Where is the *visible* graph center on screen, excluding the blue panel?
// Replace your current versions with these (they have no stray logs)

// Where is the *visible* graph center on screen, excluding the blue panel?
function graphScreenCenter() {
  const sW = (typeof baseWidth  !== "undefined") ? baseWidth  : width;
  const sH = (typeof baseHeight !== "undefined") ? baseHeight : height;

  // Blue panel sizes you already use
  const panelLeft = (typeof LAYOUT !== "undefined" && LAYOUT === "left") ? (sideBarW || 0) : 0;
  const panelTop  = (typeof LAYOUT !== "undefined" && LAYOUT === "top")  ? (topBarH || 0)  : 0;

  const availW = sW - panelLeft;
  const availH = sH - panelTop;

  const cx = panelLeft + availW / 2;
  const cy = panelTop  + availH / 2;
  return { cx, cy };
}

// Smooth camera to put a world point under the screen’s graph center
function centerCameraOnNode(n, instant = false) {
  const s = (scaleFactor || 1);
  const { cx, cy } = graphScreenCenter();
  const tx = (cx / s) - n.x;
  const ty = (cy / s) - n.y;

  if (instant) {
    worldOffsetX = tx; worldOffsetY = ty;
    cam.tx = tx; cam.ty = ty;
  } else {
    cam.tx = tx; cam.ty = ty; // eased each frame in runGraph()
  }
}


// === Header height (from the DOM) ===
window.getHeaderHeight = function() {
  try {
    const sels = ['header','.header','#header','.site-header','.topbar','.navbar','.app-header','.nav'];
    let h = 0;
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el) { const r = el.getBoundingClientRect(); h = Math.max(h, (r?.height || (r.bottom - r.top)) || 0); }
    }
    return h;
  } catch { return 0; }
};

// === White graph area (canvas minus header and blue panel) ===
window.getGraphViewport = function() {
  const leftW   = (typeof LAYOUT !== "undefined" && LAYOUT === "left")   ? (sideBarW||0) : 0;
  const topH    = (typeof LAYOUT !== "undefined" && LAYOUT === "top")    ? (topBarH||0)  : 0;
  const bottomH = (typeof LAYOUT !== "undefined" && LAYOUT === "bottom") ? (topBarH||0)  : 0;
  const headerH = window.getHeaderHeight ? window.getHeaderHeight() : 0;

  const W = (typeof width  === "number") ? width  : 0;
  const H = (typeof height === "number") ? height : 0;

  const x = leftW;
  const y = headerH + topH;
  const w = Math.max(0, W - leftW);
  const h = Math.max(0, H - headerH - (leftW ? 0 : (topH + bottomH)));
  return { x, y, w, h };
};
