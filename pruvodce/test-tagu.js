const start = document.querySelector('#start'), state = document.querySelector('#state'), results = document.querySelector('#results');
const el = (tag, text, cls) => { const item = document.createElement(tag); if (text != null) item.textContent = text; if (cls) item.className = cls; return item; };
async function api(path, options) { const response = await fetch(path, options); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Požadavek selhal.'); return data; }
const labels = { ano: 'Ano', ne: 'Ne', nezname: 'Nelze určit' };
function card(work, number) {
  const article = el('article', null, 'admin-work');
  const info = el('div', null, 'admin-info');
  info.append(el('h2', `${number}. ${work.title}`), el('p', `${work.author || ''} · ${work.year || ''}`, 'admin-meta'), el('p', work.description || 'Popis není dostupný.', 'work-description'));
  const content = el('div', null, 'admin-content');
  content.append(el('h3', `Známka ${work.grade || 'A / A+'}`), el('p', 'Původní tagy', 'admin-meta'));
  for (const tag of work.tags || []) content.append(el('p', tag, 'tag-option'));
  const outcome = el('div', null, 'test-outcome'); outcome.setAttribute('role', 'status'); content.append(outcome);
  const gallery = el('aside', null, 'work-gallery'); gallery.append(el('h3', `Obrázky (${work.images?.length || 0})`));
  const grid = el('div', null, 'work-gallery-grid');
  for (const image of work.images || []) { const link = el('a'); link.href = image.url; link.target = '_blank'; link.rel = 'noopener'; const img = el('img'); img.src = image.url; img.alt = work.title; img.loading = 'lazy'; link.append(img); grid.append(link); }
  if (!work.images?.length) gallery.append(el('p', 'Bez dostupných obrázků.', 'admin-meta')); else gallery.append(grid);
  article.append(info, content, gallery); results.append(article); return outcome;
}
function showAnswer(outcome, answers) {
  outcome.replaceChildren(el('h3', 'Návrh Tev1'));
  const proposed = categories.filter(category => answers[category.id]?.choice === 'ano');
  if (!proposed.length) outcome.append(el('p', 'Model nevybral žádný tag.', 'test-proposed'));
  for (const category of proposed) {
    const answer = answers[category.id];
    const score = answer?.probabilities?.[answer.choice];
    const confidence = typeof answer?.confidence === 'number' ? `${(answer.confidence * 100).toFixed(1)} %` : 'není k dispozici';
    outcome.append(el('p', `${category.name} · skóre výběru: ${typeof score === 'number' ? `${(score * 100).toFixed(1)} %` : 'není k dispozici'} · confidence: ${confidence}`, 'test-answer'));
  }
}
let projects = [], categories = [];
async function init() {
  try {
    const [data, cats] = await Promise.all([api('/api/projects'), api('/api/categories')]);
    projects = data.projects; categories = cats.categories;
    const authorsTest = new URLSearchParams(location.search).get('autori') === 'mikulecky-tamasi';
    const withDescriptions = authorsTest && new URLSearchParams(location.search).get('popisy') === 'ano';
    const saved = await api(withDescriptions ? '/test-tagu-mikulecky-tamasi-s-popisy.json' : authorsTest ? '/test-tagu-mikulecky-tamasi.json' : '/vysledek-osmi-tagu.json');
    for (const [i, item] of saved.entries()) {
      const outcome = card(projects.find(p => p.id === item.id) || item, i + 1);
      if (item.answers) showAnswer(outcome, item.answers); else outcome.textContent = `Chyba: ${item.error || 'Bez výsledku'}`;
    }
    state.textContent = !saved.length ? 'Žádné uložené výsledky nejsou přiložené. Nový test vyžaduje připojený katalog prací.' : withDescriptions ? 'Zobrazen je test prací Pavla Mikuleckého a Kryštofa Tamaši se schválenými popisy tagů.' : authorsTest ? 'Zobrazen je starší test prací Pavla Mikuleckého a Kryštofa Tamaši bez schválených popisů tagů.' : 'Zobrazen je starší uložený test; pro nové rozhodnutí ano/ne spusť další test. Nový test zůstane pouze v tomto okně.';
  } catch (error) { state.textContent = `Výsledky se nepodařilo načíst: ${error.message}`; }
}
start.addEventListener('click', async () => {
  start.disabled = true; results.replaceChildren();
  try {
    if (!projects.length) projects = (await api('/api/projects')).projects;
    const all = [...projects];
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    const selected = all.slice(0, 10); if (!selected.length) throw new Error('V této skupině nejsou žádné práce.');
    for (let i = 0; i < selected.length; i++) {
      const work = selected[i], outcome = card(work, i + 1); outcome.textContent = 'Zpracovávám…'; state.textContent = `Zpracovávám ${i + 1} z ${selected.length}…`;
      try { const data = await api('/api/test-tagu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: work.id }) }); showAnswer(outcome, data.answers); }
      catch (error) { outcome.textContent = `Chyba: ${error.message}`; }
    }
    state.textContent = `Zpracováno ${selected.length} prací. Případné chyby jsou uvedeny u jednotlivých prací; tagy se nezměnily. Nový test zůstává pouze v tomto okně.`;
  } catch (error) { state.textContent = error.message; } finally { start.disabled = false; }
});
init();
