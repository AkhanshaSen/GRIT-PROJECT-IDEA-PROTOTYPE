/* ============================================================
   GRIT — main.js
   Habit tracker · Interest quiz · Mantra engine · Scroll reveal
   ============================================================ */

/* ── STORAGE + DATE HELPERS ── */
const STORAGE = {
  habitDoneByDate: 'grit.habitDoneByDate',
  habitCompletionByDate: 'grit.habitCompletionByDate',
  goalCompletionByDate: 'grit.goalCompletionByDate',
  nonNegotiableByDate: 'grit.nonNegotiableByDate',
  entryMood: 'grit.entryMood',
  entryMoodDate: 'grit.entryMoodDate',
  theme: 'grit.theme',
  mantraPersonal: 'grit.mantraPersonal',
  mantraCategoryFilter: 'grit.mantraCategoryFilter',
  quizState: 'grit.quizState',
  gritScoreQuiz: 'grit.gritScoreQuiz',
  driveKillerQuiz: 'grit.driveKillerQuiz',
  motivationMatchQuiz: 'grit.motivationMatchQuiz',
  selectedChallenge: 'grit.selectedChallenge',
  joinedEmail: 'grit.joinedEmail',
  challengeDayPrefix: 'grit.challengeDay.',
  coachEntryPrefix: 'grit.coachEntry.',
  coachPersona: 'grit.coachPersona',
  weeklyProgramState: 'grit.weeklyProgramState',
  ritualStateByDate: 'grit.ritualStateByDate',
  coldShowerByDate: 'grit.coldShowerByDate',
  breathSessions: 'grit.breathSessions',
  onePercentLog: 'grit.onePercentLog',
  wallPosts: 'grit.wallPosts',
  snoozePledge: 'grit.snoozePledge',
  snoozeLog: 'grit.snoozeLog',
  genericChallengeRuns: 'grit.genericChallengeRuns',
  futureLetter: 'grit.futureLetter',
  failureResume: 'grit.failureResume',
  weeklyDigestLastCopy: 'grit.weeklyDigestLastCopy'
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

function hashStringToUint(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const DAILY_MISSION_POOL = [
  'Execute one rep before you negotiate with yourself.',
  'Replace one distraction block with 25 minutes of deep work.',
  'Finish one thing you have been avoiding for under 10 minutes.',
  'Move your body before you touch social feeds.',
  'Write down the next three steps — then do step one.',
  'Compliment your future self: do the hard thing first.',
  'Shrink the goal until it is laughably easy — then do it.',
  'Close every loop you opened yesterday (one inbox, one message, one chore).',
  'Teach someone one thing you learned this week — clarity builds grit.',
  'End the day with proof: one screenshot, one log, one line in a journal.',
  'Stack sleep: lights down 30 minutes earlier tonight.',
  'Cold truth: do the boring maintenance task you keep skipping.',
  'Say no once today to protect your main priority.',
  'Spend 15 minutes on the skill that compounds for your path.',
  'Walk outside with no inputs — let your next move surface.',
  'Make one courageous ask (help, feedback, opportunity).',
  'Fix one friction in your environment so tomorrow is easier.',
  'Trade one hour of consumption for one hour of creation.',
  'Face the smallest version of your biggest fear today.',
  'Ship something imperfect before midnight.'
];

function getDailyMissionForDate(iso) {
  if (!iso) return DAILY_MISSION_POOL[0];
  const idx = hashStringToUint(`grit-mission-${iso}`) % DAILY_MISSION_POOL.length;
  return DAILY_MISSION_POOL[idx];
}

const goalCompletionByDate = readJSON(STORAGE.goalCompletionByDate, {});

function computeGoalStreak() {
  const today = getLocalISODate();
  let cursor = goalCompletionByDate[today] ? today : shiftISODate(today, -1);
  let count = 0;
  while (goalCompletionByDate[cursor]) {
    count++;
    cursor = shiftISODate(cursor, -1);
    if (count >= 365) break;
  }
  return count;
}

function persistGoalCompletion(today, val) {
  goalCompletionByDate[today] = val;
  writeJSON(STORAGE.goalCompletionByDate, goalCompletionByDate);
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
  const personaFlavors = {
    drill: ' (Coach voice: no excuses — one rep now.)',
    mentor: ' (Coach voice: long game — character over mood.)',
    hype: ' (Coach voice: energy up — celebrate the next step.)',
    therapist: ' (Coach voice: gentle truth — name it, then one kind action.)'
  };
  const p = readJSON(STORAGE.coachPersona, null);
  const flavor = p && personaFlavors[p] ? personaFlavors[p] : '';

  if (mode === 'Push') {
    return 'You have momentum. Take one hard action in the next 30 minutes and protect your focus.' + flavor;
  }
  if (mode === 'Recover') {
    return 'Lower the friction: do the smallest meaningful rep, reset, and rebuild your rhythm.' + flavor;
  }
  return 'Stay consistent. Stack one clean win now, then repeat the same standard tomorrow.' + flavor;
}

function getCoachCelebration(mode) {
  if (mode === 'Push') return 'Push Mode active. Attack your next rep.';
  if (mode === 'Recover') return 'Recover Mode active. Reset and stay in the game.';
  return 'Steady Mode active. Consistency is your advantage.';
}

async function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const safeType = (mimeType || 'text/plain').split(';')[0];

  // Best mobile UX: share sheet with file attachment.
  try {
    if (typeof File !== 'undefined' && navigator.share && navigator.canShare) {
      const file = new File([blob], filename, { type: safeType });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: filename,
            text: `Export from GRIT: ${filename}`
          });
          return { ok: true, mode: 'share' };
        } catch (err) {
          if (err && err.name === 'AbortError') return { ok: false, mode: 'cancelled' };
          // Continue to fallback download path.
        }
      }
    }
  } catch {
    // Continue to fallback download path for older browsers/webviews.
  }

  // Mobile browsers can block direct download clicks from synthetic events.
  if (window.navigator && typeof window.navigator.msSaveOrOpenBlob === 'function') {
    window.navigator.msSaveOrOpenBlob(blob, filename);
    return { ok: true, mode: 'ms' };
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    const popup = window.open(url, '_blank');
    if (!popup) window.location.href = url;
  }
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1200);
  return { ok: true, mode: 'download' };
}

