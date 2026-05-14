/* GRIT tools.html — quizzes, coaching lab, wall, challenges, bonus */
(function () {
  const G = window.GRIT;
  if (!G) return;

  const S = G.STORAGE;
  const read = G.readJSON;
  const write = G.writeJSON;
  const today = G.getLocalISODate;

  function initPlaylists() {
    const tabs = document.querySelectorAll('#playlistTabs [data-pl]');
    const panels = document.querySelectorAll('#playlistPanels [data-pl-panel]');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const id = tab.getAttribute('data-pl');
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        panels.forEach(p => {
          p.hidden = p.getAttribute('data-pl-panel') !== id;
        });
      });
    });
  }

  function initWakeRitual() {
    const key = S.ritualStateByDate;
    const map = read(key, {});
    const t = today();
    const day = map[t] || {};
    document.querySelectorAll('#ritualSteps [data-ritual]').forEach(cb => {
      const k = cb.getAttribute('data-ritual');
      cb.checked = Boolean(day[k]);
      cb.addEventListener('change', () => {
        const m = read(key, {});
        if (!m[t]) m[t] = {};
        m[t][k] = cb.checked;
        write(key, m);
      });
    });
    const save = document.getElementById('ritualSave');
    if (save) {
      save.addEventListener('click', () => {
        save.textContent = 'Saved ✓';
        setTimeout(() => (save.textContent = 'Save today’s ritual progress'), 1200);
      });
    }
  }

  function initFiveSec() {
    const numEl = document.getElementById('fiveSecNum');
    const start = document.getElementById('fiveSecStart');
    const reset = document.getElementById('fiveSecReset');
    if (!numEl || !start || !reset) return;
    let n = 5;
    let timer = null;
    reset.addEventListener('click', () => {
      if (timer) clearInterval(timer);
      timer = null;
      n = 5;
      numEl.textContent = String(n);
    });
    start.addEventListener('click', () => {
      if (timer) return;
      n = 5;
      numEl.textContent = String(n);
      timer = setInterval(() => {
        n -= 1;
        numEl.textContent = String(Math.max(0, n));
        if (n <= 0) {
          clearInterval(timer);
          timer = null;
        }
      }, 1000);
    });
  }

  function initColdShower() {
    const btn = document.getElementById('coldShowerLog');
    const out = document.getElementById('coldShowerStreak');
    if (!btn || !out) return;
    const map = read(S.coldShowerByDate, {});
    function streak() {
      let c = 0;
      let d = today();
      while (map[d]) {
        c++;
        d = G.shiftISODate(d, -1);
        if (c > 400) break;
      }
      return c;
    }
    out.textContent = `Streak: ${streak()} cold days`;
    btn.addEventListener('click', () => {
      map[today()] = true;
      write(S.coldShowerByDate, map);
      out.textContent = `Streak: ${streak()} cold days`;
      btn.textContent = 'Logged ✓';
      setTimeout(() => (btn.textContent = 'I did it today'), 1200);
    });
  }

  const GRIT_Q = [
    'I finish whatever I begin.',
    'Setbacks don’t discourage me for long.',
    'I am a hard worker.',
    'I often set a goal but later choose to pursue a different one. (reverse)',
    'I have difficulty maintaining focus on projects that take more than a few months. (reverse)',
    'I become interested in new pursuits every few months. (reverse)',
    'I have been obsessed with a certain idea or project for a short time but later lost interest. (reverse)',
    'I am diligent.',
    'I have overcome setbacks to conquer an important challenge.',
    'My interests change from year to year. (reverse)'
  ];

  function renderGritQuiz() {
    const mount = document.getElementById('gritQuizMount');
    const resEl = document.getElementById('gritQuizResult');
    if (!mount) return;
    const saved = read(S.gritScoreQuiz, null);
    const answers = saved && saved.answers ? saved.answers : {};

    mount.innerHTML = GRIT_Q.map((q, i) => {
      const rev = q.includes('(reverse)');
      const label = q.replace(/\s*\(reverse\)\s*$/, '');
      return (
        `<div class="tools-card" style="margin-top:0.75rem;padding:0.9rem">` +
        `<div style="font-size:0.88rem;color:var(--sand);margin-bottom:0.5rem">${i + 1}. ${label}${rev ? ' <em>(reverse scored)</em>' : ''}</div>` +
        `<div class="quiz-likert" data-grit-q="${i}">` +
        [1, 2, 3, 4, 5]
          .map(
            v =>
              `<button type="button" data-v="${v}" class="${answers[i] === v ? 'selected' : ''}">${v}</button>`
          )
          .join('') +
        `</div></div>`
      );
    }).join('');

    const btnRow = document.createElement('div');
    btnRow.style.marginTop = '1rem';
    btnRow.innerHTML =
      '<button type="button" class="btn-primary" id="gritScoreBtn">See score</button> ' +
      '<span class="cta-note" id="gritRetakeNote"></span>';
    mount.appendChild(btnRow);

    mount.querySelectorAll('.quiz-likert').forEach(row => {
      row.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', () => {
          const qi = Number(row.getAttribute('data-grit-q'));
          const v = Number(b.getAttribute('data-v'));
          row.querySelectorAll('button').forEach(x => x.classList.remove('selected'));
          b.classList.add('selected');
          answers[qi] = v;
          write(S.gritScoreQuiz, { answers, lastTaken: saved ? saved.lastTaken : null });
        });
      });
    });

    const note = btnRow.querySelector('#gritRetakeNote');
    if (saved && saved.lastTaken) {
      const days = Math.floor(
        (Date.now() - new Date(saved.lastTaken).getTime()) / 86400000
      );
      if (note && days < 28) note.textContent = `Last taken ${days}d ago — monthly retake suggested.`;
    }

    btnRow.querySelector('#gritScoreBtn').addEventListener('click', () => {
      let sum = 0;
      for (let i = 0; i < GRIT_Q.length; i++) {
        if (!answers[i]) {
          alert('Answer all 10 questions (1–5).');
          return;
        }
        const rev = GRIT_Q[i].includes('(reverse)');
        sum += rev ? 6 - answers[i] : answers[i];
      }
      write(S.gritScoreQuiz, { answers, lastScore: sum, lastTaken: new Date().toISOString() });
      let band = 'Building baseline';
      let tip = 'Stack tiny wins daily; protect sleep; pick one hard task before noon.';
      if (sum >= 44) {
        band = 'High grit pattern';
        tip = 'Channel intensity into recovery so you don’t burn out. Teach someone else your system.';
      } else if (sum >= 38) {
        band = 'Strong';
        tip = 'Add one longer horizon project; practice saying no to shiny distractions.';
      } else if (sum >= 32) {
        band = 'Solid middle';
        tip = 'Name your quitting trigger; pre-plan the next move when motivation dips.';
      }
      resEl.hidden = false;
      resEl.className = 'tools-card';
      resEl.innerHTML = `<div class="result-label">Your score: ${sum} / 50</div><p><strong>${band}.</strong> ${tip}</p><p class="cta-note">For reflection only — not medical or psychological advice.</p>`;
    });
  }

  const DRIVE_Q = [
    { q: 'When you stall, what is closest to the truth?', opts: [
      { t: 'I spiral on what could go wrong', w: { fear: 2, perfectionism: 1 } },
      { t: 'I wait until I “feel like it”', w: { laziness: 2, distraction: 1 } },
      { t: 'I open tabs and drift', w: { distraction: 3 } },
      { t: 'I redo instead of ship', w: { perfectionism: 3 } }
    ]},
    { q: 'Your energy crash usually comes from…', opts: [
      { t: 'Poor sleep / no recovery plan', w: { energy: 2, laziness: 1 } },
      { t: 'Avoiding one scary task', w: { fear: 3 } },
      { t: 'Too many competing priorities', w: { distraction: 2, perfectionism: 1 } },
      { t: 'No clear reward for the grind', w: { laziness: 2 } }
    ]},
    { q: 'What do you procrastinate on most?', opts: [
      { t: 'Starting messy work', w: { perfectionism: 3 } },
      { t: 'Conflict or hard conversations', w: { fear: 3 } },
      { t: 'Boring maintenance', w: { laziness: 2 } },
      { t: 'Anything after I check messages', w: { distraction: 3 } }
    ]}
  ];

  const DRIVE_PLANS = {
    fear: {
      title: 'Fear',
      plan: ['Name the worst case in one sentence.', 'Shrink the task to 2 minutes.', 'Do it before noon while courage is fresh.']
    },
    laziness: {
      title: 'Friction / inertia',
      plan: ['Make the first step stupidly small.', 'Pair with music or a walk.', 'Remove one distraction from your environment tonight.']
    },
    distraction: {
      title: 'Distraction',
      plan: ['One-device mode for 25 minutes.', 'Write distractions on a list instead of acting.', 'Batch messages after lunch.']
    },
    perfectionism: {
      title: 'Perfectionism',
      plan: ['Ship a “B+” version on purpose.', 'Set a hard timer; stop when it rings.', 'Ask for feedback earlier than feels comfortable.']
    },
    energy: {
      title: 'Energy debt',
      plan: ['Fix one sleep lever (time, caffeine cut-off, light).', 'Swap one hour of scrolling for a walk.', 'Schedule recovery like a meeting.']
    }
  };

  function renderDriveQuiz() {
    const mount = document.getElementById('driveQuizMount');
    const resEl = document.getElementById('driveQuizResult');
    if (!mount) return;
    const scores = { fear: 0, laziness: 0, distraction: 0, perfectionism: 0, energy: 0 };
    mount.innerHTML = DRIVE_Q.map((item, idx) => (
      `<div class="tools-card" style="margin-top:0.75rem">` +
      `<div style="font-size:0.9rem;margin-bottom:0.6rem">${item.q}</div>` +
      `<div class="quiz-options" style="flex-direction:column;align-items:stretch" id="driveQ${idx}">` +
      item.opts.map((o, j) => (
        `<button type="button" class="quiz-opt" style="text-align:left" data-drive="${idx}" data-opt="${j}">${o.t}</button>`
      )).join('') +
      `</div></div>`
    )).join('');
    mount.innerHTML += '<button type="button" class="btn-primary" id="driveResultBtn" style="margin-top:1rem">Reveal blocker</button>';

    mount.querySelectorAll('[data-drive]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-drive'));
        const j = Number(btn.getAttribute('data-opt'));
        const wrap = document.getElementById(`driveQ${idx}`);
        wrap.querySelectorAll('.quiz-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        DRIVE_Q[idx].picked = j;
      });
    });

    mount.querySelector('#driveResultBtn').addEventListener('click', () => {
      Object.keys(scores).forEach(k => (scores[k] = 0));
      for (let idx = 0; idx < DRIVE_Q.length; idx++) {
        const p = DRIVE_Q[idx].picked;
        if (p === undefined) {
          alert('Answer all questions.');
          return;
        }
        const w = DRIVE_Q[idx].opts[p].w;
        Object.keys(w).forEach(k => (scores[k] += w[k]));
      }
      let top = 'fear';
      let best = -1;
      Object.keys(scores).forEach(k => {
        if (scores[k] > best) {
          best = scores[k];
          top = k;
        }
      });
      write(S.driveKillerQuiz, { top, scores, at: new Date().toISOString() });
      const plan = DRIVE_PLANS[top] || DRIVE_PLANS.fear;
      resEl.hidden = false;
      resEl.className = 'tools-card';
      resEl.innerHTML =
        `<div class="result-label">#1 blocker: ${plan.title}</div>` +
        `<ol class="quote-list" style="list-style:decimal">${plan.plan.map(s => `<li>${s}</li>`).join('')}</ol>`;
    });
  }

  const MOT_Q = [
    { q: 'You move fastest when…', opts: [
      { t: 'It connects to a bigger mission', v: 'purpose' },
      { t: 'Someone else is watching / competing', v: 'competition' },
      { t: 'Deadlines or consequences loom', v: 'fear' },
      { t: 'People I love are counting on me', v: 'love' },
      { t: 'I think about what I will leave behind', v: 'legacy' }
    ]},
    { q: 'Praise that hits hardest…', opts: [
      { t: '“That actually mattered.”', v: 'purpose' },
      { t: '“Nobody else could have done that.”', v: 'competition' },
      { t: '“You didn’t quit.”', v: 'fear' },
      { t: '“You made us proud.”', v: 'love' },
      { t: '“People will remember this.”', v: 'legacy' }
    ]},
    { q: 'When motivation fades you…', opts: [
      { t: 'Reconnect to why', v: 'purpose' },
      { t: 'Find a rival or metric', v: 'competition' },
      { t: 'Raise stakes / deadline', v: 'fear' },
      { t: 'Remember who benefits', v: 'love' },
      { t: 'Zoom out to decades', v: 'legacy' }
    ]}
  ];

  const MOT_COACH = {
    purpose: { coach: 'Wise Mentor', mantraCat: 'abundance' },
    competition: { coach: 'Drill Sergeant', mantraCat: 'discipline' },
    fear: { coach: 'Therapist', mantraCat: 'resilience' },
    love: { coach: 'Hype Friend', mantraCat: 'self-worth' },
    legacy: { coach: 'Wise Mentor', mantraCat: 'discipline' }
  };

  function renderMotivationQuiz() {
    const mount = document.getElementById('motivationQuizMount');
    const resEl = document.getElementById('motivationQuizResult');
    if (!mount) return;
    const counts = { purpose: 0, competition: 0, fear: 0, love: 0, legacy: 0 };
    mount.innerHTML = MOT_Q.map((item, idx) => (
      `<div class="tools-card" style="margin-top:0.75rem">` +
      `<div style="font-size:0.9rem;margin-bottom:0.6rem">${item.q}</div>` +
      `<div class="quiz-options" style="flex-direction:column;align-items:stretch" id="motQ${idx}">` +
      item.opts.map((o, j) => (
        `<button type="button" class="quiz-opt" style="text-align:left" data-mot="${idx}" data-v="${o.v}">${o.t}</button>`
      )).join('') +
      `</div></div>`
    )).join('');
    mount.innerHTML += '<button type="button" class="btn-primary" id="motResultBtn" style="margin-top:1rem">Match me</button>';

    mount.querySelectorAll('[data-mot]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-mot'));
        const wrap = document.getElementById(`motQ${idx}`);
        wrap.querySelectorAll('.quiz-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        MOT_Q[idx].pickedV = btn.getAttribute('data-v');
      });
    });

    mount.querySelector('#motResultBtn').addEventListener('click', () => {
      Object.keys(counts).forEach(k => (counts[k] = 0));
      for (let idx = 0; idx < MOT_Q.length; idx++) {
        const v = MOT_Q[idx].pickedV;
        if (!v) {
          alert('Answer all 3.');
          return;
        }
        counts[v]++;
      }
      let top = 'purpose';
      let best = -1;
      Object.keys(counts).forEach(k => {
        if (counts[k] > best) {
          best = counts[k];
          top = k;
        }
      });
      write(S.motivationMatchQuiz, { top, at: new Date().toISOString() });
      const pair = MOT_COACH[top];
      resEl.hidden = false;
      resEl.className = 'tools-card';
      resEl.innerHTML =
        `<div class="result-label">Driver: ${top}</div>` +
        `<p>Try <strong>${pair.coach}</strong> mode in Coaching below. Mantra category lean: <strong>${pair.mantraCat}</strong> (on home Mantras).</p>` +
        `<p class="cta-note"><a href="index.html#mantras" style="color:var(--orange)">Open mantras →</a></p>`;
    });
  }

  const PERSONA_COPY = {
    drill: {
      title: 'DRILL SERGEANT',
      blurb: 'No excuses. One rep now.',
      sample: 'You are not tired. You are undecided. Decide: five minutes of work starting in ten seconds.'
    },
    mentor: {
      title: 'WISE MENTOR',
      blurb: 'Long game. Character over mood.',
      sample: 'The goal is not intensity today — it is never abandoning yourself on the hard days.'
    },
    hype: {
      title: 'HYPE FRIEND',
      blurb: 'Energy up. Celebrate forward motion.',
      sample: 'You already did the impossible before — this is smaller. Turn the music up and take the step.'
    },
    therapist: {
      title: 'THERAPIST',
      blurb: 'Gentle truth. Name the feeling, then one kind action.',
      sample: 'It makes sense you are struggling. What is one supportive action your wisest friend would assign for the next hour?'
    }
  };

  function initPersona() {
    const cur = read(S.coachPersona, 'mentor');
    const blur = document.getElementById('personaBlurb');
    const samp = document.getElementById('personaSample');
    document.querySelectorAll('#personaPick [data-persona]').forEach(btn => {
      if (btn.getAttribute('data-persona') === cur) btn.classList.add('selected');
      btn.addEventListener('click', () => {
        const p = btn.getAttribute('data-persona');
        document.querySelectorAll('#personaPick .quiz-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        write(S.coachPersona, p);
        const c = PERSONA_COPY[p] || PERSONA_COPY.mentor;
        if (blur) blur.textContent = c.title;
        if (samp) samp.textContent = `${c.blurb} ${c.sample}`;
      });
    });
    const c = PERSONA_COPY[cur] || PERSONA_COPY.mentor;
    if (blur) blur.textContent = c.title;
    if (samp) samp.textContent = `${c.blurb} ${c.sample}`;
  }

  const WEEKLY = {
    confidence: {
      title: 'Confidence week',
      days: [
        { tasks: ['Stand tall for 2 minutes', 'Speak one clear sentence without hedging'], ref: 'Where did you feel strongest today?' },
        { tasks: ['Prep one hard question before a conversation', 'Celebrate one small win out loud'], ref: 'What evidence shows you are more capable than you felt?' },
        { tasks: ['Do one thing you avoided last week', 'Write a “proof list” of 5 past wins'], ref: 'Which win surprised you most?' },
        { tasks: ['Teach someone one thing you know well', 'Posture + eye contact practice'], ref: 'When did you feel seen today?' },
        { tasks: ['Ask for feedback on one piece of work', 'Say no to one distraction'], ref: 'What feedback stung — and what was useful?' },
        { tasks: ['Repeat a hard task you once failed', 'Visualize tomorrow’s key moment'], ref: 'What changed in your self-talk?' },
        { tasks: ['Lead one moment (start the call, pick the plan)', 'Journal: I am becoming…'], ref: 'What identity did you protect this week?' }
      ]
    },
    discipline: {
      title: 'Discipline week',
      days: [
        { tasks: ['Same wake time ±15 min', 'Phone away first 30 min'], ref: 'What friction did you remove?' },
        { tasks: ['Time-block calendar for tomorrow tonight', 'One “boring” task to completion'], ref: 'What boring win felt best?' },
        { tasks: ['No snooze', 'Track water intake'], ref: 'Where did you negotiate with yourself?' },
        { tasks: ['Deep work 45 min timer', 'End with 5 min tidy'], ref: 'What pulled you off track?' },
        { tasks: ['Prep clothes/gear night before', 'One hard physical rep'], ref: 'How did body state affect focus?' },
        { tasks: ['Review week systems', 'Delete one redundant app'], ref: 'What system saved you most time?' },
        { tasks: ['Plan next week’s non-negotiables', 'Rest without guilt block'], ref: 'What will you carry forward?' }
      ]
    },
    fear: {
      title: 'Fear-facing week',
      days: [
        { tasks: ['Name one fear in writing', 'Do a 2-minute version of the scary task'], ref: 'What was the realistic worst case?' },
        { tasks: ['Share one worry with a trusted person', 'Walk 10 min without phone'], ref: 'What support did you feel?' },
        { tasks: ['Cold shower or cold face splash', 'Send one message you delayed'], ref: 'Where did courage spike?' },
        { tasks: ['Start before you feel ready (timer 10 min)', 'Box breathing 3 rounds'], ref: 'What story did fear tell — and what was true?' },
        { tasks: ['Micro-rejection: ask for something small', 'Journal: fear vs danger'], ref: 'What did you learn about the gap?' },
        { tasks: ['Repeat hardest day’s task slightly bigger', 'Celebrate anyway'], ref: 'How did repetition change the fear temperature?' },
        { tasks: ['Plan next fear ladder step', 'Rest + gratitude three lines'], ref: 'What will you attempt next month?' }
      ]
    }
  };

  function initWeekly() {
    const ui = document.getElementById('weekProgramUI');
    if (!ui) return;
    const raw = read(S.weeklyProgramState, null);
    const base = raw && typeof raw === 'object' ? raw : {};
    const validWeek = w => Boolean(w && WEEKLY[w]);
    let active = {
      week: validWeek(base.week) ? base.week : 'confidence',
      checks: base.checks && typeof base.checks === 'object' ? base.checks : {},
      reflections: base.reflections && typeof base.reflections === 'object' ? base.reflections : {}
    };
    function render() {
      const prog = WEEKLY[active.week];
      if (!prog) return;
      const checks = active.checks || {};
      const refs = active.reflections || {};
      ui.innerHTML = `<div class="result-label">${prog.title}</div>`;
      prog.days.forEach((d, i) => {
        const dayKey = `${active.week}-${i}`;
        const card = document.createElement('div');
        card.className = 'tools-card';
        card.style.marginTop = '0.75rem';
        card.innerHTML =
          `<div class="result-label">Day ${i + 1}</div>` +
          d.tasks
            .map(
              (t, ti) =>
                `<label class="daily-goal-check" style="margin:0.35rem 0"><input type="checkbox" data-wk="${dayKey}-${ti}" /> ${t}</label>`
            )
            .join('') +
          `<div style="margin-top:0.75rem;font-size:0.75rem;color:var(--sand)">Reflection</div>` +
          `<textarea class="mantra-personal-ta" rows="2" data-ref="${dayKey}" placeholder="${d.ref}">${refs[dayKey] || ''}</textarea>`;
        ui.appendChild(card);
        d.tasks.forEach((t, ti) => {
          const id = `${dayKey}-${ti}`;
          const cb = card.querySelector(`[data-wk="${id}"]`);
          cb.checked = Boolean(checks[id]);
          cb.addEventListener('change', () => {
            checks[id] = cb.checked;
            active.checks = checks;
            write(S.weeklyProgramState, active);
          });
        });
        const ta = card.querySelector(`[data-ref="${dayKey}"]`);
        ta.addEventListener('change', () => {
          refs[dayKey] = ta.value;
          active.reflections = refs;
          write(S.weeklyProgramState, active);
        });
      });
    }
    document.querySelectorAll('#weekProgramPick [data-week]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#weekProgramPick .quiz-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        active.week = btn.getAttribute('data-week');
        active.checks = active.checks || {};
        active.reflections = active.reflections || {};
        write(S.weeklyProgramState, active);
        ui.innerHTML = '';
        render();
      });
    });
    const first = document.querySelector(`#weekProgramPick [data-week="${active.week}"]`);
    if (first) {
      document.querySelectorAll('#weekProgramPick .quiz-opt').forEach(b => b.classList.remove('selected'));
      first.classList.add('selected');
    }
    render();
  }

  function initExcuseCoach() {
    const inp = document.getElementById('excuseInput');
    const out = document.getElementById('excuseOutput');
    const sub = document.getElementById('excuseSubmit');
    if (!inp || !out || !sub) return;
    const rules = [
      { k: /tired|exhaust|sleep/i, r: 'Tired is real — and your future self still needs one honest rep. Lower the bar to something doable in five minutes, then sleep earlier tonight as repair.', a: 'Set a timer for 5 minutes. Do the smallest slice. Then rest.' },
      { k: /busy|time|no time/i, r: '“Busy” often means unprioritized. Trade one scroll block for the task you keep moving.', a: 'Delete one meeting or task from tomorrow’s list. Replace with a 25-minute block on the hard thing.' },
      { k: /scared|afraid|fear|anxious/i, r: 'Fear shrinks when named. Courage is not absence of fear — it is motion while afraid.', a: 'Write the fear in one sentence. Do a 2-minute version of the task.' },
      { k: /perfect|not ready|polish/i, r: 'Readiness is a myth sold to procrastinators. B+ shipped beats A+ imaginary.', a: 'Ship a draft to one trusted person before end of day.' },
      { k: /later|tomorrow|monday/i, r: 'Later is how months vanish. You are not negotiating with a calendar — you are negotiating with identity.', a: 'Start in the next 60 seconds for 60 seconds only.' }
    ];
    sub.addEventListener('click', () => {
      const text = inp.value.trim();
      if (!text) return;
      let hit = rules.find(x => x.k.test(text));
      if (!hit) hit = { r: 'That excuse has kept you safe short-term. Long-term it taxes your self-trust. Pick one action that proves you listen to yourself.', a: 'Do one concrete rep in the next 10 minutes and log it.' };
      out.style.display = 'block';
      out.innerHTML = `<p>${hit.r}</p><p><strong>Action:</strong> ${hit.a}</p>`;
    });
  }

  const HOF = [
    { cat: 'athletes', name: 'Michael Jordan', blurb: 'Cut from his high school varsity team — used rejection as fuel to obsess on fundamentals.', prompt: 'What fundamental would your hero repeat today?' },
    { cat: 'athletes', name: 'Serena Williams', blurb: 'Battled injuries and doubt while rewriting what dominance looks like on her terms.', prompt: 'Where can you bring calm confidence instead of noise?' },
    { cat: 'artists', name: 'Vincent van Gogh', blurb: 'Sold few paintings in life — relentless output anyway.', prompt: 'What would you still make if nobody clapped?' },
    { cat: 'artists', name: 'Lady Gaga', blurb: 'Rejected early; built a lane through specificity and work ethic.', prompt: 'What is your weirdest honest strength?' },
    { cat: 'entrepreneurs', name: 'Walt Disney', blurb: 'Bankruptcies and betrayals — rebuilt stories and systems.', prompt: 'What small system would make your dream less fragile?' },
    { cat: 'entrepreneurs', name: 'Sara Blakely', blurb: 'Door-to-door sales and years of “no” before Spanx scaled.', prompt: 'Who is the next person you will ask for help or feedback?' },
    { cat: 'everyday', name: 'Parents working doubles', blurb: 'Invisible reps — shifts stacked for family futures.', prompt: 'Who is counting on your consistency this week?' },
    { cat: 'everyday', name: 'Students grinding quietly', blurb: 'Progress without spotlight — late nights that become leverage.', prompt: 'What boring hour today is actually compound interest?' }
  ];

  function initHof() {
    const grid = document.getElementById('hofGrid');
    if (!grid) return;
    let filter = 'all';
    function draw() {
      grid.innerHTML = '';
      HOF.filter(h => filter === 'all' || h.cat === filter).forEach(h => {
        const el = document.createElement('div');
        el.className = 'hof-card';
        el.innerHTML = `<h3>${h.name}</h3><p style="color:var(--sand);font-size:0.9rem">${h.blurb}</p><p style="margin-top:0.75rem;font-size:0.85rem"><em>What would they do?</em> ${h.prompt}</p>`;
        grid.appendChild(el);
      });
    }
    document.querySelectorAll('#hofFilter [data-hof]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#hofFilter .quiz-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        filter = btn.getAttribute('data-hof');
        draw();
      });
    });
    draw();
  }

  const QG = [
    'Everything happens for a reason.',
    'Good vibes only.',
    'Just believe and the universe will provide.',
    'You are exactly where you need to be.',
    'Happiness is a choice.'
  ];
  const QY = [
    'Do the next rep anyway — what is it?',
    'What is the smallest proof you can ship in 20 minutes?',
    'Who will suffer if you quit here — name them.',
    'What is the hard conversation you are avoiding?',
    'What system would make this automatic next week?'
  ];

  function initQuotes() {
    const g = document.getElementById('quoteGraveyard');
    const y = document.getElementById('quoteGym');
    if (g) g.innerHTML = QG.map(q => `<li>${q} <button type="button" class="btn-ghost" style="padding:0.1rem 0.35rem;font-size:0.65rem" data-copy="${encodeURIComponent(q)}">copy</button></li>`).join('');
    if (y) y.innerHTML = QY.map(q => `<li>${q} <button type="button" class="btn-ghost" style="padding:0.1rem 0.35rem;font-size:0.65rem" data-copy="${encodeURIComponent(q)}">copy</button></li>`).join('');
    document.querySelectorAll('#quotes [data-copy]').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(decodeURIComponent(btn.getAttribute('data-copy')));
        btn.textContent = '✓';
        setTimeout(() => (btn.textContent = 'copy'), 900);
      });
    });
  }

  function initOnePct() {
    const inp = document.getElementById('onePctInput');
    const save = document.getElementById('onePctSave');
    const svg = document.getElementById('onePctChart');
    if (!inp || !save || !svg) return;
    const log = read(S.onePercentLog, {});
    function drawChart() {
      const keys = Object.keys(log).sort();
      const n = keys.length;
      const W = 400;
      const H = 160;
      const pad = 20;
      let d = `M ${pad} ${H - pad}`;
      const maxX = Math.max(30, n);
      for (let i = 0; i <= maxX; i++) {
        const x = pad + (i / maxX) * (W - 2 * pad);
        const yv = H - pad - (Math.pow(1.01, i) - 1) * 40;
        d += ` L ${x} ${Math.max(pad, Math.min(H - pad, yv))}`;
      }
      svg.innerHTML =
        `<text x="${pad}" y="14" fill="#888" font-size="10">Motivational 1% curve (not a forecast)</text>` +
        `<path d="${d}" fill="none" stroke="var(--orange)" stroke-width="2"/>` +
        `<text x="${pad}" y="${H - 4}" fill="#aaa" font-size="10">Days logged: ${n}</text>`;
    }
    if (log[today()]) inp.value = log[today()];
    save.addEventListener('click', () => {
      const v = inp.value.trim();
      if (!v) return;
      log[today()] = v;
      write(S.onePercentLog, log);
      save.textContent = 'Logged ✓';
      setTimeout(() => (save.textContent = 'Log today'), 1200);
      drawChart();
    });
    drawChart();
  }

  function initWall() {
    const list = document.getElementById('wallList');
    const body = document.getElementById('wallBody');
    const name = document.getElementById('wallName');
    const post = document.getElementById('wallPost');
    const demo = document.getElementById('wallDemo');
    const exp = document.getElementById('wallExport');
    if (!list || !post) return;
    function posts() {
      return read(S.wallPosts, []);
    }
    function savePosts(p) {
      write(S.wallPosts, p);
      render();
    }
    function render() {
      list.innerHTML = posts()
        .map(
          (p, i) =>
            `<div class="wall-post"><div><small>${p.name || 'Anonymous'} · ${p.at.slice(0, 10)}</small>${p.body}</div>` +
            `<button type="button" class="btn-ghost" data-up="${i}">Up ${p.votes || 0}</button></div>`
        )
        .join('');
      list.querySelectorAll('[data-up]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = posts();
          const i = Number(btn.getAttribute('data-up'));
          p[i].votes = (p[i].votes || 0) + 1;
          savePosts(p);
        });
      });
    }
    post.addEventListener('click', () => {
      const b = (body && body.value) || '';
      if (!b.trim()) return;
      const p = posts();
      p.unshift({ name: (name && name.value) || '', body: b.trim(), at: new Date().toISOString(), votes: 0 });
      savePosts(p);
      body.value = '';
    });
    if (demo) {
      demo.addEventListener('click', () => {
        savePosts([
          { name: 'A.', body: 'No snooze for 7 days.', at: new Date().toISOString(), votes: 2 },
          { name: 'Anonymous', body: 'Ship my portfolio page — B+ version.', at: new Date().toISOString(), votes: 1 },
          ...posts()
        ]);
      });
    }
    if (exp) {
      exp.addEventListener('click', async () => {
        const blob = JSON.stringify(posts(), null, 2);
        await G.downloadFile('grit-wall.json', blob, 'application/json;charset=utf-8');
      });
    }
    render();
  }

  function initAlarm() {
    const box = document.getElementById('alarmSuggestions');
    const lines = [
      'Your future self is watching.',
      'Soft life = small life.',
      'Feet on the floor before the story starts.',
      'Prove it with the first ten minutes.',
      'Discipline is remembering what you want.'
    ];
    function copyAlarmLine(text) {
      const t = text || 'GRIT — up.';
      navigator.clipboard.writeText(t).then(() => {
        if (typeof window.showGritToast === 'function') {
          window.showGritToast('Copied — paste into your phone’s alarm label.');
        }
      }).catch(() => {
        if (typeof window.showGritToast === 'function') {
          window.showGritToast('Could not access clipboard. Select the text and copy manually.', true);
        }
      });
    }
    if (box) {
      box.innerHTML = lines
        .map(
          (l, i) =>
            `<div style="display:flex;justify-content:space-between;align-items:center;margin:0.35rem 0;gap:0.5rem">` +
            `<span style="font-size:0.9rem">${l}</span>` +
            `<button type="button" class="btn-ghost" data-alarm="${i}">Copy</button></div>`
        )
        .join('');
      box.querySelectorAll('[data-alarm]').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = Number(btn.getAttribute('data-alarm'));
          copyAlarmLine(lines[i]);
        });
      });
    }
    const cus = document.getElementById('alarmCustom');
    const copy = document.getElementById('alarmCopy');
    if (copy && cus) {
      copy.addEventListener('click', () => {
        copyAlarmLine(cus.value.trim() || 'GRIT — up.');
      });
    }
  }

  function initPledge() {
    const cb = document.getElementById('pledgeSign');
    const badge = document.getElementById('pledgeBadge');
    const saveLog = document.getElementById('snoozeLogSave');
    const pledge = read(S.snoozePledge, {});
    const log = read(S.snoozeLog, {});
    if (cb) {
      cb.checked = Boolean(pledge.signed);
      cb.addEventListener('change', () => {
        write(S.snoozePledge, { signed: cb.checked, at: new Date().toISOString() });
        updateBadge();
      });
    }
    function streakKept() {
      let c = 0;
      let d = today();
      while (log[d] === 'kept') {
        c++;
        d = G.shiftISODate(d, -1);
        if (c > 500) break;
      }
      return c;
    }
    function updateBadge() {
      const p = read(S.snoozePledge, {});
      if (!badge) return;
      if (p.signed) badge.textContent = `Badge: pledge active · kept streak ${streakKept()} days`;
      else badge.textContent = 'Sign the pledge to earn your badge.';
    }
    if (log[today()]) {
      const r = document.querySelector(`input[name="snooze"][value="${log[today()]}"]`);
      if (r) r.checked = true;
    }
    if (saveLog) {
      saveLog.addEventListener('click', () => {
        const sel = document.querySelector('input[name="snooze"]:checked');
        if (!sel) return;
        log[today()] = sel.value;
        write(S.snoozeLog, log);
        updateBadge();
        saveLog.textContent = 'Saved ✓';
        setTimeout(() => (saveLog.textContent = 'Save today'), 1200);
      });
    }
    updateBadge();
  }

  const GEN_TASKS = {
    7: ['One non-negotiable rep', 'Hydrate early', '10 min movement', 'Journal one line', 'Sleep window set', 'Help one person', 'Review wins']
  };

  function tasksForDays(n) {
    const base = GEN_TASKS[7];
    const out = [];
    for (let i = 0; i < n; i++) out.push(`Day ${i + 1}: ${base[i % base.length]}`);
    return out;
  }

  function initGenericChallenge() {
    const pick = document.getElementById('genericChallengePick');
    const ui = document.getElementById('genericChallengeUI');
    const cert = document.getElementById('certPrintArea');
    const certBtn = document.getElementById('certPrintBtn');
    if (!pick || !ui) return;
    const runs = read(S.genericChallengeRuns, {});
    let days = 7;
    function render() {
      const id = `run-${days}`;
      if (!runs[id]) {
        runs[id] = { done: {}, started: today() };
        write(S.genericChallengeRuns, runs);
      }
      const r = runs[id];
      const tasks = tasksForDays(days);
      ui.innerHTML =
        `<p class="cta-note">Started ${r.started} · illustrative “community” bar: your completions vs length</p>` +
        `<div class="challenge-runner-days">` +
        tasks
          .map((t, i) => {
            const done = Boolean(r.done[i]);
            return `<button type="button" class="${done ? 'done' : ''}" data-day="${i}" title="${t.replace(/"/g, '&quot;')}">D${i + 1}</button>`;
          })
          .join('') +
        `</div>` +
        `<p style="font-size:0.8rem;color:var(--sand);max-height:8rem;overflow:auto">${tasks
          .map((t, i) => `<span style="display:block;margin:0.15rem 0"><strong>D${i + 1}</strong> ${t.replace(/^Day \d+: /, '')}</span>`)
          .join('')}</p>`;
      ui.querySelectorAll('[data-day]').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = Number(btn.getAttribute('data-day'));
          r.done[i] = !r.done[i];
          runs[id] = r;
          write(S.genericChallengeRuns, runs);
          render();
        });
      });
      const total = Object.keys(r.done).filter(k => r.done[k]).length;
      const complete = total >= tasks.length;
      if (cert) cert.style.display = complete ? 'block' : 'none';
      if (certBtn) certBtn.style.display = complete ? 'inline-block' : 'none';
      if (complete && cert) {
        document.getElementById('certDays').textContent = `${days}-day challenge complete`;
      }
    }
    pick.querySelectorAll('[data-days]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#genericChallengePick .quiz-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        days = Number(btn.getAttribute('data-days'));
        render();
      });
    });
    pick.querySelector('[data-days="7"]').classList.add('selected');
    render();
    if (certBtn) {
      certBtn.addEventListener('click', () => window.print());
    }
  }

  function initBonus() {
    const fl = read(S.futureLetter, {});
    const fb = document.getElementById('futureLetterBody');
    const fd = document.getElementById('futureLetterReveal');
    const fs = document.getElementById('futureLetterSave');
    const flk = document.getElementById('futureLetterLocked');
    if (fb) fb.value = fl.body || '';
    if (fd) fd.value = fl.reveal || '';
    if (fs) {
      fs.addEventListener('click', () => {
        write(S.futureLetter, { body: fb.value, reveal: fd.value });
        fs.textContent = 'Saved ✓';
        setTimeout(() => (fs.textContent = 'Save'), 1200);
      });
    }
    if (fl.reveal && fl.reveal > today() && fl.body) {
      fb.disabled = true;
      flk.style.display = 'block';
      flk.textContent = `Locked until ${fl.reveal}.`;
    }

    const fails = read(S.failureResume, []);
    function renderFails() {
      const ul = document.getElementById('failList');
      if (!ul) return;
      ul.innerHTML = fails.map(f => `<li style="margin-bottom:0.6rem"><strong>${f.title}</strong> — ${f.lesson}</li>`).join('');
    }
    document.getElementById('failAdd')?.addEventListener('click', () => {
      const t = document.getElementById('failTitle').value.trim();
      const l = document.getElementById('failLesson').value.trim();
      if (!t || !l) return;
      fails.unshift({ title: t, lesson: l });
      write(S.failureResume, fails);
      renderFails();
    });
    renderFails();

    const lb = document.getElementById('leaderboardList');
    if (lb) {
      const gq = read(S.gritScoreQuiz, {});
      const lines = [
        `Habit streak (home): ${G.computeStreakCount()} days`,
        `Goal-check streak: ${G.computeGoalStreak()} days`,
        gq.lastScore != null ? `Last grit quiz: ${gq.lastScore}/50` : 'Grit quiz: not taken yet'
      ];
      lb.innerHTML = lines.map(t => `<li style="margin:0.35rem 0">${t}</li>`).join('');
    }

    document.getElementById('digestBuild')?.addEventListener('click', () => {
      const out = document.getElementById('digestOut');
      const copy = document.getElementById('digestCopy');
      const mail = document.getElementById('digestMail');
      const body =
        `# GRIT weekly digest\nDate: ${today()}\n` +
        `- Mission: ${G.getDailyMissionForDate(today())}\n` +
        `- Streaks: habits ${G.computeStreakCount()}, goals ${G.computeGoalStreak()}\n` +
        `- Cold showers logged: ${Object.keys(read(S.coldShowerByDate, {})).length} total days marked\n`;
      out.style.display = 'block';
      copy.style.display = 'inline-block';
      if (mail) mail.style.display = 'inline-block';
      out.textContent = body;
      write(S.weeklyDigestLastCopy, body);
    });
    document.getElementById('digestCopy')?.addEventListener('click', () => {
      const t = document.getElementById('digestOut').textContent;
      navigator.clipboard.writeText(t);
    });
    document.getElementById('digestMail')?.addEventListener('click', () => {
      const t = document.getElementById('digestOut').textContent || read(S.weeklyDigestLastCopy, '');
      const subj = encodeURIComponent('GRIT weekly digest');
      const body = encodeURIComponent(t);
      window.location.href = `mailto:?subject=${subj}&body=${body}`;
    });

    let stream = null;
    let rec = null;
    const v = document.getElementById('mirrorVideo');
    document.getElementById('mirrorStart')?.addEventListener('click', async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        v.srcObject = stream;
        v.style.display = 'block';
        v.play();
        document.getElementById('mirrorRec').disabled = false;
      } catch {
        alert('Camera/mic permission denied or unavailable.');
      }
    });
    document.getElementById('mirrorRec')?.addEventListener('click', async () => {
      if (!stream) return;
      rec = new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = e => chunks.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'grit-mantra-mirror.webm';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      };
      rec.start();
      document.getElementById('mirrorStop').disabled = false;
      setTimeout(() => {
        if (rec && rec.state === 'recording') rec.stop();
      }, 10000);
    });
    document.getElementById('mirrorStop')?.addEventListener('click', () => {
      if (rec && rec.state === 'recording') rec.stop();
    });
  }

  initPlaylists();
  initWakeRitual();
  initFiveSec();
  initColdShower();
  renderGritQuiz();
  renderDriveQuiz();
  renderMotivationQuiz();
  initPersona();
  initWeekly();
  initExcuseCoach();
  initHof();
  initQuotes();
  initOnePct();
  initWall();
  initAlarm();
  initPledge();
  initGenericChallenge();
  initBonus();
})();
