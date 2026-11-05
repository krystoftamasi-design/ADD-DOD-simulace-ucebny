const managerToggle = document.querySelector('#manager-toggle');
managerToggle.addEventListener('click', () => {
  const enabled = managerToggle.getAttribute('aria-expanded') !== 'true';
  managerToggle.setAttribute('aria-expanded', String(enabled));
  managerToggle.textContent = enabled ? 'Zavřít manažer' : 'Manažer';
  document.querySelector('#manager-tools').hidden = !enabled;
  document.querySelector('#manager-animation').hidden = !enabled;
});
const canvas = document.querySelector('#scene');
const ctx = canvas.getContext('2d');
const project = document.querySelector('#project');
const selectedWork = document.querySelector('#selected-work');
let hasSelectedWork = false;
const status = document.querySelector('#status');
const transcript = document.querySelector('#transcript');
const buttons = [...document.querySelectorAll('[data-state]')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let width = 1, height = 1, state = 'idle', stateStart = performance.now(), originX = .25, positionX = .25;
let timers = [], demoRunning = false;
let requestBusy = false;
const defaultProject = { tag: 'UKÁZKOVÝ OBSAH / 3D', title: 'Prostor pro studentskou práci', description: 'Sem se později načte skutečný projekt.' };
function showProject(content) {
  hasSelectedWork = !!content.work;
  selectedWork.hidden = true;
  const works = content.works || (content.work ? [content.work] : []);
  selectedWork.replaceChildren();
  for (const work of works) {
    const card = document.createElement('article'); card.className = 'admin-work selected-work-card';
    const info = document.createElement('div'); info.className = 'admin-info';
    const title = document.createElement('h2'); title.textContent = work.title;
    const meta = document.createElement('p'); meta.className = 'admin-meta'; meta.textContent = `${work.author} · ${work.year}`;
    const description = document.createElement('p'); description.className = 'work-description'; description.textContent = work.description || 'Popis práce není dostupný.';
    const tag = document.createElement('p'); tag.className = 'selected-work-tag'; tag.textContent = `Vybraný tag: ${content.tag} · Známka: ${work.grade}`;
    info.append(title, meta, description, tag);
    const gallery = document.createElement('aside'); gallery.className = 'work-gallery';
    const heading = document.createElement('h3'); heading.textContent = `Obrázky (${work.images.length})`;
    const grid = document.createElement('div'); grid.className = 'work-gallery-grid';
    work.images.forEach((image, index) => {
      const link = document.createElement('a'); link.href = image.url; link.target = '_blank'; link.rel = 'noopener';
      const img = document.createElement('img'); img.src = image.url; img.alt = `${work.title}, obrázek ${index + 1}`; img.loading = 'lazy';
      link.append(img); grid.append(link);
    });
    gallery.append(heading, grid); card.append(info, gallery); selectedWork.append(card);
  }
  project.querySelector('.project-tag').textContent = content.tag;
  project.querySelector('h2').textContent = content.title;
  project.querySelector('p').textContent = content.description;
  project.querySelector('.sculpture').replaceChildren();
  if (content.image) { const img = document.createElement('img'); img.src = content.image; img.alt = content.title; project.querySelector('.sculpture').append(img); }
  else project.querySelector('.sculpture').textContent = '◇';
}
const labels = { idle: 'Čeká na návštěvníka', listening: 'Naslouchá', thinking: 'Přemýšlí nad požadavkem', flying: 'Letí na druhý displej', presenting: 'Představuje práci' };
const hints = { idle: 'Připraveno na dalšího návštěvníka.', listening: 'Simulace: návštěvník mluví do mikrofonu…', thinking: 'Průvodce vybírá kategorii.', flying: 'Předání postavy z displeje 01 na displej 02.', presenting: 'Průvodce představuje vybranou práci.' };
function resize() {
  const box = canvas.getBoundingClientRect();
  width = box.width; height = box.height;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
new ResizeObserver(resize).observe(canvas);
function cancelDemo() { timers.forEach(clearTimeout); timers = []; demoRunning = false; document.querySelector('#demo').textContent = 'Přehrát scénář ↗'; }
function setState(next) {
  originX = positionX; state = next; stateStart = performance.now();
  if (next !== 'flying') positionX = next === 'presenting' ? .75 : .25;
  if (next === 'flying' && originX > .5) originX = .25;
  project.hidden = next !== 'presenting';
  selectedWork.hidden = next !== 'presenting' || !hasSelectedWork;
  status.textContent = labels[next]; transcript.textContent = hints[next];
  buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.state === next)));
}
buttons.forEach(button => button.addEventListener('click', () => { if (requestBusy) return; cancelDemo(); showProject(defaultProject); setState(button.dataset.state); }));
document.querySelector('#demo').addEventListener('click', () => {
  if (requestBusy) return;
  showProject(defaultProject);
  if (demoRunning) { cancelDemo(); setState('idle'); return; }
  cancelDemo(); demoRunning = true; document.querySelector('#demo').textContent = 'Zastavit scénář ■'; setState('idle');
  [[700, 'listening'], [3000, 'thinking'], [5000, 'flying'], [6900, 'presenting']].forEach(([delay, next]) => timers.push(setTimeout(() => setState(next), delay)));
  timers.push(setTimeout(cancelDemo, 7000));
});
function circle(x, y, r, color) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
function draw(now) {
  const t = (now - stateStart) / 1000, still = reducedMotion.matches;
  ctx.clearRect(0, 0, width, height);
  const r = Math.min(43, width * .061), wave = still ? 0 : Math.sin(t * 2.4);
  let y = height * .45 + wave * 7, stretch = 1, rotation = 0;
  if (state === 'flying') {
    const p = Math.min(t / 1.8, 1), smooth = p * p * (3 - 2 * p);
    positionX = still ? .75 : originX + (.75 - originX) * smooth;
    y = height * (.45 + .34 * smooth) - (still ? 0 : Math.sin(p * Math.PI) * height * .28);
    stretch = still ? 1 : 1 + Math.sin(p * Math.PI) * .18;
    rotation = still ? 0 : Math.sin(p * Math.PI) * -.18;
    if (p === 1) { setState('presenting'); }
  }
  if (state === 'presenting') { positionX = .75; y = height * .79; }
  const x = positionX * width;
  ctx.save(); ctx.globalAlpha = .12; ctx.fillStyle = '#526340'; ctx.beginPath(); ctx.ellipse(x, height * (state === 'presenting' ? .93 : .77), r * .9, r * .15, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  if (state === 'listening') {
    for (let i = 0; i < 3; i++) { const p = still ? i / 3 : (t * .65 + i / 3) % 1; ctx.beginPath(); ctx.arc(x, y, r + 8 + p * 35, 0, Math.PI * 2); ctx.strokeStyle = `rgba(115,149,75,${(1-p)*.35})`; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  if (state === 'thinking') {
    for (let i = 0; i < 3; i++) circle(x + (i-1)*14, y-r-23 + (still ? 0 : Math.sin(t*5-i)*3), 3, '#7b925d');
    rotation = still ? 0 : Math.sin(t*2)*.09;
  }
  if (state === 'flying' && !still) {
    ctx.strokeStyle = '#9aae87'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i=0;i<3;i++) { ctx.beginPath(); ctx.moveTo(x-r-15-i*8,y+(i-1)*12); ctx.lineTo(x-r-35-i*8,y+(i-1)*12); ctx.stroke(); }
  }
  ctx.save(); ctx.translate(x,y); ctx.rotate(rotation); ctx.scale(stretch, 1/stretch);
  const gradient = ctx.createRadialGradient(-r*.35,-r*.4,2,0,0,r*1.2); gradient.addColorStop(0,'#e4f6b9'); gradient.addColorStop(.6,'#bcd883'); gradient.addColorStop(1,'#91b35f');
  circle(0,0,r,gradient);
  const blink = !still && state !== 'listening' && t % 4.8 > 4.62;
  const look = state === 'thinking' ? -3 : state === 'flying' ? 4 : 0;
  for (const side of [-1,1]) { ctx.save(); ctx.translate(side*r*.25+look,-r*.04); ctx.scale(1,blink?.13:1); circle(0,0,r*.075,'#34412b'); ctx.restore(); }
  ctx.strokeStyle = '#485a36'; ctx.lineWidth = 1.7; ctx.lineCap='round'; ctx.beginPath();
  if(state==='listening') ctx.arc(0,r*.22,r*.055,0,Math.PI*2); else ctx.arc(0,r*.13,r*.16,.2,Math.PI-.2);
  ctx.stroke();
  if(state==='presenting') { ctx.beginPath(); ctx.moveTo(r*.78,-r*.1); ctx.quadraticCurveTo(r*1.35,-r*.2,r*1.1,-r*.9); ctx.stroke(); circle(r*1.1,-r*.9,3,'#485a36'); }
  ctx.restore(); requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

const modelSelect = document.querySelector('#model-select');
const connectionStatus = document.querySelector('#connection-status');
const resultText = document.querySelector('#request-result');
const refreshModels = document.querySelector('#refresh-models');
const feedback = document.querySelector('#feedback');
const feedbackForm = document.querySelector('#feedback-form');
const feedbackCategory = document.querySelector('#feedback-category');
const feedbackSecond = document.querySelector('#feedback-second');
const missingButton = document.querySelector('#feedback-missing');
const missingForm = document.querySelector('#feedback-missing-form');
const missingCategory = document.querySelector('#feedback-missing-category');
const feedbackStatus = document.querySelector('#feedback-status');
let feedbackRecord = null;
const confirmFeedback = document.querySelector('#feedback-confirm');
function setFeedbackReady(ready) {
  [confirmFeedback, document.querySelector('#feedback-open'), missingButton, feedbackForm.querySelector('button'), missingForm.querySelector('button')].forEach(control => { control.disabled = !ready; });
  if (!ready) feedbackStatus.textContent = 'Po vyhodnocení věty můžeš potvrdit nebo opravit vybrané tagy.';
  else feedbackStatus.textContent = '';
}
setFeedbackReady(false);
confirmFeedback.addEventListener('click', async () => {
  if (!feedbackRecord) return;
  const buttons = [confirmFeedback, document.querySelector('#feedback-open'), missingButton]; const controls = [...buttons, feedbackForm.querySelector('button'), missingForm.querySelector('button')]; controls.forEach(b => b.disabled = true);
  try { await api('/api/category-feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...feedbackRecord, verdict: 'confirmed', correctId: feedbackRecord.selectedId, correctIds: feedbackRecord.selectedIds }) }); feedbackForm.hidden = true; missingForm.hidden = true; buttons.forEach(b => b.hidden = true); feedbackStatus.textContent = 'Potvrzení bylo uloženo.'; }
  catch (error) { feedbackStatus.textContent = `Potvrzení se nepodařilo uložit: ${error.message}`; }
  finally { controls.forEach(b => b.disabled = false); }
});
document.querySelector('#feedback-open').addEventListener('click', () => { missingForm.hidden = true; feedbackForm.hidden = false; feedbackStatus.textContent = ''; feedbackCategory.focus(); });
missingButton.addEventListener('click', () => { feedbackForm.hidden = true; missingForm.hidden = false; missingCategory.value = ''; feedbackStatus.textContent = ''; missingCategory.focus(); });
missingForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!feedbackRecord || feedbackRecord.selectedIds.length !== 1) return;
  if (missingCategory.value === feedbackRecord.selectedIds[0]) { feedbackStatus.textContent = 'Vyber jiný tag než ten, který už model vybral.'; return; }
  const controls = [confirmFeedback, document.querySelector('#feedback-open'), missingButton, missingForm.querySelector('button')]; controls.forEach(control => control.disabled = true);
  const correctIds = [feedbackRecord.selectedIds[0], missingCategory.value];
  try { await api('/api/category-feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...feedbackRecord, verdict: 'corrected', correctId: correctIds[0], correctIds }) }); missingForm.hidden = true; controls.slice(0, 3).forEach(control => control.hidden = true); feedbackStatus.textContent = 'Oprava byla uložena.'; }
  catch (error) { feedbackStatus.textContent = `Opravu se nepodařilo uložit: ${error.message}`; }
  finally { controls.forEach(control => control.disabled = false); }
});
feedbackForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!feedbackRecord) return;
  if (feedbackCategory.value === 'unknown' && feedbackSecond.value) { feedbackStatus.textContent = 'U volby „Žádný oborový tag“ nemůže být vybraný druhý tag.'; return; }
  const correctIds = feedbackCategory.value === 'unknown' ? [] : [feedbackCategory.value, ...(feedbackSecond.value ? [feedbackSecond.value] : [])];
  if (new Set(correctIds).size !== correctIds.length) { feedbackStatus.textContent = 'Vyber dva různé tagy.'; return; }
  if (correctIds.length === feedbackRecord.selectedIds.length && correctIds.every(id => feedbackRecord.selectedIds.includes(id))) { feedbackStatus.textContent = 'Vyber jiný výsledek, než vybral model.'; return; }
  const button = feedbackForm.querySelector('button'); button.disabled = true;
  confirmFeedback.disabled = true; missingButton.disabled = true;
  try { await api('/api/category-feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...feedbackRecord, verdict: 'corrected', correctId: correctIds[0] || 'unknown', correctIds }) }); feedbackForm.hidden = true; document.querySelector('#feedback-open').hidden = true; confirmFeedback.hidden = true; missingButton.hidden = true; feedbackStatus.textContent = 'Oprava byla uložena.'; }
  catch (error) { feedbackStatus.textContent = `Opravu se nepodařilo uložit: ${error.message}`; }
  finally { button.disabled = false; confirmFeedback.disabled = false; missingButton.disabled = false; }
});
async function api(path, options) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error || 'Server není dostupný.'); error.diagnostics = data.diagnostics; throw error; }
  return data;
}
async function loadModels() {
  if (location.protocol === 'file:') {
    connectionStatus.textContent = 'Pro připojení modelu spusť node server.mjs a otevři http://127.0.0.1:3000 v Chrome.';
    modelSelect.replaceChildren(new Option('Otevři aplikaci přes server', '')); return;
  }
  refreshModels.disabled = true; connectionStatus.textContent = 'Hledám lokální modely…';
  const previous = modelSelect.value;
  try {
    const { models } = await api('/api/models');
    modelSelect.replaceChildren(...(models.length ? models.map(name => new Option(name, name)) : [new Option('Žádný stažený model', '')]));
    if (models.includes(previous)) modelSelect.value = previous;
    else if (models.includes('tev1:4b')) modelSelect.value = 'tev1:4b';
    else if (models.includes('tev1:latest')) modelSelect.value = 'tev1:latest';
    connectionStatus.textContent = models.length ? 'Ollama je připojená. Vyber model a odešli požadavek.' : 'Ollama běží, ale nemá stažený model. Přidej model v Ollama a obnov seznam.';
  } catch (error) { modelSelect.replaceChildren(new Option('Model není dostupný', '')); connectionStatus.textContent = error.message; }
  finally { refreshModels.disabled = false; }
}
refreshModels.addEventListener('click', loadModels);
document.querySelector('#request-form').addEventListener('submit', async event => {
  event.preventDefault(); if (requestBusy) return;
  const text = document.querySelector('#request-text').value.trim();
  if (!text || !modelSelect.value) { resultText.textContent = 'Zadej požadavek a vyber dostupný model.'; return; }
  cancelDemo(); requestBusy = true; setState('thinking');
  feedback.hidden = false; feedbackForm.hidden = true; missingForm.hidden = true; missingButton.hidden = true; document.querySelector('#feedback-open').hidden = false; confirmFeedback.hidden = false; feedbackRecord = null; setFeedbackReady(false);
  beginInspection(text, modelSelect.value);
  transcript.textContent = 'Lokální model vybírá kategorii…'; resultText.textContent = '';
  const locked = [...buttons, document.querySelector('#demo'), document.querySelector('#submit-request'), refreshModels, modelSelect];
  locked.forEach(control => control.disabled = true);
  try {
    const data = await api('/api/classify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, model: modelSelect.value }) });
    completeInspection(data);
    const d = data.diagnostics || {};
    const answer = d.response?.answers?.category;
    const rejectedAtStart = d.relevanceResponse?.answers?.relevance?.choice === 'ne';
    feedbackRecord = { requestId: crypto.randomUUID(), text, model: modelSelect.value, selectedId: data.category?.id || 'unknown', selectedIds: (data.categories || []).map(c => c.id), diagnostics: { endpoint: d.endpoint || null, durationMs: d.durationMs ?? null, confidence: answer?.confidence ?? null, scores: d.tagScores ?? answer?.probabilities ?? null, usage: d.response?.usage ?? null, request: d.request || null, answers: d.response?.answers ?? null, selectionRules: d.selectionRules ?? null } }; feedbackSecond.value = ''; missingButton.hidden = feedbackRecord.selectedIds.length !== 1; feedback.hidden = false; setFeedbackReady(true);
    try { await api('/api/category-feedback', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ ...feedbackRecord, verdict:'automatic', correctId:feedbackRecord.selectedId, correctIds:feedbackRecord.selectedIds }) }); feedbackStatus.textContent = 'Výsledek se automaticky uložil; můžeš jej opravit.'; } catch (error) { feedbackStatus.textContent = `Automatické uložení se nepodařilo: ${error.message}`; }
    if (!data.category) { setState('idle'); resultText.textContent = data.clarification || 'Zkus popsat, jaký typ studentské práce chceš vidět.'; transcript.textContent = rejectedAtStart ? 'Tev1 požadavek při úvodním posouzení vyhodnotil jako nesouvisející se studentskou prací.' : 'Model nevybral žádný tag ani téma.'; return; }
    if (!data.projectsConnected) { setState('idle'); resultText.textContent = 'Katalog prací není připojený. Pro zobrazení prací nastav DOD_DATA_DIR podle návodu.'; return; }
    if (!data.project && data.searchMode === 'text') { setState('idle'); resultText.textContent = `Pro téma „${data.searchTerm}“ jsem v názvech, jménech autorů, dostupných popisech ani souvisejících slovech nenašel odpovídající práci. Zkus jiné nebo jednodušší vyjádření.`; return; }
    if (!data.project) { setState('idle'); resultText.textContent = `Pro zadané podmínky${data.years ? ` a školní rok ${data.years.join(' nebo ')}` : ''} není dostupná žádná práce se známkou ${data.quality === 'best' ? `v pořadí ${data.qualityOrder?.join(' → ') || 'A+ / A → B → C → D → E → F'}` : data.quality === 'worst' ? 'v pořadí F → E → D → C → B → A → A+' : 'A nebo A+'} a obrázkem.`; return; }
    const qualityLabel = data.quality === 'best' ? 'Nejlepší' : data.quality === 'worst' ? 'Nejhorší' : '';
    const chosenTags = [...data.categories.map(c => c.name), qualityLabel].filter(Boolean).join(' + ') || 'školní rok';
    const matchedTags = [...data.matchedCategories.map(c => c.name), data.gradeFallback ? '' : qualityLabel].filter(Boolean).join(' + ') || 'Školní rok';
    showProject({ tag: matchedTags, title: data.project.title, description: `${data.project.author} · ${data.project.year} · ${data.project.grade}`, image: data.project.images[0]?.url, work: data.project, works: data.projects });
    const gradeMessage = data.gradeFallback ? data.quality === 'best' ? ` Známka A+ ani A nebyla při ostatních podmínkách dostupná; podle pořadí ${data.qualityOrder?.join(' → ') || 'A+ / A → B → C → D → E → F'} zobrazuji práci se známkou ${data.project.grade}.` : ` Známka F nebyla při ostatních podmínkách dostupná; zobrazuji práci se známkou ${data.project.grade}.` : '';
    const tagFallbackMessage = data.fallback ? ` Práci se všemi tagy se nepodařilo najít; druhý tag se neuplatnil.` : '';
    resultText.textContent = data.searchMode === 'text' ? `Pro téma „${data.searchTerm}“ jsem našel ${(data.projects || [data.project]).length} prací podle shody v názvu, jménu autora, popisu nebo souvisejících slovech. Zkontroluj, jestli odpovídají tvému zájmu.${gradeMessage}` : `Kategorické tagy: ${data.categories.map(c => c.name).join(' + ')}. Jiné tagy: ${[qualityLabel, ...(data.years || [])].filter(Boolean).join(' + ') || 'žádné'}.${gradeMessage}${tagFallbackMessage} Nalezeno prací: ${(data.projects || [data.project]).length}.`;
    setState('flying');
  } catch (error) { completeInspection({ error: error.message, diagnostics: error.diagnostics }); setState('idle'); resultText.textContent = error.message; transcript.textContent = 'Požadavek se nepodařilo dokončit.'; }
  finally { requestBusy = false; locked.forEach(control => control.disabled = false); }
});
let categoryNames = new Map();
async function loadCategories() {
  if (location.protocol === 'file:') return;
  try { const { categories } = await api('/api/categories'); categoryNames = new Map(categories.map(category => [category.id, category.name])); feedbackCategory.replaceChildren(new Option('Vyber správný tag', ''), new Option('Žádný oborový tag', 'unknown'), ...categories.map(category => new Option(category.name, category.id))); feedbackSecond.replaceChildren(new Option('Žádný druhý tag', ''), ...categories.map(category => new Option(category.name, category.id))); missingCategory.replaceChildren(new Option('Vyber chybějící tag', ''), ...categories.map(category => new Option(category.name, category.id))); document.querySelector('#category-list').replaceChildren(...categories.map(category => { const chip = document.createElement('span'); chip.textContent = category.name; return chip; })); }
  catch { /* Connection information is displayed by loadModels. */ }
}
loadModels(); const categoriesReady = loadCategories();

