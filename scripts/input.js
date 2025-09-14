/***** INPUT.JS — consolidated interactions *****/

/* ---- world/screen mapping (must invert your draw() translate/scale) ---- */
function screenToWorld(sx, sy) {
  const sc = (typeof scaleFactor === "number" ? scaleFactor : 1);
  const ox = (typeof worldOffsetX === "number" ? worldOffsetX : 0);
  const oy = (typeof worldOffsetY === "number" ? worldOffsetY : 0);
  return { x: (sx - ox) / sc, y: (sy - oy) / sc };
}

/* ---- UI passthrough helpers ---- */
function uiWantsThisTouch(ev) {
  const t = ev && (ev.target || ev.srcElement);
  if (!t) return false;
  return !!t.closest('#mobileOverlay, #mobileTrigger, .mobile-close, .button-header, .header, a, button');
}
function overlayIsOpen() {
  const ov = document.getElementById('mobileOverlay');
  return ov && ov.classList.contains('open');
}

/* ---- panel hit (screen coords) ---- */
function isInPanelScreen(px, py) {
  if (mode !== "graph" || !showBluePanel) return false;
  const layout = (typeof LAYOUT === "string" ? LAYOUT : "side");
  if (layout === "top") {
    const h = (typeof topBarH === "number" ? topBarH : 0);
    return py <= h;
  } else {
    const w = (typeof sideBarW === "number" ? sideBarW : 0);
    return px <= w;
  }
}

/* ---- select-mode circle helpers ---- */
function effectivePlayRadius() { // pulse-aware radius (matches what you see)
  const r = (playCircle && typeof playCircle.r === "number") ? playCircle.r : (UI?.playRadius ?? 120);
  const bump = (playCircle && typeof playCircle.bump === "number") ? playCircle.bump : 0;
  return r * (1 + 0.08 * bump);
}
function inDrop(wx, wy) {
  const R = effectivePlayRadius();
  return dist(wx, wy, playCircle.x, playCircle.y) <= R;
}
function isOnPlayButton(sx, sy) { // circle OR "PRESS PLAY" text
  const w = screenToWorld(sx, sy);
  const inCircle = dist(w.x, w.y, playCircle.x, playCircle.y) <= effectivePlayRadius();
  let inText = false;
  if (playTextBox) {
    inText = (w.x >= playTextBox.x && w.x <= playTextBox.x + playTextBox.w &&
              w.y >= playTextBox.y && w.y <= playTextBox.y + playTextBox.h);
  }
  return inCircle || inText;
}

/* ---- picking ---- */
function pickTagNodeAt(xw, yw) {
  if (!Array.isArray(tagNodes)) return null;
  let best = null, bestD = Infinity;
  for (const n of tagNodes) {
    const d = dist(xw, yw, n.x, n.y);
    const r = pointer.isTouch ? touchHitRadius(n) / (scaleFactor || 1) : (n.r || 16);
    if (d <= r && d < bestD) { best = n; bestD = d; }
  }
  return best;
}
function pickGraphNodeAt(xw, yw) {
  if (!Array.isArray(nodes)) return null;
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (!n) continue;
    const inside = (typeof n.isPointInside === "function")
      ? n.isPointInside(xw, yw)
      : ((xw - n.x) ** 2 + (yw - n.y) ** 2) <= ((n.baseR || n.r || UI?.rNode || 16) ** 2);
    if (inside) return n;
  }
  return null;
}

/* ---- select-mode add + gate ---- */
function addSelectedTagByNode(n) {
  if (!n) return false;
  const label = n.label;
  const tagsArr = Array.isArray(n.tags) ? n.tags.slice()
                : (typeof n.tag === "string" && n.tag ? [n.tag] : [label]);
  const maxSel = UI?.maxSelected ?? 3;
  if (selected.some(s => s.label === label)) return false;
  if (selected.length >= maxSel) return false;
  selected.push({ label, tags: tagsArr });
  if (playCircle) playCircle.bump = 1.0; // pulse
  return true;
}
function canPlay() { return (selected?.length ?? 0) === (UI?.maxSelected ?? 3); }

/* ---- shared state ---- */
const DRAG_SLOP = 8;
let draggingNode = null;


/* ================= Mouse ================= */
function mouseMoved() {
  pointer.x = mouseX; pointer.y = mouseY;
  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  if (mode === "graph" && !pointer.down && !isInPanelScreen(pointer.x, pointer.y)) {
    const hover = pickGraphNodeAt(pointer.worldX, pointer.worldY);
    if (hover && hover !== activeNode) {
      activeNode = hover;
      if (typeof hoverNode !== "undefined") hoverNode = hover; // if your UI uses this
    }
  }
}

