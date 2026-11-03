const elements = Object.fromEntries(['work-layout', 'hero-image', 'work-title', 'work-author', 'work-year', 'work-description', 'previous-image', 'next-image', 'status'].map(id => [id, document.getElementById(id)]));
let works = [];
let workIndex = 0;
let imageIndex = 0;
let galleryImages = [];
let lastWheelChange = 0;

function clean(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6])\s*>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function visibleImages(work) {
  return Array.isArray(work.images) ? work.images.filter(image => !image.hidden && typeof image.url === 'string') : [];
}

function renderImage() {
  const image = galleryImages[imageIndex];
  if (!image) return;
  const hero = elements['hero-image'];
  hero.classList.add('is-changing');
  const nextSource = new Image();
  nextSource.onload = () => {
    hero.src = image.url;
    hero.alt = `${elements['work-title'].textContent} — fotografie ${imageIndex + 1}`;
    hero.classList.add('is-ready');
    hero.classList.remove('is-changing');
  };
  nextSource.onerror = () => {
    hero.classList.remove('is-changing');
    elements.status.textContent = 'Fotografii se nepodařilo načíst.';
  };
  nextSource.src = image.url;
}

function renderWork(index) {
  if (!works.length) return;
  workIndex = (index + works.length) % works.length;
  const work = works[workIndex];
  galleryImages = visibleImages(work);
  imageIndex = 0;
  elements['work-title'].textContent = clean(work.title) || 'Bez názvu';
  elements['work-author'].textContent = clean(work.author) || 'Autor neuveden';
  elements['work-year'].textContent = clean(work.year) || 'Rok neuveden';
  elements['work-description'].textContent = clean(work.description);
  elements['previous-image'].hidden = galleryImages.length < 2;
  elements['next-image'].hidden = galleryImages.length < 2;
  elements['work-layout'].setAttribute('aria-busy', 'false');
  elements.status.textContent = '';
  renderImage();
  const url = new URL(location.href);
  url.searchParams.set('id', work.id);
  history.replaceState(null, '', url);
}

async function start() {
  try {
    const response = await fetch('/api/projects', { cache: 'no-store' });
    if (!response.ok) throw new Error('Seznam prací není dostupný.');
    const data = await response.json();
    works = (Array.isArray(data.projects) ? data.projects : []).filter(work => visibleImages(work).length > 0);
    if (!works.length) throw new Error('V připojeném katalogu nejsou žádné práce s viditelnými fotografiemi.');
    const selectedId = new URL(location.href).searchParams.get('id');
    const requestedIndex = works.findIndex(work => work.id === selectedId);
    renderWork(requestedIndex < 0 ? 0 : requestedIndex);
  } catch (error) {
    elements['work-layout'].setAttribute('aria-busy', 'false');
    elements.status.textContent = error.message;
  }
}

function changeImage(step) {
  if (galleryImages.length < 2) return;
  imageIndex = (imageIndex + step + galleryImages.length) % galleryImages.length;
  renderImage();
}

elements['previous-image'].addEventListener('click', () => changeImage(-1));
elements['next-image'].addEventListener('click', () => changeImage(1));
document.getElementById('hero-frame').addEventListener('wheel', event => {
  if (event.ctrlKey || galleryImages.length < 2) return;
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (!delta) return;
  event.preventDefault();
  const now = performance.now();
  if (now - lastWheelChange < 380) return;
  lastWheelChange = now;
  changeImage(delta > 0 ? 1 : -1);
}, { passive: false });
document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(event.target.tagName)) return;
  if (event.key === 'ArrowLeft') { event.preventDefault(); changeImage(-1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); changeImage(1); }
});

start();
