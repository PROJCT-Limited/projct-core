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

function touchStarted() {
  pointer.isTouch = true;

  if (!touches || touches.length === 0 || pointer.id !== null) return false;

  const t = touches[0];
  pointer.id = t.id;
  pointer.x = t.x; pointer.y = t.y;
  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  // don't start a drag if on the blue panel
  if (isInPanelScreen(pointer.x, pointer.y)) {
    draggingTag = null; draggingNode = null;
  } else if (mode === "select") {

    draggingTag = pickTagNodeAt(pointer.worldX, pointer.worldY);
    if (draggingTag) {
      draggingTag.dragging = false;                    // will flip to true after slop
      draggingTag.dx = pointer.worldX - draggingTag.x; // same offsets as mouse
      draggingTag.dy = pointer.worldY - draggingTag.y;
    }
  } else {
    // PICK GRAPH NODE — mirror mousePressed
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

  return false;
}


function touchMoved() {
  if (pointer.id === null) return false;

  let t = null;
  for (const tt of touches) if (tt.id === pointer.id) { t = tt; break; }
  if (!t) return false;

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

  return false;
}


function touchEnded() {

   // If it was a tap and we're in select mode, treat like clicking the Play button.
   if (mode === "select" && pointer.tapCandidate) {
    const d = dist(pointer.x, pointer.y, playBtn.x, playBtn.y); // screen coords
    if (d <= playBtn.r && selected.length > 0 && selected.length <= UI.maxSelected) {
      launchGraphFromSelection();
      finishPointerGesture();
      return false;
    }
  }

  // Reuse your existing drop logic
  if (typeof mouseReleased === 'function') mouseReleased();

  // Now clear touch state
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
