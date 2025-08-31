function setup() {
  createCanvas(windowWidth, windowHeight);
  sizeToViewport();                     
  textFont('monospace');
  textAlign(CENTER, CENTER);

  UI = getUIConfig();
  baseWidth = UI.baseWidth;
  baseHeight = UI.baseHeight;

  pointer.isTouch = isMobileViewport();

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', sizeToViewport);
    window.visualViewport.addEventListener('scroll', sizeToViewport); // ← add this too
  }

  computeTopBar();
  computeTransform();

  centerNode = new GraphNode("•", baseWidth / 2, baseHeight / 2, [], true);
  centerNode.fixed = true;
  activeNode = centerNode;

  setupSelectUI();
  spawnFloatingTags();
}


function sizeToViewport() {
  const vv = window.visualViewport;
  const w = vv ? Math.round(vv.width)  : windowWidth;
  const h = vv ? Math.round(vv.height) : windowHeight;
  resizeCanvas(w, h);
}


function windowResized() {
  // resizeCanvas(windowWidth, windowHeight);  
  sizeToViewport();
  UI = getUIConfig();
  baseWidth = UI.baseWidth;
  baseHeight = UI.baseHeight;
  pointer.isTouch = isMobileViewport();

  computeTopBar();
  computeTransform();
  setupSelectUI();
}

function draw() {
  background(COLORS.bg);

  drawTopBar();

  // update world pointer
  const wpt = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = wpt.x; pointer.worldY = wpt.y;

  // after updating pointer.worldX/Y
if (pointer.dragging && pointer.dragNode) {
  const n = pointer.dragNode;
  n.x = pointer.worldX; n.y = pointer.worldY;
  n.vx = 0; n.vy = 0;
}


  if (mode === "select") {
    // tag physics
    for (const n of tagNodes) { n.resetForces(); n.applyRepulsion(tagNodes); }
    for (const n of tagNodes) n.update();

    // world render
    push(); translate(worldOffsetX, worldOffsetY); scale(scaleFactor);
    drawDropZone();
    for (const n of tagNodes) n.display();
    pop();

    drawPlayButton();
  } else {
    runGraph();
  }

  if (!isMobileViewport()) {
    noCursor();
    fill(COLORS.blue); noStroke();
    circle(pointer.x, pointer.y, 20);
    } else {
    cursor(ARROW); // normal touch/drag, no custom circle cursor
    }

  if (pointer.justReleased) pointer.justReleased = false;
}
