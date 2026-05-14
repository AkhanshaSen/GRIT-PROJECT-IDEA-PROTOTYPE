(function initMobileNav() {
  const nav = document.querySelector('nav');
  const logo = nav ? nav.querySelector('.nav-logo') : null;
  const links = nav ? nav.querySelector('.nav-links') : null;
  if (!nav || !logo || !links) return;

  const drawer = document.createElement('aside');
  drawer.className = 'mobile-nav-drawer';
  drawer.setAttribute('aria-hidden', 'true');
  const linksHTML = links.innerHTML;
  const logoMarkup = logo.outerHTML.replace('class="nav-logo"', 'class="nav-logo mobile-nav-brand"');
  drawer.innerHTML =
    `<div class="mobile-nav-header">` +
    `${logoMarkup}` +
    `<button class="mobile-nav-close" type="button" aria-label="Close menu">×</button>` +
    `</div>` +
    `<ul>${linksHTML}</ul>`;

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
  const closeBtn = drawer.querySelector('.mobile-nav-close');
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  backdrop.addEventListener('click', closeMenu);
  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => {
    if (!isMobileView()) closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
})();

(function initCalmBreathing() {
  const BREATH_KEY = 'grit.breathSessions';
  function readHist() {
    try {
      const x = JSON.parse(localStorage.getItem(BREATH_KEY) || '[]');
      return Array.isArray(x) ? x : [];
    } catch {
      return [];
    }
  }
  function pushHist(entry) {
    const arr = readHist();
    arr.push(entry);
    localStorage.setItem(BREATH_KEY, JSON.stringify(arr.slice(-50)));
    renderHist();
  }
  function isoLocal() {
    const d = new Date();
    const o = d.getTimezoneOffset() * 60000;
    return new Date(d - o).toISOString().slice(0, 10);
  }
  function renderHist() {
    const ul = document.getElementById('breathHistoryList');
    if (!ul) return;
    const rows = readHist().slice().reverse();
    ul.innerHTML = rows.length
      ? rows
          .map(r => {
            const iso = r.iso || r.date || '—';
            const label =
              r.pattern === 'calm'
                ? 'Calm 4-6'
                : r.pattern === 'box'
                  ? 'Box 4-4-4-4'
                  : r.pattern === 'n478'
                    ? '4-7-8'
                    : r.pattern === 'wim'
                      ? 'Wim Hof style'
                      : r.pattern;
            const dur = `${r.durationSec}s`;
            return (
              `<li class="breath-hist-row"><span class="breath-hist-date">${iso}</span>` +
              `<span class="breath-hist-pattern">${label}</span>` +
              `<span class="breath-hist-dur">${dur}</span></li>`
            );
          })
          .join('')
      : '<li class="breath-hist-empty">No sessions yet. Pick a pattern above.</li>';
  }
  renderHist();

  const PATTERNS = {
    calm: { phases: [{ label: 'INHALE', seconds: 4 }, { label: 'EXHALE', seconds: 6 }] },
    box: {
      phases: [
        { label: 'INHALE', seconds: 4 },
        { label: 'HOLD', seconds: 4 },
        { label: 'EXHALE', seconds: 4 },
        { label: 'HOLD', seconds: 4 }
      ]
    },
    n478: {
      phases: [
        { label: 'INHALE', seconds: 4 },
        { label: 'HOLD', seconds: 7 },
        { label: 'EXHALE', seconds: 8 }
      ]
    },
    wim: {
      phases: [
        { label: 'POWER', seconds: 30, power: true },
        { label: 'EXHALE & HOLD', seconds: 15 }
      ],
      repeat: 3
    }
  };

  const triggers = document.querySelectorAll('.breathe-trigger');
  const panel = document.getElementById('breathPanel');
  const stopBtn = document.getElementById('breathStopBtn');
  const phaseEl = document.getElementById('breathPhase');
  const countEl = document.getElementById('breathCount');
  const cycleEl = document.getElementById('breathCycle');
  const elapsedEl = document.getElementById('breathElapsed');

  if (!triggers.length || !panel || !stopBtn || !phaseEl || !countEl || !cycleEl || !elapsedEl) return;

  let audioCtx = null;
  let gainNode = null;
  let droneA = null;
  let droneB = null;
  let droneC = null;
  let lowpass = null;
  let noiseSource = null;
  let noiseFilter = null;
  let noiseGain = null;
  let lfo = null;
  let lfoGain = null;
  let sereneAudio = null;
  let tickTimer = null;
  let secondTimer = null;
  let prepTimer = null;

  let patternKey = 'calm';
  let phases = PATTERNS.calm.phases;
  let outerLeft = 1;
  let phaseIdx = 0;
  let secondsLeft = phases[0].seconds;
  let cycle = 1;
  let elapsed = 0;
  let sessionStart = 0;
  let powerToggle = false;

  function pad2(n) {
    return n < 10 ? `0${n}` : String(n);
  }

  function applyPhaseVisual() {
    const ph = phases[phaseIdx];
    panel.classList.remove('inhale', 'exhale', 'hold', 'power-in', 'power-out');
    if (ph.power) {
      panel.classList.add(powerToggle ? 'power-in' : 'power-out');
      return;
    }
    if (ph.label === 'INHALE') panel.classList.add('inhale');
    else if (ph.label === 'HOLD') panel.classList.add('hold');
    else panel.classList.add('exhale');
  }

  function render() {
    const ph = phases[phaseIdx];
    let labelText = ph.label;
    if (ph.label === 'INHALE') labelText = 'INHALE →';
    else if (ph.label === 'EXHALE') labelText = 'EXHALE ←';
    else if (ph.label === 'HOLD') labelText = 'HOLD ·';
    else if (ph.label === 'EXHALE & HOLD') labelText = 'EXHALE · HOLD';
    else if (ph.label === 'POWER') labelText = powerToggle ? 'POWER IN' : 'POWER OUT';
    phaseEl.textContent = labelText;
    countEl.textContent = String(secondsLeft);
    cycleEl.textContent = `${cycle} · r${outerLeft}`;
    const mm = Math.floor(elapsed / 60);
    const ss = elapsed % 60;
    elapsedEl.textContent = `${pad2(mm)}:${pad2(ss)}`;
    applyPhaseVisual();
  }

  function stopAudio() {
    if (tickTimer) clearInterval(tickTimer);
    if (secondTimer) clearInterval(secondTimer);
    if (prepTimer) clearInterval(prepTimer);
    tickTimer = null;
    secondTimer = null;
    prepTimer = null;

    if (sereneAudio) {
      sereneAudio.pause();
      sereneAudio.currentTime = 0;
      sereneAudio = null;
    }

    try {
      if (droneA) droneA.stop();
      if (droneB) droneB.stop();
      if (droneC) droneC.stop();
      if (noiseSource) noiseSource.stop();
      if (lfo) lfo.stop();
    } catch {}

    droneA = null;
    droneB = null;
    droneC = null;
    noiseSource = null;
    lfo = null;

    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
  }

  function stopSession() {
    if (sessionStart) {
      const sec = Math.max(1, Math.round((Date.now() - sessionStart) / 1000));
      pushHist({ iso: isoLocal(), pattern: patternKey, durationSec: sec });
      sessionStart = 0;
    }
    stopAudio();
    panel.classList.remove('open', 'inhale', 'exhale', 'hold', 'power-in', 'power-out');
    panel.setAttribute('aria-hidden', 'true');
  }

  function startSynthAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.018;

    lowpass = audioCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 520;

    droneA = audioCtx.createOscillator();
    droneA.type = 'sine';
    droneA.frequency.value = 196.0;

    droneB = audioCtx.createOscillator();
    droneB.type = 'sine';
    droneB.frequency.value = 293.66;

    droneC = audioCtx.createOscillator();
    droneC.type = 'sine';
    droneC.frequency.value = 392.0;

    droneA.connect(lowpass);
    droneB.connect(lowpass);
    droneC.connect(lowpass);
    lowpass.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    droneA.start();
    droneB.start();
    droneC.start();

    const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.12;
    }
    noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 320;
    noiseGain = audioCtx.createGain();
    noiseGain.gain.value = 0.006;
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(gainNode);
    noiseSource.start();

    lfo = audioCtx.createOscillator();
    lfoGain = audioCtx.createGain();
    lfo.frequency.value = 0.06;
    lfoGain.gain.value = 0.008;
    lfo.connect(lfoGain);
    lfoGain.connect(gainNode.gain);
    lfo.start();
  }

  async function startAudio() {
    sereneAudio = new Audio('assets/serene-horizons.mp3');
    sereneAudio.loop = true;
    sereneAudio.volume = 0.28;
    sereneAudio.preload = 'auto';
    try {
      await sereneAudio.play();
    } catch {
      sereneAudio = null;
      startSynthAudio();
    }
  }

  function startSession(key) {
    stopAudio();
    patternKey = key && PATTERNS[key] ? key : 'calm';
    const def = PATTERNS[patternKey];
    phases = def.phases;
    outerLeft = def.repeat != null ? def.repeat : 999999;

    phaseIdx = 0;
    secondsLeft = phases[0].seconds;
    cycle = 1;
    elapsed = 0;
    powerToggle = false;
    sessionStart = Date.now();

    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    panel.classList.remove('inhale', 'exhale', 'hold', 'power-in', 'power-out');

    let prep = 5;
    phaseEl.textContent = 'Relax. Sync with the circle.';
    countEl.textContent = String(prep);
    cycleEl.textContent = '0';
    elapsedEl.textContent = '00:00';

    prepTimer = setInterval(() => {
      prep -= 1;
      if (prep <= 0) {
        clearInterval(prepTimer);
        prepTimer = null;

        render();
        startAudio();

        tickTimer = setInterval(() => {
          const ph = phases[phaseIdx];
          if (ph.power) powerToggle = !powerToggle;

          secondsLeft -= 1;
          if (secondsLeft > 0) {
            render();
            return;
          }

          if (phaseIdx >= phases.length - 1) {
            outerLeft -= 1;
            cycle += 1;
            if (outerLeft <= 0) {
              stopSession();
              return;
            }
            phaseIdx = 0;
          } else {
            phaseIdx += 1;
          }
          secondsLeft = phases[phaseIdx].seconds;
          powerToggle = false;
          render();
        }, 1000);

        secondTimer = setInterval(() => {
          elapsed += 1;
          render();
        }, 1000);
        return;
      }
      countEl.textContent = String(prep);
    }, 1000);
  }

  triggers.forEach(t => {
    t.addEventListener('click', () => {
      const k = t.getAttribute('data-pattern') || 'calm';
      startSession(k);
    });
  });
  stopBtn.addEventListener('click', stopSession);
  panel.addEventListener('click', e => {
    if (e.target === panel) stopSession();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') stopSession();
  });
})();