function openExportPreview(filename, content) {
  const escaped = String(content)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${filename}</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0b0b;color:#f5f0e8;margin:0;padding:16px}h1{font-size:18px;margin:0 0 8px}.meta{color:#c9b89a;font-size:13px;margin-bottom:12px}pre{white-space:pre-wrap;word-break:break-word;background:#121212;border:1px solid #2a2a2a;border-radius:8px;padding:12px;line-height:1.55}</style></head><body><h1>${filename}</h1><div class="meta">If download/share is blocked on this phone, copy from this preview.</div><pre>${escaped}</pre></body></html>`;
  const previewBlob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const previewUrl = URL.createObjectURL(previewBlob);
  const popup = window.open(previewUrl, '_blank');
  if (!popup) window.location.href = previewUrl;
  setTimeout(() => URL.revokeObjectURL(previewUrl), 2500);
}

function showCoachGuidePopup(title, lines, isError = false) {
  let wrap = document.getElementById('coachGuidePopup');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'coachGuidePopup';
    wrap.className = 'coach-guide-pop';
    wrap.innerHTML = `
      <div class="coach-guide-card">
        <button class="coach-guide-close" type="button" aria-label="Close">×</button>
        <div class="coach-guide-title"></div>
        <div class="coach-guide-body"></div>
      </div>
    `;
    document.body.appendChild(wrap);
    const closeBtn = wrap.querySelector('.coach-guide-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        wrap.classList.remove('open');
      });
    }
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) wrap.classList.remove('open');
    });
  }

  const titleEl = wrap.querySelector('.coach-guide-title');
  const bodyEl = wrap.querySelector('.coach-guide-body');
  if (!titleEl || !bodyEl) return;

  titleEl.textContent = title;
  bodyEl.innerHTML = lines.map((line, idx) => `<div>${idx + 1}. ${line}</div>`).join('');
  wrap.classList.toggle('is-error', Boolean(isError));
  wrap.classList.add('open');

  // Hard fallback for restrictive mobile webviews.
  if (isError && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    try {
      alert(`${title}\n\n${lines.map((line, idx) => `${idx + 1}. ${line}`).join('\n')}`);
    } catch {}
  }
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
  const coachInfoBtn = document.getElementById('coachInfoBtn');
  const coachInfoPop = document.getElementById('coachInfoPop');

  let selectedMood = null;
  let selectedTrigger = null;
  let selectedObstacle = null;
  let selectedSupport = null;
  let coachEntry = readCoachEntry(challengeDays) || {};
  let coachInteracted = false;

  function validateCoachInputs() {
    const dayVal = readChallengeDay(challengeDays);
    const winsPending = winInput && winInput.value.trim() ? [winInput.value.trim()] : [];

    const hasSelection =
      Boolean(selectedMood) ||
      Boolean(selectedTrigger) ||
      Boolean(selectedObstacle) ||
      Boolean(selectedSupport);

    const hasContextText =
      Boolean(motivationInput && motivationInput.value.trim()) ||
      Boolean(challengeCauseInput && challengeCauseInput.value.trim()) ||
      Boolean(reflectionInput && reflectionInput.value.trim()) ||
      winsPending.length > 0;

    const missing = [];
    if (dayVal === null) missing.push(`Set your challenge day (1 to ${challengeDays}).`);
    if (!coachInteracted) missing.push('Update at least one coach field in this session before saving/exporting.');
    if (!hasSelection) missing.push('Choose at least one check-in option (mood / trigger / obstacle / support).');
    if (!hasContextText) missing.push('Add motivation, reflection, challenge cause, or at least one win.');

    return {
      ok: missing.length === 0,
      missing
    };
  }

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
      coachInteracted = true;
      selectMood(btn.getAttribute('data-mood'));
    });
  });

  triggerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      coachInteracted = true;
      selectTrigger(btn.getAttribute('data-trigger'));
    });
  });

  obstacleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      coachInteracted = true;
      selectObstacle(btn.getAttribute('data-obstacle'));
    });
  });

  supportButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      coachInteracted = true;
      selectSupport(btn.getAttribute('data-support'));
    });
  });

  if (challengeMeterInput && challengeMeterValue) {
    challengeMeterInput.addEventListener('input', () => {
      coachInteracted = true;
      challengeMeterValue.textContent = String(challengeMeterInput.value);
    });
  }

  if (winImpactInput && winImpactValue) {
    winImpactInput.addEventListener('input', () => {
      coachInteracted = true;
      winImpactValue.textContent = String(winImpactInput.value);
    });
  }

  [motivationInput, challengeCauseInput, reflectionInput, winInput, dayInput].forEach(el => {
    if (!el) return;
    el.addEventListener('input', () => {
      coachInteracted = true;
    });
  });

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
    const validation = validateCoachInputs();
    if (!validation.ok) {
      showCoachGuidePopup('Complete Coach Check-In', validation.missing, true);
      celebrateJourney('Fill required coach inputs before saving.');
      return false;
    }
    const dayVal = readChallengeDay(challengeDays);
    if (dayVal === null) return false;

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
    return true;
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
      const saved = saveCoachEntry();
      if (!saved) return;
    });
  }

  if (exportSummaryBtn) {
    exportSummaryBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const validation = validateCoachInputs();
      if (!validation.ok) {
        showCoachGuidePopup('Before Exporting Summary', validation.missing, true);
        celebrateJourney('Complete the required check-in fields first.');
        return;
      }

      showCoachGuidePopup('Export Summary - Steps', [
        'Tap "Save Check-In" if you changed anything.',
        'A share/download screen opens next.',
        'Choose Save to Files, Drive, or Share.',
        'If blocked, a preview opens so you can copy the text.'
      ]);

      let entry = readCoachEntry(challengeDays);
      if (!entry) {
        const saved = saveCoachEntry();
        if (!saved) return;
        entry = readCoachEntry(challengeDays);
      }
      if (!entry) {
        celebrateJourney('Save a valid check-in first, then export.');
        return;
      }
      const dayVal = readChallengeDay(challengeDays);
      const mode = computeCoachMode(entry, dayVal || 1, challengeDays);
      const text = buildCoachTextSummary(pageTitle || 'Challenge', challengeDays, entry, dayVal, mode);
      const fileName = `grit-${challengeDays}-day-summary.txt`;
      let res = null;
      try {
        res = await downloadFile(fileName, text, 'text/plain;charset=utf-8');
      } catch {
        openExportPreview(fileName, text);
        celebrateJourney('Export fallback opened. Copy/save from preview.');
        return;
      }
      if (res && res.mode === 'share') celebrateJourney('Summary ready in share sheet.');
      else if (res && res.mode === 'cancelled') celebrateJourney('Export cancelled.');
      else {
        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) openExportPreview(fileName, text);
        celebrateJourney('Summary exported.');
      }
    });
  }

  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const validation = validateCoachInputs();
      if (!validation.ok) {
        showCoachGuidePopup('Before Exporting JSON', validation.missing, true);
        celebrateJourney('Complete the required check-in fields first.');
        return;
      }

      showCoachGuidePopup('Export JSON - Steps', [
        'Tap "Save Check-In" if you changed anything.',
        'A share/download screen opens next.',
        'Choose Save to Files or Share app.',
        'If blocked, a preview opens so you can copy the JSON.'
      ]);

      let entry = readCoachEntry(challengeDays);
      if (!entry) {
        const saved = saveCoachEntry();
        if (!saved) return;
        entry = readCoachEntry(challengeDays);
      }
      if (!entry) {
        celebrateJourney('Save a valid check-in first, then export.');
        return;
      }
      const payload = {
        ...entry,
        day: readChallengeDay(challengeDays),
        exportedAt: new Date().toISOString()
      };
      const fileName = `grit-${challengeDays}-day-data.json`;
      const body = JSON.stringify(payload, null, 2);
      let res = null;
      try {
        res = await downloadFile(fileName, body, 'application/json;charset=utf-8');
      } catch {
        openExportPreview(fileName, body);
        celebrateJourney('Export fallback opened. Copy/save from preview.');
        return;
      }
      if (res && res.mode === 'share') celebrateJourney('JSON ready in share sheet.');
      else if (res && res.mode === 'cancelled') celebrateJourney('Export cancelled.');
      else {
        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) openExportPreview(fileName, body);
        celebrateJourney('JSON exported.');
      }
    });
  }

  if (coachInfoBtn && coachInfoPop) {
    coachInfoBtn.addEventListener('click', () => {
      const isHidden = coachInfoPop.hasAttribute('hidden');
      if (isHidden) coachInfoPop.removeAttribute('hidden');
      else coachInfoPop.setAttribute('hidden', 'hidden');
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

  if (carouselTrack) {
    carouselTrack.addEventListener('click', e => {
      const a = e.target.closest('a');
      if (!a || !a.getAttribute('href')) return;
      if (
        !window.confirm(
          'Leave this challenge page? Your progress is saved locally. Skip — or level up on a new path when you are ready.'
        )
      ) {
        e.preventDefault();
      }
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
  const mission = getDailyMissionForDate(getLocalISODate());
  todayTaskEl.textContent = `Today's mission: ${mission}`;
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
initThemeFromStorage();
initHabitTracker();
initChallengePage();
initThemeControls();
initMoodGate();
initDailyGritSection();

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

/* ── THEME (dark / war) + MOOD ── */
function applyTheme(theme) {
  const t = theme === 'dark' || theme === 'war' ? theme : 'default';
  if (t === 'default') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  writeJSON(STORAGE.theme, t);
}

function initThemeFromStorage() {
  const saved = readJSON(STORAGE.theme, 'default');
  applyTheme(saved === 'dark' || saved === 'war' ? saved : 'default');
}

function initThemeControls() {
  const wrap = document.getElementById('themeToggle');
  if (!wrap) return;
  wrap.querySelectorAll('[data-theme-set]').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-theme-set') || 'default';
      applyTheme(v);
      wrap.querySelectorAll('[data-theme-set]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  const cur = readJSON(STORAGE.theme, 'default');
  const active = wrap.querySelector(`[data-theme-set="${cur}"]`);
  if (active) {
    wrap.querySelectorAll('[data-theme-set]').forEach(b => b.classList.remove('active'));
    active.classList.add('active');
  }
}

function showGritToast(message, isError) {
  let el = document.getElementById('gritToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'gritToast';
    el.setAttribute('role', 'status');
    el.style.cssText =
      'position:fixed;left:50%;bottom:2rem;transform:translateX(-50%);z-index:99999;' +
      'padding:0.85rem 1.35rem;border-radius:10px;background:rgba(18,18,18,0.96);' +
      'border:1px solid rgba(255,255,255,0.14);color:#f5f0e8;font-size:0.9rem;max-width:min(420px,92vw);' +
      'box-shadow:0 12px 40px rgba(0,0,0,0.55);opacity:0;transition:opacity 0.25s ease;pointer-events:none;' +
      'font-family:DM Sans,system-ui,sans-serif;text-align:center;line-height:1.4';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.style.borderColor = isError ? 'rgba(255,90,90,0.55)' : 'rgba(232,78,27,0.45)';
  el.style.opacity = '1';
  clearTimeout(el._gritHideToast);
  el._gritHideToast = setTimeout(() => {
    el.style.opacity = '0';
  }, 2800);
}
window.showGritToast = showGritToast;

const MOOD_COPY = {
  defeated: {
    heroSub:
      'You do not have to feel ready. You only have to take one small rep. GRIT meets you where you are — then walks with you forward.',
    mantraSubHint: 'Gentle mode: one tiny win is enough.'
  },
  neutral: {
    heroSub:
      'Discover what pulls you, build habits that stick, and keep grinding with mantras and challenges built for teens and young adults.',
    mantraSubHint: 'Pick one lane and go one degree deeper today.'
  },
  ready: {
    heroSub:
      'Channel the fire: lock one target, remove one excuse, and stack proof today. You came here to work — let the platform match your intensity.',
    mantraSubHint: 'Attack the hardest step first while energy is high.'
  }
};

function applyEntryMood(mood) {
  document.body.classList.remove('mood-defeated', 'mood-neutral', 'mood-ready');
  const m = mood === 'defeated' || mood === 'ready' ? mood : 'neutral';
  document.body.classList.add(`mood-${m}`);
  const sub = document.querySelector('#hero .hero-sub');
  if (sub && MOOD_COPY[m]) {
    sub.innerHTML = MOOD_COPY[m].heroSub;
  }
}

function initMoodGate() {
  const modal = document.getElementById('moodEntryModal');
  if (!modal) return;
  const todayIso = getLocalISODate();
  const savedDate = localStorage.getItem(STORAGE.entryMoodDate);
  const savedMood = localStorage.getItem(STORAGE.entryMood);
  if (savedDate === todayIso && savedMood && ['defeated', 'neutral', 'ready'].includes(savedMood)) {
    applyEntryMood(savedMood);
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    return;
  }
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');

  function closeMood(mood) {
    localStorage.setItem(STORAGE.entryMood, mood);
    localStorage.setItem(STORAGE.entryMoodDate, todayIso);
    applyEntryMood(mood);
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    renderMantraToDom();
  }

  modal.addEventListener('click', e => {
    const pick = e.target.closest('[data-mood-pick]');
    if (pick) {
      e.preventDefault();
      const mood = pick.getAttribute('data-mood-pick') || 'neutral';
      closeMood(mood);
      return;
    }
    const skipBtn = e.target.closest('.mood-skip');
    if (skipBtn) {
      e.preventDefault();
      closeMood('neutral');
    }
  });
}

function initDailyGritSection() {
  const missionEl = document.getElementById('dashboardMission');
  const streakHabitsEl = document.getElementById('dashboardStreakHabits');
  const streakGoalsEl = document.getElementById('dashboardStreakGoals');
  const nnInput = document.getElementById('nonNegotiableInput');
  const nnSave = document.getElementById('nonNegotiableSave');
  const goalCheck = document.getElementById('dailyGoalCheckbox');
  if (!missionEl) return;

  const today = getLocalISODate();
  missionEl.textContent = getDailyMissionForDate(today);

  function renderDashboardStreaks() {
    if (streakHabitsEl) streakHabitsEl.textContent = String(computeStreakCount());
    if (streakGoalsEl) streakGoalsEl.textContent = String(computeGoalStreak());
  }
  renderDashboardStreaks();

  const nnMap = readJSON(STORAGE.nonNegotiableByDate, {});
  if (nnInput) nnInput.value = nnMap[today] || '';

  if (nnSave && nnInput) {
    nnSave.addEventListener('click', () => {
      nnMap[today] = nnInput.value.trim();
      writeJSON(STORAGE.nonNegotiableByDate, nnMap);
      nnSave.textContent = 'Saved ✓';
      setTimeout(() => {
        nnSave.textContent = 'Save';
      }, 1200);
    });
  }

  if (goalCheck) {
    goalCheck.checked = Boolean(goalCompletionByDate[today]);
    goalCheck.addEventListener('change', () => {
      persistGoalCompletion(today, goalCheck.checked);
      renderDashboardStreaks();
    });
  }
}

/* ── MANTRA ENGINE ── */
const MANTRA_CATS = ['resilience', 'discipline', 'abundance', 'self-worth'];

const MANTRAS = [
  { text: 'BOUNCE BACK HARDER THAN THE SETBACK HIT YOU.', sub: 'Resilience is a decision you repeat.', category: 'resilience' },
  { text: 'YOU HAVE SURVIVED 100% OF YOUR BAD DAYS SO FAR.', sub: 'This one is another rep, not a verdict.', category: 'resilience' },
  { text: 'SCARS MEAN YOU STAYED IN THE FIGHT.', sub: 'Wear them as proof, not shame.', category: 'resilience' },
  { text: 'FATIGUE IS REAL; QUITTING IS OPTIONAL.', sub: 'Shrink the task until you can move.', category: 'resilience' },
  { text: 'STILL STANDING IS STILL WINNING.', sub: 'Some days the win is not collapsing.', category: 'resilience' },
  { text: 'DISCIPLINE BEATS MOOD EVERY TIME.', sub: 'Action first; feelings follow.', category: 'discipline' },
  { text: 'DO THE BORING REPS WHEN NO ONE CLAPS.', sub: 'Champions are built in invisible hours.', category: 'discipline' },
  { text: 'YOUR SYSTEM IS YOUR SUPERPOWER.', sub: 'Design the default so discipline is easy.', category: 'discipline' },
  { text: 'SHOW UP ON THE DAYS YOU WANT TO DISAPPEAR.', sub: 'Identity is built when it costs.', category: 'discipline' },
  { text: 'DELAYED GRATIFICATION IS A MUSCLE.', sub: 'Flex it today with one hard choice.', category: 'discipline' },
  { text: 'THERE IS ROOM FOR YOU AT THE TABLE.', sub: 'Abundance starts with believing you can grow.', category: 'abundance' },
  { text: 'CELEBRATE SMALL WINS; THEY STACK.', sub: 'Gratitude multiplies momentum.', category: 'abundance' },
  { text: 'GIVE VALUE FIRST; OPPORTUNITY FOLLOWS.', sub: 'Play long games with open hands.', category: 'abundance' },
  { text: 'YOUR NETWORK EXPANDS WHEN YOU SERVE.', sub: 'Lift one person today.', category: 'abundance' },
  { text: 'ENOUGH IS A LAUNCHPAD, NOT A CEILING.', sub: 'Build from enough, aim for more.', category: 'abundance' },
  { text: 'YOU ARE NOT BEHIND; YOU ARE ON YOUR PATH.', sub: 'Self-worth is not a ranking.', category: 'self-worth' },
  { text: 'YOUR VOICE MATTERS EVEN WHEN IT SHAKES.', sub: 'Speak anyway; clarity comes with reps.', category: 'self-worth' },
  { text: 'BOUNDARIES ARE AN ACT OF SELF-RESPECT.', sub: 'Saying no can be love for future you.', category: 'self-worth' },
  { text: 'YOU DO NOT NEED PERMISSION TO RESET.', sub: 'Begin again without apology.', category: 'self-worth' },
  { text: 'COMPARISON STEALS YOUR REPS.', sub: 'Eyes on your own paper, heart on your own pace.', category: 'self-worth' },
  { text: 'YOUR ONLY COMPETITION IS WHO YOU WERE YESTERDAY.', sub: 'On days it feels impossible — this is the truth.', category: 'discipline' },
  { text: 'SHOW UP. DO THE WORK. THE RESULTS WILL COME.', sub: 'Consistency beats talent every single time.', category: 'discipline' },
  { text: 'YOU ARE CAPABLE OF MORE THAN YOU KNOW.', sub: 'Your limits are further than you think.', category: 'self-worth' },
  { text: 'THE DISCOMFORT YOU FEEL IS CALLED GROWTH.', sub: "Lean into it. That's where change lives.", category: 'resilience' },
  { text: 'SMALL STEPS EVERY DAY BUILD EMPIRES.', sub: 'Never underestimate what 1% better looks like in a year.', category: 'abundance' },
  { text: "YOUR POTENTIAL IS NOT A DESTINATION. IT'S A DIRECTION.", sub: "Keep moving. The destination is who you're becoming.", category: 'abundance' },
  { text: 'BREATHE. RESET. GO AGAIN. ALWAYS.', sub: "Falling isn't failing. Staying down is.", category: 'resilience' },
  { text: 'THE WORLD BENDS FOR THOSE WHO REFUSE TO BREAK.', sub: "Grit isn't loud. It's the quiet decision to keep going.", category: 'resilience' },
  { text: 'YOU WERE BUILT FOR THIS EXACT MOMENT.', sub: "Everything you've been through prepared you for right now.", category: 'self-worth' },
  { text: 'DREAM BIG. START SMALL. ACT NOW.', sub: 'The best time to begin was yesterday. The second best is today.', category: 'discipline' }
];

let mantraCategoryFilter = readJSON(STORAGE.mantraCategoryFilter, 'all');
if (mantraCategoryFilter !== 'all' && !MANTRA_CATS.includes(mantraCategoryFilter)) mantraCategoryFilter = 'all';

function getFilteredMantraIndices() {
  return MANTRAS.map((m, i) => i).filter(i => mantraCategoryFilter === 'all' || MANTRAS[i].category === mantraCategoryFilter);
}

let mantraIdx = 0;

function syncMantraIdxInFilter() {
  const allowed = getFilteredMantraIndices();
  if (!allowed.length) return;
  if (!allowed.includes(mantraIdx)) mantraIdx = allowed[0];
}

function getDisplayedMantra() {
  syncMantraIdxInFilter();
  const m = MANTRAS[mantraIdx];
  const personal = readJSON(STORAGE.mantraPersonal, null);
  if (personal && personal.text && Number(personal.forIndex) === mantraIdx) {
    return { text: personal.text, sub: m.sub, category: m.category };
  }
  return m;
}

function renderMantraToDom() {
  const textEl = document.getElementById('mantraText');
  const subEl = document.getElementById('mantraSub');
  if (!textEl || !subEl) return;
  const d = getDisplayedMantra();
  const mood = localStorage.getItem(STORAGE.entryMood) || 'neutral';
  const moodHint = MOOD_COPY[mood] ? MOOD_COPY[mood].mantraSubHint : '';
  textEl.textContent = d.text;
  subEl.textContent = moodHint ? `${d.sub} — ${moodHint}` : d.sub;
  const ta = document.getElementById('mantraPersonalInput');
  if (ta) {
    const personal = readJSON(STORAGE.mantraPersonal, null);
    ta.value =
      personal && personal.text && Number(personal.forIndex) === mantraIdx ? personal.text : '';
  }
}

function nextMantra() {
  const allowed = getFilteredMantraIndices();
  if (!allowed.length) return;
  const pos = allowed.indexOf(mantraIdx);
  const nextPos = pos >= 0 ? (pos + 1) % allowed.length : 0;
  mantraIdx = allowed[nextPos];

  const textEl = document.getElementById('mantraText');
  const subEl = document.getElementById('mantraSub');
  if (!textEl || !subEl) return;

  textEl.style.opacity = '0';
  subEl.style.opacity = '0';

  setTimeout(() => {
    renderMantraToDom();
    textEl.style.opacity = '1';
    subEl.style.opacity = '1';
  }, 350);
}

function copyMantra() {
  const btn = document.querySelector('#mantras .mantra-controls button.btn-ghost');
  const d = getDisplayedMantra();
  navigator.clipboard.writeText(d.text).then(() => {
    if (btn) {
      btn.textContent = 'Copied ✓';
      setTimeout(() => (btn.textContent = 'Copy It'), 1500);
    }
    if (typeof showGritToast === 'function') showGritToast('Copied to clipboard.');
  }).catch(() => {
    if (typeof showGritToast === 'function') {
      showGritToast('Clipboard blocked — select the mantra text and copy manually.', true);
    }
  });
}

function savePersonalMantra() {
  const ta = document.getElementById('mantraPersonalInput');
  if (!ta) return;
  const text = ta.value.trim();
  if (!text) {
    writeJSON(STORAGE.mantraPersonal, null);
    renderMantraToDom();
    if (typeof showGritToast === 'function') showGritToast('Personal line cleared.');
    return;
  }
  writeJSON(STORAGE.mantraPersonal, { text, forIndex: mantraIdx });
  renderMantraToDom();
  if (typeof showGritToast === 'function') showGritToast('Your mantra version is saved.');
}

function initMantraCategoryChips() {
  const wrap = document.getElementById('mantraCategoryChips');
  if (!wrap) return;
  wrap.querySelectorAll('[data-mantra-cat]').forEach(chip => {
    chip.addEventListener('click', () => {
      mantraCategoryFilter = chip.getAttribute('data-mantra-cat') || 'all';
      writeJSON(STORAGE.mantraCategoryFilter, mantraCategoryFilter);
      wrap.querySelectorAll('[data-mantra-cat]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      syncMantraIdxInFilter();
      renderMantraToDom();
    });
  });
  const cur = readJSON(STORAGE.mantraCategoryFilter, 'all');
  const active = wrap.querySelector(`[data-mantra-cat="${cur}"]`) || wrap.querySelector('[data-mantra-cat="all"]');
  if (active) {
    wrap.querySelectorAll('[data-mantra-cat]').forEach(c => c.classList.remove('active'));
    active.classList.add('active');
    mantraCategoryFilter = active.getAttribute('data-mantra-cat') || 'all';
  }
  syncMantraIdxInFilter();
}

function downloadMantraWallpaper() {
  const d = getDisplayedMantra();
  const canvas = document.createElement('canvas');
  const w = 1080;
  const h = 1920;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#0a0a0a');
  g.addColorStop(1, '#2a1510');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#e84e1b';
  ctx.font = 'bold 36px DM Sans, sans-serif';
  ctx.fillText('GRIT', 72, 100);
  ctx.fillStyle = '#f5f0e8';
  ctx.font = 'bold 52px Bebas Neue, sans-serif';
  const words = d.text.split(' ');
  let line = '';
  let y = 280;
  const maxW = w - 144;
  words.forEach(word => {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), 72, y);
      line = word + ' ';
      y += 64;
    } else line = test;
  });
  if (line) ctx.fillText(line.trim(), 72, y);
  ctx.fillStyle = '#c9b89a';
  ctx.font = '28px DM Sans, sans-serif';
  const subWords = d.sub.split(' ');
  line = '';
  y += 100;
  subWords.forEach(word => {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), 72, y);
      line = word + ' ';
      y += 40;
    } else line = test;
  });
  if (line) ctx.fillText(line.trim(), 72, y);
  canvas.toBlob(blob => {
    if (!blob) {
      if (typeof showGritToast === 'function') showGritToast('Could not create image.', true);
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grit-mantra-wallpaper.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    if (typeof showGritToast === 'function') showGritToast('Wallpaper download started.');
  });
}

window.downloadMantraWallpaper = downloadMantraWallpaper;
window.savePersonalMantra = savePersonalMantra;

initMantraCategoryChips();
renderMantraToDom();

/* ── MOBILE NAV (tap logo or hamburger) ── */
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

window.GRIT = {
  STORAGE,
  readJSON,
  writeJSON,
  getLocalISODate,
  shiftISODate,
  downloadFile,
  computeStreakCount: () => computeStreakCount(),
  computeGoalStreak: () => computeGoalStreak(),
  getDailyMissionForDate,
  hashStringToUint
};
