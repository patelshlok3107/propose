// ═══════════════════════════════════════════════
//  DASHBOARD — Cinematic Streaming UI
// ═══════════════════════════════════════════════

const Dashboard = (() => {
  function init() {
    const heroSection = document.getElementById('hero-section');
    const mainContent = document.getElementById('dashboard-content');
    const featureSection = document.getElementById('feature-section');
    const finalBtn = document.querySelector('.final-cta-btn');

    if (!mainContent) return;

    // Nav logo — Netflix wordmark (do not overwrite image asset)
    const navLogo = document.querySelector('.nav-logo');
    if (navLogo && navLogo.tagName !== 'IMG') navLogo.textContent = 'NETFLIX';

    // Hero
    if (heroSection && CONFIG.hero) {
      const hBg = heroSection.querySelector('.dashboard-hero-bg');
      if (hBg) hBg.style.backgroundImage = `url('${CONFIG.hero.backgroundImage}')`;

      const titleEl = heroSection.querySelector('.dashboard-title');
      if (titleEl) titleEl.innerHTML = CONFIG.hero.title.replace(/\n/g, '<br>');

      const badgeEl = heroSection.querySelector('.badge-text');
      if (badgeEl) badgeEl.textContent = CONFIG.hero.badge;

      const taglineEl = heroSection.querySelector('.dashboard-tagline');
      if (taglineEl) taglineEl.textContent = CONFIG.hero.tagline;

      // Netflix Original feel — tiny metadata under subtitle (only once)
      if (taglineEl && !heroSection.querySelector('.hero-original-meta')) {
        const metaWrap = document.createElement('div');
        metaWrap.className = 'hero-original-meta';
        metaWrap.innerHTML = `
          <span class="hero-original-line">A SHLOK & JIYA ORIGINAL</span>
          <span class="hero-original-dot">•</span>
          <span class="hero-genre-line">Romance • Memories • Forever</span>
        `;
        taglineEl.insertAdjacentElement('afterend', metaWrap);
      }

      const descEl = heroSection.querySelector('.dashboard-desc');
      if (descEl) descEl.innerHTML = CONFIG.hero.description.replace(/\n/g, '<br>');

      const authorEl = heroSection.querySelector('.dashboard-author');
      if (authorEl) authorEl.innerHTML = CONFIG.hero.authorInfo.replace(/\n/g, '<br>');

      const btnPlay = heroSection.querySelector('.btn-play');
      const btnList = heroSection.querySelector('.btn-list');
      if (btnPlay) btnPlay.textContent = CONFIG.hero.ctaPlay;
      if (btnList) btnList.textContent = CONFIG.hero.ctaList;

      btnPlay?.addEventListener('click', () => {
        Story.start();
      });

      btnList?.addEventListener('click', () => {
        mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    // Media Rows
    if (CONFIG.mediaRows) {
      mainContent.innerHTML = '';
      CONFIG.mediaRows.forEach((row, rowIndex) => {
        const rowEl = document.createElement('section');
        rowEl.className = 'media-row';

        const titleEl = document.createElement('h2');
        titleEl.className = 'row-title';
        titleEl.textContent = row.title;
        rowEl.appendChild(titleEl);

        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'row-scroll-container';

        row.items.forEach((item, itemIndex) => {
          const card = document.createElement('div');
          card.className = 'media-card';
          card.setAttribute('tabindex', '0');

          const imgSrc = item.cover || item.src;
          card.innerHTML = `
            <img src="${imgSrc}" class="media-card-img" alt="${item.title}" loading="lazy">
            ${item.type === 'video' ? '<div class="media-card-play-icon">▶</div>' : ''}
            <div class="media-card-overlay">
              <h3 class="media-card-title">${item.title}</h3>
            </div>
          `;

          const img = card.querySelector('.media-card-img');
          img.onerror = () => { card.classList.add('placeholder'); img.remove(); };

          card.addEventListener('click', () => Modal.open(rowIndex, itemIndex));
          card.addEventListener('keydown', (e) => { if (e.key === 'Enter') Modal.open(rowIndex, itemIndex); });

          scrollContainer.appendChild(card);
        });

        rowEl.appendChild(scrollContainer);
        mainContent.appendChild(rowEl);
      });
    }

    // Feature Section
    if (featureSection && CONFIG.feature) {
      featureSection.querySelector('.feature-title').textContent = CONFIG.feature.title;
      featureSection.querySelector('.feature-message').innerHTML = CONFIG.feature.message.replace(/\n/g, '<br><br>');
      const featureImg = featureSection.querySelector('.feature-image');
      if (featureImg) {
        featureImg.src = CONFIG.feature.photo;
        featureImg.onerror = () => {
          featureImg.style.display = 'none';
          featureSection.querySelector('.feature-image-wrapper').style.background = 'linear-gradient(45deg, #1a0b12, #0a0a0a)';
        };
      }
    }

    // Why I Choose You — staggered fade
    const whySection = document.getElementById('why-choose-section');
    if (whySection) {
      const lines = whySection.querySelectorAll('.why-choose-lines p');
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            lines.forEach((p, i) => {
              setTimeout(() => p.classList.add('is-visible'), 300 + i * 420);
            });
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      obs.observe(whySection);
    }

    // Final CTA
    if (finalBtn && CONFIG.finalCta) {
      finalBtn.textContent = CONFIG.finalCta;
      finalBtn.addEventListener('click', () => Proposal.reveal());
    }

    // Scroll nav
    window.addEventListener('scroll', () => {
      const nav = document.getElementById('top-nav');
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  return { init };
})();
