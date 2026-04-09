(function initMobileNav() {
  const nav = document.querySelector('nav');
  const logo = nav ? nav.querySelector('.nav-logo') : null;
  const links = nav ? nav.querySelector('.nav-links') : null;
  if (!nav || !logo || !links) return;

  const hamburger = document.createElement('button');
  hamburger.type = 'button';
  hamburger.className = 'nav-hamburger';
  hamburger.setAttribute('aria-label', 'Open menu');
  hamburger.textContent = '☰';
  nav.appendChild(hamburger);

  const drawer = document.createElement('aside');
  drawer.className = 'mobile-nav-drawer';
  drawer.setAttribute('aria-hidden', 'true');
  drawer.innerHTML = links.innerHTML;

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

  hamburger.addEventListener('click', (e) => {
    e.preventDefault();
    toggleMenu();
  });
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

(function initCalmBreathing() {
  const trigger = document.querySelector('.breathe-trigger');
  const panel = document.getElementById('breathPanel');
  const stopBtn = document.getElementById('breathStopBtn');
  const phaseEl = document.getElementById('breathPhase');
  const countEl = document.getElementById('breathCount');
  const cycleEl = document.getElementById('breathCycle');
  const elapsedEl = document.getElementById('breathElapsed');

  if (!trigger || !panel || !stopBtn || !phaseEl || !countEl || !cycleEl || !elapsedEl) return;

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

  // 4s inhale, 6s exhale
  const phases = [
    { label: 'INHALE', seconds: 4 },
    { label: 'EXHALE', seconds: 6 }
  ];
  let phaseIdx = 0;
  let secondsLeft = phases[0].seconds;
  let cycle = 1;
  let elapsed = 0;

  function pad2(n) {
    return n < 10 ? `0${n}` : String(n);
  }

  function render() {
    const label = phases[phaseIdx].label;
    phaseEl.textContent = label === 'INHALE' ? 'INHALE →' : 'EXHALE ←';
    countEl.textContent = String(secondsLeft);
    cycleEl.textContent = String(cycle);
    const mm = Math.floor(elapsed / 60);
    const ss = elapsed % 60;
    elapsedEl.textContent = `${pad2(mm)}:${pad2(ss)}`;

    panel.classList.toggle('inhale', label === 'INHALE');
    panel.classList.toggle('exhale', label === 'EXHALE');
  }

  function stopAudio() {
    if (tickTimer) clearInterval(tickTimer);
    if (secondTimer) clearInterval(secondTimer);
    tickTimer = null;
    secondTimer = null;

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
    stopAudio();
    panel.classList.remove('open');
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

    // Soft noise bed (serene air feel).
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

    // Gentle pulse for breathing rhythm.
    lfo = audioCtx.createOscillator();
    lfoGain = audioCtx.createGain();
    lfo.frequency.value = 0.06;
    lfoGain.gain.value = 0.008;
    lfo.connect(lfoGain);
    lfoGain.connect(gainNode.gain);
    lfo.start();
  }

  async function startAudio() {
    // Preferred: user-provided serene soundtrack file.
    sereneAudio = new Audio('assets/serene-horizons.mp3');
    sereneAudio.loop = true;
    sereneAudio.volume = 0.28;
    sereneAudio.preload = 'auto';
    try {
      await sereneAudio.play();
    } catch {
      // Fallback to generated ambient if browser blocks/asset unavailable.
      sereneAudio = null;
      startSynthAudio();
    }
  }

  function startSession() {
    stopAudio();

    phaseIdx = 0;
    secondsLeft = phases[0].seconds;
    cycle = 1;
    elapsed = 0;
    render();

    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    panel.classList.add('inhale');
    panel.classList.remove('exhale');

    startAudio();

    tickTimer = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        if (phaseIdx === 1) cycle += 1;
        phaseIdx = (phaseIdx + 1) % phases.length;
        secondsLeft = phases[phaseIdx].seconds;
      }
      render();
    }, 1000);

    secondTimer = setInterval(() => {
      elapsed += 1;
      render();
    }, 1000);
  }

  trigger.addEventListener('click', startSession);
  stopBtn.addEventListener('click', stopSession);
  panel.addEventListener('click', (e) => {
    if (e.target === panel) stopSession();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') stopSession();
  });
})();
