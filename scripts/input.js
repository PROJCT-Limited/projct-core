/* ---------- UI passthrough helpers ---------- */
function uiWantsThisTouch(ev) {
  const t = ev && (ev.target || ev.srcElement);
  if (!t) return false;
  return !!t.closest('#mobileOverlay, #mobileTrigger, .mobile-close, .button-header, .header, a, button');
}
function overlayIsOpen() {
  const ov = document.getElementById('mobileOverlay');
  return ov && ov.classList.contains('open');
}

/* ---------- Play hit-test (circle OR "PRESS PLAY" text) ---------- */
// Clickable zone: circle OR "PRESS PLAY" text (world-aware, pulse-aware)
function isOnPlayButton(sx, sy) {
  const w = screenToWorld(sx, sy);     // screen -> world (select mode should be identity)
  const R = effectivePlayRadius();     // <- matches visual size
  const inCircle = dist(w.x, w.y, playCircle.x, playCircle.y) <= R;

  let inText = false;
  if (playTextBox) {
    inText = (w.x >= playTextBox.x && w.x <= playTextBox.x + playTextBox.w &&
              w.y >= playTextBox.y && w.y <= playTextBox.y + playTextBox.h);
  }
  return inCircle || inText;
}

/* ---------- Mouse ---------- */
function mouseMoved() {
  pointer.x = mouseX; pointer.y = mouseY;
  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  if (mode === "graph" && !pointer.down && !isInPanelScreen(pointer.x, pointer.y)) {
    const hover = pickGraphNodeAt(pointer.worldX, pointer.worldY);
    if (hover && hover !== activeNode) {
      activeNode = hover;     // <- this drives the blue panel content
    }
  }
}

function mousePressed() {
  pointer.isTouch = false;
  pointer.x = mouseX; pointer.y = mouseY;
  pointer.down = true;
  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  pointer.startX = pointer.x;
  pointer.startY = pointer.y;
  pointer.dragging = false;
  pointer.tapCandidate = true;

  if (mode === "select") {
    // your immediate tag-drag code stays as-is
    draggingTag = pickTagNodeAt(pointer.worldX, pointer.worldY);
    if (draggingTag) {
      pointer.dragging = true;
      draggingTag.dragging = true;
      draggingTag.dx = pointer.worldX - draggingTag.x;
      draggingTag.dy = pointer.worldY - draggingTag.y;
    }
    return;
  }

  // --- graph mode ---
  if (mode === "graph") {
    if (isInPanelScreen(pointer.x, pointer.y)) return; // ignore clicks on panel
    draggingNode = pickGraphNodeAt(pointer.worldX, pointer.worldY);
    if (draggingNode) {
      draggingNode.fixed = true; // let physics pause while dragging
      draggingNode.offsetX = pointer.worldX - draggingNode.x;
      draggingNode.offsetY = pointer.worldY - draggingNode.y;
      activeNode = draggingNode; // update panel immediately
    }
  }
}

function mouseDragged() {
  pointer.x = mouseX; pointer.y = mouseY;
  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  if (!pointer.dragging) {
    const dx = pointer.x - pointer.startX, dy = pointer.y - pointer.startY;
    if (dx * dx + dy * dy > DRAG_SLOP * DRAG_SLOP) pointer.dragging = true;
  }

  if (mode === "select" && draggingTag) {
    draggingTag.x = pointer.worldX - draggingTag.dx;
    draggingTag.y = pointer.worldY - draggingTag.dy;
    draggingTag.vx = 0; draggingTag.vy = 0;
    return;
  }

  if (mode === "graph" && draggingNode && pointer.dragging) {
    draggingNode.x = pointer.worldX - draggingNode.offsetX;
    draggingNode.y = pointer.worldY - draggingNode.offsetY; // ✅ worldY, not worldX
  }
}

