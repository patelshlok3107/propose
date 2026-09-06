// STORY - a temporary cinematic overlay over the unchanged dashboard.
const Story = (() => {
  let overlay;
  let storyAudio;
  let storyVideo;
  let phase = 'dashboard';
  let currentPhoto = -1;
  let isOpen = false;
  let entryBound = false;
  let audioTimeHandler;
  let audioEndedHandler;
  let videoEndedHandler;
  let fadeFrame;

  const timeline = () => (CONFIG.storyTimeline || []).filter((item) => item.type === 'photo');

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
    phase = 'transition';
    document.body.classList.add('story-mode');
    document.body.style.overflow = 'hidden';
    createOverlay();
    bindOverlayEvents();
    createAudio();
    if (!storyAudio) return;

    // This play call is made synchronously from the dashboard button's click handler.
    storyAudio.currentTime = 0;
    const playback = storyAudio.play();
    if (playback && typeof playback.then === 'function') {
      playback.then(() => {
        if (!isOpen) return;
        phase = 'video';
        startVideo();
      }).catch((error) => {
        showAudioError(error);
      });
    } else {
      phase = 'video';
      startVideo();
    }
  }

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'story-overlay';
    overlay.innerHTML = `
      <div class="story-blackout active"></div>
      <div class="story-now-playing" aria-live="polite">
        <span class="story-kicker">Now playing</span>
        <strong>Those Eyes</strong>
        <span>Jiya &amp; Shlok</span>
      </div>
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
        <img class="story-memory-img" alt="">
        <div class="story-memory-text">
          <p class="story-chapter-label"></p>
          <h3 class="story-memory-title"></h3>
          <p class="story-memory-message"></p>
        </div>
        <div class="story-memory-controls"><div class="story-memory-dots"></div></div>
        <button class="story-mem-exit" aria-label="Exit story">✕</button>
      </div>
      <div class="story-proposal" aria-live="polite">
        <div class="story-proposal-photo"></div>
        <div class="story-proposal-shade"></div>
        <div class="story-proposal-copy"></div>
      </div>
      <audio class="story-audio" preload="auto"></audio>
      <p class="story-audio-error" role="alert"></p>
    `;
    document.body.appendChild(overlay);
    storyVideo = overlay.querySelector('.story-video');
    const dots = overlay.querySelector('.story-memory-dots');
    timeline().forEach((_, index) => {
      const dot = document.createElement('span');
      dot.className = 'story-dot';
      dot.addEventListener('click', () => seekPhoto(index));
      dots.appendChild(dot);
    });
  }

  function createAudio() {
    const source = CONFIG.audio?.storySoundtrack;
    if (!source) {
      showAudioError(new Error('CONFIG.audio.storySoundtrack is empty.'));
      return;
    }
    storyAudio = overlay.querySelector('.story-audio');
    storyAudio.src = source;
    storyAudio.preload = 'auto';
    storyAudio.loop = false;
    storyAudio.volume = 0.86;
    audioTimeHandler = syncPhotos;
    audioEndedHandler = handleAudioEnded;
    storyAudio.addEventListener('timeupdate', audioTimeHandler);
    storyAudio.addEventListener('ended', audioEndedHandler);
    storyAudio.addEventListener('error', () => showAudioError(new Error(`Unable to load ${source}`)));
  }

  function bindOverlayEvents() {
    overlay.querySelectorAll('.story-exit-btn, .story-mem-exit').forEach((button) => button.addEventListener('click', close));
    overlay.querySelector('.story-play-pause').addEventListener('click', togglePlayback);
    storyVideo.addEventListener('timeupdate', updateVideoProgress);
    videoEndedHandler = startPhotoSequence;
    storyVideo.addEventListener('ended', videoEndedHandler, { once: true });
    document.addEventListener('keydown', handleKeydown);
  }

  function startVideo() {
    if (!isOpen || phase !== 'video') return;
    const videoContainer = overlay.querySelector('.story-video-container');
    videoContainer.classList.add('active');
    overlay.querySelector('.story-blackout').classList.remove('active');
    overlay.querySelector('.story-now-playing').classList.add('hidden');
    storyVideo.src = CONFIG.storyVideo;
    storyVideo.load();
    storyVideo.volume = 0.72;
    storyAudio.volume = 0.24;
    storyVideo.play().catch((error) => showVideoError(error));
  }

  function startPhotoSequence() {
    if (!isOpen || phase === 'photos' || phase === 'proposal' || phase === 'celebration') return;
    phase = 'photos';
    storyVideo.pause();
    storyVideo.removeAttribute('src');
    storyVideo.load();
    overlay.querySelector('.story-video-container').classList.remove('active');
    overlay.querySelector('.story-memory-container').classList.add('active');
    // Decide sync vs timer: if Those Eyes is placeholder/short (<20s) use timer so ALL photos show
    const items = timeline();
    const totalTimeline = items.reduce((s, it) => s + (it.duration || 8), 0);
    const audioDur = storyAudio ? (isFinite(storyAudio.duration) ? storyAudio.duration : 0) : 0;
    const useSync = storyAudio && !storyAudio.paused && !storyAudio.ended && audioDur > 20 && audioDur >= totalTimeline * 0.7;
    if (useSync) {
      storyAudio.volume = 0.86;
      syncPhotos();
    } else {
      // Timer fallback — ensures ALL photos appear even with short/missing Those Eyes
      if (storyAudio && !storyAudio.paused) storyAudio.volume = 0.35;
      startTimerPhotos();
    }
  }

  function startTimerPhotos() {
    const items = timeline();
    let idx = 0;
    function nextTimerPhoto() {
      if (!isOpen || phase !== 'photos') return;
      if (idx >= items.length) { showProposal(); return; }
      showPhoto(idx, items[idx]);
      const durMs = (items[idx].duration || 8) * 1000;
      // Also respect chapter duration if provided
      setTimeout(() => { idx++; nextTimerPhoto(); }, durMs);
    }
    nextTimerPhoto();
  }

  function syncPhotos() {
    if (!isOpen || phase !== 'photos' || !storyAudio) return;
    const items = timeline();
    const index = items.findIndex((item) => storyAudio.currentTime >= item.start && storyAudio.currentTime < item.start + item.duration);
    if (index >= 0 && index !== currentPhoto) showPhoto(index, items[index]);
    const finalItem = items.at(-1);
    if (finalItem && storyAudio.currentTime >= finalItem.start + finalItem.duration) showProposal();
    if (storyAudio.ended) handleAudioEnded();
  }

  function showPhoto(index, item) {
    currentPhoto = index;
    const container = overlay.querySelector('.story-memory-container');
    const image = overlay.querySelector('.story-memory-img');
    const background = overlay.querySelector('.story-memory-bg');
    const title = overlay.querySelector('.story-memory-title');
    const message = overlay.querySelector('.story-memory-message');
    const chapter = overlay.querySelector('.story-chapter-label');
    container.classList.remove('fade-in');
    void container.offsetWidth;
    container.classList.add('fade-in');
    const source = item.source || item.image;
    image.src = source;
    image.alt = item.title || item.message || 'A memory from our story';
    background.style.backgroundImage = `url("${source}")`;
    title.textContent = item.title || '';
    message.textContent = item.message || '';
    chapter.textContent = item.chapter || '';
    overlay.querySelectorAll('.story-dot').forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === index));
    const next = timeline()[index + 1];
    if (next) { const preload = new Image(); preload.src = next.source || next.image; }
  }

  function handleAudioEnded() {
    if (!isOpen || phase !== 'photos') return;
    const items = timeline();
    if (items.length && currentPhoto !== items.length - 1) showPhoto(items.length - 1, items[items.length - 1]);
    // Don't wait 60s if Those Eyes is short placeholder — finish quickly
    window.setTimeout(() => showProposal(), 1800);
  }

  function showProposal() {
    if (!isOpen || phase === 'proposal' || phase === 'celebration') return;
    phase = 'proposal';
    fadeAudio(0.12, 1400);
    overlay.querySelector('.story-memory-container').classList.remove('active');
    const proposal = overlay.querySelector('.story-proposal');
    proposal.innerHTML = `
      <div class="story-proposal-photo"></div>
      <div class="story-proposal-shade"></div>
      <div class="story-proposal-copy">
        <p>Jiya...</p>
        <p>After all these memories...</p>
        <p>I have one question for you.</p>
        <h2>WILL YOU BE MINE? <span>❤️</span></h2>
        <div class="story-proposal-buttons"><button data-answer="yes">YES ❤️</button><button data-answer="yes">YES, OF COURSE ❤️</button></div>
      </div>
    `;
    const image = CONFIG.proposal?.questionPhoto || (timeline().at(-1)?.source);
    proposal.querySelector('.story-proposal-photo').style.backgroundImage = `url("${image}")`;
    proposal.classList.add('active');
    proposal.querySelectorAll('button').forEach((button) => button.addEventListener('click', showCelebration));
  }

  function showCelebration() {
    phase = 'celebration';
    const proposal = overlay.querySelector('.story-proposal');
    proposal.innerHTML = `
      <div class="story-proposal-photo"></div><div class="story-proposal-shade"></div>
      <div class="story-proposal-copy story-celebration-copy"><p>She said...</p><h2>YES! ❤️</h2><p>✨ ❤️ 🎉</p><strong>Jiya ❤️ Shlok</strong><p>This is only the beginning of our story.</p></div>
    `;
    const image = CONFIG.proposal?.celebrationImage || timeline().at(-1)?.source;
    proposal.querySelector('.story-proposal-photo').style.backgroundImage = `url("${image}")`;
  }

  function togglePlayback() {
    if (!storyAudio) return;
    if (storyAudio.paused) {
      storyAudio.play().catch(showAudioError);
      if (phase === 'video') storyVideo.play().catch(showVideoError);
    } else {
      storyAudio.pause();
      if (phase === 'video') storyVideo.pause();
    }
  }

  function seekPhoto(index) {
    const item = timeline()[index];
    if (storyAudio && item) storyAudio.currentTime = item.start + 0.01;
  }

  function updateVideoProgress() {
    const progress = overlay?.querySelector('.story-progress-fill');
    if (progress && storyVideo.duration) progress.style.width = `${storyVideo.currentTime / storyVideo.duration * 100}%`;
  }

  function fadeAudio(target, duration) {
    if (!storyAudio) return;
    cancelAnimationFrame(fadeFrame);
    const initial = storyAudio.volume;
    const started = performance.now();
    const step = (now) => {
      const ratio = Math.min((now - started) / duration, 1);
      storyAudio.volume = initial + (target - initial) * ratio;
      if (ratio < 1 && isOpen) fadeFrame = requestAnimationFrame(step);
    };
    fadeFrame = requestAnimationFrame(step);
  }

  function showAudioError(error) {
    console.error('[Story] Those Eyes playback failed:', error);
    const errorElement = overlay?.querySelector('.story-audio-error');
    if (errorElement) errorElement.textContent = `Those Eyes could not start. Check ${CONFIG.audio?.storySoundtrack || 'the configured audio file'}.`;
  }

  function showVideoError(error) {
    console.error('[Story] Story video playback failed:', error);
    const errorElement = overlay?.querySelector('.story-audio-error');
    if (errorElement) errorElement.textContent = 'The story video could not start. The dashboard video asset is unavailable.';
  }

  function handleKeydown(event) {
    if (!isOpen) return;
    if (event.key === 'Escape') close();
    if (event.key === ' ') { event.preventDefault(); togglePlayback(); }
  }

  function close() {
    if (!isOpen && !overlay) return;
    isOpen = false;
    phase = 'dashboard';
    cancelAnimationFrame(fadeFrame);
    document.removeEventListener('keydown', handleKeydown);
    if (storyAudio) {
      storyAudio.pause();
      storyAudio.removeEventListener('timeupdate', audioTimeHandler);
      storyAudio.removeEventListener('ended', audioEndedHandler);
      storyAudio.removeAttribute('src');
      storyAudio.load();
    }
    if (storyVideo) {
      storyVideo.pause();
      storyVideo.removeEventListener('timeupdate', updateVideoProgress);
      storyVideo.removeEventListener('ended', videoEndedHandler);
      storyVideo.removeAttribute('src');
      storyVideo.load();
    }
    overlay?.remove();
    overlay = null;
    storyAudio = null;
    storyVideo = null;
    currentPhoto = -1;
    document.body.classList.remove('story-mode');
    document.body.style.overflow = '';
  }

  init();
  return { init, start, close };
})();
