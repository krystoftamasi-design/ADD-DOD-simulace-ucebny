const form = document.querySelector('#form');
const sentence = document.querySelector('#sentence');
const model = document.querySelector('#model');
const status = document.querySelector('#status');
const button = document.querySelector('#submit');
const steps = document.querySelector('#steps');
const duration = document.querySelector('#duration');
const raw = document.querySelector('#raw');
let categories = [];

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
  const article = el('article', null, `step color-${color}${state === 'Neproběhlo' ? ' skipped' : ''}${number === 9 ? ' result last' : ''}`);
  const header = el('div', null, 'step-head');
  header.append(el('span', String(number).padStart(2, '0'), 'number'), el('span', state, 'badge'));
  article.append(header, el('h3', title));
  for (const line of lines) article.append(el('p', line));
  if (extra) article.append(extra);
  steps.append(article);
}
function render(data, input) {
  const d = data.diagnostics || {};
  const relevance = d.relevanceResponse?.answers?.relevance?.choice;
  const relevanceOkay = relevance !== 'ne';
  const categoryDone = !!d.response && relevanceOkay;
  const selected = data.categories || [];
  const first = selected[0]?.name;
  const second = selected[1]?.name;
  const tags = el('div', null, 'category-scores');
  if (d.tagScores) Object.entries(d.tagScores).sort((a,b) => b[1]-a[1]).forEach(([id,score]) => {
    const name = categories.find(c => c.id === id)?.name || id;
    tags.append(el('span', `${name} ${(score*100).toFixed(1)} %`, selected.some(c => c.id === id) ? 'selected' : ''));
  });
  const quality = data.quality === 'best' ? 'Nejlepší → A+' : data.quality === 'worst' ? 'Nejhorší → F' : 'Bez preference → A nebo A+';
  const answers = d.topicResponse?.answers?.topic;
  const criteria = d.topicRequest?.questions?.topic?.criteria;
  const words = criteria ? Object.entries(criteria).filter(([id]) => id !== 'none').map(([, label]) => label.replace(/^Téma nebo vlastnost požadované studentské práce: /, '')) : [];
  const wordTags = el('div', null, 'tags');
  words.forEach(word => wordTags.append(el('span', word, 'tag')));
  const searched = data.searchMode === 'text';
  const topicAttempted = !!d.topicRequest;
  const usableFilters = !!data.quality || !!data.years;
  steps.replaceChildren();
  block(1, 'Věta návštěvníka', 'a', 'Vstup', [input]);
  block(2, 'Je to zájem o studentskou práci?', 'a', relevance ? 'Tev1 odpověděl' : 'Neproběhlo', [relevance === 'ano' ? 'Ano → pokračuje k posouzení oborů.' : relevance === 'ne' ? 'Ne → další výběr se zastavil a průvodce žádá o upřesnění.' : 'Samostatné úvodní posouzení je vypnuté; pokračuje se přímo k oborům.']);
  block(3, 'Posouzení oborů', 'b', categoryDone ? 'Tev1 + pravidla' : 'Neproběhlo', [categoryDone ? (selected.length ? `Vybrané tagy: ${selected.map(c=>c.name).join(' + ')}.` : 'Žádný oborový tag nepřekročil práh.') : 'Posouzení oborů se nespustilo.'], tags.childNodes.length ? tags : null);
  block(4, 'Požadovaná kvalita', 'd', categoryDone ? 'Aplikace ověřila' : 'Neproběhlo', [categoryDone ? quality : 'Kvalita se nezpracovala.', ...(categoryDone && d.response?.answers?.quality ? [`Odpověď modelu: ${{best:'nejlepší',worst:'nejhorší',none:'bez preference'}[d.response.answers.quality.choice] || d.response.answers.quality.choice}.`] : [])]);
  block(5, 'Rok', 'd', categoryDone ? 'Aplikace rozpoznala' : 'Neproběhlo', [categoryDone ? data.years?.length ? `Školní roky: ${data.years.join(' nebo ')}.` : 'Rok nebyl zadán nebo rozpoznán.' : 'Rok se nezpracoval.']);
  let branch = first ? `Zvolen obor ${first}${second ? ` + ${second}` : ''} → hledá se podle tagů.` : topicAttempted ? 'Není oborový tag → pokračuje výběr tématu.' : usableFilters ? 'Není obor ani nabídka témat → hledá se podle roku či kvality.' : relevance === 'ne' ? 'Další kroky zastavilo úvodní posouzení.' : 'Není obor ani nabídka témat → žádost o upřesnění.';
  block(6, 'Kterou cestou pokračuje?', 'b', categoryDone ? 'Rozhodnutí aplikace' : 'Neproběhlo', [branch]);
  let topicLine = !topicAttempted ? (first ? 'Při zvoleném oborovém tagu se volné téma neposuzuje.' : 'Nebylo předáno žádné slovo k posouzení.') : answers?.choice === 'none' ? 'Model zvolil „žádné téma“; slovo se nenahrazuje jiným.' : `Vybrané slovo: ${data.searchTerm || 'nelze určit'}.`;
  block(7, 'Výběr tématu', 'c', topicAttempted ? 'Tev1 odpověděl' : 'Neproběhlo', [topicLine, ...(topicAttempted ? ['Nabídka slov ze vstupní věty:'] : [])], words.length ? wordTags : null);
  let lookup = searched ? `Textová shoda pro „${data.searchTerm}“ v názvech, popisech a asociacích${usableFilters ? ' s použitím roku nebo kvality' : ''}.` : first ? `Podle ${data.matchedCategories?.map(c=>c.name).join(' + ') || first}${data.gradeFallback ? '; pro oba tagy se použila náhradní známka' : data.fallback ? '; použil se jen hlavní tag' : ''}.` : usableFilters ? 'Výběr pouze podle roku nebo kvality.' : 'Hledání práce se nespustilo.';
  block(8, 'Hledání v katalogu', 'c', searched || first || usableFilters ? 'Aplikace hledala' : 'Neproběhlo', [lookup, ...(searched ? ['Textová shoda není zárukou významové souvislosti.'] : [])]);
  let result = data.project ? `${data.project.title} — ${data.project.author}.` : data.clarification || (data.projectsConnected === false ? 'Katalog prací není připojený; nastav DOD_DATA_DIR podle návodu.' : 'Pro zadané podmínky se nenašla dostupná práce.');
  let resultLines = [result];
  if (data.project) resultLines.push(`Školní rok ${data.project.year || 'neuveden'} · známka ${data.project.grade || 'neuvedena'}.`);
  let link = null;
  if (data.project?.url) { link = el('a', 'Otevřít studentskou práci ↗'); link.href = data.project.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; }
  block(9, 'Výsledek', 'e', data.project ? 'Práce nalezena' : 'Bez práce', resultLines, link);
  duration.textContent = Number.isFinite(d.durationMs) ? `Zpracování na serveru: ${(d.durationMs/1000).toLocaleString('cs-CZ',{maximumFractionDigits:2})} s` : 'Zpracování dokončeno.';
  document.querySelector('#raw-content').textContent = JSON.stringify(d, null, 2);
  raw.hidden = false;
}
async function init() {
  try {
    const [modelData, categoryData] = await Promise.all([api('/api/models'), api('/api/categories')]);
    categories = categoryData.categories;
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
  duration.textContent = 'Zpracovávám…'; steps.replaceChildren(); raw.hidden = true;
  try {
    const result = await api('/api/classify', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({text:input,model:model.value}) });
    render(result,input); status.textContent = 'Hotovo. Níže vidíš skutečný průchod.';
  } catch (error) {
    status.textContent = error.message; duration.textContent = 'Zpracování se nezdařilo.';
    if (error.diagnostics) { document.querySelector('#raw-content').textContent = JSON.stringify(error.diagnostics,null,2); raw.hidden = false; }
  } finally { button.disabled = false; model.disabled = false; sentence.disabled = false; }
});
init();
