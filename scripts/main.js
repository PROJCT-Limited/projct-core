let acuminRegular;   
let acuminLight;    


function preload() {
  acuminLight = loadFont('./fonts/Acumin-Pro/Acumin-Pro-Book.otf'); 
 acuminRegular  = loadFont('./fonts/Acumin-Pro/Acumin-Pro-Light.otf');
}

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
  background(COLORS?.bg ?? 255);

  if (entryCircleFading && entryCircleAlpha > 0) {
    entryCircleAlpha = Math.max(0, entryCircleAlpha - 18);
    if (entryCircleAlpha === 0) entryCircleFading = false;
  }

  push();
  if (mode === "select") {
    translate(0, 0); scale(1);
    drawSelectScreen();
  } else {
    translate(worldOffsetX || 0, worldOffsetY || 0);
    scale(scaleFactor || 1);

    if (entryCircleAlpha > 0 && playCircle?.x != null) {
      fillWithAlpha(COLORS.blue, entryCircleAlpha);
      noStroke();
      circle(playCircle.x, playCircle.y, (playCircle.r || 120) * 2);
    }

    if (typeof runGraph === "function") runGraph();
  }
  pop();

  if (mode === "graph" && showBluePanel && typeof drawTopBar === "function") {
    drawTopBar();
  }
}
