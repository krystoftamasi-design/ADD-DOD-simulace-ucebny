import { readFile, writeFile, rename, mkdir, readdir } from 'node:fs/promises';
import { randomInt, randomUUID } from 'node:crypto';

export async function openCatalog(root, categories, { allowEmpty = false } = {}) {
  let source;
  try { source = JSON.parse(await readFile(new URL('prace/showcase-digital-komplet/metadata.json', root), 'utf8')); }
  catch (error) { if (allowEmpty && error.code === 'ENOENT') source = { projects: [], assets: {} }; else throw error; }
  let descriptions = {};
  try { descriptions = JSON.parse(await readFile(new URL('popisy-praci.json', root), 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  let associations = {};
  try { associations = JSON.parse(await readFile(new URL('asociace-praci.json', root), 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  let videoIndex = { projects: [] };
  try { videoIndex = JSON.parse(await readFile(new URL('projekty-sjednocene.json', root), 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (!Array.isArray(videoIndex.projects)) throw new Error('Sjednocený index prací nemá platný seznam projektů.');
  const videos = new Map();
  const externalLinks = new Map();
  for (const project of videoIndex.projects) {
    if (typeof project.id !== 'string') continue;
    const valid = (Array.isArray(project.videos) ? project.videos : []).flatMap(video => {
      if (video.provider === 'youtube' && typeof video.video_id === 'string' && /^[\w-]{11}$/.test(video.video_id)) return [{ provider: 'youtube', video_id: video.video_id, url: `https://www.youtube.com/watch?v=${video.video_id}`, embed_url: `https://www.youtube.com/embed/${video.video_id}` }];
      if (video.provider === 'vimeo' && typeof video.video_id === 'string' && /^\d+$/.test(video.video_id)) return [{ provider: 'vimeo', video_id: video.video_id, url: `https://vimeo.com/${video.video_id}`, embed_url: `https://player.vimeo.com/video/${video.video_id}` }];
      return [];
    });
    videos.set(project.id, valid);
    const links = (Array.isArray(project.external_links) ? project.external_links : []).flatMap(link => {
      try {
        const url = new URL(link.url);
        if (!['http:', 'https:'].includes(url.protocol)) return [];
        return [{ url: url.href, label: typeof link.label === 'string' && link.label.trim() ? link.label : url.hostname }];
      } catch { return []; }
    });
    externalLinks.set(project.id, links);
  }
  const overridesPath = new URL('upravy-praci.json', root);
  const backupDir = new URL('zalohy-uprav/', root);
  let edits = {};
  try { edits = JSON.parse(await readFile(overridesPath, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const projects = new Map(source.projects.map(p => [p.id, p]));
  const images = new Map();
  for (const asset of Object.values(source.assets)) {
    const file = asset.image?.file;
    if (!file || !/^obrazky\/[^/\\]+\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(file)) continue;
    for (const use of asset.uses || []) {
      if (!projects.has(use.project_id)) continue;
      const list = images.get(use.project_id) || [];
      if (!list.some(x => x.file === file)) list.push({ file, role: use.role, position: use.gallery_position });
      images.set(use.project_id, list);
    }
  }
  const media = new Map();
  let mediaId = 0;
  for (const list of images.values()) {
    list.sort((a, b) => ({ hlavni_obrazek_detailu: 0, nahled: 1, galerie: 2 }[a.role] ?? 3) - ({ hlavni_obrazek_detailu: 0, nahled: 1, galerie: 2 }[b.role] ?? 3) || (a.position ?? 0) - (b.position ?? 0));
    for (const image of list) { image.url = `/media/${mediaId}`; media.set(String(mediaId++), image.file); }
  }
  const effective = p => {
    const edit = edits[p.id];
    const originalTags = p.tags || [];
    const currentTags = edit?.tags ?? originalTags;
    const hiddenImages = edit?.hiddenImages || [];
    const isEdited = (edit?.grade ?? p.grade) !== p.grade || currentTags.length !== originalTags.length || currentTags.some(tag => !originalTags.includes(tag)) || hiddenImages.length > 0;
    return { ...p, ...(edit || {}), hiddenImages, isEdited, description: descriptions[p.id] || '', images: (images.get(p.id) || []).map(image => ({ ...image, hidden: hiddenImages.includes(image.file) })), videos: videos.get(p.id) || [], external_links: externalLinks.get(p.id) || [] };
  };
  let index = new Map(), yearIndex = new Map(), gradeIndex = new Map(), last = new Map(), queue = Promise.resolve();
  function rebuild() {
    index = new Map(categories.map(c => [c.id, []]));
    yearIndex = new Map();
    gradeIndex = new Map();
    for (const p of projects.values()) {
      const work = effective(p);
      if (!['A', 'A+', 'F'].includes(work.grade) || !work.images.some(image => !image.hidden)) continue;
      const graded = gradeIndex.get(work.grade) || []; graded.push(p.id); gradeIndex.set(work.grade, graded);
      if (work.year) { const ids = yearIndex.get(work.year) || []; ids.push(p.id); yearIndex.set(work.year, ids); }
      for (const cat of categories) if (work.tags.includes(cat.name)) index.get(cat.id).push(p.id);
    }
  }
  rebuild();
  function pick(id, secondId = null, years = null, grade = null) {
    const second = secondId ? new Set(index.get(secondId) || []) : null;
    const yearsSet = years ? new Set(years.flatMap(year => yearIndex.get(year) || [])) : null;
    const graded = grade ? (gradeIndex.get(grade) || []) : [...(gradeIndex.get('A') || []), ...(gradeIndex.get('A+') || [])];
    const primary = id ? new Set(index.get(id) || []) : null;
    const candidates = graded.filter(candidate => (!primary || primary.has(candidate)) && (!second || second.has(candidate)) && (!yearsSet || yearsSet.has(candidate)));
    if (!candidates.length) return null;
    const key = `${secondId ? [id, secondId].sort().join('|') : id}|${years?.join('|') || ''}|${grade || ''}`;
    const available = candidates.length > 1 ? candidates.filter(x => x !== last.get(key)) : candidates;
    const chosen = available[randomInt(available.length)]; last.set(key, chosen);
    const work = effective(projects.get(chosen));
    return { ...work, images: work.images.filter(image => !image.hidden) };
  }
  function topicTerms(text) {
    const normalize = value => value.toLocaleLowerCase('cs').normalize('NFD').replace(/\p{M}/gu, '');
    const stop = new Set(['ukaz','ukazat','ukaž','vyhledej','vyhledat','vyhledam','najdi','najit','najdu','hledej','hledat','chci','chtel','chtela','prosim','nejake','nejaky','neco','zajima','zajimaji','zajimam','hledam','videt','vidim','prace','praci','pracu','praci','projekt','projekty','studentske','studentu','nejlepsi','nejhorsi','nejkrasnejsi','roku','rok','skolni','nejakou','ktere','ktery','ktera','nebo','takove','tykajici','tyka','tykaj','o','me','mi','a','se','je','to','v','z','na','pro','co','jak','bych','chtel bych']);
    return [...new Map((text.toLocaleLowerCase('cs').match(/[\p{L}]+/gu) || []).filter(word => word.length >= 4 && !stop.has(normalize(word))).map(word => [normalize(word), word])).values()].slice(0, 24);
  }
  // Přibližné porovnání vybraných českých tvarů; nejde o úplnou lemmatizaci.
  function topicStem(word) {
    if (/^zvir(?:e|ete|eti|etem|ata|at|aty|atum|atech)$/.test(word)) return 'zvir';
    if (/^(?:kun|kone|koni|konem|konech|konmi)$/.test(word)) return 'kun';
    if (/^(?:clovek|cloveka|cloveku|clovekem|lide|lidi|lidem|lidech|lidmi)$/.test(word)) return 'clovek';
    const endings = ['atech', 'etem', 'atum', 'emi', 'ami', 'ove', 'ovi', 'ove', 'ach', 'ich', 'ych', 'ama', 'em', 'um', 'ou', 'y', 'i', 'a', 'e', 'u'];
    const ending = endings.find(suffix => word.endsWith(suffix) && word.length - suffix.length >= 3);
    return ending ? word.slice(0, -ending.length) : word;
  }
  function searchTopic(text, years = null, grade = null) {
    const normalize = value => value.toLocaleLowerCase('cs').normalize('NFD').replace(/\p{M}/gu, '');
    const terms = topicTerms(text).map(normalize);
    if (!terms.length) return { attempted: false, project: null };
    const yearsSet = years ? new Set(years.flatMap(year => yearIndex.get(year) || [])) : null;
    const graded = grade ? (gradeIndex.get(grade) || []) : [...(gradeIndex.get('A') || []), ...(gradeIndex.get('A+') || [])];
    const candidates = graded.flatMap(id => {
      if (yearsSet && !yearsSet.has(id)) return [];
      const work = effective(projects.get(id));
      const extra = Array.isArray(associations[id]) ? associations[id].join(' ') : '';
      const words = normalize(`${work.title} ${work.description} ${extra}`).match(/[\p{L}]+/gu) || [];
      const matches = terms.every(term => words.some(word => word === term || topicStem(word) === topicStem(term) || (term.length >= 6 && word.length >= 6 && word.startsWith(term.slice(0, 6)))));
      return matches ? [work] : [];
    });
    if (!candidates.length) return { attempted: true, project: null };
    const preferred = !grade && candidates.some(work => work.grade === 'A+') ? candidates.filter(work => work.grade === 'A+') : candidates;
    const key = `text:${terms.join('|')}|${years?.join('|') || ''}|${grade || ''}`;
    const available = preferred.length > 1 ? preferred.filter(work => work.id !== last.get(key)) : preferred;
    const work = available[randomInt(available.length)]; last.set(key, work.id);
    return { attempted: true, project: { ...work, images: work.images.filter(image => !image.hidden) } };
  }
  function update(id, grade, tags, hiddenImages) {
    const task = async () => {
      if (!projects.has(id)) throw Object.assign(new Error('Práce nebyla nalezena.'), { status: 404 });
      const allowed = new Set([...categories.map(c => c.name), ...(projects.get(id).tags || [])]);
      if (!['A+','A','B','C','D','E','F'].includes(grade) || !Array.isArray(tags) || tags.length > allowed.size || tags.some(x => !allowed.has(x)) || new Set(tags).size !== tags.length) throw Object.assign(new Error('Neplatná známka nebo tagy.'), { status: 400 });
      hiddenImages ??= edits[id]?.hiddenImages || [];
      const allowedImages = new Set((images.get(id) || []).map(image => image.file));
      if (!Array.isArray(hiddenImages) || hiddenImages.some(file => !allowedImages.has(file)) || new Set(hiddenImages).size !== hiddenImages.length) throw Object.assign(new Error('Neplatný výběr obrázků.'), { status: 400 });
      const previous = effective(projects.get(id));
      await mkdir(backupDir, { recursive: true });
      const stamp = new Date().toISOString();
      const backup = { timestamp: stamp, projectId: id, title: previous.title, previous: { grade: previous.grade, tags: previous.tags, hiddenImages: previous.hiddenImages, savedAt: edits[id]?.savedAt || null }, overrides: edits };
      await writeFile(new URL(`${stamp.replace(/[:.]/g, '-')}-${randomUUID()}.json`, backupDir), JSON.stringify(backup, null, 2), { encoding: 'utf8', flag: 'wx' });
      const next = { ...edits, [id]: { grade, tags, hiddenImages, savedAt: stamp } };
      const temp = new URL('upravy-praci.tmp', root);
      await writeFile(temp, JSON.stringify(next, null, 2), 'utf8'); await rename(temp, overridesPath);
      edits = next; rebuild(); return effective(projects.get(id));
    };
    const result = queue.then(task); queue = result.catch(() => {}); return result;
  }
  async function history(id) {
    if (!projects.has(id)) throw Object.assign(new Error('Práce nebyla nalezena.'), { status: 404 });
    await queue;
    let files; try { files = await readdir(backupDir); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
    const versions = [];
    const current = effective(projects.get(id));
    let after = { grade: current.grade, tags: [...current.tags], hiddenImages: [...current.hiddenImages] };
    for (const file of files.filter(x => x.endsWith('.json')).sort().reverse()) {
      const snapshot = JSON.parse(await readFile(new URL(file, backupDir), 'utf8'));
      if (snapshot.projectId === id) {
        const previous = snapshot.previous;
        versions.push({ timestamp: snapshot.timestamp, ...previous, hiddenImages: previous.hiddenImages || [], after });
        after = { grade: previous.grade, tags: [...previous.tags], hiddenImages: [...(previous.hiddenImages || [])] };
      }
    }
    return versions;
  }
  return { categories, list: () => [...projects.values()].map(effective), pick, topicTerms, searchTopic, update, history, media: id => media.get(id) };
}
