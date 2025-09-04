
// HabbitZ Vocab Power-Up — 30-Day Vocabulary Challenge App
// Enhanced with loading screen and improved user experience

// DOM Elements for loading
const loadingScreen = document.getElementById('loadingScreen');
const appContainer = document.getElementById('appContainer');

// Initialize app with loading screen
document.addEventListener('DOMContentLoaded', function() {
    // Show loading screen initially
    loadingScreen.classList.remove('hidden');
    appContainer.style.opacity = '0';
    
    // Simulate app initialization
    setTimeout(() => {
        // Hide loading screen
        loadingScreen.classList.add('hidden');
        appContainer.style.opacity = '1';
        appContainer.style.transition = 'opacity 0.5s ease';
        
        // Initialize the app
        initializeApp();
    }, 2000);
});

// App initialization function
function initializeApp() {
    console.log('🎓 HabbitZ Vocab Power-Up initialized!');
    initStreakUI();
    
    // Auto-select last completed day + 1
    const lastDay = parseInt(localStorage.getItem(LS_KEYS.lastCompletedDay) || "0");
    const nextDay = Math.min(lastDay + 1, 30);
    daySelect.value = nextDay;
}
const LS_KEYS = {
  streakCount: 'vp_streak_count',
  lastDate: 'vp_last_date',
  lastCompletedDay: 'vp_last_completed_day',
  scores: 'vp_scores' // {day: {correct, total, pct}}
};

const daySelect = document.getElementById('daySelect');
const startBtn  = document.getElementById('startLesson');
const prevBtn   = document.getElementById('prevActivity');
const nextBtn   = document.getElementById('nextActivity');
const resetBtn  = document.getElementById('resetBtn');
const resetProgressBtn = document.getElementById('resetProgress');

const exportBtn = document.getElementById('exportCSV');


const lessonEl  = document.getElementById('lesson');
const titleEl   = document.getElementById('lessonTitle');
const introEl   = document.getElementById('lessonIntro');
const actWrap   = document.getElementById('activityContainer');
const resultsEl = document.getElementById('results');
const summaryEl = document.getElementById('summary');

const streakCountEl = document.getElementById('streakCount');

let currentDay = 1;
let lesson = null;
let activityIndex = 0;
let gradebook = []; // track results

// --- Day selector
for(let d=1; d<=30; d++){
  const opt = document.createElement('option');
  opt.value = d;
  opt.textContent = `Day ${d}`;
  daySelect.appendChild(opt);
}
daySelect.value = localStorage.getItem(LS_KEYS.lastCompletedDay) || "1";

// --- Streak load
initStreakUI();

startBtn.addEventListener('click', async () => {
  currentDay = parseInt(daySelect.value, 10);
  await loadLesson(currentDay);
  showActivity(0);
});

prevBtn.addEventListener('click', () => {
  if(activityIndex>0){ showActivity(activityIndex-1); }
});
nextBtn.addEventListener('click', () => {
  if(activityIndex < (lesson.activities.length - 1)){
    showActivity(activityIndex+1);
  } else {
    showSummary();
  }
});
resetBtn.addEventListener('click', () => {
  lessonEl.classList.add('hidden');
  resultsEl.classList.add('hidden');
  document.querySelector('.controls').scrollIntoView({behavior:'smooth'});
});

