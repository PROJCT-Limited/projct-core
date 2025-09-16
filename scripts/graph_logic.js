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


// Build once after PROJECTS is loaded
function buildTagRegistry() {
  const list = [];

  for (const p of PROJECTS) {
    list.push({
      kind: "project",
      title: p.title,
      tags: Array.isArray(p.tags) ? p.tags.slice() : [],
      info: p.info || { category: "Project" },
      parent: null
    });

    if (Array.isArray(p.children)) {
      for (const c of p.children) {
        list.push({
          kind: "child",
          title: c.title,
          tags: Array.isArray(c.tags) ? c.tags.slice() : [],
          info: (c.info || { category: "Subnode" }),
          parent: p.title
        });
      }
    }
  }
  return list;
}

const TAG_REGISTRY = buildTagRegistry();


function tagsIntersect(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  const set = new Set(a);
  for (const t of b) if (set.has(t)) return true;
  return false;
}



function buildNodeRegistry() {
  const reg = new Map();
  function upsert(def) {
    if (!def || !def.title) return;
    if (!reg.has(def.title)) {
      reg.set(def.title, {
        title: def.title,
        tags: Array.isArray(def.tags) ? def.tags.slice() : [],
        info: def.info || {},
        children: Array.isArray(def.children) ? def.children.slice() : []
      });
    } else {
      const cur = reg.get(def.title);
      const tagSet = new Set(cur.tags);
      for (const t of (def.tags || [])) tagSet.add(t);
      cur.tags = Array.from(tagSet);
      if (Array.isArray(def.children)) {
        const byTitle = new Map(cur.children.map(c => [c.title, c]));
        for (const c of def.children) if (!byTitle.has(c.title)) cur.children.push(c);
      }
      if (def.info) cur.info = { ...cur.info, ...def.info };
    }
  }
  for (const p of PROJECTS) {
    upsert(p);
    if (Array.isArray(p.children)) for (const c of p.children) upsert(c);
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
  const centerTags = Array.isArray(centerNode.tags) ? centerNode.tags : [];
  const parents = [];
  const children = [];

  // First: collect parents (projects) that match center tags
  for (const p of PROJECTS) {
    const projectTagsHit = tagsIntersect(centerTags, p.tags || []);
    const anyChildHit = Array.isArray(p.children) && p.children.some(c => tagsIntersect(centerTags, c.tags || []));
    if (projectTagsHit || anyChildHit) {
      // avoid considering the project as a "parent" if the center itself IS that project
      if (centerNode.title !== p.title) {
        parents.push({
          kind: "project",
          title: p.title,
          tags: p.tags || [],
          info: p.info || { category: "Project" },
          parent: null
        });
      }
    }
  }

  // Then: all other nodes that match by tags (excluding center + parents)
  const parentTitles = new Set(parents.map(p => p.title));
  for (const n of TAG_REGISTRY) {
    if (n.title === centerNode.title) continue;
    if (parentTitles.has(n.title)) continue;
    if (tagsIntersect(centerTags, n.tags || [])) {
      children.push({ ...n });
    }
  }

  // Optional: cap the size to avoid visual overload (tweak or remove)
  const MAX_CHILDREN = 5;
  return { parents, children: children.slice(0, MAX_CHILDREN) };
}



// Choose best project (prefer AND; fallback to best OR)
function pickBestProject(selectedTags) {
    const sel = new Set(selectedTags);
    if (sel.size === 0) return null;
  
    let candidates = PROJECTS.filter(p => [...sel].every(t => p.tags.includes(t)));
    if (candidates.length === 0) {
      candidates = PROJECTS
        .map(p => ({ p, overlap: p.tags.filter(t => sel.has(t)).length }))
        .filter(x => x.overlap > 0)
        .sort((a, b) => b.overlap - a.overlap)
        .map(x => x.p);
    }
    return candidates[0] || null;
  }

  // Build an expanded subgraph for a focus node:
// - center node
// - its explicit .children (from PROJECTS dataset)
// - plus "related" nodes that share at least one tag with the focus or its children.

// Build expanded subgraph for a focused project:
// - center (the focus project)
// - explicit children from the dataset
// - "related" projects sharing enough tags with the focus/children pool
function buildExpandedForFocus(focusTitle) {
  const byTitle = new Map(PROJECTS.map(p => [p.title, p]));
  const focus = byTitle.get(focusTitle);
  if (!focus) return { center: null, children: [], related: [] };

  // Build a tag pool from the focus + its explicit children
  const tagPool = new Set(focus.tags || []);
  const children = (focus.children || []).map(c => ({
    title: c.title,
    tags: Array.isArray(c.tags) ? c.tags.slice() : [],
    info: c.info || { category: "Subnode" }
  }));
  for (const c of children) for (const t of (c.tags || [])) tagPool.add(t);

  // ── Levers to control fan-out ────────────────────────────────────────────
  const MIN_SHARED = 2;        // require ≥ 2 shared tags to count as related
  const MAX_RELATED = 5;       // cap the number of related projects
  // ─────────────────────────────────────────────────────────────────────────

  // Score related projects by # of shared tags with the tagPool
  const relatedScored = [];
  for (const p of PROJECTS) {
    if (p.title === focus.title) continue;

    const tags = Array.isArray(p.tags) ? p.tags : [];
    let shared = 0;
    for (const t of tags) if (tagPool.has(t)) shared++;

    if (shared >= MIN_SHARED) {
      relatedScored.push({
        title: p.title,
        tags: tags.slice(),
        info: p.info || { category: "Project" },
        shared
      });
    }
  }

  // Sort by most shared tags first and cap
  relatedScored.sort((a, b) => b.shared - a.shared);
  const related = relatedScored.slice(0, MAX_RELATED).map(r => ({
    title: r.title,
    tags: r.tags,
    info: r.info
  }));

  // Strong de-duplication by title across all buckets
  const seen = new Set([focus.title]);
  const dedup = list => {
    const out = [];
    for (const n of list) {
      if (seen.has(n.title)) continue;
      seen.add(n.title);
      out.push(n);
    }
    return out;
  };

  return {
    center: {
      title: focus.title,
      tags: (focus.tags || []).slice(),
      info: focus.info || { category: "Project" }
    },
    children: dedup(children),
    related: dedup(related)
  };
}


// Recenter and enlarge the given node, rebuild nodes/links around it.
function focusNodeGraph(targetNode) {
  if (typeof applyMobileSpacing === "function") applyMobileSpacing();
  if (!targetNode || !targetNode.title) return;

  // Recompute subgraph content
  const sub = buildExpandedForFocus(targetNode.title);

  // Rebuild nodes/links array
  nodes = [];
  links = [];
  centerNode = null;
activeNode = null;

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
        if (LAYOUT === "bottom") enforceMinOrbit(centerNode, nodes);
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
    if (typeof applyMobileSpacing === "function") applyMobileSpacing();
    mode = "graph";
  
    const selectedTags = [];
    for (const s of selected) s.tags.forEach(t => selectedTags.push(t));
  
    const chosen = pickBestProject(selectedTags);
    nodes = []; links = [];centerNode = null;
    activeNode = null;
  
    if (!chosen) {
      centerNode = new GraphNode("No match", baseWidth/2, baseHeight/2, [], true, false, {
        desc: "No project matches your selection. Try different tags.",
        category: "Center"
      });
      centerNode.fixed = true; nodes.push(centerNode); activeNode = centerNode;
      return;
    }
  
    const { cx, cy } = graphScreenCenter();
    centerNode = new GraphNode(
      chosen.title,
      cx / (scaleFactor || 1),
      cy / (scaleFactor || 1),
      chosen.tags,
      true, false,
      chosen.info || {}
    );
    centerNode.fixed = true; nodes.push(centerNode); activeNode = centerNode;
  
    // const children = buildChildrenForProject(chosen, selectedTags);
    // const N = children.length; const off = random(TWO_PI);
  
    // for (let i = 0; i < N; i++) {
    //   const a = off + (TWO_PI * i) / Math.max(1, N);
    //   const c = children[i];
    //   const child = new GraphNode(c.title, centerNode.x, centerNode.y, c.tags || [], false, true, {
    //     desc: c.desc || "—",
    //     category: c.category || "Child"
    //   });
    //   child.birth.parent = centerNode;
    //   child.birth.angle  = a;
    //   child.birth.kick   = UI.kick;
  
    //   nodes.push(child);
    //   const L = new GraphLink(centerNode, child);
    //   L.restLength = UI.childRest;
    //   links.push(L);
    // }
  
    // // Light cross-links among children that share a tag
    // for (let i = 1; i < nodes.length; i++) {
    //   for (let j = i + 1; j < nodes.length; j++) {
    //     if (nodes[i].sharesTagWith && nodes[i].sharesTagWith(nodes[j])) {
    //       links.push(new GraphLink(nodes[i], nodes[j]));
    //     }
    //   }
    // }
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
    if (LAYOUT === "bottom") enforceMinOrbit(centerNode, nodes);
  }
  









function runGraph() {
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

for (const n of nodes) clampNodeToPlayableRect(n);

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
function graphScreenCenter() {
  const sW = (typeof baseWidth  !== "undefined") ? baseWidth  : width;
  const sH = (typeof baseHeight !== "undefined") ? baseHeight : height;
 

  // Blue panel sizes you already use in ui_topbar.js
  const panelLeft  = (typeof LAYOUT !== "undefined" && LAYOUT === "left") ? (sideBarW || 0) : 0;
  const panelTop   = (typeof LAYOUT !== "undefined" && LAYOUT === "top")  ? (topBarH || 0)  : 0;

  const availW = sW - panelLeft;
  const availH = sH - panelTop;

  const cx = panelLeft + availW / 2;  // middle of the usable width
  const cy = panelTop  + availH / 2;  // middle of the usable height
  return { cx, cy };
}
// console.log removed
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
    cam.tx = tx; cam.ty = ty; // eased in runGraph()
  }
}


