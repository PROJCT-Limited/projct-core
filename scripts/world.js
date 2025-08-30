// Layout controls
let LAYOUT = 'top'; // 'top' | 'left'
let sideBarW = 0; // width of the left panel when LAYOUT==='left'


function computeTopBar() {
  if (isMobileViewport()) {
  // Mobile: keep panel on TOP
  LAYOUT = 'top';
  topBarH = constrain(round(windowHeight * UI.topBarRatio), UI.topBarMin, UI.topBarMax);
  sideBarW = 0;
  } else {
  // Desktop: move panel to the LEFT
  LAYOUT = 'left';
  // Tunable: how wide the left bar should be
  sideBarW = constrain(round(windowWidth * 0.28), 260, 420);
  topBarH = 0;
  }
  }

  function computeTransform() {
    let availW, availH;
    if (LAYOUT === 'top') {
    availW = windowWidth;
    availH = Math.max(100, windowHeight - topBarH);
    } else {
    availW = Math.max(100, windowWidth - sideBarW);
    availH = windowHeight;
    }
    
    const sx = availW / baseWidth;
    const sy = availH / baseHeight;
    scaleFactor = Math.min(sx, sy);
    
    const worldW = baseWidth * scaleFactor;
    const worldH = baseHeight * scaleFactor;
    
    worldOffsetX = (LAYOUT === 'left' ? sideBarW : 0) + (availW - worldW) * 0.5;
    worldOffsetY = (LAYOUT === 'top' ? topBarH : 0) + (availH - worldH) * 0.5;
    }

function screenToWorld(px, py) {
  return { x: (px - worldOffsetX) / scaleFactor, y: (py - worldOffsetY) / scaleFactor };
}
