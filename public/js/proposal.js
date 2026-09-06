// ═══════════════════════════════════════════════
//  PROPOSAL — Minimal cinematic reveal + Letter
// ═══════════════════════════════════════════════

const Proposal = (() => {
  let section, canvas, ctx;
  let confettiPieces = [];
  let animationId;
  let floatingHeartsInterval;
  let hasRevealed = false;

  function init() {
    section = document.getElementById('proposal');
    canvas = document.getElementById('celebration-canvas');

    if (canvas) {
      ctx = canvas.getContext('2d');
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
    }

    if (!section || !CONFIG.proposal) return;

    const bg = section.querySelector('.proposal-bg');
    // Use questionPhoto if provided, else backgroundImage
    const bgSrc = CONFIG.proposal.questionPhoto || CONFIG.proposal.backgroundImage;
    if (bg) {
      bg.style.backgroundImage = `url('${bgSrc}')`;
      bg.style.opacity = '0'; // will fade in slowly before question
      bg.style.transition = 'opacity 1.6s ease, transform 8s ease';
    }

    // Letter close
    const letterScreen = document.getElementById('letter-screen');
    const letterClose = document.querySelector('.letter-close');
    if (letterClose) letterClose.addEventListener('click', () => {
      letterScreen.classList.remove('active');
      letterScreen.setAttribute('aria-hidden','true');
    });
    if (letterScreen) letterScreen.addEventListener('click', (e)=>{
      if (e.target === letterScreen) {
        letterScreen.classList.remove('active');
        letterScreen.setAttribute('aria-hidden','true');
      }
    });

    // Celebration next button -> letter
    const nextBtn = document.querySelector('.celebration-next-btn');
    if (nextBtn) nextBtn.addEventListener('click', showLetter);
  }

  function reveal() {
    if (!section || hasRevealed) return;
    hasRevealed = true;
    section.classList.add('active');
    document.body.style.overflow = 'hidden';
    // lower any photo music
    lowerPhotoMusic();

    const content = section.querySelector('.proposal-content');
    // Clear existing and build minimal sequence
    content.innerHTML = '';
    content.style.opacity = '1';

    const lines = CONFIG.proposal.simpleLines || [
      "Jiya...",
      "After every memory...",
      "Every laugh...",
      "Every stupid little moment..."
    ];

    // Container for lines
    const linesWrap = document.createElement('div');
    linesWrap.className = 'proposal-simple-lines';
    content.appendChild(linesWrap);

    lines.forEach((txt, i) => {
      const p = document.createElement('p');
      p.className = 'proposal-simple-line';
      p.textContent = txt;
      p.style.opacity = '0';
      p.style.transform = 'translateY(14px)';
      p.style.transition = `opacity 0.9s ease ${0.2+i*0.1}s, transform 0.9s ease ${0.2+i*0.1}s`;
      linesWrap.appendChild(p);
    });

    // Question photo (favorite) — hidden initially, will fade in
    const bg = section.querySelector('.proposal-bg');

    const intro = document.createElement('p');
    intro.className = 'proposal-question-intro';
    intro.textContent = CONFIG.proposal.questionIntro || "I have one question for you.";
    intro.style.opacity = '0';
    content.appendChild(intro);

    const heart = document.createElement('div');
    heart.className = 'proposal-heart';
    heart.textContent = CONFIG.proposal.heart || '❤️';
    heart.style.opacity = '0';
    content.appendChild(heart);

    const question = document.createElement('h2');
    question.className = 'proposal-question';
    question.textContent = CONFIG.proposal.question || "WILL YOU BE MINE?";
    question.style.opacity = '0';
    content.appendChild(question);

    const btnWrap = document.createElement('div');
    btnWrap.className = 'proposal-buttons';
    btnWrap.style.opacity = '0';
    btnWrap.innerHTML = `<button class="btn-yes btn-yes-primary"></button><button class="btn-yes btn-yes-secondary"></button>`;
    const btnPrimary = btnWrap.querySelector('.btn-yes-primary');
    const btnSecondary = btnWrap.querySelector('.btn-yes-secondary');
    if (btnPrimary) btnPrimary.textContent = CONFIG.proposal.btnYes;
    if (btnSecondary) btnSecondary.textContent = CONFIG.proposal.btnYesCourse;
    btnPrimary?.addEventListener('click', celebrate);
    btnSecondary?.addEventListener('click', celebrate);
    content.appendChild(btnWrap);

    // Create particles subtle
    createParticles();

    // Staggered reveal with pauses — minimal, cinematic
    const lineEls = linesWrap.querySelectorAll('.proposal-simple-line');
    let delay = 500;
    lineEls.forEach((el, idx) => {
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, delay + idx * 1100);
    });
    delay += lineEls.length * 1100 + 600;
    setTimeout(() => {
      intro.style.transition = 'opacity 0.9s ease';
      intro.style.opacity = '1';
      intro.classList.add('reveal');
    }, delay);
    delay += 1100;
    // Slow photo appear
    setTimeout(() => {
      if (bg) { bg.style.opacity = '0.42'; bg.style.transform = 'scale(1.04)'; }
      heart.style.transition = 'opacity 0.9s ease, transform 0.9s ease';
      heart.style.opacity = '1';
      heart.classList.add('reveal');
      setTimeout(()=> heart.classList.add('pulse'), 1000);
    }, delay);
    delay += 1200;
    setTimeout(() => {
      question.style.transition = 'opacity 1s ease, transform 1s ease, filter 1s ease';
      question.style.opacity = '1';
      question.style.transform = 'translateY(0) scale(1)';
      question.classList.add('reveal');
    }, delay);
    delay += 1000;
    setTimeout(() => {
      btnWrap.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
      btnWrap.style.opacity = '1';
      btnWrap.style.transform = 'translateY(0)';
      btnWrap.classList.add('reveal');
    }, delay);
  }

  function createParticles() {
    const container = document.getElementById('proposal-particles');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 18; i++) {
      const particle = document.createElement('div');
      particle.className = 'proposal-particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 5 + 's';
      particle.style.animationDuration = (3 + Math.random() * 4) + 's';
      particle.style.width = (2 + Math.random() * 3) + 'px';
      particle.style.height = particle.style.width;
      container.appendChild(particle);
    }
  }

  function celebrate() {
    startConfetti();
    startFloatingHearts();
    // proposal music rise if exists
    const pm = document.getElementById('celebration-music');
    if (CONFIG.audio && CONFIG.audio.celebrationMusic && pm) {
      pm.src = CONFIG.audio.celebrationMusic;
      pm.volume = 0.4;
      pm.play().catch(()=>{});
    }
    // lower photo music already
    setTimeout(() => showCelebrationEvolution(), 900);
  }

  function showCelebrationEvolution() {
    const screen = document.getElementById('celebration-screen');
    if (!screen) return;
    const img = screen.querySelector('.celebration-image');
    const title = screen.querySelector('.celebration-title');
    const msg = screen.querySelector('.celebration-message');
    const nextBtn = screen.querySelector('.celebration-next-btn');
    const stages = CONFIG.proposal.celebrationStages || {
      sheSaid: "She said...",
      yes: "YES. ❤️",
      nextChapter: "Our next chapter starts now.",
      finalTitle: "JIYA ❤️ SHLOK"
    };

    // Reset
    screen.classList.add('active');
    if (img && CONFIG.proposal.celebrationImage) {
      img.src = CONFIG.proposal.celebrationImage;
      img.style.opacity = '0';
      img.style.transform = 'scale(0.96)';
      img.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
      img.onerror = () => { img.style.display = 'none'; };
      setTimeout(()=> { img.style.opacity='1'; img.style.transform='scale(1)'; }, 100);
    }
    // Stage 1: She said...
    title.textContent = stages.sheSaid;
    title.style.opacity = '0';
    title.style.transform = 'translateY(12px)';
    title.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
    msg.textContent = '';
    msg.style.opacity = '0';
    if (nextBtn) nextBtn.style.display = 'none';

    setTimeout(()=> {
      title.style.opacity = '1';
      title.style.transform = 'translateY(0)';
    }, 300);

    // Stage 2: YES.
    setTimeout(()=> {
      title.style.opacity = '0';
      setTimeout(()=> {
        title.textContent = stages.yes;
        title.style.opacity = '1';
        // subtle photos fill — we already have main image, add floating preview grid
        addMiniPhotoGrid(screen);
      }, 400);
    }, 1600);

    // Stage 3: Our next chapter + final
    setTimeout(()=> {
      msg.textContent = stages.nextChapter;
      msg.style.transition = 'opacity 0.8s ease';
      msg.style.opacity = '1';
    }, 3000);

    setTimeout(()=> {
      // Final title
      title.style.opacity = '0';
      setTimeout(()=> {
        title.textContent = stages.finalTitle;
        title.style.opacity = '1';
        title.style.background = 'linear-gradient(135deg, var(--accent-pink) 0%, var(--accent-gold) 100%)';
        title.style.webkitBackgroundClip = 'text';
        title.style.backgroundClip = 'text';
        // show next button
        if (nextBtn) {
          nextBtn.style.display = 'inline-flex';
          nextBtn.style.opacity = '0';
          nextBtn.style.transform = 'translateY(10px)';
          nextBtn.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
          setTimeout(()=> { nextBtn.style.opacity='1'; nextBtn.style.transform='translateY(0)'; }, 100);
        }
      }, 400);
    }, 4400);
  }

  function addMiniPhotoGrid(screen) {
    if (screen.querySelector('.celebration-mini-grid')) return;
    const grid = document.createElement('div');
    grid.className = 'celebration-mini-grid';
    grid.style.display = 'flex';
    grid.style.gap = '8px';
    grid.style.margin = '14px 0 10px';
    grid.style.opacity = '0';
    grid.style.transition = 'opacity 0.8s ease';
    (CONFIG.memories || []).slice(0,4).forEach(m=>{
      const im = document.createElement('img');
      im.src = m.image;
      im.style.width = '56px';
      im.style.height = '56px';
      im.style.objectFit = 'cover';
      im.style.borderRadius = '8px';
      im.style.border = '1px solid rgba(255,255,255,0.15)';
      grid.appendChild(im);
    });
    const msg = screen.querySelector('.celebration-message');
    msg.parentNode.insertBefore(grid, msg);
    setTimeout(()=> grid.style.opacity='1', 100);
  }

  function showLetter() {
    const screen = document.getElementById('letter-screen');
    if (!screen) return;
    const title = screen.querySelector('.letter-title');
    const body = screen.querySelector('.letter-body');
    const sign = screen.querySelector('.letter-sign');
    const L = CONFIG.proposal.letter;
    if (title) title.textContent = L.title || "For my Jiya,";
    if (body) body.innerHTML = (L.body || "").replace(/\n/g, '<br>');
    if (sign) sign.textContent = L.sign || "— Shlok";
    screen.classList.add('active');
    screen.setAttribute('aria-hidden','false');
    // confetti burst
    startConfetti();
  }

  // ── Audio helpers ──
  function lowerPhotoMusic() {
    const pm = document.getElementById('photo-music');
    if (pm && !pm.paused) {
      let v = pm.volume;
      const fade = setInterval(()=>{
        v -= 0.05;
        if (v <= 0.08) { pm.volume = 0.08; clearInterval(fade); }
        else pm.volume = v;
      }, 120);
    }
  }

  // ── Confetti ──────────────────────────────
  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function startConfetti() {
    if (!ctx) return;
    confettiPieces = [];
    const colors = ['#e50914', '#ff6b8a', '#c4395c', '#f5c518', '#ff4081', '#ff80ab', '#ff1744', '#ff8a80', '#ffffff', '#ffd700'];
    for (let i = 0; i < 160; i++) {
      confettiPieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedY: Math.random() * 3 + 2,
        speedX: (Math.random() - 0.5) * 2,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: Math.random() * 0.5 + 0.5
      });
    }
    animateConfetti();
  }

  function animateConfetti() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;
    confettiPieces.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotationSpeed;
      if (p.y < canvas.height + 50) active = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (active) animationId = requestAnimationFrame(animateConfetti);
  }

  // ── Floating Hearts ───────────────────────
  function startFloatingHearts() {
    const hearts = ['❤️', '💕', '💖', '💗', '💘', '💝', '🥰', '😍'];
    let count = 0;
    const maxHearts = 36;
    floatingHeartsInterval = setInterval(() => {
      if (count >= maxHearts) { clearInterval(floatingHeartsInterval); return; }
      const heart = document.createElement('div');
      heart.className = 'floating-heart';
      heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
      heart.style.left = Math.random() * 100 + '%';
      heart.style.fontSize = (1 + Math.random() * 2) + 'rem';
      heart.style.animationDuration = (3 + Math.random() * 3) + 's';
      heart.style.animationDelay = Math.random() * 0.5 + 's';
      document.body.appendChild(heart);
      count++;
      setTimeout(() => heart.remove(), 7000);
    }, 150);
  }

  return { init, reveal };
})();
