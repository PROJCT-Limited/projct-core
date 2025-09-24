// === Google Sheet → PROJECTS 
const GOOGLE_SHEET_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSusQjz8MYYWZ4E_IzJDHWYn7R9WjbmT8pKq76TNkJGemiBZuS298Ldop7y3xzRElo4tYuU8VXApoSQ/pub?gid=925317863&single=true&output=csv'; 


window.PROJECTS = window.PROJECTS || [];

// --- add once, near your loader ---
function val(v) { return v == null ? "" : String(v).trim(); }

// Case-insensitive getter with alias list
function getAny(row, keys) {
  // build a lowercase index once per row
  if (!row.__lc) {
    const lc = {};
    for (const [k, v] of Object.entries(row)) lc[k.toLowerCase().trim()] = v;
    row.__lc = lc;
  }
  for (const k of keys) {
    const v = row.__lc[k.toLowerCase().trim()];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

// Accept comma/semicolon/pipe or JSON array
function parseTagsFlexible(x) {
  const s = val(x);
  if (!s) return [];
  if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr.map(t => String(t).trim()).filter(Boolean);
    } catch(_) {}
  }
  return s.split(/[,\|;]+/).map(t => t.trim()).filter(Boolean);
}

// --- REPLACE your rowsToProjects with this version ---
function rowsToProjects(rows) {
  const map = new Map(); // title -> project

  function ensureProject(title) {
    if (!map.has(title)) {
      map.set(title, {
        title,
        tags: [],
        info: { category: "Project" },
        children: []
      });
    }
    return map.get(title);
  }

  for (const r of rows) {
    const title = getAny(r, ["title", "node_title", "project_title"]);
    if (!title) continue;

    // explicit kind OR infer from presence of parent
    const kindRaw = getAny(r, ["kind", "node_kind", "row_kind"]).toLowerCase();
    const parent  = getAny(r, ["parent_title", "parent", "project_parent"]);
    const kind    = kindRaw || (parent ? "child" : "project");

    // tags + info (accept many header variants)
    const tags = parseTagsFlexible(getAny(r, ["tags", "node_tags", "project_tags", "child_tags"]));

    const info = {
      category: getAny(r, ["category", "node_category", "project_category"]) || (kind === "child" ? "Subnode" : "Project"),
      desc:  getAny(r, ["desc", "node_desc", "project_desc"]),
      year:  getAny(r, ["year", "project_year"]),
      type:  getAny(r, ["type", "project_type", "node_type"]),
      image: getAny(r, ["image", "project_image", "node_image"]),
    };

    if (kind === "project") {
      const p = ensureProject(title);

      // union tags
      const set = new Set(p.tags);
      for (const t of tags) set.add(t);
      p.tags = Array.from(set);

      // merge non-empty info fields (sheet wins)
      for (const [k, v] of Object.entries(info)) if (v !== "") p.info[k] = v;

    } else { // child
      if (!parent) continue;
      const p = ensureProject(parent);
      if (!p.children.some(c => c.title === title)) {
        p.children.push({
          title,
          tags,
          info: {
            category: info.category || "Subnode",
            desc: info.desc || "",
            year: info.year || "",
            type: info.type || "",
            image: info.image || ""
          }
        });
      }
    }
  }

  const projects = Array.from(map.values());

  // Debug: verify a couple of rows actually have year/type
  const dbg = projects.slice(0, 3).map(p => ({ title: p.title, year: p.info.year, type: p.info.type }));
  console.log("[rowsToProjects] sample:", dbg);

  return projects;
}


function parseCsv(text) {
  if (window.Papa && typeof Papa.parse === 'function') {
    const out = Papa.parse(text, { header: true, skipEmptyLines: true });
    return out.data || [];
  }
  // VERY simple fallback (quotes not fully supported)
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(',').map(h => h.trim());
  return lines.map(line => {
    const cells = line.split(','); // naive
    const obj = {};
    headers.forEach((h, i) => obj[h] = (cells[i] || '').trim());
    return obj;
  });
}

// main loader
async function loadProjectsFromSheet(url) {
  const res  = await fetch(url, { cache: 'no-store' });
  const csv  = await res.text();
  const rows = parseCsv(csv);
  const projects = rowsToProjects(rows);


  window.PROJECTS = projects;
  if (typeof rebuildRegistries === 'function') rebuildRegistries();



  console.log('[Sheet] Loaded projects:', projects.length);
}

async function loadProjectsFromSheet(url) {
    const res  = await fetch(url, { cache: 'no-store' });
    const csv  = await res.text();
    const rows = parseCsv(csv);
    const projects = rowsToProjects(rows);
  
    window.PROJECTS = projects;
  
    if (typeof rebuildRegistries === "function") rebuildRegistries();
  
    // If already in graph mode, re-center so the blue panel picks up new info
    if (typeof mode !== "undefined" && mode === "graph" && typeof centerNode !== "undefined" && centerNode) {
      if (typeof focusNodeGraph === "function") {
        focusNodeGraph(centerNode);
      } else if (typeof centerCameraOnNode === "function") {
        centerCameraOnNode(centerNode, false);
      }
    }
  
    console.log("[Sheet] Loaded projects:", projects.length);
  }
  