// Faster spread: push siblings beyond the minimum orbit and give them a small outward velocity.
// Call right after you spawn nodes/links.
function enforceMinOrbit(center, allNodes, opts = {}) {
  if (!center) return;

  // ---- tunables (override via opts or UI) ----
  const isMobile        = (typeof LAYOUT !== "undefined" && LAYOUT === "bottom");
  const baseOrbit       = (UI?.spawnRadius || 180);
  const orbitMul        = opts.orbitMul ?? (isMobile ? (UI?.orbitMulMobile ?? 1.35) : 1.10); // >1 = farther than spawnRadius
  const overshoot       = opts.overshoot ?? (isMobile ? (UI?.orbitOvershoot ?? 1.12) : 1.0); // >1 = push past target, settle back
  const velocityKick    = opts.kick ?? (isMobile ? (UI?.orbitKick ?? 5.0) : 0.0);             // outward vx/vy
  const zeroVelOnSnap   = opts.zeroVelOnSnap ?? false; // set true if you *don’t* want the kick when snapping

  // target radius (min) and overshoot target
  const minOrbit    = baseOrbit * orbitMul;
  const snapTarget  = minOrbit * overshoot;

  for (const n of allNodes) {
    if (n === center) continue;

    const dx = n.x - center.x;
    const dy = n.y - center.y;
    let d = Math.hypot(dx, dy) || 0.0001;

    if (d < snapTarget) {
      // place directly on the overshoot circle — fast visual spread
      const s = snapTarget / d;
      n.x = center.x + dx * s;
      n.y = center.y + dy * s;

      // velocity: either zero (hard snap) or a small outward kick
      if (zeroVelOnSnap) {
        n.vx = 0; n.vy = 0;
      } else if (velocityKick > 0) {
        const ux = dx / (d * s); // unit vector at the *new* position
        const uy = dy / (d * s);
        n.vx = (n.vx || 0) + ux * velocityKick;
        n.vy = (n.vy || 0) + uy * velocityKick;
      }
    }
  }
}
