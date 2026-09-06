// ═══════════════════════════════════════════════
//  STORY — Cinematic Overlay (separate from Dashboard)
//  PLAY → BLACKOUT → THOSE EYES (user gesture) → VIDEO → PHOTOS (synced) → PROPOSAL
//  Dashboard DOM is NEVER modified — overlay sits on top.
// ═══════════════════════════════════════════════

const Story = (() => {
  let overlay, videoEl, controlsEl, progressEl, dotsEl;
  let storyAudio = null; // Those Eyes — single instance
  let youtubePlayer = null;
  let isOpen = false;
  let currentPhase = 'idle'; // idle | blackout | season | opening | video | interlude | photos | final | done
  let currentPhotoIndex = -1;
  let timers = [];
  let hasVideoEnded = false;
  let hasAudioStarted = false;

  function init() {}

  // ── Entry: called directly from PLAY OUR STORY click (user gesture) ──
  function start() {
    if (isOpen) return;
    isOpen = true;
    currentPhase = 'blackout';
    hasVideoEnded = false;
    hasAudioStarted = false;
    currentPhotoIndex = -1;

    // Do NOT modify dashboard DOM — just cover it with overlay
    const topNav = document.getElementById('top-nav');
    const mobileTop = document.getElementById('mobile-top-nav');
    const mobileBottom = document.getElementById('mobile-bottom-nav');
    // We keep dashboard in DOM but hidden behind overlay via z-index; for clean cinematic we hide navs visually
    if (topNav) topNav.style.display = 'none';
    if (mobileTop) mobileTop.style.display = 'none';
    if (mobileBottom) mobileBottom.style.display = 'none';
    // Keep mainContent in DOM (do not alter) — overlay will cover it

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
      <div id="story-youtube-wrap" style="position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;"></div>
      <div class="story-vignette"></div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    videoEl = overlay.querySelector('.story-video');
    controlsEl = overlay.querySelector('.story-video-controls');
    progressEl = overlay.querySelector('.story-progress-fill');
    dotsEl = overlay.querySelector('.story-memory-dots');

    // Build dots for all story photos (use storyTimeline or memories)
    const photos = getStoryPhotos();
    if (dotsEl && photos) {
      photos.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = 'story-dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => goToPhoto(i));
        dotsEl.appendChild(dot);
      });
    }

    setupEvents();

    // ── START MUSIC FROM PLAY CLICK (user gesture) ──
    // Create/load audio synchronously inside click handler
    createStoryAudio();

    // Blackout → Season → Opening → Video
    setTimeout(() => {
      const blackout = overlay.querySelector('.story-blackout');
      blackout.classList.add('active');
      setTimeout(() => showSeasonCard(), 800);
    }, 100);
  }

  function getStoryPhotos() {
    // Prefer explicit storyTimeline (has start/duration for sync), else memories
    if (CONFIG.storyTimeline && CONFIG.storyTimeline.length) return CONFIG.storyTimeline;
    if (CONFIG.memories && CONFIG.memories.length) return CONFIG.memories;
    // Fallback: collect all photos from dashboard mediaRows
    const all = [];
    if (CONFIG.mediaRows) {
      CONFIG.mediaRows.forEach(row => {
        row.items.forEach(item => {
          if (item.type === 'photo') all.push({ image: item.src, source: item.src, title: item.title, message: item.message, duration: 4200 });
        });
      });
    }
    return all;
  }

  function getTimeline() {
    // Use storyTimeline if available (has start/end), else build from memories
    if (CONFIG.storyTimeline && CONFIG.storyTimeline.length) return CONFIG.storyTimeline;
    const mems = CONFIG.memories || [];
    return mems.map((m, i) => ({
      source: m.image || m.source,
      image: m.image || m.source,
      title: m.title,
      message: m.message,
      chapter: m.chapter,
      episode: m.episode,
      start: i * 8,
      duration: (m.duration || 4200) / 1000
    }));
  }

  function createStoryAudio() {
    // Clean previous
    if (storyAudio) {
      try { storyAudio.pause(); storyAudio.src = ''; } catch(e) {}
      storyAudio = null;
    }
    if (youtubePlayer) {
      try { youtubePlayer.remove(); } catch(e) {}
      youtubePlayer = null;
    }

    const src = CONFIG.audio && CONFIG.audio.storySoundtrack;
    const youtubeId = CONFIG.audio && CONFIG.audio.storySoundtrackYoutubeId;

    // Try HTMLAudio first if file exists
    if (src) {
      storyAudio = new Audio();
      storyAudio.preload = 'auto';
      storyAudio.loop = false;
      storyAudio.volume = 0.85;
      storyAudio.src = src;

      // If file 404, error event will fire → fallback to YouTube
      storyAudio.addEventListener('error', () => {
        console.warn('[Story] Those Eyes audio file not found:', src, '— falling back to YouTube');
        try { storyAudio.pause(); } catch(e) {}
        storyAudio = null;
        if (youtubeId) createYoutubePlayer(youtubeId);
        else console.error('[Story] No YouTube fallback configured. Place file at', src);
      });

      storyAudio.addEventListener('ended', () => {
        console.log('[Story] Those Eyes ended — visual sequence will finish naturally');
        // Do not restart, do not loop — let photos finish then proposal
      });

      // Attempt play as user gesture — handle promise
      storyAudio.currentTime = 0;
      const p = storyAudio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          hasAudioStarted = true;
          console.log('[Story] Those Eyes playing');
        }).catch((err) => {
          console.error('[Story] Audio playback failed:', err);
          // Fallback to YouTube if available
          if (youtubeId) {
            storyAudio = null;
            createYoutubePlayer(youtubeId);
          }
        });
      } else {
        hasAudioStarted = true;
      }
    } else if (youtubeId) {
      createYoutubePlayer(youtubeId);
    } else {
      console.warn('[Story] No storySoundtrack configured');
    }
  }

  function createYoutubePlayer(youtubeId) {
    const wrap = document.getElementById('story-youtube-wrap');
    if (!wrap || !youtubeId) return;
    // Use YouTube iframe with JS API not required — simple embed autoplay
    const iframe = document.createElement('iframe');
    iframe.width = '1';
    iframe.height = '1';
    iframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&controls=0&loop=0&rel=0&enablejsapi=1`;
    iframe.allow = 'autoplay; encrypted-media';
    iframe.style.border = '0';
    wrap.appendChild(iframe);
    youtubePlayer = iframe;
    hasAudioStarted = true;
    console.log('[Story] YouTube fallback playing:', youtubeId);
  }

  function showSeasonCard() {
    currentPhase = 'season';
    const card = overlay.querySelector('.story-cinematic');
    const title = card.querySelector('.story-season-title');
    const sub = card.querySelector('.story-season-subtitle');
    const line = card.querySelector('.story-cinematic-line');
    const s = CONFIG.story || {};
    title.textContent = s.seasonTitle || 'JIYA & SHLOK';
    sub.textContent = s.seasonSubtitle || 'Season 1';
    line.textContent = '';
    card.querySelector('.story-cinematic-sub').textContent = '';
    card.classList.add('active');
    const t = setTimeout(() => {
      card.classList.remove('active');
      setTimeout(showOpeningCard, 700);
    }, 2200);
    timers.push(t);
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
    card.querySelector('.story-cinematic-sub').textContent = '';
    card.classList.add('active');
    const t = setTimeout(() => {
      card.classList.remove('active');
      setTimeout(() => startVideo(), 800);
    }, 3200);
    timers.push(t);
  }

  function setupEvents() {
    overlay.querySelectorAll('.story-exit-btn, .story-mem-exit').forEach(btn => {
      btn.addEventListener('click', () => close(true));
    });
    const playPauseBtn = overlay.querySelector('.story-play-pause');
    const iconPause = overlay.querySelector('.story-icon-pause');
    const iconPlay = overlay.querySelector('.story-icon-play');
    playPauseBtn?.addEventListener('click', () => {
      if (videoEl.paused) {
        videoEl.play();
        iconPause.style.display = '';
        iconPlay.style.display = 'none';
        // lower music while video resumes
        if (storyAudio && !storyAudio.paused) storyAudio.volume = 0.22;
      } else {
        videoEl.pause();
        iconPause.style.display = 'none';
        iconPlay.style.display = '';
        if (storyAudio && !storyAudio.paused) storyAudio.volume = 0.35;
      }
    });
    videoEl.addEventListener('timeupdate', () => {
      if (videoEl.duration) {
        const pct = (videoEl.currentTime / videoEl.duration) * 100;
        if (progressEl) progressEl.style.width = pct + '%';
      }
    });
    videoEl.addEventListener('ended', () => {
      if (hasVideoEnded) return;
      hasVideoEnded = true;
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
    overlay.querySelector('.story-mem-prev')?.addEventListener('click', prevPhoto);
    overlay.querySelector('.story-mem-next')?.addEventListener('click', nextPhoto);
    const memContainer = overlay.querySelector('.story-memory-container');
    let touchStartX = 0;
    memContainer?.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    memContainer?.addEventListener('touchend', (e) => {
      const diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) nextPhoto();
        else prevPhoto();
      }
    }, { passive: true });
    document.addEventListener('keydown', handleKeydown);
  }

  function handleKeydown(e) {
    if (!isOpen) return;
    if (e.key === 'Escape') close(true);
    if (currentPhase === 'video') {
      if (e.key === ' ') { e.preventDefault(); videoEl.paused ? videoEl.play() : videoEl.pause(); }
    }
    if (currentPhase === 'photos') {
      if (e.key === 'ArrowRight' || e.key === ' ') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
    }
  }

  function startVideo() {
    currentPhase = 'video';
    const videoContainer = overlay.querySelector('.story-video-container');
    const card = overlay.querySelector('.story-cinematic');
    card.classList.remove('active');
    videoContainer.classList.add('active');
    videoEl.src = CONFIG.storyVideo;
    videoEl.loop = false;
    videoEl.volume = 1.0;
    // Lower Those Eyes while video audio is important
    if (storyAudio && !storyAudio.paused) storyAudio.volume = 0.22;
    if (youtubePlayer) {
      // YouTube volume can't be controlled without API — keep as is
    }
    videoEl.load();
    videoEl.play().catch(() => {
      const iconPause = overlay.querySelector('.story-icon-pause');
      const iconPlay = overlay.querySelector('.story-icon-play');
      if (iconPause) iconPause.style.display = 'none';
      if (iconPlay) iconPlay.style.display = '';
    });
  }

  function transitionToInterlude() {
    if (!isOpen || currentPhase === 'photos' || currentPhase === 'final') return;
    currentPhase = 'interlude';
    const videoContainer = overlay.querySelector('.story-video-container');
    videoContainer.classList.remove('active');
    videoContainer.classList.add('fading');
    // Restore music volume after video
    if (storyAudio && !storyAudio.paused) storyAudio.volume = 0.35;
    try { videoEl.pause(); videoEl.src = ''; videoEl.load(); } catch(e) {}
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
    const t = setTimeout(() => {
      card.classList.remove('active');
      setTimeout(() => startPhotoSequence(), 800);
    }, 2800);
    timers.push(t);
  }

  function startPhotoSequence() {
    currentPhase = 'photos';
    // If song is playing, sync to it; else use timer fallback
    if (storyAudio && hasAudioStarted && !storyAudio.paused && storyAudio.duration > 0) {
      startSyncedPhotos();
    } else if (youtubePlayer) {
      // YouTube fallback — use timer fallback (no timeupdate)
      startTimerPhotos();
    } else {
      // No audio — timer fallback
      startTimerPhotos();
    }
  }

  function startSyncedPhotos() {
    const timeline = getTimeline();
    let lastIndex = -1;
    const onTimeUpdate = () => {
      if (!isOpen || currentPhase !== 'photos') return;
      const t = storyAudio.currentTime;
      // Find current photo based on timeline
      let idx = -1;
      for (let i = 0; i < timeline.length; i++) {
        const start = timeline[i].start;
        const end = start + timeline[i].duration;
        if (t >= start && t < end) { idx = i; break; }
      }
      // If past last, idx = last
      if (idx === -1 && t >= 0) {
        if (t >= timeline[timeline.length-1].start) idx = timeline.length-1;
        else idx = 0;
      }
      if (idx !== -1 && idx !== lastIndex) {
        lastIndex = idx;
        showPhoto(idx, timeline[idx]);
      }
      // If song ended, finish after last photo duration
      if (storyAudio.ended) {
        storyAudio.removeEventListener('timeupdate', onTimeUpdate);
        // Show final photo longer then proposal
        const finalIdx = timeline.length - 1;
        if (lastIndex !== finalIdx) showPhoto(finalIdx, timeline[finalIdx]);
        setTimeout(() => showTheEnd(), (timeline[finalIdx].duration * 1000) + 800);
      }
    };
    storyAudio.addEventListener('timeupdate', onTimeUpdate);
    // Also handle ended
    storyAudio.addEventListener('ended', () => {
      storyAudio.removeEventListener('timeupdate', onTimeUpdate);
      setTimeout(() => showTheEnd(), 1200);
    });
    // Trigger first
    onTimeUpdate();
    // Fallback if audio is shorter than visual: ensure we still progress even if timeupdate stalls
    // Keep timer for final transition as safety
    const totalDuration = timeline.reduce((sum, item) => sum + item.duration, 0) * 1000;
    const t = setTimeout(() => {
      if (currentPhase === 'photos') showTheEnd();
    }, totalDuration + 4000);
    timers.push(t);
  }

  function startTimerPhotos() {
    const photos = getStoryPhotos();
    let idx = 0;
    function next() {
      if (!isOpen || currentPhase !== 'photos') return;
      if (idx >= photos.length) { showTheEnd(); return; }
      showPhoto(idx, photos[idx]);
      const dur = (photos[idx].duration || 4200);
      const t = setTimeout(() => { idx++; next(); }, dur);
      timers.push(t);
    }
    next();
  }

  function showPhoto(index, data) {
    if (index < 0) return;
    currentPhotoIndex = index;
    const memContainer = overlay.querySelector('.story-memory-container');
    const memImg = overlay.querySelector('.story-memory-img');
    const memTitle = overlay.querySelector('.story-memory-title');
    const memMsg = overlay.querySelector('.story-memory-message');
    const memBg = overlay.querySelector('.story-memory-bg');
    const chapterEl = overlay.querySelector('.story-chapter-label');
    const episodeEl = overlay.querySelector('.story-episode-label');

    if (!memContainer) return;
    memContainer.classList.add('active');

    const src = data.source || data.image || data.src;
    const title = data.title || '';
    const message = data.message || '';
    const chapter = data.chapter || '';
    const episode = data.episode || '';

    // Crossfade: fade-out previous then fade-in new if already visible
    const isFirst = !memContainer.classList.contains('fade-in');
    if (!isFirst) {
      memContainer.classList.add('fade-out');
      memContainer.classList.remove('fade-in');
      setTimeout(() => {
        setPhotoContent();
        memContainer.classList.remove('fade-out');
        memContainer.classList.add('fade-in');
      }, 380);
    } else {
      setPhotoContent();
      memContainer.classList.remove('fade-out');
      memContainer.classList.add('fade-in');
    }

    function setPhotoContent() {
      memImg.src = src;
      memImg.alt = title;
      memBg.style.backgroundImage = `url('${src}')`;
      if (chapterEl) chapterEl.textContent = chapter;
      if (episodeEl) episodeEl.textContent = episode;
      memTitle.textContent = title;
      memMsg.textContent = message;
      // Update dots
      if (dotsEl) {
        dotsEl.querySelectorAll('.story-dot').forEach((d, i) => {
          d.classList.toggle('active', i === index);
        });
      }
    }
  }

  function nextPhoto() {
    const photos = getStoryPhotos();
    if (currentPhotoIndex < photos.length - 1) {
      // If synced mode, just let timeupdate drive it — but allow manual override
      if (storyAudio && hasAudioStarted && !storyAudio.paused) {
        // Seek audio forward by ~8s
        try { storyAudio.currentTime += 8; } catch(e) {}
      } else {
        showPhoto(currentPhotoIndex + 1, photos[currentPhotoIndex + 1]);
      }
    } else {
      showTheEnd();
    }
  }

  function prevPhoto() {
    const photos = getStoryPhotos();
    if (currentPhotoIndex > 0) {
      if (storyAudio && hasAudioStarted && !storyAudio.paused) {
        try { storyAudio.currentTime = Math.max(0, storyAudio.currentTime - 8); } catch(e) {}
      } else {
        showPhoto(currentPhotoIndex - 1, photos[currentPhotoIndex - 1]);
      }
    }
  }

  function goToPhoto(index) {
    const photos = getStoryPhotos();
    if (index >= 0 && index < photos.length) {
      if (storyAudio && hasAudioStarted && !storyAudio.paused && getTimeline()[index]) {
        try { storyAudio.currentTime = getTimeline()[index].start + 0.2; } catch(e) {}
      } else {
        showPhoto(index, photos[index]);
      }
    }
  }

  function showTheEnd() {
    if (currentPhase === 'final' || currentPhase === 'done') return;
    currentPhase = 'final';
    clearTimers();
    // Soften music
    if (storyAudio && !storyAudio.paused) {
      let v = storyAudio.volume;
      const fade = setInterval(() => {
        v -= 0.06;
        if (v <= 0.12) { storyAudio.volume = 0.12; clearInterval(fade); }
        else storyAudio.volume = v;
      }, 150);
    }
    const memContainer = overlay.querySelector('.story-memory-container');
    if (memContainer) {
      memContainer.classList.add('fade-out');
      memContainer.classList.remove('fade-in');
    }
    setTimeout(() => {
      if (memContainer) {
        memContainer.classList.remove('active');
        memContainer.style.display = 'none';
      }
      const card = overlay.querySelector('.story-cinematic');
      const title = card.querySelector('.story-season-title');
      const line = card.querySelector('.story-cinematic-line');
      const sub = card.querySelector('.story-cinematic-sub');
      title.textContent = '';
      sub.textContent = '';
      line.textContent = (CONFIG.story && CONFIG.story.theEnd) || 'THE END';
      line.style.letterSpacing = '6px';
      line.style.fontSize = 'clamp(1.4rem, 4vw, 2rem)';
      line.style.fontWeight = '800';
      line.style.fontStyle = 'normal';
      line.style.fontFamily = 'var(--font-display)';
      card.classList.add('active');
      const t1 = setTimeout(() => {
        line.textContent = (CONFIG.story && CONFIG.story.orMaybe) || '...or maybe, our beginning.';
        line.style.letterSpacing = '0.5px';
        line.style.fontSize = 'clamp(1rem, 2.8vw, 1.3rem)';
        line.style.fontWeight = '400';
        line.style.fontStyle = 'italic';
        line.style.fontFamily = 'var(--font-romantic)';
        const t2 = setTimeout(() => {
          card.classList.remove('active');
          setTimeout(() => finishAndPropose(), 700);
        }, 2400);
        timers.push(t2);
      }, 2100);
      timers.push(t1);
    }, 700);
  }

  function finishAndPropose() {
    if (currentPhase === 'done') return;
    currentPhase = 'done';
    clearTimers();
    // Keep music at low volume for proposal
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
      setTimeout(() => {
        close(false);
        Proposal.reveal();
        // Proposal will handle music rise after YES
      }, 1000);
    }, 600);
  }

  function clearTimers() {
    timers.forEach(t => clearTimeout(t));
    timers = [];
  }

  function close(restoreDashboard = true) {
    if (!isOpen && !overlay) return;
    isOpen = false;
    clearTimers();
    currentPhase = 'idle';
    currentPhotoIndex = -1;
    hasVideoEnded = false;
    // Pause and clean audio (do not garbage collect immediately — keep for resume)
    if (storyAudio) {
      try { storyAudio.pause(); } catch(e) {}
      storyAudio.removeEventListener('timeupdate', ()=>{});
      // Keep storyAudio for potential replay, but reset
    }
    if (youtubePlayer) {
      try { youtubePlayer.src = ''; } catch(e) {}
    }
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
      // Pause story audio fully on exit
      if (storyAudio) {
        try { storyAudio.pause(); storyAudio.currentTime = 0; } catch(e) {}
      }
      if (youtubePlayer) {
        try { youtubePlayer.remove(); youtubePlayer = null; } catch(e) {}
      }
    }
  }

  return { init, start, close };
})();
