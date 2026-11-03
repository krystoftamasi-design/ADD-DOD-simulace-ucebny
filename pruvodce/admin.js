const $ = s => document.querySelector(s);
let projects = [], categories = [], filtered = [], shown = 0;
let digitalProposals = new Map(), proposalSource = 'codex';
const batchSize = 18, status = $('#admin-status'), list = $('#work-list'), sentinel = $('#load-sentinel'), loadMore = $('#load-more');
async function get(url, options) { const response = await fetch(url, options); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Načítání selhalo.'); return data; }
const node = (tag, text, className) => { const el = document.createElement(tag); if (text != null) el.textContent = text; if (className) el.className = className; return el; };
const gradeMatches = (selected, grade) => !selected || selected === grade || (selected === 'A' && grade === 'A+');
const sameItems = (a, b) => a.length === b.length && a.every(item => b.includes(item));
const imageViewer = node('dialog', null, 'image-viewer');
imageViewer.setAttribute('aria-label', 'Náhled obrázku práce');
const viewerBar = node('div', null, 'image-viewer-bar');
const closeViewer = node('button', '← Zpět k práci', 'image-viewer-close'); closeViewer.type = 'button';
const viewerCaption = node('span', '', 'image-viewer-caption');
const viewerImage = node('img'); viewerImage.className = 'image-viewer-image';
viewerBar.append(closeViewer, viewerCaption); imageViewer.append(viewerBar, viewerImage); document.body.append(imageViewer);
closeViewer.addEventListener('click', () => imageViewer.close());
imageViewer.addEventListener('close', () => { viewerImage.removeAttribute('src'); });
const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) appendBatch(); }, { rootMargin: '600px 0px' });
function refreshStatus() { status.textContent = `Zobrazeno ${shown} z ${filtered.length} nalezených prací · celkem ${projects.length}`; loadMore.hidden = shown >= filtered.length; }
function filterProjects() {
  observer.unobserve(sentinel);
  const query = $('#search').value.trim().toLocaleLowerCase('cs');
  const editedFilter = $('#edited-filter').value;
  const proposalFilter = $('#proposal-filter').value;
  const matchesProposal = p => { const proposal = digitalProposals.get(p.id); return !proposalFilter || (proposal && (proposalFilter === 'all' || (proposalFilter === 'uncertain' ? proposal.uncertain : proposalFilter === 'none' ? !proposal.proposedTags.length : proposal.proposedTags.includes(proposalFilter)))); };
  filtered = projects.filter(p => matchesProposal(p) && `${p.title} ${p.author}`.toLocaleLowerCase('cs').includes(query) && (!$('#year-filter').value || p.year === $('#year-filter').value) && gradeMatches($('#grade-filter').value, p.grade) && (!$('#tag-filter').value || p.tags.includes($('#tag-filter').value)) && (!editedFilter || (editedFilter === 'edited' ? p.isEdited : !p.isEdited)));
  shown = 0; list.replaceChildren(); appendBatch();
}
function appendBatch() {
  observer.unobserve(sentinel);
  const fragment = document.createDocumentFragment();
  for (const work of filtered.slice(shown, shown + batchSize)) fragment.append(createCard(work));
  shown = Math.min(filtered.length, shown + batchSize); list.append(fragment); refreshStatus();
  if (shown < filtered.length) requestAnimationFrame(() => observer.observe(sentinel));
}
function createCard(work) {
  const hiddenImages = new Set(work.hiddenImages || []);
  const imageControls = [];
  const article = node('article', null, 'admin-work');
  const info = node('div', null, 'admin-info');
  const editedBadge = node('span', 'Upraveno', 'edited-badge');
  function refreshEditedBadge() {
    editedBadge.hidden = !work.isEdited;
    editedBadge.title = work.savedAt ? `Naposledy uloženo ${new Date(work.savedAt).toLocaleString('cs-CZ')}` : 'Práce byla upravena';
  }
  refreshEditedBadge(); info.append(editedBadge, node('h2', work.title), node('p', `${work.author} · ${work.year}`, 'admin-meta'));
  const description = node('p', work.description || 'Popis práce není dostupný.', 'work-description');
  info.append(description);
  if (work.videos?.length) {
    const links = node('p', null, 'work-video-links');
    work.videos.forEach((video, index) => {
      if (index) links.append(document.createTextNode(' · '));
      const link = node('a', `Video ${index + 1} (${video.provider === 'youtube' ? 'YouTube' : 'Vimeo'})`);
      link.href = video.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; links.append(link);
    });
    info.append(links);
  }
  if (work.external_links?.length) {
    const links = node('p', null, 'work-external-links');
    work.external_links.forEach((external, index) => {
      if (index) links.append(document.createTextNode(' · '));
      const link = node('a', external.label);
      link.href = external.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; links.append(link);
    });
    info.append(links);
  }
  article.append(info);
  const content = node('div', null, 'admin-content');
  const form = node('form'); const gradeLabel = node('label', 'Známka ', 'admin-grade'); const grade = node('select'); grade.setAttribute('aria-label', `Známka: ${work.title}`);
  for (const g of ['A+','A','B','C','D','E','F']) grade.add(new Option(g,g)); grade.value = work.grade; gradeLabel.append(grade); form.append(gradeLabel);
  const group = node('fieldset'); group.append(node('legend', 'Kategorické tagy')); const boxes = [];
  for (const name of [...new Set([...categories.map(c => c.name), ...work.tags])]) { const label = node('label', null, 'tag-option'); const box = node('input'); label.title = categories.find(c => c.name === name)?.description || 'Původní tag uložený u práce'; box.type = 'checkbox'; box.value = name; box.checked = work.tags.includes(name); boxes.push(box); label.append(box, document.createTextNode(name)); group.append(label); }
  form.append(group);
  const proposal = digitalProposals.get(work.id);
  if (proposal) {
    const approved = proposal.approvalStatus === 'approved';
    const comparison = node(approved ? 'details' : 'section', null, 'work-history');
    if (approved) comparison.append(node('summary', 'Schválená změna tagů · předchozí verze'));
    comparison.append(node('h3', approved ? 'Schválené tagy Codex' : proposalSource === 'codex' ? 'Návrh asistenta Codex' : 'Starší návrh Tev1'), node('p', approved ? 'Schváleno uživatelem a převedeno do běžných tagů práce.' : proposal.uncertain ? 'Nejisté — ověř podklady před schválením.' : proposalSource === 'codex' ? 'Čeká na tvoje schválení; uložené tagy se zatím nemění.' : proposal.reviewed ? 'Opravený návrh podle kontroly — uložené tagy práce se mění až potvrzením.' : 'Návrh k revizi — zatím není uložený jako tag práce.', 'admin-meta'), node('p', `Starší verze: ${proposal.originalTags.join(' · ') || 'bez tagů'}`), node('p', `${approved ? 'Schválené' : 'Nové'} digitální tagy: ${proposal.proposedTags.join(' · ') || 'žádný z těchto tří tagů není doložený'}`));
    if (proposal.reason) comparison.append(node('p', proposal.reason));
    if (proposal.modelProposedTags) comparison.append(node('p', `Původní návrh modelu: ${proposal.modelProposedTags.join(' · ')}`), node('p', proposal.review.reason));
    const loadProposal = node('button', 'Načíst nový návrh do formuláře'); loadProposal.type = 'button';
    loadProposal.addEventListener('click', () => {
      const replaced = new Set(['web / UI / UX design', 'web', 'aplikace', 'UX design']);
      const proposedTags = [...new Set([...work.tags.filter(tag => !replaced.has(tag)), ...proposal.proposedTags])];
      boxes.forEach(box => { box.checked = proposedTags.includes(box.value); });
      message.textContent = 'Návrh načtený; zkontroluj jej a potvrď tlačítkem Uložit změny.';
    });
    if (!approved) comparison.append(loadProposal); form.append(comparison);
  }

  const actions = node('div', null, 'work-actions'); const save = node('button', 'Uložit změny', 'primary'); save.type = 'submit';
  const undo = node('button', '↶ Zpět'); undo.type = 'button'; undo.setAttribute('aria-label', `Vrátit změnu práce ${work.title}`);
  const showHistory = node('button', 'Historie změn'); showHistory.type = 'button'; const message = node('span', '', 'save-message'); message.setAttribute('role', 'status'); actions.append(save, undo, showHistory, message); form.append(actions);
  const history = node('div', null, 'work-history'); history.hidden = true; form.append(history);
  function applyValues(state) { grade.value = state.grade; boxes.forEach(box => { box.checked = state.tags.includes(box.value); }); hiddenImages.clear(); (state.hiddenImages || []).forEach(file => hiddenImages.add(file)); imageControls.forEach(refresh => refresh()); }
  function refreshFiltered() { const state = $('#edited-filter').value; if ((state === 'edited' && !work.isEdited) || (state === 'unedited' && work.isEdited) || !gradeMatches($('#grade-filter').value, work.grade) || ($('#tag-filter').value && !work.tags.includes($('#tag-filter').value))) filterProjects(); }
  undo.addEventListener('click', async () => {
    const currentTags = boxes.filter(box => box.checked).map(box => box.value);
    if (grade.value !== work.grade || !sameItems(currentTags, work.tags) || !sameItems([...hiddenImages], work.hiddenImages || [])) { applyValues(work); message.textContent = 'Neuložené změny vráceny.'; return; }
    undo.disabled = true; save.disabled = true; message.textContent = 'Vracím poslední změnu…';
    try {
      const { versions } = await get(`/api/projects/history?id=${encodeURIComponent(work.id)}`);
      const previous = versions.find(v => v.grade !== v.after.grade || !sameItems(v.tags, v.after.tags) || !sameItems(v.hiddenImages || [], v.after.hiddenImages || []));
      if (!previous) { message.textContent = 'Není co vrátit.'; return; }
      const result = await get('/api/projects/update', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:work.id,grade:previous.grade,tags:previous.tags,hiddenImages:previous.hiddenImages || []}) });
      Object.assign(work, result.project); applyValues(work); refreshEditedBadge(); history.hidden = true; showHistory.textContent = 'Historie změn'; message.textContent = 'Poslední změna vrácena.'; refreshFiltered();
    } catch (error) { message.textContent = `Chyba: ${error.message}`; } finally { undo.disabled = false; save.disabled = false; }
  });
  showHistory.addEventListener('click', async () => {
    if (!history.hidden) { history.hidden = true; showHistory.textContent = 'Historie změn'; return; }
    history.hidden = false; showHistory.textContent = 'Skrýt historii'; history.textContent = 'Načítám historii…';
    try {
      const { versions } = await get(`/api/projects/history?id=${encodeURIComponent(work.id)}`); history.replaceChildren();
      if (!versions.length) { history.textContent = 'Pro tuto práci zatím nejsou žádné starší uložené hodnoty.'; return; }
      const entries = node('ol', null, 'change-list');
      for (const v of versions) {
        if (!v.after) continue;
        const added = v.after.tags.filter(tag => !v.tags.includes(tag));
        const removed = v.tags.filter(tag => !v.after.tags.includes(tag));
        const newlyHidden = (v.after.hiddenImages || []).filter(file => !(v.hiddenImages || []).includes(file));
        const newlyVisible = (v.hiddenImages || []).filter(file => !(v.after.hiddenImages || []).includes(file));
        if (v.grade === v.after.grade && !added.length && !removed.length && !newlyHidden.length && !newlyVisible.length) continue;
        const entry = node('li', null, 'change-entry');
        const date = node('time', new Date(v.timestamp).toLocaleString('cs-CZ')); date.dateTime = v.timestamp; entry.append(date);
        if (v.grade !== v.after.grade) entry.append(node('p', `Známka: ${v.grade} → ${v.after.grade}`));
        for (const tag of added) entry.append(node('p', `Tag: ${tag} · nepřiřazen → přiřazen`, 'change-added'));
        for (const tag of removed) entry.append(node('p', `Tag: ${tag} · přiřazen → nepřiřazen`, 'change-removed'));
        for (const file of newlyHidden) entry.append(node('p', `Obrázek ${work.images.findIndex(image => image.file === file) + 1}: viditelný → skrytý`, 'change-removed'));
        for (const file of newlyVisible) entry.append(node('p', `Obrázek ${work.images.findIndex(image => image.file === file) + 1}: skrytý → viditelný`, 'change-added'));
        const load = node('button', 'Načíst stav před změnou'); load.type = 'button';
        load.addEventListener('click', () => { applyValues(v); message.textContent = 'Starší hodnoty načteny. Pro potvrzení je ulož.'; });
        entry.append(load); entries.append(entry);
      }
      if (entries.childElementCount) history.append(entries);
      else history.textContent = 'Zatím nebyla změněna známka ani tagy.';
    } catch (error) { history.textContent = `Historii se nepodařilo načíst: ${error.message}`; }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); save.disabled = true; message.textContent = 'Ukládám…';
    try { const result = await get('/api/projects/update', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:work.id,grade:grade.value,tags:boxes.filter(x => x.checked).map(x => x.value),hiddenImages:[...hiddenImages]}) }); Object.assign(work, result.project); refreshEditedBadge(); message.textContent = 'Uloženo. Předchozí stav je v historii.'; history.hidden = true; showHistory.textContent = 'Historie změn'; refreshFiltered(); }
    catch (error) { message.textContent = `Chyba: ${error.message}`; } finally { save.disabled = false; }
  });
  content.append(form); article.append(content);
  const gallery = node('aside', null, 'work-gallery'); gallery.setAttribute('aria-label', `Obrázky práce ${work.title}`);
  gallery.append(node('h3', `Obrázky (${work.images.length})`));
  if (!work.images.length) gallery.append(node('p', 'Bez dostupných obrázků.', 'admin-meta'));
  else {
    const grid = node('div', null, 'work-gallery-grid');
    for (let i = 0; i < work.images.length; i++) {
      const image = work.images[i], item = node('div', null, 'gallery-item');
      const link = node('a'); link.href = image.url; link.target = '_blank'; link.rel = 'noopener'; link.setAttribute('aria-label', `Otevřít obrázek ${i + 1} práce ${work.title}`);
      const img = node('img'); img.loading = 'lazy'; img.alt = `${work.title}, obrázek ${i + 1}`;
      img.addEventListener('load', () => { if (img.naturalWidth < 800 || img.naturalHeight < 600) { link.classList.add('low-resolution'); link.title = 'Rozlišení je menší než 800 × 600 px.'; } });
      img.src = image.url; link.append(img);
      link.addEventListener('click', event => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); viewerImage.src = image.url; viewerImage.alt = img.alt; viewerCaption.textContent = `${work.title} · ${i + 1} / ${work.images.length}`; imageViewer.showModal(); closeViewer.focus(); });
      const toggle = node('button', '', 'image-visibility'); toggle.type = 'button';
      const refresh = () => { const hidden = hiddenImages.has(image.file); item.classList.toggle('image-hidden', hidden); toggle.textContent = hidden ? '↶ Zobrazit' : '× Skrýt'; toggle.setAttribute('aria-label', `${hidden ? 'Znovu zobrazit' : 'Skrýt'} obrázek ${i + 1} práce ${work.title}`); };
      toggle.addEventListener('click', () => { if (hiddenImages.has(image.file)) hiddenImages.delete(image.file); else hiddenImages.add(image.file); refresh(); message.textContent = 'Změnu obrázků potvrď tlačítkem Uložit změny.'; });
      imageControls.push(refresh); refresh(); item.append(link, toggle); grid.append(item);
    }
    gallery.append(grid);
  }
  article.append(gallery); return article;
}
for (const s of ['#search','#grade-filter','#tag-filter','#edited-filter','#year-filter','#proposal-filter']) $(s).addEventListener('input', filterProjects);
loadMore.addEventListener('click', appendBatch);
$('#proposal-source').addEventListener('change', async event => {
  const control = event.target, selected = control.value;
  control.disabled = true; status.textContent = 'Načítám vybranou verzi návrhů…';
  try {
    const proposals = await get(`/api/digital-tag-proposals?version=${selected}`);
    digitalProposals = new Map(proposals.results.map(item => [item.id, item])); if (selected === 'codex') control.options[0].textContent = proposals.approval?.status === 'approved-and-applied' ? 'Schválená verze Codex' : 'Návrh asistenta Codex';
    proposalSource = selected; filterProjects();
  } catch (error) { control.value = proposalSource; status.textContent = `Verzi se nepodařilo načíst: ${error.message}`; }
  finally { control.disabled = false; }
});

Promise.all([get('/api/projects'),get('/api/categories'),get('/api/digital-tag-proposals')]).then(([data, cats, proposals]) => { projects = data.projects; categories = cats.categories; if (!data.projectsConnected) { const notice = document.createElement('p'); notice.textContent = 'Katalog prací není připojený. Nastav DOD_DATA_DIR podle návodu v podsložce průvodce.'; status.parentElement.insertBefore(notice, status); } $('#proposal-source').options[0].textContent = proposals.approval?.status === 'approved-and-applied' ? 'Schválená verze Codex' : 'Návrh asistenta Codex'; digitalProposals = new Map(proposals.results.map(item => [item.id, item])); for (const c of categories) $('#tag-filter').add(new Option(c.name,c.name)); for (const year of [...new Set(projects.map(p => p.year).filter(Boolean))].sort().reverse()) $('#year-filter').add(new Option(year,year)); filterProjects(); }).catch(error => { status.textContent = `Práce se nepodařilo načíst: ${error.message}`; });
