/* ============================================================
   GRIT — main.js
   Habit tracker · Interest quiz · Mantra engine · Scroll reveal
   ============================================================ */

/* ── STORAGE + DATE HELPERS ── */
const STORAGE = {
  habitDoneByDate: 'grit.habitDoneByDate',
  habitCompletionByDate: 'grit.habitCompletionByDate',
  quizState: 'grit.quizState',
  selectedChallenge: 'grit.selectedChallenge',
  joinedEmail: 'grit.joinedEmail',
  challengeDayPrefix: 'grit.challengeDay.',
  coachEntryPrefix: 'grit.coachEntry.'
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function challengeDayKey(challengeDays) {
  return `${STORAGE.challengeDayPrefix}${challengeDays}`;
}

function readChallengeDay(challengeDays) {
  const raw = localStorage.getItem(challengeDayKey(challengeDays));
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function writeChallengeDay(challengeDays, day) {
  localStorage.setItem(challengeDayKey(challengeDays), String(day));
}

function coachEntryKey(challengeDays) {
  return `${STORAGE.coachEntryPrefix}${challengeDays}`;
}

function readCoachEntry(challengeDays) {
  return readJSON(coachEntryKey(challengeDays), null);
}

function writeCoachEntry(challengeDays, entry) {
  writeJSON(coachEntryKey(challengeDays), entry);
}

function isoLocalDate(d) {
  const tzOffsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d - tzOffsetMs).toISOString().slice(0, 10);
}

function getLocalISODate() {
  return isoLocalDate(new Date());
}

function shiftISODate(isoDate, days) {
  const [y, m, day] = isoDate.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  d.setDate(d.getDate() + days);
  return isoLocalDate(d);
}

/* ── HABIT STREAK MODEL (localStorage-backed) ── */
const habitDoneByDate = readJSON(STORAGE.habitDoneByDate, {});
const habitCompletionByDate = readJSON(STORAGE.habitCompletionByDate, {});

function ensureStreakSeed() {
  if (Object.keys(habitCompletionByDate).length > 0) return;
  const today = getLocalISODate();
  // Seed: 7-day streak ending yesterday (today not completed).
  for (let back = 1; back <= 7; back++) {
    habitCompletionByDate[shiftISODate(today, -back)] = true;
  }
  habitCompletionByDate[today] = false;
  writeJSON(STORAGE.habitCompletionByDate, habitCompletionByDate);
}

function computeStreakCount() {
  const today = getLocalISODate();
  let cursor = habitCompletionByDate[today] ? today : shiftISODate(today, -1);
  let count = 0;
  while (habitCompletionByDate[cursor]) {
    count++;
    cursor = shiftISODate(cursor, -1);
    if (count >= 365) break; // hard safety cap
  }
  return count;
}

function renderStreakDots(streakCount) {
  const container = document.getElementById('streakDots');
  if (!container) return;
  container.innerHTML = '';

  const totalDots = 10;
  const filled = Math.min(streakCount, totalDots);
  for (let i = 0; i < totalDots; i++) {
    const dot = document.createElement('div');
    const done = i < filled;
    dot.className = 'dot' + (done ? (i < 7 ? ' done' : ' active') : '');
    container.appendChild(dot);
  }
}

function renderStreakCount(streakCount) {
  const streakEl = document.getElementById('streakCount');
  if (!streakEl) return;
  streakEl.textContent = `${streakCount} 🔥`;
}

/* ── HERO TASK TEXT (adaptive without visual changes) ── */
const todayTaskEl = document.querySelector('.today-task');
const baseTodayTaskText = todayTaskEl ? todayTaskEl.textContent : '';
let selectedChallenge = readJSON(STORAGE.selectedChallenge, null);
let todayCompletionAll = false;

const CHALLENGE_STORY_BY_DAYS = {
  7: {
    promptStart: 'Start small. Show up anyway.',
    promptMid: 'Halfway is where discipline turns into identity.',
    promptLate: 'Protect the streak. One more rep.',
    promptEnd: 'You finished. Now keep the identity alive.',
    milestones: [
      "Day 1: Start before you're ready.",
      'Day 4: The urge to quit is your signal to go.',
      'Day 7: You proved you can show up.'
    ]
  },
  21: {
    promptStart: 'Lock in the system. Not just the motivation.',
    promptMid: 'The middle is where growth gets real. Stay there.',
    promptLate: 'Stack the last days. Momentum is already yours.',
    promptEnd: 'You built the routine. Keep it rolling.',
    milestones: [
      'Day 1: Make it repeatable.',
      'Day 11: Discipline feels better than excuses.',
      'Day 21: Your habits now run your life.'
    ]
  },
  30: {
    promptStart: 'Do the hard thing. Then do 5 more.',
    promptMid: 'This is The Dip. Lean in. Keep showing up.',
    promptLate: 'You are stronger than the discomfort you feel.',
    promptEnd: 'Completed. Your future self is watching.',
    milestones: [
      'Day 1: Begin messy, not perfect.',
      'Day 16: Compounding beats intensity.',
      'Day 30: You can grind when it matters.'
    ]
  },
  66: {
    promptStart: 'Small decisions. Big transformation.',
    promptMid: 'Identity is built in the boring days you repeat.',
    promptLate: 'You are becoming someone who does not quit.',
    promptEnd: '66 days done. Now protect your identity.',
    milestones: [
      'Day 1: Willpower runs out. Identity stays.',
      'Day 34: Make the habit your default.',
      'Day 66: You are the proof.'
    ]
  },
  default: {
    promptStart: 'Keep showing up.',
    promptMid: 'Small wins stack into momentum.',
    promptLate: 'One more rep.',
    promptEnd: 'Completed. Keep going.',
    milestones: ['Day 1: Start.', 'Day 1: Stay consistent.', 'Finish: Keep your identity.']
  }
};

function celebrateJourney(message) {
  const card = document.querySelector('#journey-story .mantra-display');
  const promptEl = document.getElementById('journeyPrompt');
  if (!card || !promptEl) return;

  const prev = promptEl.textContent;
  promptEl.textContent = message;

  card.classList.add('journey-celebrate');
  setTimeout(() => {
    card.classList.remove('journey-celebrate');
    // Only restore if we haven't been updated again meanwhile.
    if (promptEl.textContent === message) promptEl.textContent = prev;
  }, 1400);
}

function computeCoachMode(entry, challengeDay, challengeDays) {
  const dayRatio = challengeDays > 0 ? challengeDay / challengeDays : 0;
  const meter = Number(entry.challengeMeter);
  const winImpact = Number(entry.winImpact);

  if (
    entry.mood === 'drained' ||
    meter >= 8 ||
    entry.obstacle === 'energy' ||
    (entry.supportSystem === 'self' && dayRatio < 0.2)
  ) return 'Recover';

  if (
    entry.mood === 'locked-in' ||
    meter <= 3 ||
    dayRatio >= 0.7 ||
    winImpact >= 4 ||
    entry.trigger === 'discipline'
  ) return 'Push';

  return 'Steady';
}

function getCoachAdvice(mode) {
  if (mode === 'Push') {
    return 'You have momentum. Take one hard action in the next 30 minutes and protect your focus.';
  }
  if (mode === 'Recover') {
    return 'Lower the friction: do the smallest meaningful rep, reset, and rebuild your rhythm.';
  }
  return 'Stay consistent. Stack one clean win now, then repeat the same standard tomorrow.';
}

function getCoachCelebration(mode) {
  if (mode === 'Push') return 'Push Mode active. Attack your next rep.';
  if (mode === 'Recover') return 'Recover Mode active. Reset and stay in the game.';
  return 'Steady Mode active. Consistency is your advantage.';
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);

  // Mobile/webview fallback where `download` may be ignored.
  setTimeout(() => {
    if (document.visibilityState === 'visible') {
      window.open(url, '_blank');
    }
  }, 120);
}

