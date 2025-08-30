function mouseMoved(){ pointer.x = mouseX; pointer.y = mouseY; }

function mousePressed() {
  pointer.isTouch = false; pointer.x = mouseX; pointer.y = mouseY; pointer.down = true;

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

// Delegate touch to mouse logic, but mark as touch and avoid default scrolling
function touchStarted() {
  pointer.isTouch = true;

  // Only track the first active touch
  if (!touches || touches.length === 0 || pointer.id !== null) return false;

  const t = touches[0];
  pointer.id = t.id;
  pointer.x = t.x; pointer.y = t.y;
  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  // Don't start a drag if the finger is on the blue panel
  if (!isInPanelScreen(pointer.x, pointer.y) && mode === "select") {
    pointer.dragNode = pickTagNodeAt(pointer.worldX, pointer.worldY);
  } else {
    pointer.dragNode = null;
  }

  pointer.down = true;
  pointer.startX = pointer.x;
  pointer.startY = pointer.y;
  pointer.dragging = false;

  return false; // prevent page scroll
}

function touchMoved() {
  if (pointer.id === null) return false; // not our touch

  // Find the active touch by id
  let t = null;
  for (const tt of touches) if (tt.id === pointer.id) { t = tt; break; }
  if (!t) return false;

  pointer.x = t.x; pointer.y = t.y;
  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  // Only lock into a drag after moving past a small threshold
  if (!pointer.dragging && pointer.dragNode) {
    const dx = pointer.x - pointer.startX, dy = pointer.y - pointer.startY;
    if (dx*dx + dy*dy > DRAG_SLOP*DRAG_SLOP) {
      pointer.dragging = true;
    }
  }

  // While dragging, directly place the node at the finger
  if (pointer.dragging && pointer.dragNode) {
    const n = pointer.dragNode;
    n.x = pointer.worldX; n.y = pointer.worldY;
    n.vx = 0; n.vy = 0; // stop physics from fighting the finger
  }

  return false;
}

function touchEnded() {
  // Release regardless of which finger ended (safest for single-touch)
  finishPointerGesture();
  if (typeof mouseReleased === 'function') mouseReleased(); // keep your drop-zone logic
  return false;
}

// If the browser cancels the touch (e.g., OS gesture), also clean up
function finishPointerGesture() {
  pointer.down = false;
  pointer.dragging = false;
  pointer.dragNode = null;
  pointer.id = null;
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
