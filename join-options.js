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
