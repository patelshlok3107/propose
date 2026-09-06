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
    // Requirement 7: explicitly stop Netflix intro audio if still playing — never mix with Story audio
    try {
      const introAudio = document.getElementById('intro-audio');
      if (introAudio) { introAudio.pause(); introAudio.currentTime = 0; }
      // also silence any dashboard ambient that might conflict
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
    // Ensure we use the Story soundtrack (those-eyes.mp3) — NOT Netflix intro
    storyAudio.src = source;
    storyAudio.preload = 'auto';
    storyAudio.loop = false;
    storyAudio.volume = 0.86;
    // Do NOT jump to fakeEnd when song ends — let slideshow continue and song simply stop (requirement 5)
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

  // ── Helpers ──
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

  // ── Cinematic cards ──
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
    // Use configured duration if larger, otherwise SCENE_TOTAL
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

    // Atomic scene update: fade out scene, swap ALL content together, fade in
    // This prevents OLD TEXT + NEW IMAGE flicker
    const source = item.image || item.source;
    const next = memories()[index + 1];
    if (next) { const pre = new Image(); pre.src = next.image || next.source; }

    // If first scene, no fade-out needed — render immediately and fade in
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

    // Crossfade: fade out current scene, swap atomically, fade in
    scene.classList.remove('is-visible');
    img.classList.remove('is-visible');
    // Wait for fade-out (600ms) then swap
    delay(() => {
      bg.style.backgroundImage = `url("${source}")`;
      img.src = source;
      img.alt = item.title || item.message || 'A memory';
      title.textContent = item.title || '';
      message.textContent = item.message || '';
      chapter.textContent = item.chapter || '';
      overlay.querySelectorAll('.story-dot').forEach((dot, i) => dot.classList.toggle('active', i === index));
      // Ensure image decoded before fade-in to avoid blank
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
        // fallback if load stalls
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

  // ── Fake THE END → or maybe our beginning ──
  function showFakeEnd() {
    if (!isOpen || phase === 'proposal' || phase === 'celebration') return;
    phase = 'fakeEnd';
    clearTimers();
    overlay.querySelector('.story-memory-container').classList.remove('active');
    const s = cfgStory();
    overlay.querySelector('.story-cinematic-slot').classList.add('active');
    showCinematicCard(`
      <div class="story-cinematic active" style="background:#000;">
        <div class="story-cinematic-inner">
          <p style="font-family:var(--font-display);font-size:clamp(1.8rem,6vw,3.2rem);letter-spacing:.35em;color:#fff;font-weight:800;">${escapeHtml(s.theEnd || 'THE END')}</p>
        </div>
      </div>`, 2600, () => {
        showCinematicCard(`
          <div class="story-cinematic active" style="background:#000;">
            <div class="story-cinematic-inner">
              <p class="story-cinematic-line">${escapeHtml(s.orMaybe || '...or maybe, our beginning.')}</p>
            </div>
          </div>`, 3000, () => { showMinimalProposal(); });
    });
  }

  // ── Minimal Proposal with pauses ──
  function showMinimalProposal() {
    if (!isOpen) return;
    phase = 'proposal';
    clearTimers();
    fadeAudio(0.09, 1400);
    overlay.querySelector('.story-memory-container').classList.remove('active');
    const prop = overlay.querySelector('.story-proposal');
    const pc = proposalCfg();
    const lines = pc.simpleLines || ["Jiya...","After every memory...","Every laugh...","Every stupid little moment..."];
    const questionIntro = pc.questionIntro || "I have one question for you.";
    const question = pc.question || "WILL YOU BE MINE? ❤️";
    const heart = pc.heart || "❤️";
    const favPhoto = pc.questionPhoto || (memories().at(-1)?.image) || '';
    prop.innerHTML = `
      <div class="story-proposal-photo" style="background-image:url('${escapeAttr(favPhoto)}')"></div>
      <div class="story-proposal-shade"></div>
      <div class="story-proposal-copy proposal-minimal" style="opacity:0;transition:opacity .6s ease;">
        <div class="proposal-min-lines"></div>
        <p class="proposal-min-intro" style="opacity:0;transition:opacity .9s ease, transform .9s ease;transform:translateY(10px)"></p>
        <div class="proposal-min-heart" style="opacity:0;transition:opacity .9s ease, transform .9s ease;transform:scale(.92)"></div>
        <h2 class="proposal-min-question" style="opacity:0;transition:opacity 1s ease, transform 1s ease, filter 1s ease;transform:translateY(18px) scale(.98);filter:blur(6px)"></h2>
        <div class="story-proposal-buttons" style="opacity:0;transition:opacity .7s ease, transform .7s ease;transform:translateY(10px)">
          <button data-answer="yes" class="proposal-yes-btn">${escapeHtml(pc.btnYes || 'YES ❤️')}</button>
          <button data-answer="yes" class="proposal-yes-btn secondary">${escapeHtml(pc.btnYesCourse || 'YES, OF COURSE ❤️')}</button>
        </div>
      </div>
    `;
    prop.classList.add('active');
    requestAnimationFrame(() => { prop.querySelector('.proposal-minimal').style.opacity = '1'; });
    const linesWrap = prop.querySelector('.proposal-min-lines');
    const introEl = prop.querySelector('.proposal-min-intro');
    const heartEl = prop.querySelector('.proposal-min-heart');
    const questionEl = prop.querySelector('.proposal-min-question');
    const btnWrap = prop.querySelector('.story-proposal-buttons');
    const photoEl = prop.querySelector('.story-proposal-photo');
    heartEl.textContent = heart;
    lines.forEach((txt) => {
      const p = document.createElement('p');
      p.className = 'proposal-min-line';
      p.textContent = txt;
      p.style.opacity = '0';
      p.style.transform = 'translateY(12px)';
      p.style.transition = 'opacity .9s ease, transform .9s ease';
      p.style.margin = '10px 0';
      p.style.font = 'italic clamp(1rem,2.6vw,1.32rem)/1.5 var(--font-romantic)';
      p.style.color = 'rgba(255,255,255,.86)';
      linesWrap.appendChild(p);
    });
    introEl.textContent = questionIntro;
    introEl.style.font = '.96rem var(--font-body)';
    introEl.style.color = 'rgba(255,255,255,.72)';
    heartEl.style.fontSize = '2.3rem';
    heartEl.style.margin = '16px 0';
    questionEl.textContent = question;
    questionEl.style.font = '700 clamp(1.7rem,5vw,3.4rem)/1.1 var(--font-display)';
    questionEl.style.letterSpacing = '.06em';
    questionEl.style.color = '#fff';
    photoEl.style.opacity = '0';
    photoEl.style.transition = 'opacity 1.8s ease, transform 10s ease';
    photoEl.style.transform = 'scale(1.04)';
    const lineEls = linesWrap.querySelectorAll('.proposal-min-line');
    let t = 700;
    lineEls.forEach((el, i) => { delay(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, t + i * 1350); });
    t += lineEls.length * 1350 + 800;
    delay(() => { introEl.style.opacity = '1'; introEl.style.transform = 'translateY(0)'; }, t);
    t += 1300;
    delay(() => { photoEl.style.opacity = '0.42'; photoEl.style.transform = 'scale(1.08)'; heartEl.style.opacity = '1'; heartEl.style.transform = 'scale(1)'; }, t);
    t += 1400;
    delay(() => { questionEl.style.opacity = '1'; questionEl.style.transform = 'translateY(0) scale(1)'; questionEl.style.filter = 'blur(0)'; }, t);
    t += 1200;
    delay(() => { btnWrap.style.opacity = '1'; btnWrap.style.transform = 'translateY(0)'; }, t);
    prop.querySelectorAll('[data-answer="yes"]').forEach((btn) => btn.addEventListener('click', showCelebrationEvolution));
  }

  // ── Celebration evolution ──
  function showCelebrationEvolution() {
    phase = 'celebration';
    const prop = overlay.querySelector('.story-proposal');
    const cel = overlay.querySelector('.story-celebration');
    const pc = proposalCfg();
    const stages = pc.celebrationStages || { sheSaid: 'She said...', yes: 'YES. ❤️', nextChapter: 'Our next chapter starts now.', finalTitle: 'JIYA ❤️ SHLOK' };
    const celebrationImage = pc.celebrationImage || memories().at(-1)?.image || '';
    if (storyAudio) { try { storyAudio.volume = 0.42; storyAudio.play().catch(()=>{}); } catch(e){} }
    prop.classList.remove('active');
    cel.innerHTML = `
      <div class="story-proposal-photo" style="background-image:url('${escapeAttr(celebrationImage)}');opacity:.34;filter:blur(2px) brightness(.45);transform:scale(1.05)"></div>
      <div class="story-proposal-shade"></div>
      <div class="story-celebration-copy" style="position:relative;z-index:1;text-align:center;padding:24px;width:min(92vw,700px);margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:8px;">
        <h2 class="cel-title" style="margin:0;color:#fff;font:700 clamp(2rem,6vw,3.6rem)/1 var(--font-display);opacity:0;transition:opacity .8s ease, transform .8s ease;transform:translateY(14px)"></h2>
        <div class="cel-mini-grid" style="display:flex;gap:8px;justify-content:center;margin:16px 0;opacity:0;transition:opacity .7s ease;flex-wrap:wrap"></div>
        <p class="cel-next" style="margin:8px 0 0;color:rgba(255,255,255,.78);font:italic 1rem var(--font-romantic);opacity:0;transition:opacity .7s ease"></p>
        <p class="cel-final" style="margin:6px 0 0;color:#fff;font:800 .92rem var(--font-display);letter-spacing:.18em;opacity:0;transition:opacity .7s ease"></p>
        <p class="cel-closing" style="margin:4px 0 0;color:rgba(255,255,255,.62);font:italic .92rem var(--font-romantic);opacity:0;transition:opacity .7s ease"></p>
        <button class="cel-letter-btn" type="button" style="display:none;margin-top:18px;background:linear-gradient(135deg,#e50914,#c4395c);color:#fff;border:none;padding:14px 26px;border-radius:999px;font:.92rem var(--font-display);font-weight:700;cursor:pointer;box-shadow:0 10px 28px rgba(229,9,20,.38);opacity:0;transform:translateY(12px);transition:opacity .6s ease, transform .6s ease;min-height:48px;min-width:200px;position:relative;z-index:5;pointer-events:auto;-webkit-tap-highlight-color:transparent;">One last thing... 💌</button>
      </div>
    `;
    cel.classList.add('active');
    cel.style.position = 'absolute'; cel.style.inset = '0'; cel.style.display = 'grid'; cel.style.placeItems = 'center'; cel.style.background = '#050304'; cel.style.zIndex = '22'; cel.style.opacity = '1';
    const titleEl = cel.querySelector('.cel-title');
    const gridEl = cel.querySelector('.cel-mini-grid');
    const nextEl = cel.querySelector('.cel-next');
    const letterBtn = cel.querySelector('.cel-letter-btn');
    const finalEl = cel.querySelector('.cel-final');
    const closingEl = cel.querySelector('.cel-closing');

     titleEl.textContent = stages.sheSaid;
    delay(() => { titleEl.style.opacity = '1'; titleEl.style.transform = 'translateY(0)'; }, 300);
    delay(() => {
      titleEl.style.opacity = '0'; titleEl.style.transform = 'translateY(-10px)';
      delay(() => {
        titleEl.textContent = stages.yes;
        titleEl.style.transform = 'translateY(14px)';
        requestAnimationFrame(() => { titleEl.style.opacity = '1'; titleEl.style.transform = 'translateY(0)'; });
        gridEl.innerHTML = '';
        memories().slice(0, 5).forEach(m => {
          const im = document.createElement('img');
          im.src = m.image || m.source;
          im.alt = '';
          im.style.width = '58px'; im.style.height = '58px'; im.style.objectFit = 'cover'; im.style.borderRadius = '10px'; im.style.border = '1px solid rgba(255,255,255,.14)';
          im.style.boxShadow = '0 6px 18px rgba(0,0,0,.35)';
          gridEl.appendChild(im);
        });
        delay(() => gridEl.style.opacity = '1', 200);
        triggerConfetti();
      }, 460);
    }, 1900);
    // Support multiline nextChapter (e.g. "And just like that…\nmy favorite story became our story.")
    delay(() => {
      nextEl.innerHTML = escapeHtml(stages.nextChapter).replace(/\n/g, '<br>');
      nextEl.style.opacity = '1';
    }, 3600);
    delay(() => {
      titleEl.style.opacity = '0';
      delay(() => {
        titleEl.textContent = stages.finalTitle;
        titleEl.classList.add('cel-title-gradient');
        titleEl.style.opacity = '1';
        titleEl.style.transform = 'translateY(0)';
        finalEl.textContent = 'JIYA ❤️ SHLOK';
        finalEl.style.opacity = '1';
        closingEl.textContent = 'This is only the beginning.';
        closingEl.style.opacity = '1';
        letterBtn.style.display = 'inline-flex';
        letterBtn.style.alignItems = 'center';
        letterBtn.style.justifyContent = 'center';
        requestAnimationFrame(() => { letterBtn.style.opacity = '1'; letterBtn.style.transform = 'translateY(0)'; });
      }, 480);
    }, 5200);
    // Ensure button is clickable — direct handler + fallback delegation
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
      // Split into paragraphs preserving intention
      const parts = raw.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
      body.innerHTML = '';
      parts.forEach((para) => {
        const pEl = document.createElement('p');
        pEl.className = 'letter-paragraph';
        pEl.textContent = para;
        pEl.style.marginBottom = '14px';
        body.appendChild(pEl);
      });
      // Also handle single newlines inside paragraphs as <br>
      body.querySelectorAll('.letter-paragraph').forEach(p => {
        p.innerHTML = p.textContent.replace(/\n/g, '<br>');
      });
    }
    screen.classList.add('active');
    screen.setAttribute('aria-hidden','false');
    // Staged letter reveal
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

  function triggerConfetti() {
    try {
      const hearts = ['❤️','💖','💘','✨','🎉'];
      for (let i=0;i<20;i++) {
        const h = document.createElement('div');
        h.textContent = hearts[Math.floor(Math.random()*hearts.length)];
        h.style.position = 'fixed';
        h.style.left = Math.random()*100 + 'vw';
        h.style.top = '100vh';
        h.style.fontSize = (1 + Math.random()*1.4)+'rem';
        h.style.zIndex = '100000';
        h.style.pointerEvents = 'none';
        h.style.transition = `transform ${2.8+Math.random()*1.8}s ease-out, opacity ${2.8+Math.random()*1.8}s ease-out`;
        document.body.appendChild(h);
        requestAnimationFrame(()=> {
          h.style.transform = `translateY(-96vh) rotate(${Math.random()*40-20}deg)`;
          h.style.opacity = '0';
        });
        setTimeout(()=> h.remove(), 4400);
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
    // also hide letter if open
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
