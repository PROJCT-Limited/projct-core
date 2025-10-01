// invitation.js
const PI = Math.PI, TWO_PI = Math.PI * 2;
let cnv;
// nice easing so it only gets *really* calm near the end
function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }


function initSpectra() {
  spectra = [
    new SpectrumSynth(256, 0.13),
    new SpectrumSynth(256, 0.57),
    new SpectrumSynth(256, 0.91),
  ];
}

class SpectrumSynth {
  constructor(bins = 256, seed = 0){
    this.bins = bins;
    this.y    = new Array(bins).fill(0);
    this.seed = seed;
    this.t    = 0;
  }
  update(dt, opts = {}){
    const {
      peaks = 6,
      drift = 0.12,
      amp   = 1.0,
      width = 0.08,
      jitter = 0.12,
      smooth = 0.25,
      centerBoost = 1.0,
    } = opts;

    this.t += dt;

    const target = new Array(this.bins).fill(0);
    for (let p = 0; p < peaks; p++){
      const kOff = this.seed*10 + p*37.17;
      const c = noise(kOff + this.t * drift) * 0.85 + 0.075;
      const w = width * (0.6 + 0.8 * noise(kOff + 100 + this.t * drift * 0.7));
      const h = amp * (0.6 + 0.8 * noise(kOff + 200 + this.t * drift * 1.3));
      for (let i = 0; i < this.bins; i++){
        const u = i / (this.bins - 1);
        const g = Math.exp(-0.5 * Math.pow((u - c) / (w + 1e-4), 2));
        target[i] += h * g;
      }
    }

    let maxv = 0;
    for (let i = 0; i < this.bins; i++) maxv = Math.max(maxv, target[i]);

    for (let i = 0; i < this.bins; i++){
      const u = i / (this.bins - 1);
      const env = bellTaper(u, 0.2, 2.0) * centerBoost;
    
      // 0..1
      const base01 = maxv > 0 ? target[i] / maxv : 0;
    
      // make it signed -1..1
      const baseSigned = (base01 - 0.5) * 2;
    
      // signed jitter too
      const grain = (noise(this.seed*100 + i*0.07 + this.t*0.8) - 0.5) * 2.0 * jitter;
    
      // final signed value, shaped by the envelope
      const vSigned = constrain((baseSigned + grain) * env, -1, 1);
    
      // time smoothing
      const k = 1.0 - Math.pow(1.0 - smooth, 60 * (deltaTime/1000));
      this.y[i] = lerp(this.y[i], vSigned, k);
    }
    return this.y; // now in [-1, 1]
    
  }
}
function mousePressed(){ pressAt(mouseX, mouseY); }
function mouseDragged(){ dragAt(mouseX, mouseY); }
function mouseReleased(){ selectedKnob = null; }

// p5 touch callbacks — returning false prevents page scroll
function touchStarted(){ const t = touches[0]; if (t) pressAt(t.x, t.y); return false; }
function touchMoved(){  const t = touches[0]; if (t) dragAt(t.x, t.y);  return false; }
function touchEnded(){ selectedKnob = null; return false; }


const TARGET = -PI / 2;  // straight up
const EPS = 0.2;        // lock tolerance (~14°)
let spectra = [];

