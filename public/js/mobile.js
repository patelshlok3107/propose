// ═══════════════════════════════════════════════
//  MOBILE — Streaming App Navigation & Interactions
// ═══════════════════════════════════════════════

const Mobile = (() => {
  let bottomNav;
  let topNav;

  function init() {
    bottomNav = document.getElementById('mobile-bottom-nav');
    topNav = document.getElementById('mobile-top-nav');
    if (!bottomNav) return;

    // Show mobile navs now that main content is visible
    bottomNav.classList.add('visible');
    if (topNav) topNav.classList.add('visible');

    setupNavigation();
    setupScrollSpy();
    setupTouchInteractions();
  }

  function setupNavigation() {
    const navItems = bottomNav.querySelectorAll('.mobile-nav-item');

    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = item.getAttribute('data-section');
        const target = document.getElementById(targetId);
        if (target) {
          navItems.forEach(nav => nav.classList.remove('active'));
          item.classList.add('active');
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Top nav scroll behavior
    if (topNav) {
      let lastScrollY = window.scrollY;
      let ticking = false;

      window.addEventListener('scroll', () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const currentScrollY = window.scrollY;
            topNav.classList.toggle('scrolled', currentScrollY > 50);

            if (currentScrollY > lastScrollY && currentScrollY > 100) {
              topNav.style.transform = 'translateY(-100%)';
              topNav.style.transition = 'transform 0.3s ease';
            } else {
              topNav.style.transform = 'translateY(0)';
            }
            lastScrollY = currentScrollY;
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    }
  }

  function setupScrollSpy() {
    const sections = [];
    bottomNav.querySelectorAll('.mobile-nav-item').forEach(item => {
      const sectionId = item.getAttribute('data-section');
      const section = document.getElementById(sectionId);
      if (section) sections.push({ element: section, navItem: item });
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const navItem = bottomNav.querySelector(`[data-section="${entry.target.id}"]`);
          if (navItem) {
            bottomNav.querySelectorAll('.mobile-nav-item').forEach(i => i.classList.remove('active'));
            navItem.classList.add('active');
          }
        }
      });
    }, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });

    sections.forEach(s => observer.observe(s.element));
  }

  function setupTouchInteractions() {
    document.querySelectorAll('.media-card').forEach(card => {
      card.addEventListener('touchstart', () => { card.style.transform = 'scale(0.96)'; }, { passive: true });
      card.addEventListener('touchend', () => { card.style.transform = ''; }, { passive: true });
    });
  }

  return { init };
})();
