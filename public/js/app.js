// ═══════════════════════════════════════════════
//  APP — Main Orchestrator
// ═══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // 1. Profile Screen (waiting beneath the Intro)
  Profiles.init(() => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.style.display = 'block';
      mainContent.offsetHeight;
      mainContent.style.opacity = '1';
      setTimeout(() => Mobile.init(), 100);
    }
  });

  // 2. Intro Screen
  Intro.init(() => {});

  // 3. Initialize modules
  Dashboard.init();
  Modal.init();
  Story.init();
  Proposal.init();

  // Bind after dashboard rendering so the existing Play control remains the entry point.
  document.querySelector('.btn-play')?.addEventListener('click', () => Story.start());

  preloadImages();
  initScrollAnimations();
  initRomanticParticles();
});

function initRomanticParticles() {
  const container = document.getElementById('romantic-particles');
  if (!container || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const count = 7;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'romantic-particle';
    el.textContent = '❤';
    el.style.left = (8 + Math.random() * 84) + '%';
    el.style.bottom = (-10 - Math.random() * 20) + 'vh';
    el.style.fontSize = (8 + Math.random() * 7) + 'px';
    el.style.animationDuration = (22 + Math.random() * 18) + 's';
    el.style.animationDelay = (Math.random() * 18) + 's';
    el.style.opacity = (0.08 + Math.random() * 0.06).toFixed(2);
    container.appendChild(el);
  }
}

function preloadImages() {
  const imagesToPreload = [];
  if (CONFIG.hero?.backgroundImage) imagesToPreload.push(CONFIG.hero.backgroundImage);
  if (CONFIG.mediaRows) {
    CONFIG.mediaRows.forEach(row => {
      row.items.forEach(m => {
        if (m.type === 'photo') imagesToPreload.push(m.src);
        if (m.cover) imagesToPreload.push(m.cover);
      });
    });
  }
  if (CONFIG.proposal?.backgroundImage) imagesToPreload.push(CONFIG.proposal.backgroundImage);

  imagesToPreload.forEach(src => {
    if (src) { const img = new Image(); img.src = src; }
  });
}

function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.scroll-animate').forEach(el => observer.observe(el));
}
