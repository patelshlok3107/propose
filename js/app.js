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
});

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
