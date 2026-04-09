(function initMobileNav() {
  const nav = document.querySelector('nav');
  const logo = nav ? nav.querySelector('.nav-logo') : null;
  const links = nav ? nav.querySelector('.nav-links') : null;
  if (!nav || !logo || !links) return;


  const drawer = document.createElement('aside');
  drawer.className = 'mobile-nav-drawer';
  drawer.setAttribute('aria-hidden', 'true');
  const linkMarkup = Array.from(links.querySelectorAll('a'))
    .map(a => `<a href="${a.getAttribute('href') || '#'}">${a.textContent || ''}</a>`)
    .join('');
  drawer.innerHTML = `<a class="mobile-nav-brand" href="index.html">GRIT</a>${linkMarkup}`;

  const backdrop = document.createElement('div');
  backdrop.className = 'mobile-nav-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');

  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);

  function isMobileView() {
    return window.matchMedia('(max-width: 900px)').matches;
  }

  function closeMenu() {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.setAttribute('aria-hidden', 'true');
  }

  function toggleMenu() {
    const isOpen = drawer.classList.contains('open');
    if (isOpen) closeMenu();
    else {
      drawer.classList.add('open');
      backdrop.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      backdrop.setAttribute('aria-hidden', 'false');
    }
  }

  logo.addEventListener('click', (e) => {
    if (!isMobileView()) return;
    e.preventDefault();
    toggleMenu();
  });
  backdrop.addEventListener('click', closeMenu);
  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => {
    if (!isMobileView()) closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
})();

(function initJoinOptions() {
  const STORAGE_KEY = 'grit.joinSetup';
  const adGrid = document.getElementById('joinAdGrid');
  const form = document.getElementById('joinDetailsForm');
  const nameEl = document.getElementById('joinName');
  const emailEl = document.getElementById('joinEmail');
  const ageEl = document.getElementById('joinAge');
  const goalEl = document.getElementById('joinGoal');
  const motivationEl = document.getElementById('joinMotivation');
  const blockersEl = document.getElementById('joinBlockers');
  const promiseEl = document.getElementById('joinPromise');
  const msgEl = document.getElementById('joinResultMsg');
  if (!form || !emailEl) return;

  let selectedPath = 'web-portal';

  const params = new URLSearchParams(window.location.search);
  const emailFromQuery = params.get('email');
  if (emailFromQuery) emailEl.value = emailFromQuery;

  if (adGrid) {
    const cards = Array.from(adGrid.querySelectorAll('.join-ad-card'));
    cards.forEach(card => {
      card.addEventListener('click', () => {
        selectedPath = card.getAttribute('data-path') || 'web-portal';
        cards.forEach(c => c.classList.toggle('selected', c === card));
      });
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!promiseEl.checked) {
      msgEl.textContent = 'Please accept the promise to continue.';
      return;
    }

    const payload = {
      selectedPath,
      name: nameEl.value.trim(),
      email: emailEl.value.trim(),
      age: ageEl.value.trim(),
      goal: goalEl.value.trim(),
      motivation: motivationEl.value.trim(),
      blockers: blockersEl.value.trim(),
      promise: promiseEl.checked,
      savedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    msgEl.textContent = `Welcome ${payload.name || 'to GRIT'}! Your plan is saved. Redirecting to challenge setup...`;

    setTimeout(() => {
      window.location.href = 'index.html#challenge';
    }, 900);
  });
})();
