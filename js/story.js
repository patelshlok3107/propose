// STORY — Cinematic Scene Timeline (fixed layout, slow staged text, single timer system)
const Story = (() => {
  let overlay;
  let storyAudio;
  let storyVideo;
  let phase = 'idle';
  let currentMemory = -1;
  let isOpen = false;
  let entryBound = false;
  let fadeFrame;
  let timers = [];
  let audioEndedHandler;

  const memories = () => CONFIG.memories || [];
  const cfgStory = () => CONFIG.story || {};
  const proposalCfg = () => CONFIG.proposal || {};

  // Photo scene interval — exactly 3s per request (was 8800), image+text crossfade together
  const SCENE_PHOTO_FADE = 700;
  const SCENE_HOLD = 1600;
  const SCENE_TOTAL = 3000; // 3s total scene-to-scene cycle

  function init() {
    if (entryBound) return;
    entryBound = true;
    const playButton = document.querySelector('.btn-play');
    playButton?.addEventListener('click', start);
    document.addEventListener('click', (event) => {
      if (event.target.closest('.btn-play')) start();
    }, true);
  }

  function start() {
    if (isOpen) return;
    isOpen = true;
    phase = 'cinematic';
    document.body.classList.add('story-mode');
    document.body.style.overflow = 'hidden';
    try {
      const introAudio = document.getElementById('intro-audio');
      if (introAudio) { introAudio.pause(); introAudio.currentTime = 0; }
      const bgMusic = document.getElementById('bg-music');
      if (bgMusic && !bgMusic.paused) { bgMusic.pause(); }
      const photoMusic = document.getElementById('photo-music');
      if (photoMusic && !photoMusic.paused) { photoMusic.pause(); }
      const celebrationMusic = document.getElementById('celebration-music');
      if (celebrationMusic && !celebrationMusic.paused) { celebrationMusic.pause(); }
    } catch(e){}
    createOverlay();
    bindOverlayEvents();
    createAudio();
    if (storyAudio) {
      storyAudio.currentTime = 0;
      storyAudio.volume = 0.86;
      const p = storyAudio.play();
      if (p && typeof p.catch === 'function') p.catch((e) => showAudioError(e));
    }
    runCinematicFlow();
  }

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'story-overlay';
    overlay.innerHTML = `
      <div class="story-blackout active"></div>
      <div class="story-cinematic-slot" aria-live="polite"></div>
      <div class="story-video-container">
        <video class="story-video" playsinline preload="metadata"></video>
        <div class="story-video-controls">
          <button class="story-ctrl-btn story-play-pause" aria-label="Play or pause">❚❚</button>
          <div class="story-progress-wrap"><div class="story-progress-bar"><div class="story-progress-fill"></div></div></div>
          <button class="story-ctrl-btn story-exit-btn" aria-label="Exit story">✕</button>
        </div>
      </div>
      <div class="story-memory-container" aria-live="polite">
        <div class="story-memory-bg"></div>
        <div class="story-memory-overlay"></div>
        <div class="story-scene">
          <img class="story-memory-img" alt="">
          <div class="story-memory-text">
            <p class="story-chapter-label"></p>
            <h3 class="story-memory-title"></h3>
            <p class="story-memory-message"></p>
          </div>
        </div>
        <div class="story-memory-controls">
          <div class="story-memory-dots"></div>
          <button class="story-skip-btn" aria-label="Skip to proposal">Skip →</button>
        </div>
        <button class="story-mem-exit" aria-label="Exit story">✕</button>
      </div>
      <div class="story-proposal" aria-live="polite"></div>
      <div class="story-celebration" aria-live="polite"></div>
      <audio class="story-audio" preload="auto"></audio>
      <p class="story-audio-error" role="alert"></p>
    `;
    document.body.appendChild(overlay);
    storyVideo = overlay.querySelector('.story-video');
    const dots = overlay.querySelector('.story-memory-dots');
    memories().forEach((_, index) => {
      const dot = document.createElement('span');
      dot.className = 'story-dot';
      dot.setAttribute('role', 'button');
      dot.setAttribute('aria-label', `Go to scene ${index + 1}`);
      dot.addEventListener('click', () => jumpToMemory(index));
      dots.appendChild(dot);
    });
  }

  function createAudio() {
    const source = CONFIG.audio?.storySoundtrack;
    storyAudio = overlay.querySelector('.story-audio');
    if (!source) { storyAudio.removeAttribute('src'); return; }
    storyAudio.src = source;
    storyAudio.preload = 'auto';
    storyAudio.loop = false;
    storyAudio.volume = 0.86;
    audioEndedHandler = () => {
      console.log('[Story] those-eyes ended naturally — slideshow continues');
    };
    storyAudio.addEventListener('ended', audioEndedHandler);
    storyAudio.addEventListener('error', () => showAudioError(new Error(`Unable to load ${source}`)));
    storyAudio.addEventListener('canplay', () => console.log('[Story] audio ready:', source), { once: true });
  }

  function bindOverlayEvents() {
    overlay.querySelectorAll('.story-exit-btn, .story-mem-exit').forEach((btn) => btn.addEventListener('click', close));
    overlay.querySelector('.story-play-pause').addEventListener('click', togglePlayback);
    overlay.querySelector('.story-skip-btn')?.addEventListener('click', handleSkip);
    storyVideo.addEventListener('timeupdate', updateVideoProgress);
    storyVideo.addEventListener('ended', handleVideoEnded);
    document.addEventListener('keydown', handleKeydown);
    overlay.querySelector('.story-cinematic-slot')?.addEventListener('click', handleCinematicClick);
  }

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function delay(fn, ms) { const t = setTimeout(() => { if (isOpen) fn(); }, ms); timers.push(t); return t; }
  function showAudioError(e) { console.warn('[Story] audio', e); }
  function showVideoError(e) { console.warn('[Story] video', e); if (phase === 'video') handleVideoEnded(); }
  function fadeAudio(target, duration) {
    if (!storyAudio) return;
    cancelAnimationFrame(fadeFrame);
    const initial = storyAudio.volume;
    const started = performance.now();
    const step = (now) => {
      const ratio = Math.min((now - started) / duration, 1);
      storyAudio.volume = initial + (target - initial) * ratio;
      if (ratio < 1 && isOpen) fadeFrame = requestAnimationFrame(step);
      else if (ratio >= 1 && target === 0) { try { storyAudio.pause(); } catch(e){} }
    };
    fadeFrame = requestAnimationFrame(step);
  }

  let cinematicAdvance = null;
  function showCinematicCard(html, autoMs, onAdvance) {
    const slot = overlay.querySelector('.story-cinematic-slot');
    slot.innerHTML = html;
    slot.classList.add('active');
    overlay.querySelector('.story-blackout').classList.add('active');
    clearTimers();
    cinematicAdvance = () => {
      slot.classList.remove('active');
      slot.innerHTML = '';
      cinematicAdvance = null;
      clearTimers();
      onAdvance?.();
    };
    if (autoMs) delay(cinematicAdvance, autoMs);
  }
  function handleCinematicClick() { if (cinematicAdvance) cinematicAdvance(); }

  function runCinematicFlow() {
    const s = cfgStory();
    // 1. BASED ON A TRUE STORY — Netflix-style subtle intro
    showCinematicCard(`
      <div class="story-cinematic active" style="background:#000;">
        <div class="story-cinematic-inner" style="gap:10px;">
          <p style="font-family:var(--font-body);font-size:0.62rem;letter-spacing:3.8px;text-transform:uppercase;color:rgba(255,255,255,0.52);margin:0;">BASED ON A TRUE STORY</p>
          <p style="font-family:var(--font-body);font-size:0.58rem;letter-spacing:2.2px;text-transform:uppercase;color:rgba(255,255,255,0.38);margin:0;">Featuring Jiya & Shlok</p>
          <p style="font-family:var(--font-display);font-size:clamp(1.6rem,4vw,2.4rem);font-weight:800;letter-spacing:4px;color:#fff;margin-top:10px;">ONCE UPON US</p>
        </div>
      </div>`, 2800, () => {
        showCinematicCard(`
          <div class="story-cinematic active">
            <div class="story-cinematic-inner">
              <p class="story-season-title">${escapeHtml(s.seasonTitle || 'JIYA & SHLOK')}</p>
              <p class="story-season-subtitle">${escapeHtml(s.seasonSubtitle || 'Season 1')}</p>
              <p class="story-cinematic-sub" style="margin-top:18px;opacity:.55;font-size:.72rem;letter-spacing:.18em;">Click to continue →</p>
            </div>
          </div>`, 3200, () => {
            showCinematicCard(`
              <div class="story-cinematic active">
                <div class="story-cinematic-inner">
                  <p class="story-cinematic-line">${escapeHtml(s.openingLine || 'Previously, in a story I never expected to live...')}</p>
                </div>
              </div>`, 3800, () => {
                overlay.querySelector('.story-blackout').classList.remove('active');
                overlay.querySelector('.story-cinematic-slot').classList.remove('active');
                startVideoPhase();
            });
        });
      });
  }

  function startVideoPhase() {
    phase = 'video';
    const vc = overlay.querySelector('.story-video-container');
    if (!CONFIG.storyVideo) { handleVideoEnded(); return; }
    vc.classList.add('active');
    vc.classList.remove('fading');
    overlay.querySelector('.story-blackout').classList.remove('active');
    storyVideo.src = CONFIG.storyVideo;
    storyVideo.load();
    storyVideo.volume = 0.72;
    if (storyAudio && !storyAudio.paused) storyAudio.volume = 0.18;
    const p = storyVideo.play();
    if (p && typeof p.catch === 'function') p.catch(showVideoError);
    delay(() => { if (phase === 'video' && storyVideo.paused && storyVideo.currentTime === 0) handleVideoEnded(); }, 7000);
  }

  function handleVideoEnded() {
    if (!isOpen) return;
    const vc = overlay.querySelector('.story-video-container');
    vc.classList.remove('active');
    vc.classList.add('fading');
    try { storyVideo.pause(); } catch(e){}
    if (storyAudio && !storyAudio.paused) storyAudio.volume = 0.86;
    showInterludeThenMemories();
  }

  function showInterludeThenMemories() {
    phase = 'interlude';
    const s = cfgStory();
    showCinematicCard(`
      <div class="story-cinematic active">
        <div class="story-cinematic-inner">
          <p class="story-cinematic-line">${escapeHtml(s.interludeLine || 'And somehow… every chapter led me to you.')}</p>
        </div>
      </div>`, 3600, () => { startMemories(); });
  }

  function startMemories() {
    phase = 'memories';
    overlay.querySelector('.story-memory-container').classList.add('active');
    overlay.querySelector('.story-cinematic-slot').classList.remove('active');
    overlay.querySelector('.story-blackout').classList.remove('active');
    if (storyAudio) {
      if (storyAudio.paused) storyAudio.play().catch(()=>{});
      else storyAudio.volume = 0.82;
    }
    runMemoryIndex(0);
  }

  function runMemoryIndex(idx) {
    const list = memories();
    if (!isOpen || phase !== 'memories') return;
    if (idx >= list.length) { showFakeEnd(); return; }
    showMemory(idx, list[idx]);
    const cfgDur = list[idx].duration || 0;
    const total = Math.max(cfgDur, SCENE_TOTAL);
    delay(() => runMemoryIndex(idx + 1), total);
  }

  function showMemory(index, item) {
    currentMemory = index;
    const scene = overlay.querySelector('.story-scene');
    const img = overlay.querySelector('.story-memory-img');
    const bg = overlay.querySelector('.story-memory-bg');
    const title = overlay.querySelector('.story-memory-title');
    const message = overlay.querySelector('.story-memory-message');
    const chapter = overlay.querySelector('.story-chapter-label');
    const source = item.image || item.source;
    const next = memories()[index + 1];
    if (next) { const pre = new Image(); pre.src = next.image || next.source; }
    const isFirst = !scene.classList.contains('is-visible') && index === 0;
    if (isFirst) {
      bg.style.backgroundImage = `url("${source}")`;
      img.src = source;
      img.alt = item.title || item.message || 'A memory';
      title.textContent = item.title || '';
      message.textContent = item.message || '';
      chapter.textContent = item.chapter || '';
      overlay.querySelectorAll('.story-dot').forEach((dot, i) => dot.classList.toggle('active', i === index));
      requestAnimationFrame(() => {
        img.classList.add('is-visible');
        scene.classList.add('is-visible');
      });
      return;
    }
    scene.classList.remove('is-visible');
    img.classList.remove('is-visible');
    delay(() => {
      bg.style.backgroundImage = `url("${source}")`;
      img.src = source;
      img.alt = item.title || item.message || 'A memory';
      title.textContent = item.title || '';
      message.textContent = item.message || '';
      chapter.textContent = item.chapter || '';
      overlay.querySelectorAll('.story-dot').forEach((dot, i) => dot.classList.toggle('active', i === index));
      const doFadeIn = () => {
        requestAnimationFrame(() => {
          img.classList.add('is-visible');
          scene.classList.add('is-visible');
        });
      };
      if (img.complete) doFadeIn();
      else {
        img.onload = doFadeIn;
        img.onerror = doFadeIn;
        delay(doFadeIn, 400);
      }
    }, 620);
  }

  function jumpToMemory(index) {
    if (phase !== 'memories') return;
    clearTimers();
    showMemory(index, memories()[index]);
    const cfgDur = memories()[index].duration || 0;
    const total = Math.max(cfgDur, SCENE_TOTAL);
    delay(() => runMemoryIndex(index + 1), total);
  }

  function handleSkip() {
    if (phase !== 'memories') { if (phase === 'video' || phase === 'interlude' || phase === 'cinematic') showFakeEnd(); return; }
    clearTimers();
    showFakeEnd();
  }

  // ── SEASON 1 — FINALE transition before proposal ──
  function showFakeEnd() {
    if (!isOpen || phase === 'proposal' || phase === 'celebration') return;
    phase = 'proposal';
    clearTimers();
    overlay.querySelector('.story-memory-container').classList.remove('active');
    // Keep audio continuous, just lower slightly for intimacy
    fadeAudio(0.14, 1200);
    // 2. SEASON 1 — FINALE cinematic
    showCinematicCard(`
      <div class="story-cinematic active" style="background:#000;">
        <div class="story-cinematic-inner" style="gap:8px;">
          <p style="font-family:var(--font-body);font-size:0.62rem;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,0.48);margin:0;">SEASON 1 — FINALE</p>
          <p style="font-family:var(--font-display);font-size:clamp(1.5rem,4vw,2.4rem);font-weight:800;letter-spacing:3px;color:#fff;margin:0;">THE QUESTION</p>
          <p style="font-family:var(--font-romantic);font-size:0.82rem;font-style:italic;color:rgba(255,255,255,0.52);margin-top:8px;">Some stories are meant to continue.</p>
        </div>
      </div>`, 2800, () => {
        overlay.querySelector('.story-cinematic-slot').classList.remove('active');
        startEmotionalSequence();
      });
  }

  function startEmotionalSequence() {
    const prop = overlay.querySelector('.story-proposal');
    prop.innerHTML = `
      <div class="story-proposal-shade" style="position:absolute;inset:0;background:#000;opacity:1;transition:opacity 1s ease;"></div>
      <div class="proposal-emotional" style="position:relative;z-index:1;width:min(90vw,680px);margin:0 auto;text-align:center;padding:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;">
        <p class="emotional-line" style="margin:0;color:#fff;font:300 clamp(1.4rem,3.5vw,2rem)/1.4 var(--font-display);letter-spacing:.02em;opacity:0;transform:translateY(12px);transition:opacity 1s ease, transform 1s ease;text-align:center;"></p>
      </div>
    `;
    prop.classList.add('active');
    const lineEl = prop.querySelector('.emotional-line');
    const shade = prop.querySelector('.story-proposal-shade');

    // 1. Black silence 2-3s (already black), then Jiya...
    delay(() => {
      // shade stays black
      lineEl.textContent = 'Jiya...';
      lineEl.style.fontFamily = 'var(--font-romantic)';
      lineEl.style.fontStyle = 'italic';
      lineEl.style.fontSize = 'clamp(1.6rem,4vw,2.2rem)';
      requestAnimationFrame(() => { lineEl.style.opacity = '1'; lineEl.style.transform = 'translateY(0)'; });
    }, 2400);

    const lines = [
      'Do you remember all those little moments?',
      'The laughs.',
      'The random conversations.',
      'The days that somehow became memories.',
      "I didn't know it then...",
      'but I was slowly falling for you.',
      'And now, I have one question.'
    ];
    let t = 2400 + 2200; // after Jiya hold
    // Fade out Jiya then cycle through lines
    delay(() => { lineEl.style.opacity = '0'; lineEl.style.transform = 'translateY(-8px)'; }, t);
    t += 700;
    lines.forEach((txt, i) => {
      delay(() => {
        lineEl.textContent = txt;
        lineEl.style.fontFamily = 'var(--font-romantic)';
        lineEl.style.fontStyle = 'italic';
        lineEl.style.fontSize = 'clamp(1rem,2.6vw,1.35rem)';
        lineEl.style.opacity = '0';
        lineEl.style.transform = 'translateY(12px)';
        requestAnimationFrame(() => { lineEl.style.opacity = '1'; lineEl.style.transform = 'translateY(0)'; });
      }, t);
      t += 1650;
      delay(() => { lineEl.style.opacity = '0'; lineEl.style.transform = 'translateY(-8px)'; }, t);
      t += 600;
    });
    // After emotional lines, memory flash
    delay(() => { startMemoryFlash(prop); }, t + 400);
  }

  function startMemoryFlash(prop) {
    // Use 5 existing photos, no text, short crossfades
    const flashImages = memories().slice(0,5).map(m => m.image || m.source);
    // Ensure we have at least 3
    while (flashImages.length < 3) flashImages.push(flashImages[0]);
    const flashWrap = document.createElement('div');
    flashWrap.className = 'memory-flash';
    flashWrap.style.cssText = 'position:absolute;inset:0;z-index:2;display:grid;place-items:center;background:#000;opacity:0;transition:opacity 0.6s ease;';
    flashWrap.innerHTML = `<img class="flash-img" style="width:min(88vw,560px);max-height:62vh;object-fit:contain;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.6);opacity:0;transform:scale(0.96);transition:opacity 0.6s ease, transform 0.6s ease;" alt="">`;
    prop.appendChild(flashWrap);
    requestAnimationFrame(() => flashWrap.style.opacity = '1');
    const imgEl = flashWrap.querySelector('.flash-img');
    let idx = 0;
    function showNext() {
      if (!isOpen || phase !== 'proposal') return;
      if (idx >= flashImages.length) {
        // End flash -> fade to black
        flashWrap.style.opacity = '0';
        delay(() => { flashWrap.remove(); showQuestionSequence(prop); }, 700);
        return;
      }
      imgEl.style.opacity = '0';
      imgEl.style.transform = 'scale(0.96)';
      delay(() => {
        imgEl.src = flashImages[idx];
        imgEl.onload = () => {
          requestAnimationFrame(() => { imgEl.style.opacity = '1'; imgEl.style.transform = 'scale(1)'; });
        };
        imgEl.onerror = () => { imgEl.style.opacity = '1'; imgEl.style.transform = 'scale(1)'; };
        if (imgEl.complete) { imgEl.style.opacity = '1'; imgEl.style.transform = 'scale(1)'; }
        idx++;
        delay(showNext, 720);
      }, 300);
    }
    showNext();
  }

  function showQuestionSequence(prop) {
    const lineEl = prop.querySelector('.emotional-line');
    lineEl.style.opacity = '0';
    lineEl.style.transform = 'translateY(12px)';
    let t = 700;
    // 3. ONE LAST TRUTH...
    delay(() => {
      lineEl.textContent = 'ONE LAST TRUTH...';
      lineEl.style.fontFamily = 'var(--font-body)';
      lineEl.style.fontStyle = 'normal';
      lineEl.style.fontWeight = '600';
      lineEl.style.fontSize = '0.62rem';
      lineEl.style.letterSpacing = '3.5px';
      lineEl.style.textTransform = 'uppercase';
      lineEl.style.color = 'rgba(255,255,255,0.52)';
      lineEl.style.textShadow = 'none';
      requestAnimationFrame(() => { lineEl.style.opacity = '1'; lineEl.style.transform = 'translateY(0)'; });
    }, t);
    t += 1600;
    delay(() => { lineEl.style.opacity = '0'; lineEl.style.transform = 'translateY(-8px)'; }, t);
    t += 600;
    // Somewhere along the way... — elegant, readable, one block
    delay(() => {
      lineEl.innerHTML = 'Somewhere along the way,<br>you stopped being just a part of my life...<br>and became my favorite part of it.';
      lineEl.style.fontFamily = 'var(--font-romantic)';
      lineEl.style.fontStyle = 'italic';
      lineEl.style.fontWeight = '400';
      lineEl.style.fontSize = 'clamp(1rem,2.6vw,1.28rem)';
      lineEl.style.letterSpacing = '0';
      lineEl.style.textTransform = 'none';
      lineEl.style.color = 'rgba(255,255,255,0.88)';
      lineEl.style.lineHeight = '1.7';
      requestAnimationFrame(() => { lineEl.style.opacity = '1'; lineEl.style.transform = 'translateY(0)'; });
    }, t);
    t += 2400;
    delay(() => { lineEl.style.opacity = '0'; lineEl.style.transform = 'translateY(-8px)'; }, t);
    t += 600;
    // 4. CONNECT THOSE EYES
    delay(() => {
      lineEl.textContent = 'And then there were those eyes...';
      lineEl.style.fontFamily = 'var(--font-romantic)';
      lineEl.style.fontStyle = 'italic';
      lineEl.style.fontSize = 'clamp(1rem,2.6vw,1.3rem)';
      lineEl.style.color = 'rgba(255,255,255,0.88)';
      requestAnimationFrame(() => { lineEl.style.opacity = '1'; lineEl.style.transform = 'translateY(0)'; });
    }, t);
    t += 1600;
    delay(() => { lineEl.style.opacity = '0'; lineEl.style.transform = 'translateY(-8px)'; }, t);
    t += 600;
    delay(() => {
      lineEl.innerHTML = 'The kind I could look at<br>and somehow forget what I was about to say.';
      requestAnimationFrame(() => { lineEl.style.opacity = '1'; lineEl.style.transform = 'translateY(0)'; });
    }, t);
    t += 1800;
    delay(() => { lineEl.style.opacity = '0'; lineEl.style.transform = 'translateY(-8px)'; }, t);
    t += 600;
    // Original question sequence continues
    delay(() => {
      lineEl.textContent = 'After everything we\'ve shared...';
      lineEl.style.fontFamily = 'var(--font-romantic)';
      lineEl.style.fontStyle = 'italic';
      lineEl.style.fontSize = 'clamp(1rem,2.6vw,1.3rem)';
      lineEl.style.color = 'rgba(255,255,255,0.88)';
      lineEl.style.fontWeight = '400';
      lineEl.style.letterSpacing = '0';
      lineEl.style.textTransform = 'none';
      lineEl.style.textShadow = 'none';
      requestAnimationFrame(() => { lineEl.style.opacity = '1'; lineEl.style.transform = 'translateY(0)'; });
    }, t);
    t += 1600;
    delay(() => { lineEl.style.opacity = '0'; lineEl.style.transform = 'translateY(-8px)'; }, t);
    t += 600;
    delay(() => {
      lineEl.textContent = "I don't want this story to end here.";
      requestAnimationFrame(() => { lineEl.style.opacity = '1'; lineEl.style.transform = 'translateY(0)'; });
    }, t);
    t += 1600;
    delay(() => { lineEl.style.opacity = '0'; lineEl.style.transform = 'translateY(-8px)'; }, t);
    t += 600;
    delay(() => {
      lineEl.textContent = 'Will you be mine? ❤️';
      lineEl.style.fontFamily = 'var(--font-display)';
      lineEl.style.fontStyle = 'normal';
      lineEl.style.fontWeight = '800';
      lineEl.style.fontSize = 'clamp(1.8rem,5vw,3.4rem)';
      lineEl.style.letterSpacing = '.06em';
      lineEl.style.color = '#fff';
      lineEl.style.textShadow = '0 0 30px rgba(229,9,20,0.28)';
      requestAnimationFrame(() => { lineEl.style.opacity = '1'; lineEl.style.transform = 'translateY(0) scale(1)'; });
    }, t);
    t += 1300;
    delay(() => { showProposalButtons(prop); }, t);
  }

  function showProposalButtons(prop) {
    const pc = proposalCfg();
    // Add buttons container if not exists
    let btnWrap = prop.querySelector('.story-proposal-buttons');
    if (!btnWrap) {
      btnWrap = document.createElement('div');
      btnWrap.className = 'story-proposal-buttons';
      btnWrap.style.cssText = 'display:flex;justify-content:center;flex-wrap:wrap;gap:12px;margin-top:18px;opacity:0;transform:translateY(12px);transition:opacity 0.7s ease, transform 0.7s ease;';
      btnWrap.innerHTML = `
        <button data-answer="yes" class="proposal-yes-btn">${escapeHtml(pc.btnYes || 'YES ❤️')}</button>
        <button data-answer="yes" class="proposal-yes-btn secondary">${escapeHtml(pc.btnYesCourse || 'YES, OF COURSE ❤️')}</button>
      `;
      btnWrap.querySelectorAll('button').forEach(b => {
        b.style.cssText = 'min-width:152px;padding:13px 20px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;font:.78rem var(--font-body);letter-spacing:.06em;';
      });
      prop.querySelector('.proposal-emotional').appendChild(btnWrap);
      // Add subtle photo behind question for warmth (optional, low opacity)
      const favPhoto = pc.questionPhoto || (memories().at(-1)?.image) || '';
      if (favPhoto) {
        const photoEl = document.createElement('div');
        photoEl.style.cssText = `position:absolute;inset:-4%;background-image:url('${escapeAttr(favPhoto)}');background-size:cover;background-position:center;filter:blur(2px) brightness(0.32);opacity:0;transition:opacity 1.6s ease;transform:scale(1.04);z-index:0;`;
        prop.insertBefore(photoEl, prop.firstChild);
        // keep shade on top but lower opacity
        const shade = prop.querySelector('.story-proposal-shade');
        if (shade) shade.style.background = 'radial-gradient(circle at center, rgba(15,4,8,0.12), rgba(0,0,0,0.88))';
        delay(() => { photoEl.style.opacity = '0.42'; }, 200);
      }
    }
    requestAnimationFrame(() => { btnWrap.style.opacity = '1'; btnWrap.style.transform = 'translateY(0)'; });
    btnWrap.querySelectorAll('[data-answer="yes"]').forEach((btn) => btn.addEventListener('click', showCelebrationEvolution));
  }

  // ── Celebration evolution — more intimate ──
  function showCelebrationEvolution() {
    phase = 'celebration';
    const prop = overlay.querySelector('.story-proposal');
    const cel = overlay.querySelector('.story-celebration');
    const pc = proposalCfg();
    const celebrationImage = pc.celebrationImage || memories().at(-1)?.image || '';
    if (storyAudio) { try { storyAudio.volume = 0.42; storyAudio.play().catch(()=>{}); } catch(e){} }
    prop.classList.remove('active');
    // Black screen first
    cel.innerHTML = `
      <div class="story-proposal-photo" style="background-image:url('${escapeAttr(celebrationImage)}');opacity:0;filter:blur(2px) brightness(.45);transform:scale(1.05);transition:opacity 1.2s ease;"></div>
      <div class="story-proposal-shade" style="background:#000;opacity:1;transition:opacity 1s ease;"></div>
      <div class="story-celebration-copy" style="position:relative;z-index:1;text-align:center;padding:24px;width:min(92vw,700px);margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:8px;">
        <h2 class="cel-title" style="margin:0;color:#fff;font:300 clamp(1.4rem,3.5vw,2rem)/1.4 var(--font-display);opacity:0;transform:translateY(14px);transition:opacity .8s ease, transform .8s ease;"></h2>
        <div class="cel-mini-grid" style="display:flex;gap:8px;justify-content:center;margin:16px 0;opacity:0;transition:opacity .7s ease;flex-wrap:wrap"></div>
        <p class="cel-next" style="margin:8px 0 0;color:rgba(255,255,255,.78);font:italic 1rem var(--font-romantic);opacity:0;transition:opacity .7s ease"></p>
        <p class="cel-final" style="margin:6px 0 0;color:#fff;font:600 clamp(1.2rem,3vw,1.8rem)/1.2 var(--font-romantic);opacity:0;transition:opacity .7s ease"></p>
        <p class="cel-closing" style="margin:4px 0 0;color:rgba(255,255,255,.62);font:italic .92rem var(--font-romantic);opacity:0;transition:opacity .7s ease"></p>
        <button class="cel-letter-btn" type="button" style="display:none;margin-top:18px;background:linear-gradient(135deg,#e50914,#c4395c);color:#fff;border:none;padding:14px 26px;border-radius:999px;font:.92rem var(--font-display);font-weight:700;cursor:pointer;box-shadow:0 10px 28px rgba(229,9,20,.38);opacity:0;transform:translateY(12px);transition:opacity .6s ease, transform .6s ease;min-height:48px;min-width:200px;position:relative;z-index:5;pointer-events:auto;-webkit-tap-highlight-color:transparent;">One last thing... 💌</button>
      </div>
    `;
    cel.classList.add('active');
    cel.style.position = 'absolute'; cel.style.inset = '0'; cel.style.display = 'grid'; cel.style.placeItems = 'center'; cel.style.background = '#000'; cel.style.zIndex = '22'; cel.style.opacity = '1';
    const titleEl = cel.querySelector('.cel-title');
    const gridEl = cel.querySelector('.cel-mini-grid');
    const nextEl = cel.querySelector('.cel-next');
    const letterBtn = cel.querySelector('.cel-letter-btn');
    const finalEl = cel.querySelector('.cel-final');
    const closingEl = cel.querySelector('.cel-closing');
    const photoEl = cel.querySelector('.story-proposal-photo');
    const shadeEl = cel.querySelector('.story-proposal-shade');

    // Black pause 600ms, then She said...
    delay(() => {
      titleEl.textContent = 'She said...';
      titleEl.style.fontWeight = '300';
      titleEl.style.fontStyle = 'italic';
      titleEl.style.fontFamily = 'var(--font-romantic)';
      titleEl.style.fontSize = 'clamp(1.2rem,3vw,1.6rem)';
      titleEl.style.opacity = '1';
      titleEl.style.transform = 'translateY(0)';
    }, 700);
    delay(() => {
      titleEl.style.opacity = '0';
      titleEl.style.transform = 'translateY(-10px)';
      delay(() => {
        titleEl.textContent = 'YES. ❤️';
        titleEl.style.fontFamily = 'var(--font-display)';
        titleEl.style.fontStyle = 'normal';
        titleEl.style.fontWeight = '800';
        titleEl.style.fontSize = 'clamp(2.4rem,7vw,4rem)';
        titleEl.style.letterSpacing = '.04em';
        titleEl.style.transform = 'translateY(14px)';
        requestAnimationFrame(() => { titleEl.style.opacity = '1'; titleEl.style.transform = 'translateY(0)'; });
        // subtle photo appear
        if (photoEl) photoEl.style.opacity = '0.34';
        if (shadeEl) { shadeEl.style.background = 'radial-gradient(circle at center, rgba(15,4,8,.18), rgba(0,0,0,.78))'; shadeEl.style.opacity = '1'; }
        // keep grid hidden for quiet elegance (no mini grid to keep minimal)
        triggerConfetti();
      }, 500);
    }, 2200);
    delay(() => {
      finalEl.textContent = 'Jiya ❤️ Shlok';
      finalEl.style.fontSize = 'clamp(1.4rem,3.5vw,2rem)';
      finalEl.style.letterSpacing = '.08em';
      finalEl.style.fontWeight = '600';
      finalEl.style.opacity = '1';
    }, 3800);
    delay(() => {
      closingEl.textContent = 'And our next chapter begins.';
      closingEl.style.opacity = '1';
    }, 4400);
    // Letter intro
    delay(() => {
      nextEl.innerHTML = 'I could stop here...';
      nextEl.style.opacity = '1';
    }, 5200);
    delay(() => {
      nextEl.style.opacity = '0';
      delay(() => {
        nextEl.innerHTML = "But there's one last thing I never said.";
        nextEl.style.opacity = '1';
      }, 400);
    }, 5200+1400);
    delay(() => {
      letterBtn.style.display = 'inline-flex';
      letterBtn.style.alignItems = 'center';
      letterBtn.style.justifyContent = 'center';
      requestAnimationFrame(() => { letterBtn.style.opacity = '1'; letterBtn.style.transform = 'translateY(0)'; });
    }, 5200+1400+1400);
    letterBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); showLetterScreen(); });
    letterBtn.addEventListener('touchend', (e) => { e.preventDefault(); showLetterScreen(); }, { passive: false });
  }

  function showLetterScreen() {
    const screen = document.getElementById('letter-screen');
    if (!screen) { console.error('[Story] letter-screen not found'); return; }
    const title = screen.querySelector('.letter-title');
    const body = screen.querySelector('.letter-body');
    const sign = screen.querySelector('.letter-sign');
    const L = proposalCfg().letter || {};
    if (title) {
      title.textContent = L.title || "For my Jiya,";
      title.style.opacity = '0'; title.style.transform = 'translateY(10px)';
      title.style.transition = 'opacity 0.9s ease, transform 0.9s ease';
    }
    if (sign) {
      sign.textContent = L.sign || "— Shlok";
      sign.style.opacity = '0'; sign.style.transition = 'opacity 0.9s ease';
    }
    if (body) {
      const raw = (L.body || "").trim();
      const parts = raw.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
      body.innerHTML = '';
      parts.forEach((para) => {
        const pEl = document.createElement('p');
        pEl.className = 'letter-paragraph';
        pEl.textContent = para;
        pEl.style.marginBottom = '14px';
        body.appendChild(pEl);
      });
      body.querySelectorAll('.letter-paragraph').forEach(p => {
        p.innerHTML = p.textContent.replace(/\n/g, '<br>');
      });
    }
    screen.classList.add('active');
    screen.setAttribute('aria-hidden','false');
    // Hook close to trigger final ending
    const closeBtn = screen.querySelector('.letter-close');
    const onClose = () => {
      screen.removeEventListener('click', onOverlayClick);
      if (closeBtn) closeBtn.removeEventListener('click', onClose);
      showFinalEnding();
    };
    const onOverlayClick = (e) => { if (e.target === screen) onClose(); };
    if (closeBtn) closeBtn.addEventListener('click', onClose, { once: true });
    screen.addEventListener('click', onOverlayClick, { once: true });
    clearTimers();
    delay(() => { if (title) { title.style.opacity = '1'; title.style.transform = 'translateY(0)'; } }, 300);
    const paras = screen.querySelectorAll('.letter-paragraph');
    paras.forEach((p, i) => {
      delay(() => p.classList.add('is-visible'), 900 + i * 1100);
    });
    const totalLetter = 900 + paras.length * 1100 + 600;
    delay(() => { if (sign) sign.style.opacity = '1'; }, totalLetter);
    delay(() => {
      const finalEl = screen.querySelector('.letter-final');
      const closingEl = screen.querySelector('.letter-closing');
      if (finalEl) { finalEl.style.opacity = '0'; finalEl.style.transition = 'opacity 0.8s ease'; requestAnimationFrame(()=> finalEl.style.opacity='1'); }
      if (closingEl) { closingEl.style.opacity = '0'; closingEl.style.transition = 'opacity 0.8s ease'; requestAnimationFrame(()=> closingEl.style.opacity='1'); }
    }, totalLetter + 700);
    triggerConfetti();
  }

  function showFinalEnding() {
    const letterScreen = document.getElementById('letter-screen');
    if (letterScreen) { letterScreen.classList.remove('active'); letterScreen.setAttribute('aria-hidden','true'); }
    const cel = overlay.querySelector('.story-celebration');
    if (!cel) return;
    // Inject credits styles once
    if (!document.getElementById('movie-credits-styles')) {
      const s = document.createElement('style');
      s.id = 'movie-credits-styles';
      s.textContent = `
        @keyframes creditsScroll { 0% { transform: translateY(100%); } 100% { transform: translateY(-160%); } }
        .movie-credits-wrap { position:absolute; inset:0; background:#000; overflow:hidden; display:grid; place-items:center; }
        .movie-credits-mask { position:absolute; inset:0; background: linear-gradient(to bottom, #000 0%, transparent 14%, transparent 86%, #000 100%); pointer-events:none; z-index:2; }
        .movie-credits-scroll { width:min(92vw,640px); text-align:center; padding:0 24px; animation: creditsScroll 22s linear forwards; will-change: transform; }
        .movie-credits-title { font-family: var(--font-display); font-weight:800; font-size:clamp(1.8rem,5vw,2.6rem); letter-spacing:.18em; color:#fff; margin:0 0 36px; }
        .movie-credit-label { font-family: var(--font-body); font-size:0.62rem; letter-spacing:3.2px; text-transform:uppercase; color:rgba(229,9,20,0.72); margin:28px 0 6px; }
        .movie-credit-value { font-family: var(--font-display); font-size:clamp(1rem,2.6vw,1.25rem); font-weight:600; color:#fff; margin:0; }
        .movie-credit-sub { font-family: var(--font-romantic); font-size:0.82rem; font-style:italic; color:rgba(255,255,255,0.58); margin:4px 0 0; }
        .movie-credit-value.large { font-family: var(--font-romantic); font-size:clamp(1.1rem,3vw,1.4rem); color:#fff; }
        @media (max-width:767px) { .movie-credits-scroll { width:92vw; padding:0 16px; } .movie-credit-value { font-size:1rem; } }
      `;
      document.head.appendChild(s);
    }
    cel.innerHTML = `
      <div class="movie-credits-wrap" style="opacity:1; transition:opacity 1s ease;">
        <div class="movie-credits-mask"></div>
        <div class="movie-credits-scroll" id="movie-credits-scroll">
          <h2 class="movie-credits-title">ONCE UPON US</h2>
          <p class="movie-credit-label">Starring</p>
          <p class="movie-credit-value">Jiya</p>
          <p class="movie-credit-sub">The One Who Changed Everything</p>
          <p class="movie-credit-value" style="margin-top:10px;">Shlok</p>
          <p class="movie-credit-label">Written by</p>
          <p class="movie-credit-value large">The moments we shared</p>
          <p class="movie-credit-label">Produced by</p>
          <p class="movie-credit-value large">Fate</p>
          <p class="movie-credit-label">Soundtrack</p>
          <p class="movie-credit-value large">Those Eyes</p>
          <p class="movie-credit-label">Genre</p>
          <p class="movie-credit-value large">Romance</p>
          <p class="movie-credit-label">Status</p>
          <p class="movie-credit-value large">Still writing...</p>
          <p class="movie-credit-label">Next Season</p>
          <p class="movie-credit-value" style="color:var(--accent-pink);">OUR FOREVER ❤️</p>
          <div style="height:32vh;"></div>
        </div>
      </div>
      <div class="movie-final-reveal" style="position:absolute; inset:0; z-index:3; display:grid; place-items:center; background:#000; opacity:0; pointer-events:none; transition:opacity 1s ease; text-align:center; padding:24px;">
        <div>
          <h2 class="final-end-title" style="margin:0; color:#fff; font:800 clamp(1.6rem,5vw,2.4rem)/1.1 var(--font-display); letter-spacing:.16em; opacity:0; transform:translateY(10px); transition:opacity 1s ease, transform 1s ease;">THE END</h2>
          <p class="final-end-sub" style="margin:12px 0 0; color:rgba(255,255,255,0.62); font:italic 0.95rem var(--font-romantic); opacity:0; transform:translateY(10px); transition:opacity 0.9s ease, transform 0.9s ease;">or maybe... just the beginning.</p>
        </div>
      </div>
      <div class="post-credits-scene" style="position:absolute; inset:0; z-index:4; display:grid; place-items:center; background:#000; opacity:0; pointer-events:none; transition:opacity 1s ease; text-align:center; padding:24px; overflow-y:auto;">
        <div style="display:flex; flex-direction:column; align-items:center; gap:14px; max-width:640px; width:min(92vw,640px);">
          <p class="post-label" style="margin:0; color:rgba(255,255,255,0.38); font:0.62rem var(--font-body); letter-spacing:3px; text-transform:uppercase; opacity:0; transform:translateY(10px); transition:opacity 0.8s ease, transform 0.8s ease;">POST-CREDITS SCENE</p>
          <p class="post-ps" style="margin:8px 0 0; color:rgba(255,255,255,0.72); font:600 0.9rem var(--font-body); letter-spacing:2px; text-transform:uppercase; opacity:0; transform:translateY(10px); transition:opacity 0.8s ease, transform 0.8s ease;">P.S.</p>
          <p class="post-line" style="margin:0; color:rgba(255,255,255,0.88); font:italic clamp(1rem,2.6vw,1.18rem)/1.7 var(--font-romantic); opacity:0; transform:translateY(10px); transition:opacity 0.9s ease, transform 0.9s ease; text-align:center;"></p>
          <p class="post-next" style="margin:0; color:rgba(255,255,255,0.72); font:italic 0.95rem var(--font-romantic); opacity:0; transform:translateY(10px); transition:opacity 0.9s ease, transform 0.9s ease;">See you in the next chapter. ❤️</p>
          <div class="post-video-wrap" style="width:min(92vw,560px); max-width:560px; margin-top:6px; opacity:0; transform:translateY(12px); transition:opacity 0.9s ease, transform 0.9s ease; pointer-events:none; position:relative; display:none;">
            <video class="post-video" playsinline preload="metadata" muted style="width:100%; aspect-ratio:16/9; object-fit:cover; border-radius:12px; box-shadow:0 12px 40px rgba(0,0,0,0.55), 0 0 20px rgba(229,9,20,0.08); border:1px solid rgba(255,255,255,0.08); background:#0a0a0a; display:block;"></video>
            <button class="post-video-play" aria-label="Play video" style="position:absolute; inset:0; display:grid; place-items:center; background:rgba(0,0,0,0.28); border:none; border-radius:12px; color:#fff; font-size:1.8rem; cursor:pointer; opacity:0; pointer-events:none; transition:opacity 0.3s ease;">▶</button>
          </div>
          <button class="return-btn-post" style="margin-top:18px; background:transparent; border:1px solid rgba(255,255,255,0.14); color:rgba(255,255,255,0.62); font:0.62rem var(--font-body); letter-spacing:2.2px; text-transform:uppercase; padding:10px 18px; border-radius:999px; cursor:pointer; opacity:0; transform:translateY(10px); transition:opacity 0.8s ease, transform 0.8s ease; pointer-events:none;">RETURN TO ONCE UPON US</button>
        </div>
      </div>
    `;
    cel.classList.add('active');
    cel.style.display = 'grid';
    cel.style.opacity = '1';
    cel.style.background = '#000';
    cel.style.inset = '0';
    cel.style.position = 'absolute';
    cel.style.zIndex = '22';
    const wrapEl = cel.querySelector('.movie-credits-wrap');
    const finalEl = cel.querySelector('.movie-final-reveal');
    const endTitle = cel.querySelector('.final-end-title');
    const endSub = cel.querySelector('.final-end-sub');
    const postEl = cel.querySelector('.post-credits-scene');
    const postLabel = cel.querySelector('.post-label');
    const postPs = cel.querySelector('.post-ps');
    const postLine = cel.querySelector('.post-line');
    const postNext = cel.querySelector('.post-next');
    const returnBtn = cel.querySelector('.return-btn-post');
    const scrollDuration = 22000;
    delay(() => {
      wrapEl.style.opacity = '0';
      finalEl.style.opacity = '1';
      finalEl.style.pointerEvents = 'auto';
      delay(() => { endTitle.style.opacity = '1'; endTitle.style.transform = 'translateY(0)'; }, 400);
      delay(() => { endSub.style.opacity = '1'; endSub.style.transform = 'translateY(0)'; }, 1400);
      // After THE END, fade to black then post-credits
      delay(() => {
        finalEl.style.opacity = '0';
        delay(() => {
          postEl.style.opacity = '1';
          postEl.style.pointerEvents = 'auto';
          delay(() => { postLabel.style.opacity = '1'; postLabel.style.transform = 'translateY(0)'; }, 400);
          delay(() => { postPs.style.opacity = '1'; postPs.style.transform = 'translateY(0)'; }, 1200);
          delay(() => {
            postLine.innerHTML = 'I still have so many things<br>I want to experience with you.';
            postLine.style.opacity = '1';
            postLine.style.transform = 'translateY(0)';
          }, 2100);
          delay(() => { postNext.style.opacity = '1'; postNext.style.transform = 'translateY(0)'; }, 3600);
          // Small pause then reveal video as hidden memory
          delay(() => {
            const videoWrap = postEl.querySelector('.post-video-wrap');
            const video = postEl.querySelector('.post-video');
            const playBtn = postEl.querySelector('.post-video-play');
            if (!videoWrap || !video) {
              // Fallback: show return if no video element
              returnBtn.style.opacity = '1';
              returnBtn.style.transform = 'translateY(0)';
              returnBtn.style.pointerEvents = 'auto';
              return;
            }
            videoWrap.style.display = 'block';
            // Use existing video asset — distinct from main story video if possible (vid-2), fallback to storyVideo
            let postSrc = CONFIG.storyVideo || 'public/videos/vid-2.mp4';
            // Prefer an alternative video for post-credits to keep main story distinct
            const altCandidates = ['public/videos/vid-2.mp4', 'public/videos/vid-3.mp4'];
            for (const cand of altCandidates) {
              if (cand !== CONFIG.storyVideo) { postSrc = cand; break; }
            }
            // If mediaRows has a video distinct from story, prefer it
            try {
              const allVideos = [];
              (CONFIG.mediaRows || []).forEach(r => r.items.forEach(it => { if (it.type === 'video' && it.src) allVideos.push(it.src); }));
              const distinct = allVideos.find(s => s !== CONFIG.storyVideo);
              if (distinct) postSrc = distinct;
            } catch(e) {}
            video.src = postSrc;
            video.preload = 'metadata';
            video.muted = true;
            video.loop = false;
            video.playsInline = true;
            video.controls = false;
            requestAnimationFrame(() => {
              videoWrap.style.opacity = '1';
              videoWrap.style.transform = 'translateY(0)';
              videoWrap.style.pointerEvents = 'auto';
            });
            const tryPlay = () => {
              const p = video.play();
              if (p && typeof p.then === 'function') {
                p.then(() => {
                  playBtn.style.opacity = '0';
                  playBtn.style.pointerEvents = 'none';
                }).catch(() => {
                  playBtn.style.opacity = '1';
                  playBtn.style.pointerEvents = 'auto';
                });
              }
            };
            playBtn.addEventListener('click', () => {
              playBtn.style.opacity = '0';
              playBtn.style.pointerEvents = 'none';
              video.play().catch(()=>{});
            }, { once: true });
            video.addEventListener('ended', () => {
              playBtn.style.opacity = '0';
              playBtn.style.pointerEvents = 'none';
              // Keep dark short moment then show return
              delay(() => {
                returnBtn.style.opacity = '1';
                returnBtn.style.transform = 'translateY(0)';
                returnBtn.style.pointerEvents = 'auto';
              }, 900);
            }, { once: true });
            video.addEventListener('error', () => {
              // On error, still show return after short delay
              delay(() => {
                returnBtn.style.opacity = '1';
                returnBtn.style.transform = 'translateY(0)';
                returnBtn.style.pointerEvents = 'auto';
              }, 800);
            }, { once: true });
            // Fallback if video never ends (e.g. autoplay blocked and not played)
            delay(() => {
              if (returnBtn.style.opacity === '0' || returnBtn.style.opacity === '') {
                // If video hasn't ended, still allow return
                if (video.paused) {
                  playBtn.style.opacity = '1';
                  playBtn.style.pointerEvents = 'auto';
                } else {
                  // video playing, wait for ended
                  return;
                }
                // For blocked autoplay, show return anyway after total wait
                delay(() => {
                  if (returnBtn.style.opacity === '0' || returnBtn.style.opacity === '') {
                    returnBtn.style.opacity = '1';
                    returnBtn.style.transform = 'translateY(0)';
                    returnBtn.style.pointerEvents = 'auto';
                  }
                }, 6000);
              }
            }, 1200);
            tryPlay();
          }, 3600+1100);
        }, 900);
      }, 3400);
    }, scrollDuration + 800);
    returnBtn.addEventListener('click', () => close());
    returnBtn.addEventListener('touchend', (e) => { e.preventDefault(); close(); }, { passive: false });
    postEl.addEventListener('click', (e) => { if (e.target === postEl) close(); });
  }

  function triggerConfetti() {
    try {
      const hearts = ['❤️','💖','💘','✨','🎉'];
      for (let i=0;i<16;i++) {
        const h = document.createElement('div');
        h.textContent = hearts[Math.floor(Math.random()*hearts.length)];
        h.style.position = 'fixed';
        h.style.left = Math.random()*100 + 'vw';
        h.style.top = '100vh';
        h.style.fontSize = (1 + Math.random()*1.1)+'rem';
        h.style.zIndex = '100000';
        h.style.pointerEvents = 'none';
        h.style.opacity = '0.85';
        h.style.transition = `transform ${3.2+Math.random()*1.6}s ease-out, opacity ${3.2+Math.random()*1.6}s ease-out`;
        document.body.appendChild(h);
        requestAnimationFrame(()=> {
          h.style.transform = `translateY(-96vh) rotate(${Math.random()*24-12}deg)`;
          h.style.opacity = '0';
        });
        setTimeout(()=> h.remove(), 4800);
      }
    } catch(e){}
  }

  function togglePlayback() {
    if (!storyAudio) return;
    const btn = overlay.querySelector('.story-play-pause');
    if (storyAudio.paused) {
      storyAudio.play().catch(showAudioError);
      if (phase === 'video' && storyVideo) storyVideo.play().catch(showVideoError);
      if (btn) btn.textContent = '❚❚';
    } else {
      storyAudio.pause();
      if (phase === 'video' && storyVideo) storyVideo.pause();
      if (btn) btn.textContent = '▶';
    }
  }

  function updateVideoProgress() {
    const progress = overlay?.querySelector('.story-progress-fill');
    if (progress && storyVideo.duration) progress.style.width = `${storyVideo.currentTime / storyVideo.duration * 100}%`;
  }

  function handleKeydown(event) {
    if (!isOpen) return;
    if (event.key === 'Escape') close();
    if (event.key === ' ') { event.preventDefault(); togglePlayback(); }
  }

  function close() {
    if (!isOpen && !overlay) return;
    isOpen = false;
    phase = 'idle';
    clearTimers();
    cancelAnimationFrame(fadeFrame);
    document.removeEventListener('keydown', handleKeydown);
    if (storyAudio) {
      try { storyAudio.pause(); storyAudio.removeEventListener('ended', audioEndedHandler); } catch(e){}
      storyAudio.removeAttribute('src');
      try { storyAudio.load(); } catch(e){}
    }
    if (storyVideo) {
      try { storyVideo.pause(); storyVideo.removeEventListener('timeupdate', updateVideoProgress); storyVideo.removeEventListener('ended', handleVideoEnded); } catch(e){}
      storyVideo.removeAttribute('src');
      try { storyVideo.load(); } catch(e){}
    }
    const letterScreen = document.getElementById('letter-screen');
    if (letterScreen) { letterScreen.classList.remove('active'); letterScreen.setAttribute('aria-hidden','true'); }
    overlay?.remove();
    overlay = null;
    storyAudio = null;
    storyVideo = null;
    currentMemory = -1;
    document.body.classList.remove('story-mode');
    document.body.style.overflow = '';
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s) { return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

  init();
  return { init, start, close };
})();
