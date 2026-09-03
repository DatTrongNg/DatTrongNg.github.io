(function () {
  const chapterNumEl = document.getElementById('chapter-num');
  const chapterTitleEl = document.getElementById('chapter-title');
  const chapterBodyEl = document.getElementById('chapter-body');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const progressEl = document.getElementById('nav-progress');
  const listBtn = document.getElementById('list-btn');
  const listOverlay = document.getElementById('list-overlay');
  const listClose = document.getElementById('list-close');
  const listSearch = document.getElementById('list-search');
  const chapterListEl = document.getElementById('chapter-list');

  let manifest = [];
  let currentIndex = -1;

  function idFromHash() {
    return (location.hash || '').replace(/^#/, '');
  }

  function chapterCache() {
    if (!window.__chapterCache) window.__chapterCache = {};
    return window.__chapterCache;
  }

  async function fetchChapter(id) {
    const cache = chapterCache();
    if (cache[id]) return cache[id];
    const res = await fetch(`data/chapters/${id}.json`);
    if (!res.ok) throw new Error(`Chapter ${id} not found`);
    const data = await res.json();
    cache[id] = data;
    return data;
  }

  function renderList(filter) {
    const q = (filter || '').trim().toLowerCase();
    chapterListEl.innerHTML = '';
    let lastBook = null;
    manifest.forEach((m) => {
      if (q && !(`${m.num} ${m.title}`.toLowerCase().includes(q))) return;
      if (m.book !== lastBook) {
        const header = document.createElement('li');
        header.className = 'chapter-list-book';
        header.textContent = `Quyển ${m.book}`;
        chapterListEl.appendChild(header);
        lastBook = m.book;
      }
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${m.id}`;
      a.className = m.id === manifest[currentIndex]?.id ? 'active' : '';
      a.innerHTML = `<span class="li-num">${m.num}</span>${m.title}`;
      li.appendChild(a);
      chapterListEl.appendChild(li);
    });
  }

  function updateNav() {
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex >= 0 && currentIndex < manifest.length - 1;
    prevBtn.disabled = !hasPrev;
    nextBtn.disabled = !hasNext;
    prevBtn.onclick = hasPrev ? () => go(manifest[currentIndex - 1].id) : null;
    nextBtn.onclick = hasNext ? () => go(manifest[currentIndex + 1].id) : null;
    progressEl.textContent = currentIndex >= 0
      ? `${currentIndex + 1} / ${manifest.length}`
      : '— / —';
  }

  function go(id) {
    if (location.hash === `#${id}`) {
      render(id);
    } else {
      location.hash = id;
    }
  }

  function renderParagraphs(paragraphs) {
    chapterBodyEl.innerHTML = '';
    paragraphs.forEach((p) => {
      const el = document.createElement('p');
      el.textContent = p;
      if (/^["“"']/.test(p)) el.classList.add('dialogue');
      chapterBodyEl.appendChild(el);
    });
    const end = document.createElement('div');
    end.className = 'chapter-end';
    end.textContent = '— Hết chương —';
    chapterBodyEl.appendChild(end);
  }

  async function render(id) {
    currentIndex = manifest.findIndex((m) => m.id === id);
    if (currentIndex === -1) {
      chapterBodyEl.classList.add('error');
      chapterBodyEl.textContent = 'Không tìm thấy chương.';
      chapterTitleEl.textContent = 'Lỗi';
      chapterNumEl.textContent = '';
      updateNav();
      return;
    }
    const meta = manifest[currentIndex];
    chapterNumEl.textContent = `Chương ${meta.num}`;
    chapterTitleEl.textContent = meta.title;
    chapterBodyEl.classList.remove('error');
    chapterBodyEl.classList.add('loading');
    chapterBodyEl.textContent = 'Đang tải…';
    updateNav();
    renderList(listSearch.value);

    try {
      const data = await fetchChapter(id);
      chapterBodyEl.classList.remove('loading');
      renderParagraphs(data.paragraphs);
    } catch (err) {
      chapterBodyEl.classList.remove('loading');
      chapterBodyEl.classList.add('error');
      chapterBodyEl.textContent = 'Không thể tải nội dung chương này.';
    }

    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });

    // prefetch neighbours for snappy prev/next
    if (currentIndex > 0) fetchChapter(manifest[currentIndex - 1].id).catch(() => {});
    if (currentIndex < manifest.length - 1) fetchChapter(manifest[currentIndex + 1].id).catch(() => {});
  }

  function openList() {
    listOverlay.classList.add('open');
    listSearch.value = '';
    renderList('');
    const active = chapterListEl.querySelector('a.active');
    if (active) active.scrollIntoView({ block: 'center' });
    setTimeout(() => listSearch.focus(), 50);
  }

  function closeList() {
    listOverlay.classList.remove('open');
  }

  listBtn.addEventListener('click', openList);
  listClose.addEventListener('click', closeList);
  listOverlay.addEventListener('click', (e) => {
    if (e.target === listOverlay) closeList();
  });
  listSearch.addEventListener('input', () => renderList(listSearch.value));
  chapterListEl.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeList();
  });

  document.addEventListener('keydown', (e) => {
    if (document.activeElement === listSearch) {
      if (e.key === 'Escape') closeList();
      return;
    }
    if (listOverlay.classList.contains('open')) {
      if (e.key === 'Escape') closeList();
      return;
    }
    if (e.key === 'ArrowLeft' && !prevBtn.disabled) prevBtn.click();
    if (e.key === 'ArrowRight' && !nextBtn.disabled) nextBtn.click();
  });

  window.addEventListener('hashchange', () => render(idFromHash()));

  async function init() {
    const res = await fetch('data/manifest.json');
    manifest = await res.json();
    let id = idFromHash();
    if (!id || !manifest.some((m) => m.id === id)) {
      id = manifest[0]?.id;
      if (id) location.hash = id;
    }
    if (id) render(id);
  }

  init();
})();
