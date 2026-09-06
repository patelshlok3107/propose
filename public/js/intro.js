// ═══════════════════════════════════════════════
//  INTRO — N is the start button. No Tap-to-Begin.
//  Click N → start animation + audio → auto → Who's Watching
// ═══════════════════════════════════════════════

const Intro = (() => {
  let overlay;
  let nEl;
  let skipBtn;
  let audio;
  let onComplete;

  let hasStarted = false;
  let hasTransitioned = false;
  let introTimer = null;

  const INTRO_DURATION_MS = 4200;
  const FADE_MS = 900;

  function init(callback) {
    onComplete = callback;
    overlay = document.getElementById('container');
    if (!overlay) { callback?.(); return; }

    nEl = overlay.querySelector('netflixintro');
    skipBtn = overlay.querySelector('.intro-skip-btn');
    audio = document.getElementById('intro-audio');

    document.documentElement.classList.add('intro-active');

    if (audio) {
      audio.preload = 'auto';
      audio.loop = false;
      audio.volume = 1.0;
      audio.addEventListener('ended', () => {
        if (hasStarted && !hasTransitioned) scheduleComplete(150);
      });
    }

    // N is the ONLY start control — accessible + generous hit area
    if (nEl) {
      nEl.setAttribute('role', 'button');
      nEl.setAttribute('tabindex', '0');
      nEl.setAttribute('aria-label', 'Start intro');
      nEl.addEventListener('click', handleNActivate);
      nEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNActivate();
        }
      });
      // touch — prevent double fire with click (300ms delay handled via hasStarted guard)
      nEl.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleNActivate();
      }, { passive: false });
    }

    // Small bottom-right skip — never blocks N
    if (skipBtn) {
      skipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        completeIntro('skip');
      });
    }

    document.addEventListener('keydown', onKey);
  }

  function handleNActivate() {
    if (hasStarted || hasTransitioned) return;
    startIntro();
  }

  function startIntro() {
    if (hasStarted) return;
    hasStarted = true;

    // Disable further N interaction immediately
    if (nEl) {
      nEl.style.pointerEvents = 'none';
      nEl.setAttribute('aria-hidden', 'true');
    }
    if (skipBtn) skipBtn.classList.remove('is-hidden');

    overlay.classList.add('intro-playing');

    // Audio starts from the N click — satisfies browser autoplay policy
    if (audio) {
      try {
        audio.currentTime = 0;
        const p = audio.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (e) {}
    }

    clearTimeout(introTimer);
    introTimer = setTimeout(() => completeIntro('timer'), INTRO_DURATION_MS);
  }

  function scheduleComplete(delay) {
    clearTimeout(introTimer);
    introTimer = setTimeout(() => completeIntro('schedule'), delay);
  }

  function onKey(e) {
    if (hasTransitioned) return;
    if (!overlay || overlay.style.display === 'none') return;
    if (e.key === 'Escape') {
      e.preventDefault();
      completeIntro('key');
    } else if ((e.key === 'Enter' || e.key === ' ') && !hasStarted) {
      // Enter/Space before start also starts via N
      e.preventDefault();
      startIntro();
    }
  }

  // Idempotent — guarantees single transition to Who's Watching
  function completeIntro(source) {
    if (hasTransitioned) return;
    hasTransitioned = true;

    clearTimeout(introTimer);
    document.removeEventListener('keydown', onKey);

    if (audio) {
      try { audio.pause(); audio.currentTime = 0; } catch (e) {}
    }
    if (skipBtn) skipBtn.classList.add('is-hidden');
    if (nEl) nEl.style.pointerEvents = 'none';

    // Cinematic exit: zoom already running, fade to black
    overlay.classList.add('fade-away');
    overlay.style.pointerEvents = 'none';

    setTimeout(() => {
      // Completely unmount intro — remove from DOM so no CSS/z-index leakage
      try { overlay.remove(); } catch(e) { overlay.style.display = 'none'; }
      overlay = null;
      document.documentElement.classList.remove('intro-active');
      document.body.style.overflow = '';
      onComplete?.();
    }, FADE_MS);
  }

  return { init, skip: () => completeIntro('external') };
})();
