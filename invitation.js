// invitation.js
const PI = Math.PI, TWO_PI = Math.PI * 2;
let cnv;

const TARGET = -PI / 2;  // straight up
const EPS = 0.25;        // lock tolerance (~14°)

let myFont;
function preload() {
  myFont = loadFont('./fonts/PPNeueMachina-InktrapLight.otf');
  
}

// Wave settings
const WAVE_SPEED   = 0.18;    
const WAVE_DETAIL  = 0.0016;  
const WAVE_OCTAVES = 4;       
const WAVE_PAD     = 10;       

// ---- fbm with variable octaves ----
function fbm(n, octaves = WAVE_OCTAVES) {
  let total = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    total += amp * noise(n * freq);
    norm  += amp;
    amp  *= 0.5;
    freq *= 2.0;
  }
  return total / norm; // 0..1
}

// Ring geometry
const RING_DEG = 260;
const RING_SPAN = RING_DEG * PI/180;
const RING_START = TARGET - RING_SPAN/2;
const RING_END   = TARGET + RING_SPAN/2;

// Colors
const COL_RING_BG = 225;       // light gray
const COL_POINTER = 255;       // white
const LINE_COLORS = ['#ff5a5f', '#00a699', '#4a90e2']; // line/knob/label colors

let knobs = [];
let selectedKnob = null;
let triggered = false;

function setup() {
  const headerEl = document.querySelector('.header');
  const headerH = headerEl ? headerEl.offsetHeight : 0;

  cnv = createCanvas(windowWidth, windowHeight - headerH);
  cnv.position(0, headerH);
  textSize(16);

  // Initial knob layout based on canvas size
  const xs = [width/4, width/2, (3*width)/4];
  const labels = ['People', 'Process', 'Purpose'];

  knobs = [];
  for (let i = 0; i < 3; i++) {
    knobs.push(new Knob(xs[i], height * 0.85, 48, labels[i], LINE_COLORS[i]));
  }
}

function draw() {
  clear();

  // Draw knobs first (so lines sit "behind" labels visually)
  for (const k of knobs) k.display();

  // Screen frame + waveform band
  const wx = 0, wy = 80, ww = width, wh = 260;

  noFill();
  noStroke();
  strokeWeight(2);
  rect(wx, wy, ww, wh, 12);

  const t = millis() * 0.001;

  //WAVES: each tied to one knob
  noFill();
  strokeWeight(2.5);
  strokeJoin(ROUND);
  strokeCap(ROUND);

  for (let i = 0; i < 3; i++) {
    const k = knobs[i];
    const prog = constrain(k.progressToTarget(), 0, 1); // 0..1 (closer to 1 = closer to target)

    // Roughness/detail shrinks as knob aligns (smoother curve when prog→1)
    const roughMult = map(1 - prog, 0, 1, 0.7, 2.2); // small→smooth, big→rough
    const detail = WAVE_DETAIL * roughMult;

    // More octaves when rough; fewer when aligned (cleaner)
    const octaves = Math.round(lerp(2, 6, 1 - prog));

    // Phase offset collapses toward 0 as knob aligns → curves "almost" match
    const baseOffset = (i + 1) * 7.123;           // unique per line
    const offset = baseOffset * lerp(0.05, 1.0, 1 - prog);

    // Draw line
    stroke(k.color);
    beginShape();
    curveVertex(wx - 20, wy + wh * 0.6); // padding vertex

    for (let x = 0; x <= ww; x += 2) {
      const nx = (x * detail) + (t * WAVE_SPEED) + offset;

      // core noise (centered -1..1)
      const n = (fbm(nx, octaves) - 0.5) * 2.0;

      // subtle envelope to avoid hitting top/bottom edges
      const env = map(fbm(nx * 0.25 + 100.0, 3), 0, 1, 0.88, 1.0);

      // amplitude — consistent across lines so they share a band
      const amp = (wh * 0.9 - WAVE_PAD) * env;

      // all three lines share the same vertical center ("aligned in height")
      const y = wy + wh * 0.6 + n * amp;
      curveVertex(wx + x, y);
    }

    curveVertex(wx + ww + 20, wy + wh * 0.6); // padding vertex
    endShape();
  }

  // Trigger when all aligned
  if (!triggered && knobs.every(k => k.isAligned())) {
    triggered = true;
    setTimeout(() => window.location.replace("nodes.html"), 2000);
  }
}