const inspect = id => document.querySelector(`#${id}`);
inspect('toggle-dashboard').addEventListener('click', () => {
  const collapsed = !inspect('decision-body').hidden;
  inspect('decision-body').hidden = collapsed;
  inspect('toggle-dashboard').setAttribute('aria-expanded', String(!collapsed));
  inspect('toggle-dashboard').textContent = collapsed ? 'Zobrazit podrobnosti ↓' : 'Skrýt podrobnosti ↑';
});
let decisions = [], selectedDecision = null, pendingDecision = null;
function beginInspection(text, model) {
  pendingDecision = { diagnostics: { input: text, model }, pending: true, time: new Date().toLocaleTimeString('cs-CZ') };
  selectedDecision = pendingDecision;
  renderInspection(pendingDecision);
  renderDecisionHistory();
}
function completeInspection(data) {
  const record = { ...pendingDecision, ...data, diagnostics: data.diagnostics || pendingDecision?.diagnostics, pending: false };
  pendingDecision = null;
  decisions.unshift(record); decisions = decisions.slice(0, 10);
  selectedDecision = record;
  renderInspection(record); renderDecisionHistory();
}
function renderInspection(record) {
  const d = record?.diagnostics || {};
  const answer = d.tagScores ? { probabilities: d.tagScores, choice: record?.category?.id } : d.response?.answers?.category;
  const criteria = d.request?.questions?.category?.criteria || {};
  const topicAnswer = d.topicResponse?.answers?.topic;
  const relevance = d.relevanceResponse?.answers?.relevance?.choice;
  const phase = record?.pending ? 'Model zpracovává…' : record?.error ? 'Chyba požadavku' : record ? 'Dokončeno' : 'Čeká na požadavek';
  inspect('decision-phase').textContent = phase;
  inspect('decision-phase').dataset.phase = record?.pending ? 'pending' : record?.error ? 'error' : 'done';
  inspect('inspect-model').textContent = d.model || '—';
  inspect('inspect-time').textContent = Number.isFinite(d.durationMs) ? `${(d.durationMs / 1000).toLocaleString('cs-CZ', { maximumFractionDigits: 3 })} s` : '—';
  inspect('inspect-confidence').textContent = Number.isFinite(topicAnswer?.confidence) ? `${(topicAnswer.confidence * 100).toFixed(1)} %` : '—';
  const usage = d.response?.usage;
  inspect('inspect-tokens').textContent = usage ? `${usage.input_tokens ?? '—'} / ${usage.output_tokens ?? '—'}` : '—';
  inspect('inspect-input').textContent = d.input || 'Odešli požadavek výše.';
  const selected = record?.categories || [];
  const matched = record?.matchedCategories || [];
  const statusText = record?.pending ? 'Probíhá…' : record?.error ? 'Chyba' : '—';
  inspect('inspect-selected-tags').textContent = relevance === 'ne' ? 'Obory se neposuzovaly' : selected.length ? selected.map(c => c.name).join(' + ') : record && !record.pending && !record.error ? 'Žádný oborový tag' : statusText;
  inspect('inspect-topic').textContent = record?.searchTerm ? record.searchTerm : (topicAnswer?.choice === 'none' ? 'Model nezvolil téma' : d.topicRequest ? 'Téma nebylo určeno' : record && !record.pending && !record.error ? 'Textové hledání neproběhlo' : statusText);
  const filterParts = [...(record?.years || []), record?.quality === 'best' ? `Nejlepší (${(record.qualityOrder || ['A+ / A', 'B', 'C', 'D', 'E', 'F']).join(' → ')})` : record?.quality === 'worst' ? 'Nejhorší (F → E → D → C → B → A → A+)' : ''].filter(Boolean);
  inspect('inspect-filters').textContent = filterParts.join(' · ') || (record && !record.pending && !record.error ? 'Bez roku a požadavku na kvalitu' : statusText);
  inspect('inspect-result').textContent = record?.project ? `${record.project.title} — ${record.project.author}` : record && !record.pending && !record.error ? 'Práce nenalezena' : statusText;
  let outcome = relevance === 'ne' ? 'Tev1 úvodně vyhodnotil požadavek jako nesouvisející se studentskou prací; obory ani téma se neposuzovaly.' : record?.searchMode === 'text' ? 'Práce se hledala podle textové shody v názvu, jménu autora, popisu nebo asociovaných slovech.' : selected.length ? `Hledání podle oborových tagů${matched.length ? `: ${matched.map(c => c.name).join(' + ')}` : ''}.` : record?.years || record?.quality ? 'Hledání podle roku nebo kvality.' : 'Požadavek potřebuje upřesnit.';
  if (record?.gradeFallback && record.quality === 'best') outcome += ` Známka A+ ani A nebyla dostupná; sestupem byla vybrána známka ${record.project?.grade || 'podle pořadí'}.`;
  else if (record?.gradeFallback) outcome += ` Požadovaná známka nebyla dostupná; použila se známka ${record.project?.grade || 'náhradní'}.`;
  if (record?.fallback) outcome += ' Druhý tag se nepodařilo splnit.';
  inspect('inspect-outcome').textContent = record?.pending ? 'Čekáme na odpověď lokálního modelu.' : record?.error ? `Chyba: ${record.error}` : record ? outcome : 'Zatím žádné rozhodnutí.';
  inspect('inspect-topic-details').hidden = !d.topicRequest;
  inspect('inspect-topic-exchange').textContent = d.topicRequest ? `Dotaz:\n${JSON.stringify(d.topicRequest, null, 2)}\n\nOdpověď:\n${d.topicResponse ? JSON.stringify(d.topicResponse, null, 2) : 'Není k dispozici.'}` : '—';
  inspect('inspect-request').textContent = d.request || d.relevanceRequest ? `${d.relevanceRequest ? `Úvodní posouzení:\n${JSON.stringify(d.relevanceRequest, null, 2)}\n\n` : ''}${d.request ? `${d.endpoint}\n\n${JSON.stringify(d.request, null, 2)}` : ''}` : record?.pending ? 'Přesný odeslaný požadavek se zobrazí po návratu serveru.' : '—';
  inspect('inspect-response').textContent = d.response || d.relevanceResponse ? `${d.relevanceResponse ? `Úvodní posouzení:\n${JSON.stringify(d.relevanceResponse, null, 2)}\n\n` : ''}${d.response ? JSON.stringify(d.response, null, 2) : ''}` : '—';
  const scores = inspect('inspect-scores'); scores.replaceChildren();
  const probabilities = answer?.probabilities;
  if (probabilities && typeof probabilities === 'object') {
    const entries = Object.entries(probabilities).filter(([, value]) => Number.isFinite(value) && value >= 0 && value <= 1).sort((a, b) => b[1] - a[1]);
    for (const [id, value] of entries) {
      const row = document.createElement('div'); row.className = 'score-row';
      if (id === answer.choice) row.classList.add('chosen');
      const header = document.createElement('div'); header.className = 'score-label';
      const name = document.createElement('span');
      name.textContent = `${id === 'unknown' ? 'Nejasné / žádná vhodná kategorie' : categoryNames.get(id) || criteria[id] || id}${selected.some(category => category.id === id) || (!selected.length && id === answer.choice && !d.tagScores) ? ' · VYBRÁNO' : ''}`;
      const number = document.createElement('strong'); number.textContent = `${(value * 100).toFixed(1)} %`;
      header.append(name, number);
      const track = document.createElement('div'); track.className = 'score-track';
      track.setAttribute('role', 'meter'); track.setAttribute('aria-label', name.textContent); track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', '100'); track.setAttribute('aria-valuenow', String(value * 100));
      const bar = document.createElement('div'); bar.style.width = `${value * 100}%`; track.append(bar); row.append(header, track); scores.append(row);
    }
  } else {
    const message = document.createElement('p'); message.className = 'decision-help';
    message.textContent = record?.pending ? 'Čekáme na skóre modelu…' : relevance === 'ne' ? 'Oborové tagy se neposuzovaly.' : record ? 'Pro tento požadavek nejsou skóre k dispozici.' : 'Skóre se zobrazí po odeslání požadavku.';
    scores.append(message);
  }
}
function renderDecisionHistory() {
  const host = inspect('decision-history'); host.replaceChildren();
  inspect('clear-history').disabled = !!pendingDecision;
  if (!decisions.length) { const empty = document.createElement('p'); empty.className = 'decision-help'; empty.textContent = 'Historie je prázdná.'; host.append(empty); return; }
  for (const record of decisions) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'history-row';
    button.disabled = !!pendingDecision; button.setAttribute('aria-pressed', String(record === selectedDecision));
    const time = document.createElement('span'); time.textContent = record.time;
    const text = document.createElement('span'); text.textContent = record.diagnostics?.input || 'Požadavek';
    const outcome = document.createElement('strong'); outcome.textContent = record.error ? 'Chyba' : record.searchMode === 'text' ? `Téma: ${record.searchTerm}` : (record.categories || []).map(c => c.name).join(' + ') || record.category?.name || 'Upřesnit';
    button.append(time, text, outcome);
    button.addEventListener('click', () => { selectedDecision = record; renderInspection(record); renderDecisionHistory(); }); host.append(button);
  }
}
inspect('clear-history').addEventListener('click', () => { if (pendingDecision) return; decisions = []; selectedDecision = null; renderInspection(null); renderDecisionHistory(); });
if (new URLSearchParams(location.search).get('panel') === 'decision') {
  document.body.classList.add('decision-embed');
  managerToggle.click();
  inspect('toggle-dashboard').click();
  let revision = '';
  async function refreshDecision() {
    await categoriesReady;
    try {
      const response = await fetch('http://127.0.0.1:8000/api/voice/decision?after=' + revision);
      if (!response.ok) throw new Error();
      const update = await response.json();
      if (!update.unchanged) {
        revision = update.revision;
        const data = update.decision;
        if (data.pending) beginInspection(data.diagnostics.input, data.diagnostics.model);
        else completeInspection({...data,time:new Date().toLocaleTimeString('cs-CZ')});
      }
    } catch { inspect('decision-phase').textContent = 'Čekám na spojení s učebnou…'; }
    setTimeout(refreshDecision, 1000);
  }
  refreshDecision();
}
