const form = document.querySelector('#form');
const sentence = document.querySelector('#sentence');
const model = document.querySelector('#model');
const status = document.querySelector('#status');
const button = document.querySelector('#submit');
const steps = document.querySelector('#steps');
const duration = document.querySelector('#duration');
const raw = document.querySelector('#raw');
const feedback = document.querySelector('#feedback');
const feedbackForm = document.querySelector('#feedback-form');
const feedbackCategory = document.querySelector('#feedback-category');
const feedbackSecond = document.querySelector('#feedback-second');
const missingForm = document.querySelector('#feedback-missing-form');
const missingCategory = document.querySelector('#feedback-missing-category');
const feedbackStatus = document.querySelector('#feedback-status');
const confirmFeedback = document.querySelector('#feedback-confirm');
const openFeedback = document.querySelector('#feedback-open');
const missingButton = document.querySelector('#feedback-missing');
let categories = [];
let feedbackRecord = null;

async function api(path, options) {
  const response = await fetch(path, options);
  const body = await response.json();
  if (!response.ok) throw Object.assign(new Error(body.error || 'Požadavek se nepodařil.'), { diagnostics: body.diagnostics });
  return body;
}
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== null && text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function block(number, title, color, state, lines, extra) {
  const article = el('article', null, `step color-${color}${state === 'Neproběhlo' ? ' skipped' : ''}${number === 7 ? ' result last' : ''}`);
  const header = el('div', null, 'step-head');
  header.append(el('span', String(number).padStart(2, '0'), 'number'), el('span', state, 'badge'));
  article.append(header, el('h3', title));
  for (const line of lines.filter(Boolean)) article.append(el('p', line));
  if (extra) article.append(extra);
  steps.append(article);
}
function resetFeedback() {
  feedbackRecord = null;
  feedback.hidden = false;
  feedbackForm.hidden = true;
  missingForm.hidden = true;
  missingButton.hidden = true;
  openFeedback.hidden = false;
  confirmFeedback.hidden = false;
  [confirmFeedback, openFeedback, missingButton, feedbackForm.querySelector('button'), missingForm.querySelector('button')].forEach(control => { control.disabled = true; });
  feedbackStatus.textContent = 'Po vyhodnocení věty můžeš potvrdit nebo opravit vybrané tagy.';
  feedbackSecond.value = '';
}
function feedbackPayload(verdict, correctIds) {
  return {
    ...feedbackRecord,
    verdict,
    correctId: correctIds[0] || 'unknown',
    correctIds
  };
}
async function saveFeedback(payload, message) {
  const controls = [confirmFeedback, openFeedback, missingButton, feedbackForm.querySelector('button'), missingForm.querySelector('button')];
  controls.forEach(control => { control.disabled = true; });
  try {
    await api('/api/category-feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    feedbackForm.hidden = true;
    missingForm.hidden = true;
    confirmFeedback.hidden = true;
    openFeedback.hidden = true;
    missingButton.hidden = true;
    feedbackStatus.textContent = message;
  } catch (error) {
    feedbackStatus.textContent = `Uložení se nepodařilo: ${error.message}`;
  } finally {
    controls.forEach(control => { control.disabled = false; });
  }
}
confirmFeedback.addEventListener('click', () => {
  if (!feedbackRecord) return;
  saveFeedback(feedbackPayload('confirmed', feedbackRecord.selectedIds), 'Potvrzení bylo uloženo do zpětné vazby.');
});
openFeedback.addEventListener('click', () => {
  missingForm.hidden = true;
  feedbackForm.hidden = false;
  feedbackStatus.textContent = '';
  feedbackCategory.focus();
});
missingButton.addEventListener('click', () => {
  feedbackForm.hidden = true;
  missingForm.hidden = false;
  missingCategory.value = '';
  feedbackStatus.textContent = '';
  missingCategory.focus();
});
feedbackForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!feedbackRecord) return;
  if (feedbackCategory.value === 'unknown' && feedbackSecond.value) { feedbackStatus.textContent = 'U volby „Žádný oborový tag“ nemůže být vybraný druhý tag.'; return; }
  const correctIds = feedbackCategory.value === 'unknown' ? [] : [feedbackCategory.value, ...(feedbackSecond.value ? [feedbackSecond.value] : [])];
  if (new Set(correctIds).size !== correctIds.length) { feedbackStatus.textContent = 'Vyber dva různé tagy.'; return; }
  if (correctIds.length === feedbackRecord.selectedIds.length && correctIds.every(id => feedbackRecord.selectedIds.includes(id))) { feedbackStatus.textContent = 'Vyber jiný výsledek, než vybral model.'; return; }
  const payload = feedbackPayload('corrected', correctIds);
  if (!correctIds.length) payload.correctId = 'unknown';
  saveFeedback(payload, 'Oprava byla uložena do zpětné vazby.');
});
missingForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!feedbackRecord || feedbackRecord.selectedIds.length !== 1) return;
  if (missingCategory.value === feedbackRecord.selectedIds[0]) { feedbackStatus.textContent = 'Vyber jiný tag než ten, který už model vybral.'; return; }
  const correctIds = [feedbackRecord.selectedIds[0], missingCategory.value];
  saveFeedback(feedbackPayload('corrected', correctIds), 'Oprava obou tagů byla uložena do zpětné vazby.');
});
function render(data, input) {
  const d = data.diagnostics || {};
  const categoryDone = !!d.response;
  const selected = data.categories || [];
  const first = selected[0]?.name;
  const second = selected[1]?.name;
  const tags = el('div', null, 'category-scores');
  if (d.tagScores) Object.entries(d.tagScores).sort((a,b) => b[1]-a[1]).forEach(([id,score]) => {
    const name = categories.find(c => c.id === id)?.name || id;
    tags.append(el('span', `${name} ${(score*100).toFixed(1)} %`, selected.some(c => c.id === id) ? 'selected' : ''));
  });
  const quality = data.quality === 'best' ? 'Nejlepší dostupná známka' : data.quality === 'worst' ? 'Nejhorší → F → E → D → C → B → A → A+' : 'Bez preference → všechny známky od nejlepší';
  const answers = d.topicResponse?.answers?.topic;
  const criteria = d.topicRequest?.questions?.topic?.criteria;
  const offered = criteria ? Object.entries(criteria).filter(([id]) => id !== 'none').map(([id, label]) => ({ id, word: label.replace(/^Téma nebo vlastnost požadované studentské práce: /, '') })) : [];
  const wordTags = el('div', null, 'tags');
  offered.forEach(item => wordTags.append(el('span', item.word, item.id === answers?.choice ? 'tag chosen' : 'tag')));
  const searched = data.searchMode === 'text';
  const topicAttempted = !!d.topicRequest;
  const chosenTopic = offered.find(item => item.id === answers?.choice)?.word || null;
  const usableFilters = !!data.quality || !!data.years;
  const tagAnswer = d.response?.answers?.category;
  feedbackRecord = {
    requestId: crypto.randomUUID(),
    text: input,
    model: d.model || model.value,
    selectedId: data.category?.id || 'unknown',
    selectedIds: selected.map(category => category.id),
    diagnostics: {
      endpoint: d.endpoint || null,
      durationMs: d.durationMs ?? null,
      confidence: tagAnswer?.confidence ?? null,
      scores: d.tagScores ?? tagAnswer?.probabilities ?? null,
      usage: d.response?.usage ?? null,
      request: d.request || null,
      answers: d.response?.answers ?? null,
      selectionRules: d.selectionRules ?? null
    }
  };
  feedback.hidden = false;
  feedbackForm.hidden = true;
  missingForm.hidden = true;
  confirmFeedback.hidden = false;
  openFeedback.hidden = false;
  missingButton.hidden = selected.length !== 1;
  [confirmFeedback, openFeedback, missingButton, feedbackForm.querySelector('button'), missingForm.querySelector('button')].forEach(control => { control.disabled = false; });
  feedbackStatus.textContent = '';
  steps.replaceChildren();
  block(1, 'Věta návštěvníka', 'a', 'Vstup', [input]);
  block(2, 'Rozpoznání oborových tagů', 'b', categoryDone ? 'Tev1 + pravidla' : 'Neproběhlo', [categoryDone ? (selected.length ? `Vybrané tagy: ${selected.map(c=>c.name).join(' + ')}.` : 'Hlavní tag nepřekročil nastavený práh; žádný obor nebyl vybrán.') : 'Model tagy neposoudil.'], tags.childNodes.length ? tags : null);
  const qualityOrder = data.qualityOrder || ['A+ / A', 'B', 'C', 'D', 'E', 'F'];
  block(3, 'Další podmínky', 'd', categoryDone ? 'Aplikace ověřila' : 'Neproběhlo', [categoryDone ? `Kvalita: ${quality}${d.response?.answers?.quality ? ` (odpověď modelu: ${{best:'nejlepší',worst:'nejhorší',none:'bez preference'}[d.response.answers.quality.choice] || d.response.answers.quality.choice})` : ''}.` : 'Podmínky se nezpracovaly.', categoryDone && data.quality === 'best' ? `Pořadí známek: ${qualityOrder.join(' → ')}${data.project ? `; vybraná práce má známku ${data.project.grade}` : ''}${data.gradeFallback ? '; A+ ani A nebyla při ostatních podmínkách dostupná' : ''}.` : '', categoryDone ? data.years?.length ? `Rok: ${data.years.join(' nebo ')}${data.yearOrder ? `; ${data.yearOrder === 'newest' ? 'nejnovější' : 'nejstarší'} z odpovídajících` : ''}.` : data.yearOrder ? `Pořadí: ${data.yearOrder === 'newest' ? 'nejnovější' : 'nejstarší'} dostupný školní rok${data.project ? ` (${data.project.year})` : ''}.` : 'Rok nebyl zadán nebo rozpoznán.' : '']);
  let branch = first ? `Hlavní tag ${first}${second ? ` a druhý tag ${second}` : ''} → nejprve se hledá podle oborových tagů.` : topicAttempted ? 'Bez oborového tagu → Tev1 dostane nabídku slov z věty a vybere téma, nebo „žádné téma“.' : usableFilters ? 'Bez oborového tagu ani použitelného tématu → hledání může pokračovat jen podle roku či kvality.' : 'Bez oborového tagu a bez použitelných podmínek → průvodce žádá o upřesnění.';
  block(4, 'Větev hledání', 'b', categoryDone ? 'Rozhodnutí aplikace' : 'Neproběhlo', [branch]);
  let topicLine = !topicAttempted ? (first ? 'Při vybraném oborovém tagu se volné téma neposuzuje.' : usableFilters ? 'Nabídka témat nevznikla; zůstávají rok nebo kvalita.' : 'Téma se neposuzovalo.') : answers?.choice === 'none' ? 'Model zvolil „žádné téma“; jiné slovo aplikace sama nedosazuje.' : `Model zvolil „${chosenTopic || data.searchTerm || 'neznámé slovo'}“${data.searchTerm ? `; aplikace hledá „${data.searchTerm}“` : ''}.`;
  block(5, 'Výběr tématu', 'c', topicAttempted ? (answers?.choice === 'none' ? 'Tev1: žádné téma' : 'Tev1 vybral slovo') : 'Neproběhlo', [topicLine, ...(topicAttempted ? ['Slova nabídnutá modelu (zvýrazněné bylo vybráno):'] : [])], wordTags.childNodes.length ? wordTags : null);
  let lookup = searched ? `Textová shoda výrazu „${data.searchTerm}“ v názvech, jménech autorů, dostupných popisech a asociovaných slovech${usableFilters ? `; současně platí ${[...(data.years || []), data.quality === 'best' ? `známky v pořadí ${qualityOrder.join(' → ')}` : data.quality === 'worst' ? 'pořadí F → E → D → C → B → A → A+' : ''].filter(Boolean).join(' a ')}` : ''}${data.project && data.quality === 'best' ? `; nalezená známka ${data.project.grade}` : ''}.` : first ? `Podle ${data.matchedCategories?.map(c=>c.name).join(' + ') || first}${data.gradeFallback ? `; dostupná známka ${data.project?.grade} podle sestupného pořadí` : data.fallback ? '; druhý tag se neuplatnil' : ''}${usableFilters ? `; filtry: ${[...(data.years || []), data.quality === 'best' ? `pořadí ${qualityOrder.join(' → ')}` : data.quality === 'worst' ? 'F → E → D → C → B → A → A+' : ''].filter(Boolean).join(', ')}` : ''}.` : usableFilters ? `Pouze podle ${[...(data.years || []), data.quality === 'best' ? `známek v pořadí ${qualityOrder.join(' → ')}` : data.quality === 'worst' ? 'známky F' : ''].filter(Boolean).join(' a ')}${data.project && data.quality === 'best' ? `; nalezená známka ${data.project.grade}` : ''}.` : 'Hledání práce se nespustilo.';
  block(6, 'Hledání v katalogu', 'c', searched || first || usableFilters ? 'Aplikace hledala' : 'Neproběhlo', [lookup, ...(searched ? ['Jde o textovou shodu, nikoli potvrzení významové souvislosti.'] : [])]);
  const works = Array.isArray(data.projects) ? data.projects : data.project ? [data.project] : [];
  const resultList = el('ol', null, 'result-works');
  works.forEach(work => {
    const item = el('li', null, 'result-work');
    if (work.images?.[0]?.url) {
      const image = el('img', null, 'result-thumb');
      image.src = work.images[0].url; image.alt = ''; image.loading = 'lazy';
      item.append(image);
    }
    const info = el('div');
    const title = el('strong', work.title || 'Bez názvu');
    info.append(title, el('p', `${work.author || 'Autor neuveden'} · ${work.year || 'rok neuveden'} · známka ${work.grade || 'neuvedena'}`));
    if (work.url) {
      const link = el('a', 'Otevřít práci ↗'); link.href = work.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; info.append(link);
    }
    item.append(info); resultList.append(item);
  });
  const result = works.length ? `Zobrazeno ${works.length} ${works.length === 1 ? 'práce' : works.length < 5 ? 'práce' : 'prací'} (nejvýše 10).` : data.clarification || (data.projectsConnected === false ? 'Katalog prací není připojený; nastav DOD_DATA_DIR podle návodu.' : 'Pro zadané podmínky se nenašla dostupná práce.');
  block(7, 'Výsledek', 'e', works.length ? 'Práce nalezeny' : 'Bez práce', [result], works.length ? resultList : null);
  duration.textContent = Number.isFinite(d.durationMs) ? `Zpracování na serveru: ${(d.durationMs/1000).toLocaleString('cs-CZ',{maximumFractionDigits:2})} s` : 'Zpracování dokončeno.';
  document.querySelector('#raw-content').textContent = JSON.stringify(d, null, 2);
  raw.hidden = false;
}
async function init() {
  try {
    const [modelData, categoryData] = await Promise.all([api('/api/models'), api('/api/categories')]);
    categories = categoryData.categories;
    const categoryOptions = categories.map(category => new Option(category.name, category.id));
    feedbackCategory.replaceChildren(new Option('Vyber správný tag', ''), new Option('Žádný oborový tag', 'unknown'), ...categoryOptions.map(option => option.cloneNode(true)));
    feedbackSecond.replaceChildren(new Option('Žádný druhý tag', ''), ...categoryOptions.map(option => option.cloneNode(true)));
    missingCategory.replaceChildren(new Option('Vyber chybějící tag', ''), ...categoryOptions.map(option => option.cloneNode(true)));
    const tevModels = modelData.models.filter(name => /^tev1(?::|$)/.test(name));
    model.replaceChildren(...(tevModels.length ? tevModels.map(name => new Option(name,name)) : [new Option('Tev1 není dostupný','')]));
    if (tevModels.includes('tev1:4b')) model.value = 'tev1:4b';
    status.textContent = tevModels.length ? 'Připojeno k lokálnímu modelu.' : 'Tev1 není mezi dostupnými modely. Spusť Ollamu a načti stránku znovu.';
  } catch (error) { model.replaceChildren(new Option('Model není dostupný','')); status.textContent = error.message; }
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const input = sentence.value.trim();
  if (!input || !model.value) { status.textContent = 'Zadej větu a vyber dostupný Tev1.'; return; }
  button.disabled = true; model.disabled = true; sentence.disabled = true;
  status.textContent = 'Tev1 zpracovává větu. Bloky zobrazíme po dokončení odpovědi.';
  duration.textContent = 'Zpracovávám…'; steps.replaceChildren(); raw.hidden = true; resetFeedback();
  try {
    const result = await api('/api/classify', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({text:input,model:model.value}) });
    render(result,input); status.textContent = 'Hotovo. Níže vidíš skutečný průchod.';
    try { await api('/api/category-feedback', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(feedbackPayload('automatic', feedbackRecord.selectedIds)) }); feedbackStatus.textContent = 'Výsledek se automaticky uložil; můžeš jej opravit.'; } catch (error) { feedbackStatus.textContent = `Automatické uložení se nepodařilo: ${error.message}`; }
  } catch (error) {
    status.textContent = error.message; duration.textContent = 'Zpracování se nezdařilo.';
    if (error.diagnostics) { document.querySelector('#raw-content').textContent = JSON.stringify(error.diagnostics,null,2); raw.hidden = false; }
  } finally { button.disabled = false; model.disabled = false; sentence.disabled = false; }
});
init();
