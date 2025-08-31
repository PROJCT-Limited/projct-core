// Allow taps on UI (hamburger, overlay links, close button) to pass through.
function uiWantsThisTouch(ev) {
  const t = ev && (ev.target || ev.srcElement);
  if (!t) return false;
  return !!t.closest('#mobileOverlay, #mobileTrigger, .mobile-close, .button-header, .header, a, button');
}

// If the overlay is open, all touches should go to the overlay/UI.
function overlayIsOpen() {
  const ov = document.getElementById('mobileOverlay');
  return ov && ov.classList.contains('open');
}



function mouseMoved(){ pointer.x = mouseX; pointer.y = mouseY; }
pointer.tapCandidate = false;


function mousePressed() {
  pointer.isTouch = false; pointer.x = mouseX; pointer.y = mouseY; pointer.down = true;
  const w = screenToWorld(pointer.x, pointer.y);   // ← add
  pointer.worldX = w.x; pointer.worldY = w.y;  

  if (mode === "select") {
    // pick a tag (world hit)
    for (let i = tagNodes.length - 1; i >= 0; i--) {
      const t = tagNodes[i];
      if (t.isInside(pointer.worldX, pointer.worldY)) {
        draggingTag = t; t.dragging = true;
        t.dx = pointer.worldX - t.x; t.dy = pointer.worldY - t.y;
        return;
      }
    }
    // play (screen)
    const d = dist(mouseX, mouseY, playBtn.x, playBtn.y);
    if (d <= playBtn.r && selected.length > 0 && selected.length <= UI.maxSelected) {
      launchGraphFromSelection();
      return;
    }
  } else {
    // graph drag (world)
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.isPointInside(pointer.worldX, pointer.worldY)) {
        draggingNode = n; n.fixed = true;
        n.offsetX = pointer.worldX - n.x; n.offsetY = pointer.worldY - n.y;
        activeNode = n; return;
      }
    }
  }
}

function mouseDragged() {
  pointer.x = mouseX; pointer.y = mouseY;
  const w = screenToWorld(pointer.x, pointer.y);   // ← add
  pointer.worldX = w.x; pointer.worldY = w.y; 

  if (mode === "select" && draggingTag) {
    draggingTag.x = pointer.worldX - draggingTag.dx;
    draggingTag.y = pointer.worldY - draggingTag.dy;
  } else if (mode === "graph" && draggingNode) {
    draggingNode.x = pointer.worldX - draggingNode.offsetX;
    draggingNode.y = pointer.worldY - draggingNode.offsetY;
  }
}

function mouseReleased() {
  pointer.x = mouseX; pointer.y = mouseY; pointer.down = false; pointer.justReleased = true;
  const w = screenToWorld(pointer.x, pointer.y);   // ← add
  pointer.worldX = w.x; pointer.worldY = w.y; 

  if (mode === "select") {
    if (draggingTag) {
      draggingTag.dragging = false;
      if (inDrop(pointer.worldX, pointer.worldY)) {
        const already = selected.some(s => s.label === draggingTag.label);
        if (!already && selected.length < UI.maxSelected) {
          selected.push({ label: draggingTag.label, tags: draggingTag.tags.slice() });
        }
      }
      draggingTag = null;
    }
  } else {
    if (!draggingNode) {
      // tap to set active (world)
      for (let node of nodes) {
        if (node.isPointInside(pointer.worldX, pointer.worldY)) { activeNode = node; break; }
      }
    } else {
      draggingNode.fixed = false; draggingNode = null;
    }
  }
}

function touchStarted(ev) {
  // If the overlay is open or the touch began on UI, let the browser handle it.
  if (overlayIsOpen() || uiWantsThisTouch(ev)) return true;

  pointer.isTouch = true;
  if (!touches || touches.length === 0 || pointer.id !== null) return true;

  const t = touches[0];
  pointer.id = t.id;
  pointer.x = t.x; pointer.y = t.y;
  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  // don't start a drag if on the blue panel (your func)
  if (isInPanelScreen(pointer.x, pointer.y)) {
    draggingTag = null; draggingNode = null;
  } else if (mode === "select") {
    draggingTag = pickTagNodeAt(pointer.worldX, pointer.worldY);
    if (draggingTag) {
      draggingTag.dragging = false;
      draggingTag.dx = pointer.worldX - draggingTag.x;
      draggingTag.dy = pointer.worldY - draggingTag.y;
    }
  } else {
    draggingNode = null;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.isPointInside(pointer.worldX, pointer.worldY)) {
        draggingNode = n; n.fixed = true;
        n.offsetX = pointer.worldX - n.x; n.offsetY = pointer.worldY - n.y;
        activeNode = n; break;
      }
    }
  }

  pointer.down = true;
  pointer.startX = pointer.x;
  pointer.startY = pointer.y;
  pointer.dragging = false;
  pointer.tapCandidate = true; 

  return false; // prevent page scroll ONLY for canvas interactions
}

