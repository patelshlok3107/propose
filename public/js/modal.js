// ═══════════════════════════════════════════════
//  MODAL — Full-Screen Cinematic Overlay
// ═══════════════════════════════════════════════

const Modal = (() => {
  let overlay, container, mediaEl, titleEl, messageEl;
  let prevBtn, nextBtn, closeBtn, progressEl, categoryLabel;
  let currentCategory = 0;
  let currentMemory = 0;
  let isOpen = false;
  let touchStartX = 0;
  let touchStartY = 0;

  function init() {
    overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    container = overlay.querySelector('.modal-container');
    mediaEl = overlay.querySelector('.modal-media');
    titleEl = overlay.querySelector('.modal-memory-title');
    messageEl = overlay.querySelector('.modal-memory-message');
    prevBtn = overlay.querySelector('.modal-nav-prev');
    nextBtn = overlay.querySelector('.modal-nav-next');
    closeBtn = overlay.querySelector('.modal-close');
    progressEl = overlay.querySelector('.modal-progress');
    categoryLabel = overlay.querySelector('.modal-category-label');

    closeBtn?.addEventListener('click', close);
    prevBtn?.addEventListener('click', goPrev);
    nextBtn?.addEventListener('click', goNext);

    document.addEventListener('keydown', (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    overlay.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    overlay.addEventListener('touchend', (e) => {
      const diffX = touchStartX - e.changedTouches[0].screenX;
      const diffY = touchStartY - e.changedTouches[0].screenY;
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 60) {
        if (diffX > 0) goNext();
        else goPrev();
      }
    }, { passive: true });
  }

  function open(categoryIndex, memoryIndex) {
    currentCategory = categoryIndex;
    currentMemory = memoryIndex;
    isOpen = true;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    showMemory();
    overlay.classList.add('active');
  }

  function close() {
    isOpen = false;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';

    const video = mediaEl?.querySelector('video');
    if (video) { video.pause(); video.src = ''; }
  }

  function showMemory() {
    const category = CONFIG.mediaRows[currentCategory];
    if (!category) return;
    const memory = category.items[currentMemory];
    if (!memory) return;

    if (categoryLabel) categoryLabel.textContent = category.title;

    if (mediaEl) {
      mediaEl.innerHTML = '';
      if (memory.type === 'video') {
        const video = document.createElement('video');
        video.src = memory.src;
        video.controls = true;
        video.playsInline = true;
        video.preload = 'metadata';
        video.setAttribute('controlslist', 'nodownload');
        video.style.maxHeight = '55vh';
        video.onerror = () => { mediaEl.innerHTML = '<div style="padding:60px;text-align:center;color:#888"><div style="font-size:3rem;margin-bottom:16px">🎬</div><div>Video not available</div></div>'; };
        mediaEl.appendChild(video);
      } else {
        const img = document.createElement('img');
        img.src = memory.src;
        img.alt = memory.title;
        img.loading = 'lazy';
        img.onerror = () => { mediaEl.innerHTML = '<div style="padding:60px;text-align:center;color:#888"><div style="font-size:3rem;margin-bottom:16px">📸</div><div>Photo not available</div></div>'; };
        mediaEl.appendChild(img);
      }
    }

    if (titleEl) { titleEl.style.animation = 'none'; titleEl.offsetHeight; titleEl.style.animation = ''; titleEl.textContent = memory.title; }
    if (messageEl) { messageEl.style.animation = 'none'; messageEl.offsetHeight; messageEl.style.animation = ''; messageEl.textContent = memory.message; }

    updateProgress();
    updateNavButtons();
  }

  function updateProgress() {
    if (!progressEl) return;
    const category = CONFIG.mediaRows[currentCategory];
    if (!category) return;
    progressEl.innerHTML = '';
    category.items.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'modal-dot' + (i === currentMemory ? ' active' : '');
      dot.addEventListener('click', () => { currentMemory = i; showMemory(); });
      progressEl.appendChild(dot);
    });
  }

  function updateNavButtons() {
    if (prevBtn) {
      prevBtn.style.opacity = (currentCategory === 0 && currentMemory === 0) ? '0.2' : '1';
      prevBtn.style.pointerEvents = (currentCategory === 0 && currentMemory === 0) ? 'none' : 'all';
    }
  }

  function goNext() {
    const category = CONFIG.mediaRows[currentCategory];
    if (!category) return;
    const video = mediaEl?.querySelector('video');
    if (video) { video.pause(); video.src = ''; }

    if (currentMemory < category.items.length - 1) {
      currentMemory++;
      showMemory();
    } else if (currentCategory < CONFIG.mediaRows.length - 1) {
      currentCategory++;
      currentMemory = 0;
      showMemory();
    } else {
      close();
      setTimeout(() => Proposal.reveal(), 500);
    }
  }

  function goPrev() {
    const video = mediaEl?.querySelector('video');
    if (video) { video.pause(); video.src = ''; }

    if (currentMemory > 0) {
      currentMemory--;
      showMemory();
    } else if (currentCategory > 0) {
      currentCategory--;
      currentMemory = CONFIG.mediaRows[currentCategory].items.length - 1;
      showMemory();
    }
  }

  return { init, open, close };
})();
