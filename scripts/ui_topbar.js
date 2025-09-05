function drawTopBar() {
  const panelW = (typeof sideBarW !== 'undefined' && LAYOUT === 'left') ? sideBarW : width;
  const panelH = (LAYOUT === 'left') ? height : topBarH;
  
  // Background blue panel
  push();
  noStroke();
  fill(COLORS.blue);
  rect(0, 0, panelW, panelH);
  pop();
  
  // Text/content styling
  const padX = 10, padY = 8; 
  const contentW = panelW - padX * 2;
  textAlign(LEFT, TOP);
  noStroke();
  fill(255);
  
  if (mode === "select") {
  textSize(UI.fontTitle);
  text("Pick up to 3 tags", padX, padY+100, contentW);
  
  textSize(UI.fontBody);
  const bodyY = padY + (UI.fontTitle + 110);
  const bodyH = panelH - bodyY - 16;
  const picked = selected.map(s => s.label).join(", ") || "—";
  text(`Selected: ${picked}`, padX, bodyY, contentW, Math.max(0, bodyH));
  
} else {
  const node = hoveredNode || activeNode || null;

  // If nothing is hovered/active yet, show a friendly placeholder and bail early.
  if (!node) {
    textSize(UI.fontTitle);
    text("Explore the constellation", padX, padY + 100, contentW);
    textSize(UI.fontBody);
    const bodyY = padY + (UI.fontTitle + 8) + 100;
    const bodyH = panelH - bodyY - 40;
    text("Hover a node to preview details. Tap/click a node to open it and recenter.", 
         padX, bodyY, contentW, Math.max(0, bodyH));
    return;
  }

  // Title
  textSize(UI.fontTitle);
  text(node.title || node.label || "—", padX, padY + 100, contentW);

  // Description
  textSize(UI.fontBody);
  const desc = node.info?.desc || "Click a node to view details.";
  const bodyY = padY + (UI.fontTitle + 8) + 100;   // keep your +100 spacing once
  const bodyH = panelH - bodyY - 40;
  text(desc, padX, bodyY, contentW, Math.max(0, bodyH));

  // Meta rows at bottom
  const rowH = 18;
  const y0 = panelH - rowH * 2 - 200;   // keep your offset if you like the layout

  stroke(255, 180); strokeWeight(1);
  line(padX, y0 - 6, panelW - padX, y0 - 6);

  noStroke(); fill(255); textSize(12);
  textAlign(LEFT, CENTER);  text("TAGS", padX, y0);
  textAlign(RIGHT, CENTER); text((node.tags && node.tags.length) ? node.tags.join(", ") : "—", panelW - padX, y0);

  const y1 = y0 + rowH;
  stroke(255, 180); line(padX, y1 - 6, panelW - padX, y1 - 6);

  noStroke(); fill(255);
  textAlign(LEFT, CENTER);  text("CATEGORY", padX, y1);
  textAlign(RIGHT, CENTER); text(node.info?.category || "—", panelW - padX, y1);
}
}