function mousePressed() {
  pointer.isTouch = false;
  pointer.x = mouseX; pointer.y = mouseY;
  pointer.down = true;
  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  pointer.startX = pointer.x; pointer.startY = pointer.y;
  pointer.dragging = false; pointer.tapCandidate = true;

  if (mode === "select") {
    draggingTag = pickTagNodeAt(pointer.worldX, pointer.worldY);
    if (draggingTag) {
      pointer.dragging = true;
      draggingTag.dragging = true;
      draggingTag.dx = pointer.worldX - draggingTag.x;
      draggingTag.dy = pointer.worldY - draggingTag.y;
    }
    return;
  }

  if (mode === "graph") {
    if (isInPanelScreen(pointer.x, pointer.y)) return;
    draggingNode = pickGraphNodeAt(pointer.worldX, pointer.worldY);
    if (draggingNode) {
      // bring to front while dragging
      const idx = nodes.indexOf(draggingNode);
      if (idx >= 0) { nodes.splice(idx, 1); nodes.push(draggingNode); }
      draggingNode.fixed = true;
      draggingNode.offsetX = pointer.worldX - draggingNode.x;
      draggingNode.offsetY = pointer.worldY - draggingNode.y;
      activeNode = draggingNode;
      if (typeof hoverNode !== "undefined") hoverNode = draggingNode;
    }
  }
}

function mouseDragged() {
  pointer.x = mouseX; pointer.y = mouseY;
  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  if (!pointer.dragging) {
    const dx = pointer.x - pointer.startX, dy = pointer.y - pointer.startY;
    if (dx*dx + dy*dy > DRAG_SLOP*DRAG_SLOP) pointer.dragging = true;
  }

  if (mode === "select" && draggingTag) {
    draggingTag.x = pointer.worldX - draggingTag.dx;
    draggingTag.y = pointer.worldY - draggingTag.dy;
    draggingTag.vx = 0; draggingTag.vy = 0;
    return;
  }

  if (mode === "graph" && draggingNode && pointer.dragging) {
    draggingNode.x = pointer.worldX - draggingNode.offsetX;
    draggingNode.y = pointer.worldY - draggingNode.offsetY; // <- worldY
    draggingNode.vx = 0; draggingNode.vy = 0;
  }
}

function mouseReleased() {
  pointer.x = mouseX; pointer.y = mouseY;
  pointer.down = false; pointer.justReleased = true;
  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  // ----- SELECT mode -----
  if (mode === "select") {
    let added = false;

    if (draggingTag) {
      const t = draggingTag; draggingTag = null; t.dragging = false;
      if (inDrop(pointer.worldX, pointer.worldY)) added = addSelectedTagByNode(t);
    }

    if (added && canPlay()) { // auto-launch on 3rd drop
      entryCircleFading = true; showBluePanel = true; launchGraphFromSelection();
      return;
    }

    if (isOnPlayButton(pointer.x, pointer.y) && canPlay()) {
      entryCircleFading = true; showBluePanel = true; launchGraphFromSelection();
    }
    return;
  }

  // ----- GRAPH mode -----
  if (mode === "graph") {
    if (draggingNode) {
      if (!pointer.dragging) {
        if (typeof refocusToByTags === "function") refocusToByTags(draggingNode);
        else if (typeof refocusTo === "function")  refocusTo(draggingNode);
        if (typeof centerCameraOnNode === "function") centerCameraOnNode(centerNode);
      }
      draggingNode.fixed = false;
      draggingNode = null;
      return;
    }

    if (!isInPanelScreen(pointer.x, pointer.y)) {
      const tapped = pickGraphNodeAt(pointer.worldX, pointer.worldY);
      if (tapped) {
        // 1) Refocus (prefer the tags-aware version, fallback to plain refocus)
        if (typeof refocusToByTags === "function") {
          refocusToByTags(tapped);
        } else if (typeof refocusTo === "function") {
          refocusTo(tapped);
        }
    
        // 2) Make the focused node active (prefer the newly computed centerNode)
        activeNode = (typeof centerNode !== "undefined" && centerNode) ? centerNode : tapped;
    
        // 3) Center camera on whatever we marked active
        if (typeof centerCameraOnNode === "function") {
          centerCameraOnNode(activeNode);
        }
      }
    }
  }
}

