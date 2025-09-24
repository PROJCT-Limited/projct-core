// === Google Sheet → PROJECTS 
const GOOGLE_SHEET_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSusQjz8MYYWZ4E_IzJDHWYn7R9WjbmT8pKq76TNkJGemiBZuS298Ldop7y3xzRElo4tYuU8VXApoSQ/pub?gid=925317863&single=true&output=csv'; 


window.PROJECTS = window.PROJECTS || [];


function parseTags(str) {
  if (!str) return [];
  return String(str)
    .split(/[;,]/g)
    .map(s => s.trim())
    .filter(Boolean);
}

// build PROJECTS[] from combined rows
function rowsToProjects(rows) {
  const map = new Map(); // title -> project


  function ensureProject(title) {
    if (!map.has(title)) {
      map.set(title, {
        title,
        tags: [],
        info: { category: 'Project' },
        children: []
      });
    }
    return map.get(title);
  }

  for (const r of rows) {
    const kind         = (r.kind || '').toLowerCase().trim();   // 'project' | 'child'
    const parentTitle  = (r.parent_title || '').trim();
    const title        = (r.title || '').trim();
    if (!title) continue;

    const tags = parseTags(r.tags);
    const info = {
      category: r.category || (kind === 'child' ? 'Subnode' : 'Project'),
      desc: (r.desc || '').trim(),
      year: (r.year || '').trim(),
      type: (r.type || '').trim(),
      image: (r.image || '').trim()
    };

    if (kind === 'project' || !kind) {
      const p = ensureProject(title);

      // merge tags
      const set = new Set(p.tags);
      tags.forEach(t => set.add(t));
      p.tags = Array.from(set);

      // merge info (sheet wins if provided)
      p.info = { ...p.info, ...Object.fromEntries(
        Object.entries(info).filter(([_,v]) => v !== '')
      ) };
    } else if (kind === 'child') {
      if (!parentTitle) continue;
      const parent = ensureProject(parentTitle);

      // avoid duplicate children by title
      if (!parent.children.some(c => c.title === title)) {
        parent.children.push({
          title,
          tags,
          info: {
            category: info.category || 'Subnode',
            desc: info.desc || '',
            year: info.year || '',
            type: info.type || '',
            image: info.image || ''
          }
        });
      }
    }
  }

  // flatten to array
  return Array.from(map.values());
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
