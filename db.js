// ── DB & Dashboard ──
// ?? Firebase ??
let db = null;
try { firebase.initializeApp(FIREBASE_CONFIG); db = firebase.firestore(); } catch(e) {}

// auth.js 李몄“ (head??<script src="auth.js"> 濡?濡쒕뱶??

// ?? Data ??
let allScores = [], filteredScores = [], currentQuiz = 'all';
let quizMap = {}, fcSets = [];
let currentTier = 'green', currentTierTab = 'new';

function getPassCriteria() {
  if (currentQuiz !== 'all') {
    try {
      const sets = JSON.parse(localStorage.getItem('lr_sets') || '[]');
      const quiz = sets.find(s => s.name === currentQuiz);
      if (quiz) return { s: quiz.passS || 90, p: quiz.passP || 80 };
    } catch(e) {}
  }
  return { s: 90, p: 80 };
}
const S_SCORE = () => getPassCriteria().s;
const P_SCORE = () => getPassCriteria().p;

async function loadAllData() {
  if (!db) { renderFromLocal(); return; }
  try {
    const snap = await db.collection('scores').orderBy('timestamp','desc').get();
    allScores = snap.docs.map(d => ({id: d.id, ...d.data()}));
    document.getElementById('last-updated').textContent =
      '?낅뜲?댄듃: ' + new Date().toLocaleTimeString('ko-KR');
    renderAll();
  } catch(e) {
    console.error(e);
    renderFromLocal();
  }
}

function renderFromLocal() {
  // localStorage 湲곕컲 fallback
  try {
    const sets = JSON.parse(localStorage.getItem('lr_sets') || '[]');
    quizMap = {};
    sets.forEach(s => quizMap[s.id] = s.name);
    renderQuizList(sets);
    renderFCList();
  } catch(e) {}
  renderAll();
}

function renderAll() {
  buildQuizPills();
  applyFilters();
  renderQuizStatus();
  renderQuizList();
  renderFCList();
  loadAdminSessions();
}

function buildQuizPills() {
  const names = [...new Set(allScores.map(s => s.quizName).filter(Boolean))];
  const wrap = document.getElementById('cpills');
  wrap.innerHTML = '<div class="pill on" onclick="setQuizPill(this,\'all\')">?꾩껜</div>';
  if (names.length > 1) {
    names.forEach(n => {
      const d = document.createElement('div');
      d.className = 'pill';
      d.textContent = n;
      d.onclick = function(){ setQuizPill(this, n); };
      wrap.appendChild(d);
    });
  }
}

function setQuizPill(el, quiz) {
  document.querySelectorAll('#cpills .pill').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
  currentQuiz = quiz;
  applyFilters();
}

function applyFilters() {
  filteredScores = allScores.filter(s => currentQuiz === 'all' || s.quizName === currentQuiz);
  renderStats();
  renderChart();
  renderTop5();
}

function formatDur(sec) {
  if (!sec) return '-';
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? m + '분' + s + '초' : s + '초';
}

function renderStats() {
  const fs = filteredScores;
  document.getElementById('st-tot').textContent = fs.length + '명';
  const avg = fs.length ? Math.round(fs.reduce((a,s)=>a+(s.pct||s.score/s.total*100||0),0)/fs.length) : 0;
  document.getElementById('st-avg').textContent = avg + '%';
  const avgDur = fs.length ? Math.round(fs.reduce((a,s)=>a+(s.duration||0),0)/fs.length) : 0;
  document.getElementById('st-time').textContent = formatDur(avgDur);
  const pct = s => s.pct ?? (s.score && s.total ? Math.round(s.score/s.total*100) : 0);
  const ss = S_SCORE(), ps = P_SCORE();
  document.getElementById('st-g').textContent = fs.filter(s => pct(s) >= ss).length + '명';
  document.getElementById('st-b').textContent = fs.filter(s => pct(s) >= ps && pct(s) < ss).length + '명';
  document.getElementById('st-r').textContent = fs.filter(s => pct(s) < ps).length + '명';
  document.getElementById('tl-g').textContent = ss + '?먥넁 ?곗닔?⑷꺽';
  document.getElementById('tl-b').textContent = ps + '~' + ss + '???⑷꺽';
  document.getElementById('tl-r').textContent = ps + '?먥넃 誘몃떖';
}