function buildCoachTextSummary(challengeTitle, challengeDays, entry, dayValue, mode) {
  const lines = [
    `GRIT Challenge Summary`,
    `Challenge: ${challengeTitle} (${challengeDays} days)`,
    `Day: ${dayValue || 'not set'}`,
    `Coach Mode: ${mode}`,
    `Saved At: ${entry.savedAt || new Date().toISOString()}`,
    ''
  ];

  if (entry.mood) lines.push(`Mood: ${entry.mood}`);
  if (entry.motivation) lines.push(`Motivation: ${entry.motivation}`);
  if (entry.challengeMeter !== undefined && entry.challengeMeter !== null) lines.push(`Challenge Meter: ${entry.challengeMeter}/10`);
  if (entry.challengeCause) lines.push(`Challenge Cause: ${entry.challengeCause}`);
  if (entry.trigger) lines.push(`Trigger: ${entry.trigger}`);
  if (entry.obstacle) lines.push(`Obstacle: ${entry.obstacle}`);
  if (entry.supportSystem) lines.push(`Support System: ${entry.supportSystem}`);
  if (entry.winImpact !== undefined && entry.winImpact !== null) lines.push(`Win Impact: ${entry.winImpact}/5`);
  if (entry.reflection) lines.push(`Reflection: ${entry.reflection}`);
  if (Array.isArray(entry.wins) && entry.wins.length > 0) {
    lines.push('Wins:');
    entry.wins.forEach((w, i) => lines.push(`  ${i + 1}. ${w}`));
  }

  lines.push('', `Coach Advice: ${getCoachAdvice(mode)}`);
  return lines.join('\n');
}

function updateChallengeProgress(streakCount) {
  const journeySection = document.getElementById('journey-story');
  if (!journeySection) return;

  const daysStr = document.body && document.body.dataset ? document.body.dataset.challengeDays : null;
  const challengeDays = Number(daysStr);
  if (!challengeDays || !Number.isFinite(challengeDays)) return;

  const dayTitleEl = document.getElementById('journeyDayTitle');
  const promptEl = document.getElementById('journeyPrompt');
  const progressCountEl = document.getElementById('journeyProgressCount');
  const dotsEl = document.getElementById('journeyDots');
  const hintEl = document.getElementById('challengeDayHint');

  const m1 = document.getElementById('journeyMilestone1');
  const m2 = document.getElementById('journeyMilestone2');
  const m3 = document.getElementById('journeyMilestone3');

  if (!dayTitleEl || !promptEl || !progressCountEl || !dotsEl) return;

  const savedDay = readChallengeDay(challengeDays);
  const completed = savedDay === null ? 0 : Math.max(0, Math.min(savedDay, challengeDays));
  const ratio = challengeDays === 0 ? 0 : completed / challengeDays;

  const currentDay = savedDay === null ? 1 : Math.min(completed, challengeDays);
  dayTitleEl.textContent = `DAY ${currentDay} OF ${challengeDays}`;
  progressCountEl.textContent = `${completed} / ${challengeDays}`;

  const copy = CHALLENGE_STORY_BY_DAYS[challengeDays] || CHALLENGE_STORY_BY_DAYS.default;
  let prompt = copy.promptStart;
  if (savedDay === null) {
    prompt = 'Tell us what day you are on to start celebrating your progress.';
  } else if (completed >= challengeDays) {
    prompt = copy.promptEnd;
  } else if (ratio < 0.34) {
    prompt = copy.promptStart;
  } else if (ratio < 0.67) {
    prompt = copy.promptMid;
  } else {
    prompt = copy.promptLate;
  }

  promptEl.textContent = prompt;

  if (m1) m1.textContent = copy.milestones[0] || '';
  if (m2) m2.textContent = copy.milestones[1] || '';
  if (m3) m3.textContent = copy.milestones[2] || '';

  if (hintEl) {
    hintEl.textContent =
      savedDay === null
        ? 'Set your day once, then come back daily to keep leveling up.'
        : `Saved: Day ${Math.min(Math.max(savedDay, 1), challengeDays)}. Update anytime.`;
  }

  const totalDots = 10;
  const doneDots = Math.floor(ratio * totalDots);

  dotsEl.innerHTML = '';
  for (let i = 0; i < totalDots; i++) {
    const dot = document.createElement('div');
    const isDone = i < doneDots;
    const isActive = i === doneDots && completed < challengeDays;
    dot.className =
      'dot' +
      (isDone ? ' done' : '') +
      (isActive ? ' active' : '');
    dotsEl.appendChild(dot);
  }
}

