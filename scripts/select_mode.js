function setupSelectUI() {
  worldOffsetX = 0;
  worldOffsetY = 0;
  scaleFactor  = 1;


  // WORLD coords — center the 0/3 circle
  playCircle = {
    x: windowWidth * 0.5,
    y: windowHeight * 0.5,
    r: UI.playRadius || 120 
  };
  selected = [];

  // spawn floating tags (slight overlap so they start moving)
  tagNodes = [];
  const cols = Math.ceil(Math.sqrt(TAGS.length));
  const margin = 80;
  let i = 0;
  for (const t of TAGS) {
    const cx = margin + (i % cols) * ((baseWidth - margin*2) / (cols - 1 || 1));
    const cy = margin + Math.floor(i / cols) * 70;
    // jitter so some initial repulsion kicks in
    const x = constrain(cx + random(-28, 28), UI.rTag, baseWidth - UI.rTag);
    const y = constrain(cy + random(-28, 28), UI.rTag, baseHeight - UI.rTag);
    tagNodes.push(new TagNode(t.label, x, y, t.tags));
    i++;
  }
  selected = [];
}

function spawnFloatingTags() {
  selected = [];
  tagNodes = [];

  const bounds = { minX: 24, maxX: baseWidth - 24, minY: 24, maxY: baseHeight - 24 };
  for (const t of TAGS) {
    const n = new TagBubble(t.label, t.tags);
    placeNodeNoOverlap(n, tagNodes, bounds, 250, 6);
    tagNodes.push(n);
  }
}

function drawSelectScreen(){
  // Headline
  push();
  textFont(acuminRegular);
  textAlign(LEFT, TOP);
  fill(COLORS.blue);
  textSize(28);
  text("Pick projects by tags and explore relations", 28, 98);
  pop();

  // Selected tag pills under headline
  textFont(acuminLight);
  drawPickedTagPills(28, 142);

  // Physics step: your original float (repulsion only, no center attraction)
  for (const n of tagNodes) n.resetForces();
  for (const n of tagNodes) n.applyRepulsion(tagNodes);
  for (const n of tagNodes) n.update();
  for (const n of tagNodes) n.display();

  // 0/3 circle (drop target)
  drawPlayCircle();

  // "PRESS PLAY" text (store bbox so clicks work)
  const label = "PRESS PLAY";
  textSize(14);
  const tw = textWidth(label);
  const tx = playCircle.x - tw / 2;
  const ty = playCircle.y + playCircle.r + 32;
  playTextBox = { x: tx, y: ty, w: tw, h: 18 };

  push();
  fill(COLORS.blue);
  textAlign(LEFT, TOP);
  text(label, tx, ty);
  pop();
}

function drawPickedTagPills(x0, y0){
  let x = x0, y = y0;
  const padX = 10, h = 26, gap = 8;
  textSize(13); textAlign(LEFT, CENTER);
  for (const s of selected) {
    const label = s.label.toUpperCase();
    const w = textWidth(label) + padX * 2;
    noStroke(); fill(237, 245, 255);
    rect(x, y, w, h, 14);
    fill(COLORS.blue);
    textFont(acuminLight);
    text(label, x + padX, y + h / 2);
    x += w + gap;
    if (x > baseWidth - 200) { x = x0; y += h + 10; }
  }
}

// Add exactly one tag from a TagNode; returns true if it was added
function addSelectedTagByNode(n) {
  if (!n) return false;
  textFont(acuminLight);
  const label = n.label;
  const tagsArr = Array.isArray(n.tags) ? n.tags.slice()
                : (typeof n.tag === "string" && n.tag ? [n.tag] : [label]);

  const maxSel = UI?.maxSelected ?? 3;
  if (selected.some(s => s.label === label)) return false;
  if (selected.length >= maxSel) return false;

  selected.push({ label, tags: tagsArr });

  // trigger a little "bump" animation on the circle
  playCircle.bump = 1.0;
  return true;
}

function canPlay() { return (selected?.length ?? 0) === (UI?.maxSelected ?? 3); }

// Draw the central play circle; grows with #selected and "bumps" when a tag is added
function drawPlayCircle() {
  const a      = entryCircleAlpha ?? 255;
  const baseR  = UI?.playRadius ?? 120;
  const grow   = UI?.playGrowth ?? 24;
  const maxSel = UI?.maxSelected ?? 3;

  if (typeof playCircle.r !== "number") playCircle.r = baseR;
  if (typeof playCircle.bump !== "number") playCircle.bump = 0;
  

  const targetR = baseR + grow * Math.min(selected.length, maxSel);
  playCircle.r += (targetR - playCircle.r) * 0.2;
  playCircle.bump *= 0.85; // decay pulse

  const pulse = 1 + 0.08 * playCircle.bump;
  const ready = canPlay();

  push();
  translate(playCircle.x, playCircle.y);
  scale(pulse);
  noStroke();
  fillWithAlpha(ready ? COLORS.blue : [200,210,224], a);
  circle(0, 0, playCircle.r * 2);

  fill(ready ? 255 : 80, ready ? 255 : 120);
  textAlign(CENTER, CENTER);
  textSize(32);
  text(`${selected.length}/${maxSel}`, 0, 0);
  pop();
}




// Effective (visual) radius of the play circle, including the pulse bump
function effectivePlayRadius() {
  const r = (playCircle && typeof playCircle.r === "number") ? playCircle.r : (UI?.playRadius ?? 120);
  const bump = (playCircle && typeof playCircle.bump === "number") ? playCircle.bump : 0;
  // same 8% pulse used in drawPlayCircle()
  return r * (1 + 0.08 * bump);
}

// Drop-hit for tags: use the same effective radius the user sees
function inDrop(wx, wy) {
  const R = effectivePlayRadius();
  return dist(wx, wy, playCircle.x, playCircle.y) <= R;
}


// ---- color helpers (p5-safe) ----
function _toRGB(col) {
  // returns [r,g,b]
  if (Array.isArray(col) && col.length >= 3) return [col[0], col[1], col[2]];
  try {
    const c = color(col); // p5 color()
    return [red(c), green(c), blue(c)];
  } catch (e) {
    return [26, 64, 156]; // fallback blue
  }
}
function fillWithAlpha(col, a) {
  const [r, g, b] = _toRGB(col);
  fill(r, g, b, a);
}
function strokeWithAlpha(col, a) {
  const [r, g, b] = _toRGB(col);
  stroke(r, g, b, a);
}

function canPlay() {
  return (Array.isArray(selected) ? selected.length : 0) === (UI.maxSelected || 3);
}