function mousePressed() {
  selectedKnob = null;
  for (const k of knobs) {
    if (k.contains(mouseX, mouseY)) { selectedKnob = k; break; }
  }
}

function mouseDragged() {
  if (!selectedKnob) return;
  const dx = mouseX - selectedKnob.x, dy = mouseY - selectedKnob.y;
  selectedKnob.angle = Math.atan2(dy, dx) + PI/2; // keep "up" as target
}

function mouseReleased() { selectedKnob = null; }

// ---------- helpers ----------
function normalizeAngle(a){ let v=((a+PI)%TWO_PI+TWO_PI)%TWO_PI; return v-PI; }
function drawWrappedArc(x,y,d,a0,a1){ let s=a0,e=a1; if(e<s) e+=TWO_PI; arc(x,y,d,d,s,e,OPEN); }
function wrappedSpan(a0,a1){ let s=a1-a0; if(s<=0) s+=TWO_PI; return s; }

// ---------- Knob ----------
class Knob {
  constructor(x,y,r,label,color){
    this.x = x;
    this.y = y;
    this.r = r;
    this.label = label;
    this.color = color;
    this.angle = Math.random()*TWO_PI - PI;

    this.el = createP(label);
    this.el.style('margin', '0');
    this.el.style('color', this.color);
    this.el.style('position', 'absolute');
    this.el.style('pointer-events', 'none');
    this.el.style('font-family', 'PPNeueMachina, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif');
    this.el.style('font-weight', '300');
    this.el.style('transform', 'translateX(-50%)');
  }

  contains(px,py){ return dist(px,py,this.x,this.y) < this.r; }
  isAligned(){ return Math.abs(normalizeAngle(this.angle - TARGET)) < EPS; }

  progressToTarget(){
    const d = Math.min(Math.abs(normalizeAngle(this.angle - TARGET)), PI); // 0..π
    return 1 - (d / PI);  // 0..1
  }

  display(){
    push(); translate(this.x, this.y);

    // Outer ring
    strokeWeight(12);
    stroke('white');
    drawWrappedArc(0, 0, (this.r + 16) * 2, RING_START, RING_END);

    // Progress arc (green when aligned)
    const span = wrappedSpan(RING_START, RING_END);
    const prog = constrain(this.progressToTarget(), 0, 1);
    if (this.isAligned()) {
      stroke(60, 190, 120);
    } else {
      stroke(this.color);
    }
    drawWrappedArc(0, 0, (this.r + 16) * 2, RING_START, RING_START + span * prog);

    // Knob body (match line color)
    noStroke();
    fill(this.color);
    circle(0, 0, this.r * 2);

    // Pointer
    stroke(COL_POINTER);
    strokeWeight(3);
    strokeCap(ROUND);
    const len = this.r * 0.85;
    line(0, 0, len * Math.cos(this.angle), len * Math.sin(this.angle));

    pop();


    const rect = cnv.elt.getBoundingClientRect();
    const pageX = rect.left + window.scrollX;
    const pageY = rect.top  + window.scrollY;
    const labelX = pageX + this.x;
    const labelY = pageY + this.y + this.r + 16;
    this.el.style('color', this.color);
    this.el.position(labelX, labelY);
  }
}

function windowResized() {
  const headerEl = document.querySelector('.header');
  const headerH = headerEl ? headerEl.offsetHeight : 0;

  resizeCanvas(windowWidth, windowHeight - headerH);
  cnv.position(0, headerH);

  const xs = [width/4, width/2, (3*width)/4];
  knobs[0].x = xs[0];
  knobs[1].x = xs[1];
  knobs[2].x = xs[2];
  knobs.forEach(k => k.y = height * 0.85);
}

// Custom cursor (unchanged)
const cursor = document.querySelector('.cursor');
window.addEventListener('mousemove', (e) => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top  = e.clientY + 'px';
  cursor.style.opacity = '1';
});
window.addEventListener('mouseleave', () => {
  cursor.style.opacity = '0';
});