exportBtn.addEventListener('click', () => {
  const csv = exportScoresCSV();
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vocab-powerup-progress.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

resetProgressBtn.addEventListener('click', () => {
  if(confirm('Reset streak, scores, and last completed day on this device?')){
    Object.values(LS_KEYS).forEach(k => localStorage.removeItem(k));
    initStreakUI();
    daySelect.value = "1";
    alert('Progress reset.')
  }
});

async function loadLesson(day){
  const path = `data/day${day}.json`;
  try{
    const res = await fetch(path);
    if(!res.ok) throw new Error(`Not found: ${path}`);
    lesson = await res.json();
  }catch(e){
    lesson = {
      day,
      title: `Day ${day}`,
      intro: "Lesson content coming soon.",
      activities: []
    };
  }
  titleEl.textContent = `${lesson.title}`;
  introEl.textContent = lesson.intro || "";
  gradebook = [];
  activityIndex = 0;
  lessonEl.classList.remove('hidden');
  resultsEl.classList.add('hidden');
  actWrap.innerHTML = "";
}

function showActivity(idx){
  activityIndex = idx;
  const a = lesson.activities[idx];
  actWrap.innerHTML = "";
  if(!a){
    const p = document.createElement('p');
    p.textContent = "No activities for this day yet.";
    actWrap.appendChild(p);
    return;
  }
  const el = renderActivity(a, idx);
  actWrap.appendChild(el);
  el.scrollIntoView({behavior:'smooth'});
}

function renderActivity(a, idx){
  const wrap = document.createElement('div');
  wrap.className = "activity";
  const h = document.createElement('h3');
  h.textContent = `${idx+1}. ${toTitle(a.type)}`;
  wrap.appendChild(h);
  if(a.instructions){
    const p = document.createElement('p');
    p.className = "muted";
    p.textContent = a.instructions;
    wrap.appendChild(p);
  }

  if(a.type === 'antonym_test'){
    a.questions.forEach((q,i)=>{
      const qEl = document.createElement('div');
      qEl.className = "q";
      const label = document.createElement('label');
      label.textContent = `Antonym for "${q.prompt}"`;
      const input = document.createElement('input');
      input.type = "text";
      const ans = document.createElement('div');
      ans.className = "answer";
      const btn = document.createElement('button');
      btn.textContent = "Check";
      btn.addEventListener('click', ()=>{
        const correct = input.value.trim().toLowerCase() === q.answer.toLowerCase();
        ans.innerHTML = correct ? `<span class="badge correct">✓ Correct</span>`
                                : `<span class="badge incorrect">✗</span> Answer: ${q.answer}`;
        recordResult('antonym', correct);
      });
      qEl.appendChild(label); qEl.appendChild(input); qEl.appendChild(btn); qEl.appendChild(ans);
      wrap.appendChild(qEl);
    });
  }

  if(a.type === 'synonym_test'){
    a.questions.forEach((q,i)=>{
      const qEl = document.createElement('div');
      qEl.className = "q";
      const label = document.createElement('label');
      label.textContent = `Two synonyms for "${q.prompt}" (comma separated)`;
      const input = document.createElement('input');
      input.type = "text";
      const ans = document.createElement('div');
      ans.className = "answer";
      const btn = document.createElement('button');
      btn.textContent = "Check";
      btn.addEventListener('click', ()=>{
        const parts = input.value.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
        const set = new Set(parts);
        let score = 0;
        (q.answers||[]).forEach(ref=>{
          if(set.has(ref.toLowerCase())) score++;
        });
        const ok = score >= 2;
        ans.innerHTML = ok ? `<span class="badge correct">✓ Looks good</span>`
                           : `<span class="badge incorrect">Try again</span> e.g., ${q.answers.slice(0,3).join(', ')}`;
        recordResult('synonym', ok);
      });
      qEl.appendChild(label); qEl.appendChild(input); qEl.appendChild(btn); qEl.appendChild(ans);
      wrap.appendChild(qEl);
    });
  }

  if(a.type === 'multiple_choice'){
    a.questions.forEach(q=>{
      const qEl = document.createElement('div');
      qEl.className = "q";
      const p = document.createElement('p');
      p.textContent = q.prompt;
      qEl.appendChild(p);
      const group = 'mc-'+Math.random().toString(36).slice(2);
      q.options.forEach(opt=>{
        const lab = document.createElement('label');
        const inp = document.createElement('input');
        inp.type = 'radio';
        inp.name = group;
        inp.value = opt;
        lab.appendChild(inp);
        lab.appendChild(document.createTextNode(' '+opt));
        qEl.appendChild(lab);
      });
      const ans = document.createElement('div');
      ans.className = 'answer';
      const btn = document.createElement('button');
      btn.textContent = 'Check';
      btn.addEventListener('click', ()=>{
        const sel = qEl.querySelector('input[type=radio]:checked');
        const correct = sel && sel.value === q.answer;
        ans.innerHTML = correct ? `<span class="badge correct">✓ Correct</span>`
                                : `<span class="badge incorrect">✗</span> Answer: ${q.answer}`;
        recordResult('mc', !!correct);
      });
      qEl.appendChild(btn);
      qEl.appendChild(ans);
      wrap.appendChild(qEl);
    });
  }

  if(a.type === 'roots_match'){
    a.pairs.forEach(pair=>{
      const qEl = document.createElement('div');
      qEl.className = "q";
      const p = document.createElement('p');
      p.innerHTML = `<strong>${pair.root}</strong> → "${pair.meaning}" (example: ${pair.examples.join(', ')})`;
      qEl.appendChild(p);
      wrap.appendChild(qEl);
    });
    const tip = document.createElement('div');
    tip.className = 'answer';
    tip.textContent = 'Practice recalling meanings aloud before moving on.';
    wrap.appendChild(tip);
  }

  if(a.type === 'pronunciation'){
    // Each item has a target word and optional sample sentence
    (a.items||[]).forEach(item=>{
      const row = document.createElement('div');
      row.className = 'q pronounce-row';
      const w = document.createElement('span');
      w.className = 'word';
      w.textContent = item.word;
      const speakBtn = document.createElement('button');
      speakBtn.className = 'small';
      speakBtn.textContent = '🔊 Speak';
      speakBtn.addEventListener('click', ()=>{
        const say = item.say || item.word;
        speakText(say);
      });
      const recBtn = document.createElement('button');
      recBtn.className = 'small';
      recBtn.textContent = '🎤 Record';
      const res = document.createElement('span');
      res.className = 'rec-result muted';
      recBtn.addEventListener('click', ()=>{
        res.textContent = ' Listening...';
        recordAndTranscribe((text)=>{
          if(!text){ res.textContent = ' (no input)'; return; }
          const ok = text.trim().toLowerCase().includes(item.word.toLowerCase());
          res.innerHTML = ok ? ' ✓ Heard: "'+text+'"' : ' ✗ Heard: "'+text+'"';
          recordResult('pronunciation', ok);
        });
      });
      row.appendChild(w);
      if(item.sentence){
        const s = document.createElement('span');
        s.className = 'muted';
        s.textContent = ' — '+item.sentence;
        row.appendChild(s);
      }
      row.appendChild(speakBtn);
      row.appendChild(recBtn);
      row.appendChild(res);
      wrap.appendChild(row);
    });
  }

  if(a.type === 'match_pairs'){
    // Left terms with dropdown selection of right meanings
    const rightOptions = (a.pairs||[]).map(p=>p.right);
    (a.pairs||[]).forEach(pair=>{
      const row = document.createElement('div');
      row.className = 'match-row q';
      const lab = document.createElement('label');
      lab.textContent = pair.left;
      const sel = document.createElement('select');
      sel.className = 'match';
      const first = document.createElement('option');
      first.value = '';
      first.textContent = '— select —';
      sel.appendChild(first);
      // shuffle options for variety
      const shuffled = [...rightOptions].sort(()=>Math.random()-0.5);
      shuffled.forEach(opt=>{
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        sel.appendChild(o);
      });
      const ans = document.createElement('div');
      ans.className = 'answer';
      const btn = document.createElement('button');
      btn.className = 'small';
      btn.textContent = 'Check';
      btn.addEventListener('click', ()=>{
        const correct = sel.value && sel.value === pair.right;
        ans.innerHTML = correct ? `<span class="badge correct">✓ Correct</span>`
                                : `<span class="badge incorrect">✗</span> Answer: ${pair.right}`;
        recordResult('match', correct);
      });
      row.appendChild(lab);
      row.appendChild(sel);
      row.appendChild(btn);
      row.appendChild(ans);
      wrap.appendChild(row);
    });
  }

  if(a.type === 'progress_quiz'){
    // Mixed multiple-choice review
    a.questions.forEach(q=>{
      const qEl = document.createElement('div');
      qEl.className = "q";
      const p = document.createElement('p');
      p.textContent = q.prompt;
      qEl.appendChild(p);
      const group = 'pq-'+Math.random().toString(36).slice(2);
      q.options.forEach(opt=>{
        const lab = document.createElement('label');
        const inp = document.createElement('input');
        inp.type = 'radio';
        inp.name = group;
        inp.value = opt;
        lab.appendChild(inp);
        lab.appendChild(document.createTextNode(' '+opt));
        qEl.appendChild(lab);
      });
      const ans = document.createElement('div');
      ans.className = 'answer';
      const btn = document.createElement('button');
      btn.textEvent = 'Check';
      btn.textContent = 'Check';
      btn.addEventListener('click', ()=>{
        const sel = qEl.querySelector('input[type=radio]:checked');
        const correct = sel && sel.value === q.answer;
        ans.innerHTML = correct ? `<span class="badge correct">✓ Correct</span>`
                                : `<span class="badge incorrect">✗</span> Answer: ${q.answer}`;
        recordResult('progress', !!correct);
      });
      qEl.appendChild(btn);
      qEl.appendChild(ans);
      wrap.appendChild(qEl);
    });
  }

  return wrap;
}

function toTitle(s){
  return s.replace(/_/g,' ').replace(/\b\w/g, c=>c.toUpperCase());
}

function recordResult(kind, correct){
  gradebook.push({kind, correct});
}

function showSummary(){
  lessonEl.classList.add('hidden');
  resultsEl.classList.remove('hidden');
  const total = gradebook.length || 0;
  const correct = gradebook.filter(x=>x.correct).length;
  const pct = total? Math.round(correct*100/total): 0;
  summaryEl.innerHTML = `
    <p><span class="badge">Day ${lesson.day}</span>
       <span class="badge">Score: ${correct}/${total} (${pct}%)</span></p>
    <p class="muted">Great job! Keep your streak going tomorrow.</p>
  `;
  saveScore(lesson.day, correct, total, pct);
  bumpStreak();
  localStorage.setItem(LS_KEYS.lastCompletedDay, String(lesson.day));
  updateStreakUI();
  resultsEl.scrollIntoView({behavior:'smooth'});
}

// --- Streak helpers
function initStreakUI(){
  const c = parseInt(localStorage.getItem(LS_KEYS.streakCount)||'0',10);
  streakCountEl.textContent = String(c);
}

function updateStreakUI(){
  const c = parseInt(localStorage.getItem(LS_KEYS.streakCount)||'0',10);
  streakCountEl.textContent = String(c);
}

function bumpStreak(){
  const today = new Date();
  const key = LS_KEYS.lastDate;
  const last = localStorage.getItem(key);
  const todayStr = fmtDate(today);
  if(!last){
    localStorage.setItem(LS_KEYS.streakCount, '1');
    localStorage.setItem(key, todayStr);
    return;
  }
  const lastDate = parseDate(last);
  const diff = daysBetween(lastDate, today);
  let c = parseInt(localStorage.getItem(LS_KEYS.streakCount)||'0',10);
  if(diff === 0){
    // same day, no change
  } else if(diff === 1){
    c += 1;
    localStorage.setItem(LS_KEYS.streakCount, String(c));
  } else {
    // missed day(s)
    localStorage.setItem(LS_KEYS.streakCount, '1');
  }
  localStorage.setItem(key, todayStr);
}

function fmtDate(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function parseDate(s){
  const [y,m,dd]=s.split('-').map(n=>parseInt(n,10));
  return new Date(y,m-1,dd);
}
function daysBetween(a,b){
  const ms = 24*60*60*1000;
  const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((b0-a0)/ms);
}

// --- Score saving
function saveScore(day, correct, total, pct){
  let scores = {};
  try{ scores = JSON.parse(localStorage.getItem(LS_KEYS.scores) || '{}'); }catch{}
  scores[day] = {correct,total,pct,ts: Date.now()};
  localStorage.setItem(LS_KEYS.scores, JSON.stringify(scores));
}

// ---- Web Speech: TTS
function speakText(text){
  try{
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }catch(e){
    alert('Speech synthesis not supported in this browser.');
  }
}

// ---- Web Speech: basic STT (Chrome/WebKit)
function recordAndTranscribe(callback){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    alert('Speech recognition not supported in this browser.');
    return;
  }
  const rec = new SR();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e)=>{
    const text = e.results[0][0].transcript || '';
    callback(text);
  };
  rec.onerror = (e)=>{
    console.warn('rec error', e.error);
    callback('');
  };
  rec.start();
}

// ---- CSV Export of stored scores + streak
function exportScoresCSV(){
  let scores = {};
  try{ scores = JSON.parse(localStorage.getItem(LS_KEYS.scores)||'{}'); }catch{}
  const streak = localStorage.getItem(LS_KEYS.streakCount)||'0';
  const lastDay = localStorage.getItem(LS_KEYS.lastCompletedDay)||'';
  const header = ['day','correct','total','pct','timestamp'];
  const rows = [ ['_meta','streak', streak, 'last_completed_day', lastDay].join(',') ];
  rows.push(header.join(','));
  Object.keys(scores).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(day=>{
    const s = scores[day];
    rows.push([day, s.correct, s.total, s.pct, s.ts].join(','));
  });
  return rows.join('\\n');
}