let myFont;
function preload() {
  myFont = loadFont('./fonts/PPNeueMachina-InktrapLight.otf');
  
}
function smoothstep(a, b, x){
  let t = constrain((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
function bellTaper(u, minAmp = 0.18, sharpness = 1.9){
  const d = Math.abs(u - 0.5) / 0.5;        // 0 center..1 edges
  const s = 1.0 - smoothstep(0.0, 1.0, d);  // 1 center..0 edges
  return minAmp + (1.0 - minAmp) * Math.pow(s, sharpness);
}



const BOTTOM_MARGIN_DESK   = 140;
const BOTTOM_MARGIN_MOB    = 100;
const BAND_H_DESK          = 260;
const BAND_H_MOB           = 200;
const GAP_UNDER_KNOBS_DESK = 24;
const GAP_UNDER_KNOBS_MOB  = 12;



// Wave settings
const WAVE_SPEED   = 0.18;    
const WAVE_DETAIL  = 0.0016;  
const WAVE_OCTAVES = 4;       
const WAVE_PAD     = 10;       

// ---- fbm with variable octaves ----
function fbm(n, octaves = WAVE_OCTAVES) {
  let total = 0, amp = 1, freq = 1, norm = 0;
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
const X_STEP = 2;

// Per line: static multi-peak base, plus per-x modulation phase/rate (no lateral drift)
let baseShapes = [[], [], []];
let modPhase   = [[], [], []];
let modRate    = [[], [], []];
let spanPx     = 0;

function rebuildBaseAndMod(ww){
  spanPx = ww;
  const seeds = [0.73, 1.91, 3.41];   // per-line flavor

  for (let i = 0; i < 3; i++) {
    const arrBase = [], arrPhase = [], arrRate = [];

    // —— static many-peak base (harmonic bank, no time term) ——
    const K = 8;                                          // harmonics
    const baseCycles = 10 + Math.floor(noise(seeds[i]) * 22); // ~24..34 cycles
    const weights = [], phases = [];
    for (let k = 1; k <= K; k++) {
      const w = 1 / (k * 1.15) * map(noise(seeds[i] + k*2.11),0,1,0.8,1.25);
      weights.push(w);
      phases.push(map(noise(seeds[i] + k*4.31),0,1,0,TWO_PI));
    }

    for (let x = 0; x <= ww; x += X_STEP) {
      const u = x / ww;

      // base (stationary, lots of peaks)
      let s = 0;
      for (let k = 1; k <= K; k++) s += weights[k-1] * Math.sin(TWO_PI * (baseCycles*k) * u + phases[k-1]);
      arrBase.push(s / (1.0 + 0.58 * (K - 1))); // normalize-ish to -1..1

      // per-x modulation maps (smooth over x via noise → neighbors feel related)
      const n1 = noise(x*0.004 + seeds[i]*7.3);   // 0..1
      const n2 = noise(x*0.003 + seeds[i]*9.7);   // 0..1
      arrPhase.push(n1 * TWO_PI * 2.0);           // diverse phases (0..~4π)
      arrRate.push( map(n2, 0,1, 0.45, 1.25) );   // cycles/sec base rate, per-x
    }

    baseShapes[i] = arrBase;
    modPhase[i]   = arrPhase;
    modRate[i]    = arrRate;
  }
}




function setup() {
  initSpectra(); 
 
  const headerEl = document.querySelector('.header');
  const headerH = headerEl ? headerEl.offsetHeight : 0;

  cnv = createCanvas(windowWidth, windowHeight - headerH);
  window.cnv = cnv;
  cnv.position(0, headerH);
  rebuildBaseAndMod(width);
  textSize(16);

  // Initial knob layout based on canvas size
  const xs = [width/4, width/2, (3*width)/4];
  const labels = ['People', 'Process', 'Purpose'];

  knobs = [];
  for (let i = 0; i < 3; i++) {
    knobs.push(new Knob(xs[i], height * 0.85, 48, labels[i], LINE_COLORS[i]));
  }
  window.knobs = knobs;
  cnv.elt.style.touchAction = 'none'; // prevent page scroll when dragging knobs
applyResponsiveLayout();



  
  
  
}




function draw() {
  clear();

  // Draw knobs first (so lines sit "behind" labels visually)
  for (const k of knobs) k.display();


// —— WAVES: multi-peak, center-energized, no lateral travel ——
// —— WAVES: many stationary peaks, each peak breathes independently ——
// —— SPECTRUM-STYLE LINES (no audio input) ——
noFill();
strokeWeight(2.5);
strokeJoin(ROUND);
strokeCap(ROUND);

const now = millis() * 0.001;
const dt  = deltaTime / 1000.0;

// band geometry
const wx = 0, wy = height/2-200, ww = width, wh = 260;
const bandMidY = wy + wh * 0.6;
const bandMax  = (wh * 0.95 - WAVE_PAD);  // taller band? bump 0.95
for (let i = 0; i < 3; i++){
  const k    = knobs[i];
  const prog = constrain(k.progressToTarget(), 0, 1); // 0..1
  const bins = 1024;
  if (!spectra || spectra.length !== 3 || spectra[0].bins !== bins) {
    spectra = [ new SpectrumSynth(bins, 0.13),
                new SpectrumSynth(bins, 0.57),
                new SpectrumSynth(bins, 0.91) ];
  }

  // stronger calming only near alignment
  const calm = easeOutCubic(prog);       // 0 (free) → 1 (aligned)
  const vis  = 1 - calm;                 // use for alpha & amplitude

  // spectrum “feel” params (free → aligned)
  const peaks     = Math.round(lerp(18, 8, calm));        // fewer lobes
  const drift     = lerp(0.22, 0.02, calm);               // much slower
  const amp       = lerp(1.10, 0.10, calm);               // almost flat
  const widthNorm = lerp(0.035, 0.10, calm);              // slightly wider
  const jitter    = lerp(0.18, 0.00, calm);               // remove grain
  const smooth    = lerp(0.12, 0.85, calm);               // heavy smoothing
  const cBoost    = lerp(1.05, 1.00, calm);

  const vals = spectra[i].update(dt, {
    peaks, drift, amp, width: widthNorm, jitter, smooth, centerBoost: cBoost
  });


  let col = color(knobs[i].color);
  stroke(col);

  beginShape();
  curveVertex(wx - 20, bandMidY);

  // scale the vertical band by vis so it compresses toward the midline
  const bandScale = lerp(1.0, 0.12, calm); // 12% of height at green
  for (let b = 0; b < bins; b++){
    const u  = b / (bins - 1);
    const x  = wx + u * ww;
    // vals[b] is now in [-1, 1]
const y = bandMidY - vals[b] * bandMax * bandScale;

    curveVertex(x, y);
  }

  curveVertex(wx + ww + 20, bandMidY);
  endShape();
}



 

  // Trigger when all aligned
  if (!triggered && knobs.every(k => k.isAligned())) {
    triggered = true;
    setTimeout(() => window.location.replace("nodes.html"), 6000);
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
  rebuildBaseAndMod(width);

applyResponsiveLayout();

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

const MOBILE_BREAK = 768; // px
const isMobile = () => windowWidth <= MOBILE_BREAK;

// unify press/drag logic for mouse & touch
function pressAt(px, py){
  selectedKnob = null;
  for (const k of knobs) { if (k.contains(px, py)) { selectedKnob = k; break; } }
}
function dragAt(px, py){
  if (!selectedKnob) return;
  const dx = px - selectedKnob.x, dy = py - selectedKnob.y;
  selectedKnob.angle = Math.atan2(dy, dx) + PI/2;
}

// responsive knob layout (size + positions)
function applyResponsiveLayout(){
  const xsDesktop = [width/4, width/2, (3*width)/4];
  const xsMobile  = [width*0.18, width*0.5, width*0.82];
  const xs = isMobile() ? xsMobile : xsDesktop;
  const r = isMobile() ? 28 : 48;             
  const y = height * (isMobile() ? 0.80 : 0.85);

  knobs.forEach((k, i) => { k.x = xs[i]; k.y = y; k.r = r; });
}
