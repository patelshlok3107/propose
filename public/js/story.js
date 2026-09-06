// ═══════════════════════════════════════════════
//  STORY — Cinematic Story Player
//  PLAY → BLACKOUT → SEASON → Previously → VIDEO → Interlude → Chapters → THE END → Proposal
// ═══════════════════════════════════════════════

const Story = (() => {
  let overlay, videoEl, controlsEl, progressEl, dotsEl;
  let currentPhase = 'idle'; // idle | blackout | season | opening | video | interlude | memories | theend | done
  let currentMemoryIndex = 0;
  let memoryTimer = null;
  let cinematicTimer = null;
  let isOpen = false;
  let touchStartX = 0;
  let hasEndedOnce = false;

  function init() {}

  function start() {
    if (isOpen) return;
    isOpen = true;
    currentPhase = 'blackout';
    hasEndedOnce = false;

    const topNav = document.getElementById('top-nav');
    const mobileTop = document.getElementById('mobile-top-nav');
    const mobileBottom = document.getElementById('mobile-bottom-nav');
    const mainContent = document.getElementById('main-content');
    if (topNav) topNav.style.display = 'none';
    if (mobileTop) mobileTop.style.display = 'none';
    if (mobileBottom) mobileBottom.style.display = 'none';
    if (mainContent) mainContent.style.display = 'none';

    overlay = document.createElement('div');
    overlay.id = 'story-overlay';
    overlay.innerHTML = `
      <div class="story-blackout"></div>
      <div class="story-cinematic">
        <div class="story-cinematic-inner">
          <p class="story-season-title"></p>
          <p class="story-season-subtitle"></p>
          <p class="story-cinematic-line"></p>
          <p class="story-cinematic-sub"></p>
        </div>
      </div>
      <div class="story-video-container">
        <video class="story-video" playsinline preload="metadata"></video>
        <div class="story-video-controls">
          <button class="story-ctrl-btn story-play-pause" aria-label="Play/Pause">
            <span class="story-ctrl-icon story-icon-pause">❚❚</span>
            <span class="story-ctrl-icon story-icon-play" style="display:none">▶</span>
          </button>
          <div class="story-progress-wrap">
            <div class="story-progress-bar"><div class="story-progress-fill"></div></div>
          </div>
          <button class="story-ctrl-btn story-exit-btn" aria-label="Exit">✕</button>
        </div>
      </div>
      <div class="story-memory-container">
        <div class="story-memory-bg"></div>
        <div class="story-memory-overlay"></div>
        <div class="story-episode-label"></div>
        <img class="story-memory-img" src="" alt="">
        <div class="story-memory-text">
          <p class="story-chapter-label"></p>
          <h3 class="story-memory-title"></h3>
          <p class="story-memory-message"></p>
        </div>
        <div class="story-memory-controls">
          <button class="story-mem-ctrl story-mem-prev" aria-label="Previous">‹</button>
          <div class="story-memory-dots"></div>
          <button class="story-mem-ctrl story-mem-next" aria-label="Next">›</button>
        </div>
        <button class="story-mem-exit" aria-label="Exit story">✕</button>
      </div>
      <div class="story-vignette"></div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    videoEl = overlay.querySelector('.story-video');
    controlsEl = overlay.querySelector('.story-video-controls');
    progressEl = overlay.querySelector('.story-progress-fill');
    dotsEl = overlay.querySelector('.story-memory-dots');

    // Build dots
    if (dotsEl && CONFIG.memories) {
      CONFIG.memories.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = 'story-dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => goToMemory(i));
        dotsEl.appendChild(dot);
      });
    }

    setupEvents();

    // Phase 1: Blackout → Season → Opening → Video
    setTimeout(() => {
      const blackout = overlay.querySelector('.story-blackout');
      blackout.classList.add('active');
      setTimeout(() => showSeasonCard(), 900);
    }, 100);
  }

  function showSeasonCard() {
    currentPhase = 'season';
    const card = overlay.querySelector('.story-cinematic');
    const title = card.querySelector('.story-season-title');
    const sub = card.querySelector('.story-season-subtitle');
    const line = card.querySelector('.story-cinematic-line');
    const sub2 = card.querySelector('.story-cinematic-sub');
    const s = CONFIG.story || {};
    title.textContent = s.seasonTitle || 'JIYA & SHLOK';
    sub.textContent = s.seasonSubtitle || 'Season 1';
    line.textContent = '';
    sub2.textContent = '';
    card.classList.add('active');
    // season card 2s then opening
    cinematicTimer = setTimeout(() => {
      card.classList.remove('active');
      setTimeout(showOpeningCard, 700);
    }, 2200);
  }

  function showOpeningCard() {
    currentPhase = 'opening';
    const card = overlay.querySelector('.story-cinematic');
    const title = card.querySelector('.story-season-title');
    const sub = card.querySelector('.story-season-subtitle');
    const line = card.querySelector('.story-cinematic-line');
    title.textContent = '';
    sub.textContent = '';
    line.textContent = (CONFIG.story && CONFIG.story.openingLine) || "Previously, in a story I never expected to live...";
    const subEl = card.querySelector('.story-cinematic-sub');
    subEl.textContent = '';
    card.classList.add('active');
    cinematicTimer = setTimeout(() => {
      card.classList.remove('active');
      setTimeout(() => startVideo(), 800);
    }, 3200);
  }

  function setupEvents() {
    overlay.querySelectorAll('.story-exit-btn, .story-mem-exit').forEach(btn => {
      btn.addEventListener('click', close);
    });
    const playPauseBtn = overlay.querySelector('.story-play-pause');
    const iconPause = overlay.querySelector('.story-icon-pause');
    const iconPlay = overlay.querySelector('.story-icon-play');
    playPauseBtn?.addEventListener('click', () => {
      if (videoEl.paused) {
        videoEl.play();
        iconPause.style.display = '';
        iconPlay.style.display = 'none';
      } else {
        videoEl.pause();
        iconPause.style.display = 'none';
        iconPlay.style.display = '';
      }
    });
    videoEl.addEventListener('timeupdate', () => {
      if (videoEl.duration) {
        const pct = (videoEl.currentTime / videoEl.duration) * 100;
        if (progressEl) progressEl.style.width = pct + '%';
      }
    });
    // Video ended → interlude → memories (use actual ended event)
    videoEl.addEventListener('ended', () => {
      if (hasEndedOnce) return;
      hasEndedOnce = true;
      transitionToInterlude();
    });
    const videoContainer = overlay.querySelector('.story-video-container');
    let controlsTimeout;
    videoContainer?.addEventListener('click', (e) => {
      if (e.target.closest('.story-ctrl-btn')) return;
      controlsEl.classList.toggle('visible');
      clearTimeout(controlsTimeout);
      controlsTimeout = setTimeout(() => controlsEl.classList.remove('visible'), 3000);
    });
    overlay.querySelector('.story-mem-prev')?.addEventListener('click', prevMemory);
    overlay.querySelector('.story-mem-next')?.addEventListener('click', nextMemory);
    const memContainer = overlay.querySelector('.story-memory-container');
    memContainer?.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    memContainer?.addEventListener('touchend', (e) => {
      const diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) nextMemory();
        else prevMemory();
      }
    }, { passive: true });
    document.addEventListener('keydown', handleKeydown);
  }

  function handleKeydown(e) {
    if (!isOpen) return;
    if (e.key === 'Escape') close();
    if (currentPhase === 'video') {
      if (e.key === ' ') { e.preventDefault(); videoEl.paused ? videoEl.play() : videoEl.pause(); }
    }
    if (currentPhase === 'memories') {
      if (e.key === 'ArrowRight' || e.key === ' ') nextMemory();
      if (e.key === 'ArrowLeft') prevMemory();
    }
  }

  function startVideo() {
    currentPhase = 'video';
    const videoContainer = overlay.querySelector('.story-video-container');
    // ensure cinematic hidden
    const card = overlay.querySelector('.story-cinematic');
    card.classList.remove('active');
    videoContainer.classList.add('active');
    videoEl.src = CONFIG.storyVideo;
    videoEl.loop = false;
    videoEl.load();
    // try photo music pause, video audio is own
    pausePhotoMusic();
    videoEl.play().catch(() => {
      const iconPause = overlay.querySelector('.story-icon-pause');
      const iconPlay = overlay.querySelector('.story-icon-play');
      if (iconPause) iconPause.style.display = 'none';
      if (iconPlay) iconPlay.style.display = '';
    });
  }

  function transitionToInterlude() {
    if (!isOpen || hasEndedOnce === false) hasEndedOnce = true;
    // Fade video to black
    const videoContainer = overlay.querySelector('.story-video-container');
    videoContainer.classList.remove('active');
    videoContainer.classList.add('fading');
    videoEl.pause();
    videoEl.src = '';
    videoEl.load();
    setTimeout(() => {
      videoContainer.style.display = 'none';
      showInterlude();
    }, 1100);
  }

  function showInterlude() {
    currentPhase = 'interlude';
    const card = overlay.querySelector('.story-cinematic');
    const title = card.querySelector('.story-season-title');
    const sub = card.querySelector('.story-season-subtitle');
    const line = card.querySelector('.story-cinematic-line');
    title.textContent = '';
    sub.textContent = '';
    line.textContent = (CONFIG.story && CONFIG.story.interludeLine) || "And somehow… every chapter led me to you.";
    card.classList.add('active');
    // start soft photo music if available
    playPhotoMusic();
    cinematicTimer = setTimeout(() => {
      card.classList.remove('active');
      setTimeout(() => {
        currentMemoryIndex = 0;
        showMemory(0);
      }, 800);
    }, 2800);
  }

  function showMemory(index) {
    if (index < 0 || index >= CONFIG.memories.length) return;
    currentMemoryIndex = index;
    const memory = CONFIG.memories[index];
    const memContainer = overlay.querySelector('.story-memory-container');
    const memImg = overlay.querySelector('.story-memory-img');
    const memTitle = overlay.querySelector('.story-memory-title');
    const memMsg = overlay.querySelector('.story-memory-message');
    const memBg = overlay.querySelector('.story-memory-bg');
    const chapterEl = overlay.querySelector('.story-chapter-label');
    const episodeEl = overlay.querySelector('.story-episode-label');

    memContainer.classList.add('active');
    memImg.src = memory.image;
    memImg.alt = memory.title || '';
    memBg.style.backgroundImage = `url('${memory.image}')`;
    if (chapterEl) chapterEl.textContent = memory.chapter || '';
    if (episodeEl) episodeEl.textContent = memory.episode || '';
    memTitle.textContent = memory.title || '';
    memMsg.textContent = memory.message || '';

    memContainer.classList.remove('fade-out');
    memContainer.classList.add('fade-in');

    if (dotsEl) {
      dotsEl.querySelectorAll('.story-dot').forEach((d, i) => {
        d.classList.toggle('active', i === index);
      });
    }

    clearTimeout(memoryTimer);
    const duration = memory.duration || 4200;
    if (index === CONFIG.memories.length - 1) {
      memoryTimer = setTimeout(() => {
        showTheEnd();
      }, duration);
    } else {
      memoryTimer = setTimeout(() => {
        nextMemory();
      }, duration);
    }
  }

  function nextMemory() {
    clearTimeout(memoryTimer);
    clearTimeout(cinematicTimer);
    if (currentMemoryIndex < CONFIG.memories.length - 1) {
      const memContainer = overlay.querySelector('.story-memory-container');
      memContainer.classList.add('fade-out');
      memContainer.classList.remove('fade-in');
      setTimeout(() => {
        showMemory(currentMemoryIndex + 1);
      }, 600);
    } else {
      showTheEnd();
    }
  }

  function prevMemory() {
    clearTimeout(memoryTimer);
    if (currentMemoryIndex > 0) {
      const memContainer = overlay.querySelector('.story-memory-container');
      memContainer.classList.add('fade-out');
      memContainer.classList.remove('fade-in');
      setTimeout(() => {
        showMemory(currentMemoryIndex - 1);
      }, 600);
    }
  }

  function goToMemory(index) {
    clearTimeout(memoryTimer);
    if (index >= 0 && index < CONFIG.memories.length) {
      const memContainer = overlay.querySelector('.story-memory-container');
      memContainer.classList.add('fade-out');
      memContainer.classList.remove('fade-in');
      setTimeout(() => {
        showMemory(index);
      }, 400);
    }
  }

  function showTheEnd() {
    if (currentPhase === 'theend' || currentPhase === 'done') return;
    currentPhase = 'theend';
    clearTimeout(memoryTimer);
    const memContainer = overlay.querySelector('.story-memory-container');
    memContainer.classList.add('fade-out');
    memContainer.classList.remove('fade-in');
    // lower photo music before THE END
    lowerPhotoMusic();
    setTimeout(() => {
      memContainer.classList.remove('active');
      memContainer.style.display = 'none';
      const card = overlay.querySelector('.story-cinematic');
      const title = card.querySelector('.story-season-title');
      const line = card.querySelector('.story-cinematic-line');
      const sub = card.querySelector('.story-cinematic-sub');
      title.textContent = '';
      line.textContent = (CONFIG.story && CONFIG.story.theEnd) || 'THE END';
      line.style.letterSpacing = '6px';
      line.style.fontSize = 'clamp(1.4rem, 4vw, 2rem)';
      line.style.fontWeight = '800';
      sub.textContent = '';
      card.classList.add('active');
      cinematicTimer = setTimeout(() => {
        line.textContent = (CONFIG.story && CONFIG.story.orMaybe) || '...or maybe, our beginning.';
        line.style.letterSpacing = '0.5px';
        line.style.fontSize = 'clamp(1rem, 2.8vw, 1.3rem)';
        line.style.fontWeight = '400';
        line.style.fontStyle = 'italic';
        line.style.fontFamily = 'var(--font-romantic)';
        cinematicTimer = setTimeout(() => {
          card.classList.remove('active');
          setTimeout(() => finishAndPropose(), 700);
        }, 2400);
      }, 2100);
    }, 700);
  }

  function finishAndPropose() {
    if (currentPhase === 'done') return;
    currentPhase = 'done';
    clearTimeout(memoryTimer);
    clearTimeout(cinematicTimer);
    pausePhotoMusic();
    const memContainer = overlay.querySelector('.story-memory-container');
    if (memContainer) {
      memContainer.classList.add('fade-out');
      memContainer.classList.remove('fade-in');
    }
    const card = overlay.querySelector('.story-cinematic');
    if (card) card.classList.remove('active');
    setTimeout(() => {
      if (memContainer) {
        memContainer.classList.remove('active');
        memContainer.style.display = 'none';
      }
      overlay.classList.add('fading');
      document.body.style.overflow = '';
      setTimeout(() => {
        close(false);
        Proposal.reveal();
      }, 1000);
    }, 600);
  }

  // ── Audio helpers ──
  let photoAudio = null;
  function playPhotoMusic() {
    if (!CONFIG.audio || !CONFIG.audio.photoMusic) return;
    if (!photoAudio) {
      photoAudio = new Audio(CONFIG.audio.photoMusic);
      photoAudio.loop = true;
      photoAudio.volume = 0.35;
    }
    photoAudio.play().catch(()=>{});
  }
  function pausePhotoMusic() {
    if (photoAudio) { try { photoAudio.pause(); } catch(e){} }
  }
  function lowerPhotoMusic() {
    if (photoAudio && !photoAudio.paused) {
      let v = photoAudio.volume;
      const fade = setInterval(() => {
        v -= 0.04;
        if (v <= 0.08) { photoAudio.volume = 0.08; clearInterval(fade); }
        else photoAudio.volume = v;
      }, 120);
    }
  }

  function close(restoreDashboard = true) {
    if (!isOpen && !overlay) return;
    isOpen = false;
    clearTimeout(memoryTimer);
    clearTimeout(cinematicTimer);
    currentPhase = 'idle';
    pausePhotoMusic();
    if (videoEl) {
      try { videoEl.pause(); videoEl.removeAttribute('src'); videoEl.load(); } catch(e) {}
    }
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleKeydown);
    if (restoreDashboard) {
      const topNav = document.getElementById('top-nav');
      const mobileTop = document.getElementById('mobile-top-nav');
      const mobileBottom = document.getElementById('mobile-bottom-nav');
      const mainContent = document.getElementById('main-content');
      if (topNav) topNav.style.display = '';
      if (mobileTop) mobileTop.style.display = '';
      if (mobileBottom) mobileBottom.style.display = '';
      if (mainContent) { mainContent.style.display = 'block'; mainContent.style.opacity = '1'; }
    }
  }

  return { init, start, close };
})();