/* ================= Touch ================= */
function touchStarted(ev) {
  if (overlayIsOpen() || uiWantsThisTouch(ev)) return true;

  pointer.isTouch = true;
  if (!touches || touches.length === 0 || pointer.id !== null) return true;

  const t = touches[0];
  pointer.id = t.id;
  pointer.x = t.x; pointer.y = t.y;
  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  if (isInPanelScreen(pointer.x, pointer.y)) {
    draggingTag = null; draggingNode = null;
  } else if (mode === "select") {
    draggingTag = pickTagNodeAt(pointer.worldX, pointer.worldY);
    if (draggingTag) {
      pointer.dragging = true;
      draggingTag.dragging = true;
      draggingTag.dx = pointer.worldX - draggingTag.x;
      draggingTag.dy = pointer.worldY - draggingTag.y;
    }
  } else {
    draggingNode = pickGraphNodeAt(pointer.worldX, pointer.worldY);
    if (draggingNode) {
      draggingNode.fixed = true;
      draggingNode.offsetX = pointer.worldX - draggingNode.x;
      draggingNode.offsetY = pointer.worldY - draggingNode.y;
      activeNode = draggingNode;
      if (typeof hoverNode !== "undefined") hoverNode = draggingNode;
    }
  }

  pointer.down = true;
  pointer.startX = pointer.x; pointer.startY = pointer.y;
  pointer.tapCandidate = true;
  return false; // prevent scroll on canvas
}

function touchMoved(ev) {
  if (overlayIsOpen() || uiWantsThisTouch(ev)) return true;
  if (pointer.id === null) return true;

  let t = null;
  for (const tt of touches) if (tt.id === pointer.id) { t = tt; break; }
  if (!t) return true;

  pointer.x = t.x; pointer.y = t.y;
  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  if (mode === "select" && draggingTag) {
    draggingTag.x = pointer.worldX - draggingTag.dx;
    draggingTag.y = pointer.worldY - draggingTag.dy;
    draggingTag.vx = 0; draggingTag.vy = 0;
  } else if (mode === "graph" && draggingNode) {
    draggingNode.x = pointer.worldX - draggingNode.offsetX;
    draggingNode.y = pointer.worldY - draggingNode.offsetY;
  }
  return false;
}

function touchEnded(ev) {
  if (overlayIsOpen() || uiWantsThisTouch(ev)) { finishPointerGesture(); return true; }

  if (pointer.x != null && pointer.y != null) {
    const w = screenToWorld(pointer.x, pointer.y);
    pointer.worldX = w.x; pointer.worldY = w.y;
  }

  if (mode === "select") {
    let added = false;
    if (draggingTag) {
      const t = draggingTag; draggingTag = null; t.dragging = false;
      if (inDrop(pointer.worldX, pointer.worldY)) added = addSelectedTagByNode(t);
    }

    if (added && canPlay()) {
      entryCircleFading = true; showBluePanel = true; launchGraphFromSelection();
      finishPointerGesture(); return false;
    }

    if (pointer.tapCandidate && isOnPlayButton(pointer.x, pointer.y) && canPlay()) {
      entryCircleFading = true; showBluePanel = true; launchGraphFromSelection();
      finishPointerGesture(); return false;
    }

    finishPointerGesture(); return false;
  }

  if (mode === "graph") {
    // Optional: ignore taps that land on the blue panel area
    if (typeof isInPanelScreen === "function" && isInPanelScreen(pointer.x, pointer.y)) {
      finishPointerGesture();
      return false;
    }
  
    if (!draggingNode) {
      const tapped = pickGraphNodeAt(pointer.worldX, pointer.worldY);
      if (tapped) {
        // 1) Refocus (prefer tags-aware refocus, fallback to plain refocus)
        if (typeof refocusToByTags === "function") {
          refocusToByTags(tapped);
        } else if (typeof refocusTo === "function") {
          refocusTo(tapped);
        }
  
        // 2) Ensure the newly focused node drives the blue panel
        activeNode = (typeof centerNode !== "undefined" && centerNode) ? centerNode : tapped;
  
        // 3) Center camera on the same node we just marked active
        if (typeof centerCameraOnNode === "function") {
          centerCameraOnNode(activeNode);
        }
      }
    } else {
      // finish a drag
      draggingNode.fixed = false;
      draggingNode = null;
    }
  
    finishPointerGesture();
    return false;
  }
}

/* ---- finish gesture ---- */
function finishPointerGesture() {
  pointer.down = false;
  pointer.dragging = false;
  pointer.id = null;
  pointer.dragNode = null;
}