function touchMoved(ev) {
  // Let UI touches through, and ignore if we don't own the gesture
  if (overlayIsOpen() || uiWantsThisTouch(ev)) return true;
  if (pointer.id === null) return true;

  let t = null;
  for (const tt of touches) if (tt.id === pointer.id) { t = tt; break; }
  if (!t) return true;

  pointer.x = t.x; pointer.y = t.y;
  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  if (!pointer.dragging) {
    const dx = pointer.x - pointer.startX, dy = pointer.y - pointer.startY;
    if (dx*dx + dy*dy > DRAG_SLOP*DRAG_SLOP) {
      pointer.dragging = true;
      pointer.tapCandidate = false;  
      if (draggingTag) draggingTag.dragging = true;
    }
  }

  if (pointer.dragging) {
    if (mode === "select" && draggingTag) {
      draggingTag.x = pointer.worldX - draggingTag.dx;
      draggingTag.y = pointer.worldY - draggingTag.dy;
      draggingTag.vx = 0; draggingTag.vy = 0;
    } else if (mode === "graph" && draggingNode) {
      draggingNode.x = pointer.worldX - draggingNode.offsetX;
      draggingNode.y = pointer.worldY - draggingNode.offsetY;
      draggingNode.vx = 0; draggingNode.vy = 0;
    }
  }

  return false; // keep preventing default only during canvas drags
}

function touchEnded(ev) {
  // If touch ended on UI or overlay is open, let default click fire
  if (overlayIsOpen() || uiWantsThisTouch(ev)) {
    finishPointerGesture();
    return true;
  }

  if (mode === "select" && pointer.tapCandidate && typeof playBtn === 'object') {
    const TOUCH_HIT = 1.3; // slightly bigger finger target
    const d = dist(pointer.x, pointer.y, playBtn.x, playBtn.y);
    if (d <= playBtn.r * TOUCH_HIT &&
        selected.length > 0 &&
        selected.length <= UI.maxSelected) {
      launchGraphFromSelection();
      finishPointerGesture();
      return false;
    }
  }

  // Treat as a tap-to-play if you implemented tapCandidate (optional)
  if (typeof mouseReleased === 'function') mouseReleased(); // reuse your drop logic
  finishPointerGesture();
  return false;
}


function finishPointerGesture() {
  pointer.down = false;
  pointer.dragging = false;
  pointer.id = null;
  pointer.dragNode = null; // (unused now, fine to keep or remove)
}


  // Touch/drag state
pointer.id = null;           // active touch id (mobile)
pointer.dragging = false;    // are we dragging a node?
pointer.dragNode = null;     // which node
pointer.startX = 0;          // screen coords at press
pointer.startY = 0;


const DRAG_SLOP = 8;         // px finger must move before we "lock" the drag

// Is the press inside the blue panel?
function isInPanelScreen(px, py) {
  if (LAYOUT === 'top') return py < topBarH;
  return px < sideBarW;
}

// Larger hit area on touch so picking is easy on phones
function touchHitRadius(node) {
  const sr = (node.baseR || 16) * (scaleFactor || 1);
  return Math.max(28, sr * 1.25); // min 28px, or 1.25× visual radius
}

// Pick a tag node under a world-space point (select mode)
function pickTagNodeAt(xw, yw) {
  if (!Array.isArray(tagNodes)) return null;
  let best = null, bestD = Infinity;
  for (const n of tagNodes) {
    const d = dist(xw, yw, n.x, n.y);
    const r = pointer.isTouch ? touchHitRadius(n) / (scaleFactor || 1) : (n.baseR || 16);
    if (d <= r && d < bestD) { best = n; bestD = d; }
  }
  return best;
}