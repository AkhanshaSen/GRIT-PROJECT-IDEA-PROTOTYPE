/* ============================================================
   GRIT — main.js
   Habit tracker · Interest quiz · Mantra engine · Scroll reveal
   ============================================================ */

/* ── STREAK DOTS ── */
(function initStreakDots() {
  const container = document.getElementById('streakDots');
  if (!container) return;
  // true = completed day, false = upcoming
  const streakData = [true, true, true, true, true, true, true, false, false, false];
  streakData.forEach((done, i) => {
    const dot = document.createElement('div');
    dot.className = 'dot' + (done ? (i < 7 ? ' done' : ' active') : '');
    container.appendChild(dot);
  });
})();

/* ── HABIT TRACKER ── */
function toggleHabit(el) {
  el.classList.toggle('done');
  const check = el.querySelector('.habit-check');
  check.textContent = el.classList.contains('done') ? '✓' : '';
  updateStreak();
}

function updateStreak() {
  const items    = document.querySelectorAll('.habit-item');
  const doneCount = document.querySelectorAll('.habit-item.done').length;
  const streakEl = document.getElementById('streakCount');
  if (!streakEl) return;
  streakEl.textContent = doneCount === items.length ? '8 🔥' : '7 🔥';
}

/* ── INTEREST FINDER QUIZ ── */
const answers = {};

function selectOpt(el, key, val) {
  el.closest('.quiz-options')
    .querySelectorAll('.quiz-opt')
    .forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  answers[key] = val;
}

function nextStep(n) {
  document.querySelectorAll('.quiz-step').forEach(s => s.classList.remove('active'));
  const next = document.getElementById('step' + n);
  if (next) next.classList.add('active');
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

function showResult() {
  const e = answers.energy;
  const f = answers.free;
  const w = answers.win;

  let pathKey = 'explorer';
  if      (e === 'body'   || f === 'train'   || w === 'compete') pathKey = 'athlete';
  else if (e === 'mind'   || f === 'build'   || w === 'launch')  pathKey = 'builder';
  else if (e === 'people' || w === 'impact')                      pathKey = 'connector';
  else if (e === 'create' || f === 'express' || w === 'mastery')  pathKey = 'creator';

  const p = PATHS[pathKey];
  document.getElementById('resultTitle').textContent = p.title;
  document.getElementById('resultDesc').textContent  = p.desc;

  const habitsEl = document.getElementById('resultHabits');
  habitsEl.innerHTML = p.habits
    .map(h => `<span class="result-habit-tag">${h}</span>`)
    .join('');

  document.querySelectorAll('.quiz-step').forEach(s => s.classList.remove('active'));
  document.getElementById('quizResult').classList.add('active');
}

function resetQuiz() {
  Object.keys(answers).forEach(k => delete answers[k]);
  document.getElementById('quizResult').classList.remove('active');
  document.querySelectorAll('.quiz-opt').forEach(o => o.classList.remove('selected'));
  document.getElementById('step1').classList.add('active');
}

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
  const btn = event.target;
  navigator.clipboard.writeText(MANTRAS[mantraIdx].text).then(() => {
    btn.textContent = 'Copied ✓';
    setTimeout(() => (btn.textContent = 'Copy It'), 1500);
  });
}

/* ── SCROLL REVEAL ── */
(function initScrollReveal() {
  const observer = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity   = '1';
        e.target.style.transform = 'translateY(0)';
      }
    }),
    { threshold: 0.1 }
  );

  document
    .querySelectorAll('.pillar-card, .fact-card, .challenge-card, .win-card, .mantra-card')
    .forEach(el => {
      el.style.opacity    = '0';
      el.style.transform  = 'translateY(24px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(el);
    });
})();