// cohortChart
let myChart, myChartData = [];
const barScorePlugin = {
  id: 'barScore',
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx;
    const bottomY = chart.chartArea.bottom - 7;
    chart.data.datasets.forEach((dataset, i) => {
      if (dataset.type !== 'bar') return;
      chart.getDatasetMeta(i).data.forEach((bar, j) => {
        const val = dataset.data[j];
        if (!val) return;
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(val + '%', bar.x, bottomY);
        ctx.restore();
      });
    });
  }
};
function initChart(labels, data) {
  myChartData = data;
  const ctx = document.getElementById('cohortChart').getContext('2d');
  if (myChart) myChart.destroy();
  myChart = new Chart(ctx, {
    data: {
      labels: labels.length ? labels : ['?곗씠???놁쓬'],
      datasets: [
        { type:'bar', label:'?됯퇏?먯닔', data: data.map(d=>d.avg), backgroundColor:'#0E94CD', borderRadius:6, yAxisID:'y', order:1 },
        { type:'line', label:'?묒떆?몄썝', data: data.map(d=>d.cnt), borderColor:'#d97706', backgroundColor:'#fff',
          pointBackgroundColor:'#fff', pointBorderColor:'#d97706', pointBorderWidth:2, pointRadius:6, tension:.3, yAxisID:'y2', order:0 }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      layout: { padding: { top: 18 } },
      onClick(e) {
        const pts = myChart.getElementsAtEventForMode(e,'nearest',{intersect:true},false);
        if (!pts.length) return;
        const idx = pts[0].index;
        const label = myChart.data.labels[idx];
        const d = myChartData[idx];
        if (d) openCohortDetail(label, d);
      },
      plugins:{ legend:{display:false},
        tooltip:{ callbacks:{ label: c => c.dataset.type==='bar'?' 평균 '+c.raw+'점':' 응시 '+c.raw+'명' }}
      },
      scales:{
        y:{ min:0, max:100, grid:{color:'#e2eaf4'}, ticks:{callback:v=>v+'%',font:{size:11}} },
        y2:{ position:'right', min:0, grid:{display:false},
          ticks:{stepSize:1, precision:0, callback:v=>Number.isInteger(v)?v+'명':'',font:{size:11},color:'#d97706'} }
      }
    },
    plugins: [barScorePlugin]
  });
}

function openCohortDetail(label, d) {
  document.getElementById('cd-title').textContent = label + ' ?곸꽭';
  document.getElementById('cd-stat-cnt').textContent = d.cnt + '명';
  document.getElementById('cd-stat-avg').textContent = d.avg + '%';
  document.getElementById('cd-stat-time').textContent = formatDur(d.avgDur);
  const tbody = document.getElementById('cd-tbody');
  tbody.innerHTML = (d.rows || []).map(r => `
    <tr>
      <td>${r.name || '-'}</td>
      <td>${r.pct ?? 0}??/td>
      <td>${formatDur(r.duration || 0)}</td>
    </tr>
  `).join('');
  document.getElementById('cohort-detail-ov').classList.add('open');
}

function renderChart() {
  const src = currentQuiz === 'all' ? allScores : allScores.filter(s => s.quizName === currentQuiz);
  const rawCohorts = [...new Set(src.map(s=>s.cohort).filter(Boolean))].sort();
  const labels = rawCohorts.map(c => /기/.test(c) ? c : c + '기');
  const data = rawCohorts.map(c => {
    const rows = src.filter(s=>s.cohort===c);
    const avg = rows.length ? Math.round(rows.reduce((a,s)=>a+(s.pct||0),0)/rows.length) : 0;
    const avgDur = rows.length ? Math.round(rows.reduce((a,s)=>a+(s.duration||0),0)/rows.length) : 0;
    return { avg, cnt: rows.length, avgDur, rows };
  });
  initChart(labels, data);
}

function renderTop5() {
  const qMap = {};
  filteredScores.forEach(s => {
    (s.answers||[]).forEach(a => {
      const key = a.question || a.q || '';
      if (!key) return;
      if (!a.ok) {
        if (!qMap[key]) qMap[key] = {wrong:0, chosen:{}, total:0};
        qMap[key].wrong++;
      }
    });
    (s.answers||[]).forEach(a => {
      const key = a.question || a.q || '';
      if (!key) return;
      if (!qMap[key]) qMap[key] = {wrong:0, chosen:{}, total:0};
      qMap[key].total++;
      if (a.chosen != null) {
        qMap[key].chosen[a.chosen] = (qMap[key].chosen[a.chosen]||0)+1;
      }
    });
  });
  const top5 = Object.entries(qMap)
    .map(([q,v]) => ({q, pct: v.total ? Math.round(v.wrong/v.total*100):0, data:v}))
    .filter(x => x.pct > 0)
    .sort((a,b)=>b.pct-a.pct).slice(0,5);

  const wrap = document.getElementById('top5-list');
  if (!top5.length) { wrap.innerHTML='<div style="color:var(--muted);font-size:13px;padding:8px 0;">?곗씠???놁쓬</div>'; return; }
  wrap.innerHTML = top5.map((x,i) => `
    <div class="t5" onclick="openAnswer(${i})">
      <div class="t5rk">${i+1}</div>
      <div class="t5q">${x.q}</div>
      <div class="t5p">${x.pct}%</div>
      <div style="color:var(--muted);font-size:14px;">??/div>
    </div>
  `).join('');
  window._top5data = top5;
}

let _dashEditMode = false;
function toggleDashEdit() {
  _dashEditMode = !_dashEditMode;
  const btn = document.getElementById('dash-edit-btn');
  if (btn) btn.textContent = _dashEditMode ? '?섏젙 ?꾨즺' : '??쒕낫???섏젙';
  renderQuizStatus();
}

function renderQuizStatus() {
  const types = [...new Set(allScores.map(s=>s.quizName).filter(Boolean))];
  if (!types.length) {
    document.getElementById('quiz-status').innerHTML = '<div style="color:var(--muted);font-size:13px;">?묒떆 ?곗씠???놁쓬</div>';
    return;
  }
  const pct = s => s.pct ?? 0;
  document.getElementById('quiz-status').innerHTML = types.map(t => {
    const rows = allScores.filter(s=>s.quizName===t);
    const g = rows.filter(s=>pct(s)>=S_SCORE()).length;
    const b = rows.filter(s=>pct(s)>=P_SCORE()&&pct(s)<S_SCORE()).length;
    const r = rows.filter(s=>pct(s)<P_SCORE()).length;
    const tEsc = t.replace(/'/g,"\\'");
    return `
      <div style="background:var(--blue-light);border-radius:10px;padding:14px 18px;position:relative;">
        ${_dashEditMode ? `<button onclick="deleteQuizScores('${tEsc}')"
          style="position:absolute;top:10px;right:10px;padding:4px 10px;font-size:11px;border:1px solid #cdd9e8;border-radius:6px;background:#fff;color:var(--red);cursor:pointer;">?곗씠????젣</button>` : ''}
        <div style="font-size:13px;font-weight:700;color:var(--blue-dark);${_dashEditMode?'margin-right:60px;':''}">${t}</div>
        <div style="font-size:13px;color:var(--muted);margin:4px 0 8px;">?묒떆 ${rows.length}紐?/div>
        <div style="display:flex;gap:8px;">
          <span class="badge bg-green">?곗닔 ${g}紐?/span>
          <span class="badge bg-blue">?⑷꺽 ${b}紐?/span>
          <span class="badge bg-red">誘몃떖 ${r}紐?/span>
        </div>
      </div>
    `;
  }).join('');
}

async function deleteQuizScores(quizName) {
  const cnt = allScores.filter(s=>s.quizName===quizName).length;
  const msg = `"${quizName}" ?댁쫰???묒떆 ?곗씠??${cnt}嫄댁쓣 ??젣?섏떆寃좎뒿?덇퉴?\n\n???묒뾽? ?섎룎由????놁뒿?덈떎.`;
  if (!confirm(msg)) return;

  // Firebase?먯꽌 ??젣
  try {
    if (db) {
      const snap = await db.collection('scores').where('quizName','==',quizName).get();
      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  } catch(e) { console.error('Firebase ??젣 ?ㅻ쪟:', e); }

  // 硫붾え由ъ뿉???쒓굅 ???щ젋??  allScores = allScores.filter(s => s.quizName !== quizName);
  if (currentQuiz === quizName) { currentQuiz = 'all'; }
  buildQuizPills();
  applyFilters();
  renderQuizStatus();
}

// ?? Tier modal ??
function openTier(tier) {
  currentTier = tier;
  currentTierTab = 'new';
  const cfg = {
    green:{ title:'?곗닔?⑷꺽 쨌 90?먥넁 쨌 ?믪? ?먯닔 ??', bg:'var(--green-bg)', col:'var(--green)' },
    blue: { title:'?⑷꺽 쨌 80~90??쨌 ?믪? ?먯닔 ??', bg:'var(--blue-light)', col:'var(--blue)' },
    red:  { title:'誘몃떖 쨌 80?먥넃 쨌 ??? ?먯닔 ??', bg:'var(--red-bg)', col:'var(--red)' }
  }[tier];
  const mh = document.getElementById('tier-mh');
  mh.style.background = cfg.bg;
  const h2 = document.getElementById('tier-title');
  h2.textContent = cfg.title; h2.style.color = cfg.col;
  const cls = tier==='green'?'':tier==='blue'?'blue':'red';
  document.getElementById('tt-new').className = 'mtab on '+cls;
  document.getElementById('tt-old').className = 'mtab';
  document.getElementById('tier-srch').value = '';
  renderTierTable();
  document.getElementById('tier-ov').classList.add('open');
}

function setTierTab(tab) {
  currentTierTab = tab;
  const cls = currentTier==='green'?'':currentTier==='blue'?'blue':'red';
  document.getElementById('tt-new').className = 'mtab'+(tab==='new'?' on '+cls:'');
  document.getElementById('tt-old').className = 'mtab'+(tab==='old'?' on '+cls:'');
  renderTierTable();
}

function renderTierTable() {
  const pct = s => s.pct ?? (s.score&&s.total ? Math.round(s.score/s.total*100) : 0);
  const q = document.getElementById('tier-srch').value.trim().toLowerCase();
  let rows = filteredScores.filter(s => {
    const p = pct(s);
    if (currentTier==='green') return p >= S_SCORE();
    if (currentTier==='blue')  return p >= P_SCORE() && p < S_SCORE();
    return p < P_SCORE();
  });
  // type filter (no type field yet ??show all in "new" tab)
  if (currentTierTab === 'old') rows = [];
  if (q) rows = rows.filter(s => (s.name||'').toLowerCase().includes(q));
  rows.sort((a,b) => currentTier==='red' ? pct(a)-pct(b) : pct(b)-pct(a));

  const colMap = {green:['var(--green-bg)','var(--green-text)'],blue:['var(--blue-light)','var(--blue-dark)'],red:['var(--red-bg)','var(--red-text)']};
  const [sbg,sfg] = colMap[currentTier];
  const body = document.getElementById('tier-body');
  if (!rows.length) {
    body.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px;">?대떦 ?곗씠?곌? ?놁뒿?덈떎.</td></tr>`;
    return;
  }
  const errs = s => (s.wrongQuestions||[]).length || (s.answers||[]).filter(a=>!a.ok).length;
  body.innerHTML = rows.map(r => `
    <tr onclick="openWrongQ(${JSON.stringify(r.id).replace(/"/g,"'")})">
      <td style="font-weight:600;">${r.name||'-'}</td>
      <td><span class="badge bg-blue">${r.cohort||'-'}</span></td>
      <td style="color:var(--muted);font-size:12px;">${r.quizName||'-'}</td>
      <td><span style="display:inline-flex;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;background:${sbg};color:${sfg};">${pct(r)}??/span></td>
      <td style="color:var(--muted);">${errs(r)}媛?/td>
      <td><button class="btn btn-g btn-sm" style="font-size:11px;">?由?臾명빆 ??/button></td>
    </tr>
  `).join('');
}

function openWrongQ(id) {
  const s = allScores.find(x => x.id===id);
  if (!s) return;
  const wrong = (s.answers||[]).filter(a=>!a.ok);
  if (!wrong.length) { alert(s.name+'?섏? 紐⑤몢 ?뺣떟?낅땲??'); return; }
  document.getElementById('ans-title').textContent = s.name + '???ㅻ떟 紐⑸줉';
  document.getElementById('ans-meta').textContent = s.quizName + ' 쨌 ' + (s.pct||0) + '%';
  document.getElementById('ans-body').innerHTML = wrong.map(a => `
    <div style="background:var(--gray);border-radius:8px;padding:12px 16px;margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:6px;">${a.q}</div>
      <div style="font-size:12px;color:var(--red);">?좏깮: ${a.chosen??'-'}</div>
      <div style="font-size:12px;color:var(--green);">?뺣떟: ${a.correct??'-'}</div>
    </div>
  `).join('');
  document.getElementById('ans-ov').classList.add('open');
}

// ?? Answer distribution ??
function openAnswer(idx) {
  const x = (window._top5data||[])[idx];
  if (!x) return;
  document.getElementById('ans-title').textContent = x.q;
  document.getElementById('ans-meta').textContent = '?ㅻ떟瑜?' + x.pct + '%';
  const chosen = x.data.chosen;
  const total = Object.values(chosen).reduce((a,b)=>a+b,0)||1;
  const entries = Object.entries(chosen).sort((a,b)=>b[1]-a[1]);
  const colors=['#0E94CD','#22c55e','#d97706','#a855f7','#ef4444'];
  document.getElementById('ans-body').innerHTML = entries.length ? entries.map(([label,cnt],i) => {
    const p = Math.round(cnt/total*100);
    return `
      <div class="abar">
        <div class="albl">${label}</div>
        <div style="flex:1;">
          <div class="atrk"><div class="afil" style="width:${p}%;background:${colors[i%colors.length]};">${p>10?p+'%':''}</div></div>
        </div>
        <div class="apct">${p}%</div>
      </div>`;
  }).join('') : '<div style="color:var(--muted);font-size:13px;">?듬? ?곗씠???놁쓬</div>';
  document.getElementById('ans-ov').classList.add('open');
}

// ?? QR ??
let _qrTarget = '';
function openQR(target) {
  _qrTarget = target;
  const base = 'https://taeyun-larosee.github.io/larosee-quiz/';
  let url = base;
  if (target.startsWith('quiz')) url += '?quiz=' + target.replace('quiz-','');
  else if (target.startsWith('fc')) url += '?fc=' + target.replace('fc-','');
  else if (target==='flashcard') url += '?fc=larosee';
  else if (target==='quiz') url += '?quiz=larosee';
  document.getElementById('qr-lbl').textContent = target + ' QR';
  document.getElementById('qr-url').textContent = url;
  document.getElementById('qr-ov').classList.add('open');
}
function copyQR() {
  const url = document.getElementById('qr-url').textContent;
  navigator.clipboard.writeText(url).then(() => alert('留곹겕媛 蹂듭궗?섏뿀?듬땲??'));
}

// ?? Settings ??
function changePw() {
  const cur = document.getElementById('pw-cur').value;
  const nw = document.getElementById('pw-new').value;
  const nw2 = document.getElementById('pw-new2').value;
  const err = document.getElementById('pw-err');
  if (cur !== getPw()) { err.textContent='?꾩옱 鍮꾨?踰덊샇媛 ?щ컮瑜댁? ?딆뒿?덈떎.'; err.style.display='block'; return; }
  if (!nw) { err.textContent='??鍮꾨?踰덊샇瑜??낅젰?댁＜?몄슂.'; err.style.display='block'; return; }
  if (nw !== nw2) { err.textContent='鍮꾨?踰덊샇媛 ?쇱튂?섏? ?딆뒿?덈떎.'; err.style.display='block'; return; }
  savePwStore(nw);
  err.style.display='none';
  ['pw-cur','pw-new','pw-new2'].forEach(id => document.getElementById(id).value='');
  alert('鍮꾨?踰덊샇媛 蹂寃쎈릺?덉뒿?덈떎.');
}
function exportCSV() {
  if (!allScores.length) { alert('?대낫???곗씠?곌? ?놁뒿?덈떎.'); return; }
  const hdr = ['이름','기수','퀴즈명','점수(%)','득점','총문항','날짜'];
  const rows = allScores.map(s => [s.name,s.cohort,s.quizName,s.pct,s.score,s.total,s.date].join(','));
  const csv = '﻿' + [hdr.join(','), ...rows].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = '?쇰줈???묒떆寃곌낵_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
}
