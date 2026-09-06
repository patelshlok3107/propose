// ═══════════════════════════════════════════════
//  PROFILES — "Who's Watching?" Selection Screen
// ═══════════════════════════════════════════════

const Profiles = (() => {
  let overlay;
  let onComplete;

  function init(callback) {
    onComplete = callback;
    overlay = document.getElementById('profile-selection');
    if (!overlay) { callback?.(); return; }
    renderProfiles();
  }

  function renderProfiles() {
    const container = overlay.querySelector('.profiles-container');
    if (!container) return;
    container.innerHTML = '';

    CONFIG.profiles.forEach((profile) => {
      const card = document.createElement('button');
      card.className = 'profile-card';
      card.setAttribute('aria-label', `Profile: ${profile.name}`);

      card.innerHTML = `
        <div class="profile-image-wrapper">
          <img class="profile-image" src="${profile.photo}" alt="${profile.name}">
        </div>
        <div class="profile-name">${profile.name}</div>
      `;

      card.addEventListener('click', () => proceedToMainSite());
      container.appendChild(card);
    });
  }

  let completed = false;
  function proceedToMainSite() {
    if (completed) return;
    completed = true;

    overlay.classList.add('fade-away');
    setTimeout(() => {
      overlay.style.display = 'none';
      onComplete?.();
    }, 1000);
  }

  return { init };
})();