// --- mouse ---
function mouseReleased() {
  pointer.x = mouseX; pointer.y = mouseY;
  pointer.down = false; pointer.justReleased = true;

  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  // -------- SELECT MODE --------
  if (mode === "select") {
    let added = false;

    if (draggingTag) {
      const t = draggingTag; draggingTag = null; t.dragging = false;
      if (inDrop(pointer.worldX, pointer.worldY)) {
        // safely push; also bumps the circle
        added = addSelectedTagByNode(t) || false;
      }
      // fall through so the same release can also press "play"
    }

    // Auto-launch if the 3rd tag was just added by dropping into the circle
    if (added && canPlay()) {
      entryCircleFading = true;
      showBluePanel = true;
      launchGraphFromSelection();
      return;
    }

    // Otherwise: press circle / "PRESS PLAY" to launch (only when 3/3)
    if (isOnPlayButton(pointer.x, pointer.y) && canPlay()) {
      entryCircleFading = true;
      showBluePanel = true;
      launchGraphFromSelection();
    }
    return; // <-- this return is inside the function, so it's valid
  }

  // -------- GRAPH MODE --------
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

    const tapped = pickGraphNodeAt(pointer.worldX, pointer.worldY);
    if (tapped) {
      if (typeof refocusToByTags === "function") refocusToByTags(tapped);
      else if (typeof refocusTo === "function")  refocusTo(tapped);
      if (typeof centerCameraOnNode === "function") centerCameraOnNode(centerNode);
    }
  }
}






/* ---------- Touch ---------- */
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
    // Immediate drag for tags on touch too
    draggingTag = pickTagNodeAt(pointer.worldX, pointer.worldY);
    if (draggingTag) {
      pointer.dragging = true;
      draggingTag.dragging = true;
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
  pointer.startX = pointer.x; pointer.startY = pointer.y;
  pointer.tapCandidate = true;
  return false; // prevent page scroll for canvas touches
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
    // optional slop on touch for graph nodes; remove if you want immediate
    draggingNode.x = pointer.worldX - draggingNode.offsetX;
    draggingNode.y = pointer.worldY - draggingNode.offsetY;
  }
  return false;
}

// --- touch ---
function touchEnded(ev) {
  // If touch ended on UI/overlay, just reset and let default click happen
  if (overlayIsOpen() || uiWantsThisTouch(ev)) { finishPointerGesture(); return true; }

  if (pointer.x != null && pointer.y != null) {
    const w = screenToWorld(pointer.x, pointer.y);
    pointer.worldX = w.x; pointer.worldY = w.y;
  }

  // -------- SELECT MODE --------
  if (mode === "select") {
    let added = false;

    if (draggingTag) {
      const t = draggingTag; draggingTag = null; t.dragging = false;
      if (inDrop(pointer.worldX, pointer.worldY)) {
        added = addSelectedTagByNode(t) || false;
      }
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

  // -------- GRAPH MODE --------
  if (mode === "graph") {
    if (!draggingNode) {
      const tapped = pickGraphNodeAt(pointer.worldX, pointer.worldY);
      if (tapped) {
        if (typeof refocusToByTags === "function") refocusToByTags(tapped);
        else if (typeof refocusTo === "function")  refocusTo(tapped);
        if (typeof centerCameraOnNode === "function") centerCameraOnNode(centerNode);
      }
    } else {
      draggingNode.fixed = false;
      draggingNode = null;
    }
    finishPointerGesture(); return false;
  }

  finishPointerGesture(); return false;
}

/* ---------- Shared ---------- */
function finishPointerGesture() {
  pointer.down = false; pointer.dragging = false;
  pointer.id = null; pointer.dragNode = null;
}

const DRAG_SLOP = 8;

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


// Is the cursor over the blue panel? (screen coords)
function isInPanelScreen(px, py) {
  if (mode !== "graph" || !showBluePanel) return false;
  const layout = (typeof LAYOUT === "string" ? LAYOUT : "side");
  if (layout === "top") {
    const h = typeof topBarH === "number" ? topBarH : 0;
    return py <= h;
  } else {
    const w = typeof sideBarW === "number" ? sideBarW : 0;
    return px <= w;
  }
}

// Pick the topmost graph node at a WORLD point
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