function initChallengePage() {
  const journeySection = document.getElementById('journey-story');
  if (!journeySection) return;

  const daysStr = document.body && document.body.dataset ? document.body.dataset.challengeDays : null;
  const challengeDays = Number(daysStr);
  if (!challengeDays || !Number.isFinite(challengeDays)) return;

  const pageTitle = (document.body && document.body.dataset && document.body.dataset.challengeTitle) ? document.body.dataset.challengeTitle : '';

  if (!selectedChallenge || String(selectedChallenge.days) !== String(challengeDays)) {
    selectedChallenge = {
      title: pageTitle || 'your challenge',
      days: String(challengeDays),
      tag: selectedChallenge && selectedChallenge.tag ? selectedChallenge.tag : ''
    };
    writeJSON(STORAGE.selectedChallenge, selectedChallenge);
  }

  const dayInput = document.getElementById('challengeDayInput');
  const saveBtn = document.getElementById('challengeDaySave');
  const coachSaveBtn = document.getElementById('coachSaveBtn');
  const exportSummaryBtn = document.getElementById('exportSummaryBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');

  const coachModeEl = document.getElementById('coachMode');
  const coachAdviceEl = document.getElementById('coachAdvice');

  const moodButtons = Array.from(document.querySelectorAll('[data-mood]'));
  const triggerButtons = Array.from(document.querySelectorAll('[data-trigger]'));
  const obstacleButtons = Array.from(document.querySelectorAll('[data-obstacle]'));
  const supportButtons = Array.from(document.querySelectorAll('[data-support]'));
  const motivationInput = document.getElementById('motivationInput');
  const challengeMeterInput = document.getElementById('challengeMeterInput');
  const challengeMeterValue = document.getElementById('challengeMeterValue');
  const challengeCauseInput = document.getElementById('challengeCauseInput');
  const reflectionInput = document.getElementById('reflectionInput');
  const winInput = document.getElementById('winInput');
  const winImpactInput = document.getElementById('winImpactInput');
  const winImpactValue = document.getElementById('winImpactValue');
  const winsList = document.getElementById('winsList');
  const chooseAnotherTrigger = document.querySelector('.choose-another-trigger');
  const carouselModal = document.getElementById('challengeCarouselModal');
  const carouselCloseBtn = document.querySelector('.challenge-carousel-close');
  const carouselTrack = document.getElementById('challengeCarouselTrack');
  const carouselPrevBtn = document.getElementById('carouselPrevBtn');
  const carouselNextBtn = document.getElementById('carouselNextBtn');

  let selectedMood = null;
  let selectedTrigger = null;
  let selectedObstacle = null;
  let selectedSupport = null;
  let coachEntry = readCoachEntry(challengeDays) || {};

  function renderWins(list) {
    if (!winsList) return;
    winsList.innerHTML = '';
    const wins = Array.isArray(list) ? list.slice(-3).reverse() : [];
    if (wins.length === 0) {
      winsList.innerHTML = '<div class="mantra-card">No wins logged yet. Add your first one today.</div>';
      return;
    }
    wins.forEach(w => {
      const card = document.createElement('div');
      card.className = 'mantra-card';
      card.textContent = w;
      winsList.appendChild(card);
    });
  }

  function renderCoachOutcome() {
    if (!coachModeEl || !coachAdviceEl) return;
    const challengeDay = readChallengeDay(challengeDays) || 1;
    const mode = computeCoachMode(coachEntry, challengeDay, challengeDays);
    coachModeEl.textContent = `${mode.toUpperCase()} MODE`;
    coachAdviceEl.textContent = getCoachAdvice(mode);
  }

  function selectMood(mood) {
    selectedMood = mood;
    moodButtons.forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-mood') === mood);
    });
  }

  function selectTrigger(trigger) {
    selectedTrigger = trigger;
    triggerButtons.forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-trigger') === trigger);
    });
  }

  function selectObstacle(obstacle) {
    selectedObstacle = obstacle;
    obstacleButtons.forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-obstacle') === obstacle);
    });
  }

  function selectSupport(support) {
    selectedSupport = support;
    supportButtons.forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-support') === support);
    });
  }

  if (dayInput) {
    dayInput.min = '1';
    dayInput.max = String(challengeDays);
  }

  const existing = readChallengeDay(challengeDays);
  if (existing !== null && dayInput) dayInput.value = String(existing);

  if (motivationInput && coachEntry.motivation) motivationInput.value = coachEntry.motivation;
  if (challengeMeterInput && coachEntry.challengeMeter !== undefined) {
    challengeMeterInput.value = String(coachEntry.challengeMeter);
  }
  if (challengeMeterValue && challengeMeterInput) {
    challengeMeterValue.textContent = String(challengeMeterInput.value || '5');
  }
  if (challengeCauseInput && coachEntry.challengeCause) challengeCauseInput.value = coachEntry.challengeCause;
  if (reflectionInput && coachEntry.reflection) reflectionInput.value = coachEntry.reflection;
  if (coachEntry.mood) selectMood(coachEntry.mood);
  if (coachEntry.trigger) selectTrigger(coachEntry.trigger);
  if (coachEntry.obstacle) selectObstacle(coachEntry.obstacle);
  if (coachEntry.supportSystem) selectSupport(coachEntry.supportSystem);
  if (winImpactInput && coachEntry.winImpact !== undefined) winImpactInput.value = String(coachEntry.winImpact);
  if (winImpactValue && winImpactInput) winImpactValue.textContent = String(winImpactInput.value || '3');
  renderWins(coachEntry.wins);
  renderCoachOutcome();

  moodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectMood(btn.getAttribute('data-mood'));
    });
  });

  triggerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectTrigger(btn.getAttribute('data-trigger'));
    });
  });

  obstacleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectObstacle(btn.getAttribute('data-obstacle'));
    });
  });

  supportButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectSupport(btn.getAttribute('data-support'));
    });
  });

  if (challengeMeterInput && challengeMeterValue) {
    challengeMeterInput.addEventListener('input', () => {
      challengeMeterValue.textContent = String(challengeMeterInput.value);
    });
  }

  if (winImpactInput && winImpactValue) {
    winImpactInput.addEventListener('input', () => {
      winImpactValue.textContent = String(winImpactInput.value);
    });
  }

  function saveDay() {
    if (!dayInput) return;
    const raw = dayInput.value.trim();
    const day = Number(raw);

    if (!Number.isFinite(day) || day < 1 || day > challengeDays) {
      celebrateJourney(`Pick a day between 1 and ${challengeDays}. You got this.`);
      return;
    }

    const prev = readChallengeDay(challengeDays);
    writeChallengeDay(challengeDays, day);
    updateChallengeProgress(computeStreakCount());

    const mid = Math.ceil(challengeDays / 2);
    const isFirstSave = prev === null;
    const isMilestone = day === 1 || day === mid || day === challengeDays;

    if (isFirstSave) {
      celebrateJourney(`Locked in: Day ${day}. Welcome to ${pageTitle || 'your challenge'}.`);
    } else if (day === challengeDays) {
      celebrateJourney('Finished. That is discipline. That is GRIT.');
    } else if (day === mid) {
      celebrateJourney("Halfway. That's where most people quit. Not you.");
    } else if (day === 1) {
      celebrateJourney('Day 1. Start before you feel ready.');
    } else if (isMilestone) {
      celebrateJourney(`Day ${day}. Keep stacking wins.`);
    } else {
      celebrateJourney(`Saved: Day ${day}. Keep going.`);
    }
  }

  function saveCoachEntry() {
    const dayVal = readChallengeDay(challengeDays);
    if (dayVal === null) {
      celebrateJourney('Set your challenge day first, then save your check-in.');
      return;
    }

    const wins = Array.isArray(coachEntry.wins) ? [...coachEntry.wins] : [];
    if (winInput && winInput.value.trim()) {
      wins.push(winInput.value.trim());
      winInput.value = '';
    }

    coachEntry = {
      ...coachEntry,
      mood: selectedMood || coachEntry.mood || null,
      trigger: selectedTrigger || coachEntry.trigger || null,
      obstacle: selectedObstacle || coachEntry.obstacle || null,
      supportSystem: selectedSupport || coachEntry.supportSystem || null,
      motivation: motivationInput ? motivationInput.value.trim() : (coachEntry.motivation || ''),
      challengeMeter: challengeMeterInput ? Number(challengeMeterInput.value) : coachEntry.challengeMeter,
      challengeCause: challengeCauseInput ? challengeCauseInput.value.trim() : (coachEntry.challengeCause || ''),
      winImpact: winImpactInput ? Number(winImpactInput.value) : coachEntry.winImpact,
      reflection: reflectionInput ? reflectionInput.value.trim() : (coachEntry.reflection || ''),
      wins,
      day: dayVal,
      challengeDays,
      challengeTitle: pageTitle || selectedChallenge.title || 'Challenge',
      savedAt: new Date().toISOString()
    };

    writeCoachEntry(challengeDays, coachEntry);
    renderWins(coachEntry.wins);
    renderCoachOutcome();

    const mode = computeCoachMode(coachEntry, dayVal, challengeDays);
    celebrateJourney(getCoachCelebration(mode));
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      saveDay();
    });
  }
  if (dayInput) {
    dayInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveDay();
      }
    });
  }

  if (coachSaveBtn) {
    coachSaveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      saveCoachEntry();
    });
  }

  if (exportSummaryBtn) {
    exportSummaryBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const entry = readCoachEntry(challengeDays);
      if (!entry) {
        celebrateJourney('Save one check-in first, then export.');
        return;
      }
      const dayVal = readChallengeDay(challengeDays);
      const mode = computeCoachMode(entry, dayVal || 1, challengeDays);
      const text = buildCoachTextSummary(pageTitle || 'Challenge', challengeDays, entry, dayVal, mode);
      downloadFile(`grit-${challengeDays}-day-summary.txt`, text, 'text/plain;charset=utf-8');
      celebrateJourney('Summary exported.');
    });
  }

  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const entry = readCoachEntry(challengeDays);
      if (!entry) {
        celebrateJourney('Save one check-in first, then export.');
        return;
      }
      const payload = {
        ...entry,
        day: readChallengeDay(challengeDays),
        exportedAt: new Date().toISOString()
      };
      downloadFile(`grit-${challengeDays}-day-data.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
      celebrateJourney('JSON exported.');
    });
  }

  function openCarousel() {
    if (!carouselModal) return;
    carouselModal.classList.add('open');
    carouselModal.setAttribute('aria-hidden', 'false');
  }

  function closeCarousel() {
    if (!carouselModal) return;
    carouselModal.classList.remove('open');
    carouselModal.setAttribute('aria-hidden', 'true');
  }

  if (chooseAnotherTrigger) {
    chooseAnotherTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      openCarousel();
    });
  }

  if (carouselCloseBtn) {
    carouselCloseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeCarousel();
    });
  }

  if (carouselModal) {
    carouselModal.addEventListener('click', (e) => {
      if (e.target === carouselModal) closeCarousel();
    });
  }

  if (carouselTrack && carouselPrevBtn && carouselNextBtn) {
    function scrollCards(direction) {
      const amount = Math.round(carouselTrack.clientWidth * 0.65) * direction;
      carouselTrack.scrollBy({ left: amount, behavior: 'smooth' });
    }
    carouselPrevBtn.addEventListener('click', () => scrollCards(-1));
    carouselNextBtn.addEventListener('click', () => scrollCards(1));
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCarousel();
  });

  // Ensure the hero task text matches the current challenge page.
  renderTodayTask();
  updateChallengeProgress(computeStreakCount());
}

function renderTodayTask() {
  if (!todayTaskEl) return;
  if (todayCompletionAll) {
    todayTaskEl.textContent =
      'You did the reps. Do 5 more when you feel like stopping. That\'s where growth lives.';
    return;
  }
  if (selectedChallenge && selectedChallenge.title) {
    todayTaskEl.textContent =
      `For your ${selectedChallenge.title}: keep showing up today. Small wins stack into momentum.`;
    return;
  }
  todayTaskEl.textContent = baseTodayTaskText;
}

/* ── HABIT TRACKER ── */
let habitItems = [];

function persistHabitTodayState() {
  const today = getLocalISODate();
  const doneArr = habitItems.map(item => item.classList.contains('done'));
  habitDoneByDate[today] = doneArr;

  const completionAll = doneArr.every(Boolean);
  habitCompletionByDate[today] = completionAll;

  writeJSON(STORAGE.habitDoneByDate, habitDoneByDate);
  writeJSON(STORAGE.habitCompletionByDate, habitCompletionByDate);
  todayCompletionAll = completionAll;
}

function updateStreak() {
  const streakCount = computeStreakCount();
  renderStreakDots(streakCount);
  renderStreakCount(streakCount);
  renderTodayTask();
  updateChallengeProgress(streakCount);
}

function initHabitTracker() {
  habitItems = Array.from(document.querySelectorAll('.habit-item'));
  if (habitItems.length === 0) return;

  // Keep the check glyph stable; "done" is communicated by color + strikethrough.
  habitItems.forEach(item => {
    const check = item.querySelector('.habit-check');
    if (check) check.textContent = '✓';
  });

  const today = getLocalISODate();
  ensureStreakSeed();

  const savedDoneArr = habitDoneByDate[today];
  let doneArr;
  if (Array.isArray(savedDoneArr) && savedDoneArr.length === habitItems.length) {
    doneArr = savedDoneArr.map(Boolean);
  } else {
    doneArr = new Array(habitItems.length).fill(false);
  }

  habitItems.forEach((item, i) => {
    item.classList.toggle('done', Boolean(doneArr[i]));
  });

  todayCompletionAll = doneArr.every(Boolean);
  habitCompletionByDate[today] = todayCompletionAll;
  writeJSON(STORAGE.habitCompletionByDate, habitCompletionByDate);

  updateStreak();
}

function toggleHabit(el) {
  el.classList.toggle('done');
  persistHabitTodayState();
  updateStreak();
}

// Run habit init once DOM is available (this script is loaded at the end of body).
initHabitTracker();
initChallengePage();

/* ── INTEREST FINDER QUIZ ── */
const answers = {};

const QUIZ_TOPICS = {
  performance: {
    label: 'Performance & fitness',
    questions: [
      {
        key: 'q1',
        q: 'Where do you feel most alive?',
        hint: 'Pick the environment that lights you up',
        options: [
          { icon: '🏋️', text: 'During hard training and physical challenge', val: 'athlete' },
          { icon: '🧩', text: 'While solving technical or strategic problems', val: 'builder' },
          { icon: '🎨', text: 'When creating original moves, routines, or style', val: 'creator' },
          { icon: '🤝', text: 'When helping teammates level up together', val: 'connector' }
        ]
      },
      {
        key: 'q2',
        q: 'What kind of rep feels the most rewarding?',
        hint: 'Think about what you would repeat daily',
        options: [
          { icon: '🥇', text: 'Tracking numbers and beating personal bests', val: 'athlete' },
          { icon: '📊', text: 'Systemizing routines and optimizing progress', val: 'builder' },
          { icon: '🎬', text: 'Experimenting with style and expression', val: 'creator' },
          { icon: '👏', text: 'Motivating others to keep showing up', val: 'connector' }
        ]
      },
      {
        key: 'q3',
        q: 'What win would make you proud this season?',
        hint: 'Choose the outcome you care about most',
        options: [
          { icon: '🏆', text: 'Compete and perform at a higher level', val: 'athlete' },
          { icon: '🛠', text: 'Build a strong training system that works', val: 'builder' },
          { icon: '🔥', text: 'Develop a unique style and signature', val: 'creator' },
          { icon: '🤝', text: 'Inspire your group to become more disciplined', val: 'connector' }
        ]
      }
    ]
  },
  career: {
    label: 'Career & business',
    questions: [
      {
        key: 'q1',
        q: 'What challenge excites you most at work?',
        hint: 'Choose the one you naturally move toward',
        options: [
          { icon: '🚀', text: 'Hitting ambitious targets under pressure', val: 'athlete' },
          { icon: '🧠', text: 'Building systems, products, or operations', val: 'builder' },
          { icon: '🎯', text: 'Crafting ideas that stand out from noise', val: 'creator' },
          { icon: '🤝', text: 'Leading people and improving team culture', val: 'connector' }
        ]
      },
      {
        key: 'q2',
        q: 'When you have free time, what do you improve first?',
        hint: 'Your default focus says a lot',
        options: [
          { icon: '⏱', text: 'Execution speed and consistency', val: 'athlete' },
          { icon: '🧱', text: 'Process quality and long-term leverage', val: 'builder' },
          { icon: '💡', text: 'Storytelling, brand, and original thinking', val: 'creator' },
          { icon: '🗣', text: 'Communication, influence, and mentoring', val: 'connector' }
        ]
      },
      {
        key: 'q3',
        q: 'Which career result feels most meaningful?',
        hint: 'Pick the impact you want to leave',
        options: [
          { icon: '🏅', text: 'Be known for elite performance', val: 'athlete' },
          { icon: '🏗', text: 'Ship work that scales beyond you', val: 'builder' },
          { icon: '✨', text: 'Create bold ideas people remember', val: 'creator' },
          { icon: '🌍', text: 'Grow people and make teams stronger', val: 'connector' }
        ]
      }
    ]
  },
  creativity: {
    label: 'Creativity & expression',
    questions: [
      {
        key: 'q1',
        q: 'What kind of creative work pulls you in?',
        hint: 'Follow what feels effortless',
        options: [
          { icon: '🥊', text: 'Performance-heavy craft with discipline', val: 'athlete' },
          { icon: '🧰', text: 'Design systems and technical craft', val: 'builder' },
          { icon: '🎨', text: 'Pure artistic expression and originality', val: 'creator' },
          { icon: '🎤', text: 'Collaborative storytelling with people', val: 'connector' }
        ]
      },
      {
        key: 'q2',
        q: 'How do you usually turn ideas into output?',
        hint: 'Pick your natural making style',
        options: [
          { icon: '📆', text: 'By strict routine and daily reps', val: 'athlete' },
          { icon: '🧩', text: 'By building frameworks and structure', val: 'builder' },
          { icon: '🌈', text: 'By experimenting and following instinct', val: 'creator' },
          { icon: '🫶', text: 'By co-creating with feedback from others', val: 'connector' }
        ]
      },
      {
        key: 'q3',
        q: 'What result would feel like your breakthrough?',
        hint: 'Choose the one that gives you chills',
        options: [
          { icon: '🏁', text: 'Completing a demanding body-of-work challenge', val: 'athlete' },
          { icon: '🛠', text: 'Shipping a repeatable creative system', val: 'builder' },
          { icon: '🌟', text: 'Publishing work that feels fully yours', val: 'creator' },
          { icon: '💬', text: 'Touching lives through your message', val: 'connector' }
        ]
      }
    ]
  },
  leadership: {
    label: 'Leadership & impact',
    questions: [
      {
        key: 'q1',
        q: 'What leadership moment motivates you most?',
        hint: 'Pick the one you want more of',
        options: [
          { icon: '⚔️', text: 'Stepping up in high-pressure moments', val: 'athlete' },
          { icon: '🗺', text: 'Designing better systems for the team', val: 'builder' },
          { icon: '🎤', text: 'Casting vision that moves people', val: 'creator' },
          { icon: '🤲', text: 'Helping others grow with care and trust', val: 'connector' }
        ]
      },
      {
        key: 'q2',
        q: 'What do people thank you for most often?',
        hint: 'Use real feedback from your circle',
        options: [
          { icon: '🔥', text: 'Your drive, discipline, and standards', val: 'athlete' },
          { icon: '🧱', text: 'Your clarity and dependable systems', val: 'builder' },
          { icon: '💫', text: 'Your original ideas and inspiration', val: 'creator' },
          { icon: '❤️', text: 'Your empathy and support', val: 'connector' }
        ]
      },
      {
        key: 'q3',
        q: 'What impact do you want to be remembered for?',
        hint: 'Choose your long-game outcome',
        options: [
          { icon: '🏆', text: 'Building a culture of elite execution', val: 'athlete' },
          { icon: '🏗', text: 'Leaving systems that outlast you', val: 'builder' },
          { icon: '🕯', text: 'Igniting vision and belief in others', val: 'creator' },
          { icon: '🌱', text: 'Raising people who thrive because of you', val: 'connector' }
        ]
      }
    ]
  }
};

function selectOpt(el, key, val) {
  el.closest('.quiz-options')
    .querySelectorAll('.quiz-opt')
    .forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  answers[key] = val;
  saveQuizState();
}

function selectQuizTopic(el, topic) {
  el.closest('.quiz-options')
    .querySelectorAll('.quiz-opt')
    .forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  answers.topic = topic;
  delete answers.q1;
  delete answers.q2;
  delete answers.q3;
  renderQuizForTopic(topic);
  saveQuizState();
}

function renderQuizForTopic(topic) {
  const activeTopic = QUIZ_TOPICS[topic] ? topic : 'performance';
  const topicConfig = QUIZ_TOPICS[activeTopic];
  topicConfig.questions.forEach((question, idx) => {
    const stepEl = document.getElementById(`step${idx + 1}`);
    if (!stepEl) return;
    const qEl = stepEl.querySelector('.quiz-q');
    const hintEl = stepEl.querySelector('.quiz-hint');
    const optionsEl = stepEl.querySelector('.quiz-options');
    if (!qEl || !hintEl || !optionsEl) return;

    qEl.textContent = question.q;
    hintEl.textContent = question.hint;
    optionsEl.innerHTML = question.options
      .map(opt => (
        `<div class="quiz-opt" onclick="selectOpt(this,'${question.key}','${opt.val}')">` +
        `<span class="quiz-opt-icon">${opt.icon}</span> ${opt.text}</div>`
      ))
      .join('');
  });
}

function nextStep(n) {
  const activeStep = getActiveQuizStepNumber();
  if (activeStep === 0 && !answers.topic) return;
  if (activeStep >= 1 && activeStep <= 3 && !answers[`q${activeStep}`]) return;
  document.querySelectorAll('.quiz-step').forEach(s => s.classList.remove('active'));
  const next = document.getElementById('step' + n);
  if (next) next.classList.add('active');
  saveQuizState();
}

const PATHS = {
  athlete: {
    title: 'THE ATHLETE',
    desc: 'You thrive through physical challenge and competitive energy. Your grit is built on the track, in the gym, and in the moments where your body wants to stop but your mind refuses.',
    habits: ['Daily movement (30 min)', 'Cold shower discipline', 'Protein-first nutrition', 'Sleep 8hrs — recover like a pro', 'Compete with yourself weekly']
  },
  builder: {
    title: 'THE BUILDER',
    desc: "You're wired to create and solve. Whether it's code, design, or engineering — your calling is making things that didn't exist before. Your grit is built in the late-night build sessions.",
    habits: ['2hr deep work block daily', 'Ship one small thing per week', 'Learn one new tool per month', 'Document your progress', 'Embrace "ugly first drafts"']
  },
  connector: {
    title: 'THE CONNECTOR',
    desc: 'Your strength is people. Leading, mentoring, teaching — you grow by lifting others. Your grit is built every time you show up for someone else even when you have nothing left.',
    habits: ['Reach out to one person daily', 'Practice active listening', 'Journal your impact', 'Lead one thing per week', 'Read on psychology or leadership']
  },
  creator: {
    title: 'THE CREATOR',
    desc: "Art, music, writing, film — you see the world differently and you need to express it. Your grit is built by creating consistently, even when the output isn't perfect yet.",
    habits: ['Create something daily (even small)', 'Consume great work intentionally', 'Share one thing per week', 'Master one medium deeply', 'Keep a creative journal']
  },
  explorer: {
    title: 'THE EXPLORER',
    desc: "You're driven by curiosity, discovery, and understanding the world. Science, nature, travel, ideas — your grit is built by following questions until they become answers.",
    habits: ['Read 20 minutes daily', 'Learn one new thing per day', 'Go outside with intention', 'Ask "why?" constantly', 'Start a discovery journal']
  }
};

/* ── QUIZ PERSISTENCE ── */
function parseQuizOptOnclick(el) {
  // Example: selectOpt(this,'q1','athlete') or selectQuizTopic(this,'career')
  const attr = el.getAttribute('onclick') || '';
  const topicMatch = attr.match(/selectQuizTopic\(this,'([^']+)'\)/);
  if (topicMatch) return { key: 'topic', val: topicMatch[1] };
  const answerMatch = attr.match(/selectOpt\(this,'([^']+)','([^']+)'\)/);
  return answerMatch ? { key: answerMatch[1], val: answerMatch[2] } : null;
}

function restoreQuizSelections() {
  document.querySelectorAll('.quiz-opt').forEach(o => o.classList.remove('selected'));
  const opts = Array.from(document.querySelectorAll('.quiz-opt'));
  opts.forEach(optEl => {
    const parsed = parseQuizOptOnclick(optEl);
    if (!parsed) return;
    if (answers[parsed.key] === parsed.val) optEl.classList.add('selected');
  });
}

function getActiveQuizStepNumber() {
  const active = document.querySelector('.quiz-step.active');
  if (!active || !active.id) return 0;
  const m = active.id.match(/step(\d+)/);
  return m ? Number(m[1]) : 0;
}

function setQuizActiveStep(n) {
  document.querySelectorAll('.quiz-step').forEach(s => s.classList.remove('active'));
  const next = document.getElementById('step' + n);
  if (next) next.classList.add('active');
}

function saveQuizState() {
  const quizResultEl = document.getElementById('quizResult');
  const state = {
    answers: { ...answers },
    step: getActiveQuizStepNumber(),
    resultVisible: Boolean(quizResultEl && quizResultEl.classList.contains('active'))
  };
  writeJSON(STORAGE.quizState, state);
}

function loadQuizState() {
  // Challenge pages don't include the quiz markup; avoid errors.
  if (!document.getElementById('quizResult') || !document.getElementById('step0')) return;

  const saved = readJSON(STORAGE.quizState, null);
  const hasSaved = saved && typeof saved === 'object';
  if (hasSaved && saved.answers && saved.answers.topic) {
    renderQuizForTopic(saved.answers.topic);
  } else {
    renderQuizForTopic('performance');
  }

  if (!hasSaved) return;

  const savedAnswers = saved.answers || {};
  Object.keys(answers).forEach(k => delete answers[k]);
  Object.keys(savedAnswers).forEach(k => (answers[k] = savedAnswers[k]));

  restoreQuizSelections();

  if (saved.resultVisible) {
    showResult();
  } else {
    setQuizActiveStep(saved.step || 1);
    const qr = document.getElementById('quizResult');
    if (qr) qr.classList.remove('active');
  }
}

function showResult() {
  const resultTitleEl = document.getElementById('resultTitle');
  const resultDescEl = document.getElementById('resultDesc');
  const resultHabitsEl = document.getElementById('resultHabits');
  const quizResultEl = document.getElementById('quizResult');
  if (!resultTitleEl || !resultDescEl || !resultHabitsEl || !quizResultEl) return;

  if (!answers.topic || !answers.q1 || !answers.q2 || !answers.q3) return;

  const scores = {
    athlete: 0,
    builder: 0,
    connector: 0,
    creator: 0,
    explorer: 0
  };
  [answers.q1, answers.q2, answers.q3].forEach(choice => {
    if (scores[choice] !== undefined) scores[choice] += 1;
  });
  let pathKey = 'explorer';
  let bestScore = -1;
  Object.keys(scores).forEach(key => {
    if (scores[key] > bestScore) {
      bestScore = scores[key];
      pathKey = key;
    }
  });

  const p = PATHS[pathKey];
  const topicLabel = (QUIZ_TOPICS[answers.topic] && QUIZ_TOPICS[answers.topic].label) || 'Personal';
  resultTitleEl.textContent = `${p.title} (${topicLabel})`;
  resultDescEl.textContent  = p.desc;

  resultHabitsEl.innerHTML = p.habits
    .map(h => `<span class="result-habit-tag">${h}</span>`)
    .join('');

  document.querySelectorAll('.quiz-step').forEach(s => s.classList.remove('active'));
  quizResultEl.classList.add('active');

  saveQuizState();

  // If the user hasn't customized the hero habits yet, map the spark path into today’s reps.
  const habitTextEls = document.querySelectorAll('#habitList .habit-text');
  if (habitTextEls.length > 0 && Array.isArray(p.habits)) {
    if (!window.__gritDefaultHeroHabits) {
      window.__gritDefaultHeroHabits = Array.from(habitTextEls).map(el => el.textContent);
    }
    const current = Array.from(habitTextEls).map(el => el.textContent);
    const isDefault = JSON.stringify(current) === JSON.stringify(window.__gritDefaultHeroHabits);
    if (isDefault) {
      const nextHabits = p.habits.slice(0, habitTextEls.length);
      habitTextEls.forEach((el, i) => {
        el.textContent = nextHabits[i] || el.textContent;
      });
    }
  }
}

function resetQuiz() {
  Object.keys(answers).forEach(k => delete answers[k]);
  renderQuizForTopic('performance');
  const quizResultEl = document.getElementById('quizResult');
  if (quizResultEl) quizResultEl.classList.remove('active');
  document.querySelectorAll('.quiz-opt').forEach(o => o.classList.remove('selected'));
  const step0El = document.getElementById('step0');
  if (step0El) step0El.classList.add('active');

  localStorage.removeItem(STORAGE.quizState);
}

// Restore quiz state on load (if present).
loadQuizState();

/* ── MANTRA ENGINE ── */
const MANTRAS = [
  { text: 'YOUR ONLY COMPETITION IS WHO YOU WERE YESTERDAY.',         sub: 'On days it feels impossible — this is the truth.' },
  { text: 'SHOW UP. DO THE WORK. THE RESULTS WILL COME.',             sub: 'Consistency beats talent every single time.' },
  { text: 'YOU ARE CAPABLE OF MORE THAN YOU KNOW.',                   sub: 'Your limits are further than you think.' },
  { text: 'THE DISCOMFORT YOU FEEL IS CALLED GROWTH.',                sub: "Lean into it. That's where change lives." },
  { text: 'SMALL STEPS EVERY DAY BUILD EMPIRES.',                     sub: 'Never underestimate what 1% better looks like in a year.' },
  { text: "YOUR POTENTIAL IS NOT A DESTINATION. IT'S A DIRECTION.",   sub: "Keep moving. The destination is who you're becoming." },
  { text: 'BREATHE. RESET. GO AGAIN. ALWAYS.',                        sub: "Falling isn't failing. Staying down is." },
  { text: 'THE WORLD BENDS FOR THOSE WHO REFUSE TO BREAK.',           sub: "Grit isn't loud. It's the quiet decision to keep going." },
  { text: 'YOU WERE BUILT FOR THIS EXACT MOMENT.',                    sub: "Everything you've been through prepared you for right now." },
  { text: 'DREAM BIG. START SMALL. ACT NOW.',                         sub: 'The best time to begin was yesterday. The second best is today.' },
];

let mantraIdx = 0;

function nextMantra() {
  mantraIdx = (mantraIdx + 1) % MANTRAS.length;
  const textEl = document.getElementById('mantraText');
  const subEl  = document.getElementById('mantraSub');
  if (!textEl || !subEl) return;

  textEl.style.opacity = '0';
  subEl.style.opacity  = '0';

  setTimeout(() => {
    textEl.textContent   = MANTRAS[mantraIdx].text;
    subEl.textContent    = MANTRAS[mantraIdx].sub;
    textEl.style.opacity = '1';
    subEl.style.opacity  = '1';
  }, 350);
}

function copyMantra() {
  const btn = document.querySelector('#mantras .mantra-controls button.btn-ghost');
  navigator.clipboard.writeText(MANTRAS[mantraIdx].text).then(() => {
    if (!btn) return;
    btn.textContent = 'Copied ✓';
    setTimeout(() => (btn.textContent = 'Copy It'), 1500);
  });
}

/* ── MOBILE NAV (tap logo or hamburger) ── */
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

  function openMenu() {
    drawer.classList.add('open');
    backdrop.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.setAttribute('aria-hidden', 'false');
  }

  function toggleMenu() {
    if (drawer.classList.contains('open')) closeMenu();
    else openMenu();
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

/* ── SCROLL REVEAL ── */
(function initScrollReveal() {
  const targets = document.querySelectorAll('.pillar-card, .fact-card, .challenge-card, .win-card, .mantra-card');
  if (!targets.length) return;

  if (typeof IntersectionObserver === 'undefined') {
    targets.forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
    return;
  }

  const observer = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity   = '1';
        e.target.style.transform = 'translateY(0)';
      }
    }),
    { threshold: 0.1 }
  );

  targets.forEach(el => {
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
})();

/* ── CHALLENGE SELECTOR (affects hero copy only) ── */
(function initChallengeInteractions() {
  const cards = Array.from(document.querySelectorAll('#challenge .challenge-card'));
  if (!cards.length) return;

  function activateCard(card) {
    if (!card) return;
    const title = card.querySelector('.ch-title')?.textContent?.trim() || '';
    const days = card.querySelector('.ch-days')?.textContent?.trim() || '';
    const tag = card.querySelector('.ch-tag')?.textContent?.trim() || '';
    selectedChallenge = { title: title || 'your challenge', days, tag };
    writeJSON(STORAGE.selectedChallenge, selectedChallenge);

    const daysNum = Number(days);
    const routeByDays = {
      7: 'challenge-7.html',
      21: 'challenge-21.html',
      30: 'challenge-30.html',
      66: 'challenge-66.html'
    };
    const route = routeByDays[daysNum];

    if (route) window.location.href = route;
    else renderTodayTask();
  }

  cards.forEach(card => {
    card.style.cursor = 'pointer';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.addEventListener('click', () => {
      activateCard(card);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activateCard(card);
      }
    });
  });
})();

/* ── MANTRA TICKER PAUSE/RESUME ── */
(function initTickerInteractions() {
  const tickerEl = document.getElementById('mantra-ticker');
  const track = document.querySelector('#mantra-ticker .ticker-track');
  if (!tickerEl || !track) return;

  let paused = false;
  tickerEl.addEventListener('click', () => {
    paused = !paused;
    track.style.animationPlayState = paused ? 'paused' : 'running';
  });
})();

/* ── MANTRA AUTO-ROTATE ── */
(function initMantraAuto() {
  const section = document.getElementById('mantras');
  if (!section) return;

  let paused = false;
  section.addEventListener('mouseenter', () => (paused = true));
  section.addEventListener('mouseleave', () => (paused = false));

  setInterval(() => {
    if (!paused) nextMantra();
  }, 15000);
})();

/* ── CTA EMAIL JOIN (local-only; updates existing text) ── */
(function initCtaInteractions() {
  const cta = document.getElementById('cta');
  if (!cta) return;

  const input = cta.querySelector('.cta-input');
  const button = cta.querySelector('.btn-primary');
  const note = cta.querySelector('.cta-note');
  if (!input || !button || !note) return;

  const savedEmail = readJSON(STORAGE.joinedEmail, null);
  if (savedEmail) {
    input.value = savedEmail;
    note.textContent = `You're in, ${savedEmail}. Daily grit nudge is queued.`;
    button.textContent = 'Joined ✓';
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
  }

  function join() {
    const email = input.value.trim();
    if (!isValidEmail(email)) {
      note.textContent = 'Please enter a valid email address to join.';
      return;
    }

    writeJSON(STORAGE.joinedEmail, email);
    note.textContent = `You're in, ${email}. Redirecting to your setup...`;
    button.textContent = 'Joining...';

    setTimeout(() => {
      window.location.href = `join-options.html?email=${encodeURIComponent(email)}`;
    }, 350);
  }

  button.addEventListener('click', (e) => {
    e.preventDefault();
    join();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      join();
    }
  });
})();
