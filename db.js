// ── DB & Dashboard ──
// ── Firebase ──
let db = null;
try { firebase.initializeApp(FIREBASE_CONFIG); db = firebase.firestore(); } catch(e) {}

// auth.js 참조 (head에서 <script src="auth.js"> 로드됨)

// ── Data ──
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
      '업데이트: ' + new Date().toLocaleTimeString('ko-KR');
    renderAll();
  } catch(e) {
    console.error(e);
    renderFromLocal();
  }
}

function renderFromLocal() {
  // localStorage 기반 fallback
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
  wrap.innerHTML = '<div class="pill on" onclick="setQuizPill(this,\'all\')">전체</div>';
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
  return m > 0 ? m + '분 ' + s + '초' : s + '초';
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
  document.getElementById('tl-g').textContent = ss + '점↑ 우수합격';
  document.getElementById('tl-b').textContent = ps + '~' + ss + '점 합격';
  document.getElementById('tl-r').textContent = ps + '점↓ 미달';
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
      labels: labels.length ? labels : ['데이터 없음'],
      datasets: [
        { type:'bar', label:'평균점수', data: data.map(d=>d.avg), backgroundColor:'#0E94CD', borderRadius:6, yAxisID:'y', order:1 },
        { type:'line', label:'응시인원', data: data.map(d=>d.cnt), borderColor:'#d97706', backgroundColor:'#fff',
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
  document.getElementById('cd-title').textContent = label + ' 상세';
  document.getElementById('cd-stat-cnt').textContent = d.cnt + '명';
  document.getElementById('cd-stat-avg').textContent = d.avg + '%';
  document.getElementById('cd-stat-time').textContent = formatDur(d.avgDur);
  const tbody = document.getElementById('cd-tbody');
  tbody.innerHTML = (d.rows || []).map(r => `
    <tr>
      <td>${r.name || '-'}</td>
      <td>${r.pct ?? 0}점</td>
      <td>${formatDur(r.duration || 0)}</td>
    </tr>
  `).join('');
  document.getElementById('cohort-detail-ov').classList.add('open');
}

function renderChart() {
  const src = currentQuiz === 'all' ? allScores : allScores.filter(s => s.quizName === currentQuiz);
  const rawCohorts = [...new Set(src.map(s=>s.cohort).filter(Boolean))].sort();
  const labels = rawCohorts.map(c => /기$/.test(c) ? c : c + '기');
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
  if (!top5.length) { wrap.innerHTML='<div style="color:var(--muted);font-size:13px;padding:8px 0;">데이터 없음</div>'; return; }
  wrap.innerHTML = top5.map((x,i) => `
    <div class="t5" onclick="openAnswer(${i})">
      <div class="t5rk">${i+1}</div>
      <div class="t5q">${x.q}</div>
      <div class="t5p">${x.pct}%</div>
      <div style="color:var(--muted);font-size:14px;">›</div>
    </div>
  `).join('');
  window._top5data = top5;
}

let _dashEditMode = false;
function toggleDashEdit() {
  _dashEditMode = !_dashEditMode;
  const btn = document.getElementById('dash-edit-btn');
  if (btn) btn.textContent = _dashEditMode ? '수정 완료' : '대시보드 수정';
  renderQuizStatus();
}

function renderQuizStatus() {
  const types = [...new Set(allScores.map(s=>s.quizName).filter(Boolean))];
  if (!types.length) {
    document.getElementById('quiz-status').innerHTML = '<div style="color:var(--muted);font-size:13px;">응시 데이터 없음</div>';
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
          style="position:absolute;top:10px;right:10px;padding:4px 10px;font-size:11px;border:1px solid #cdd9e8;border-radius:6px;background:#fff;color:var(--red);cursor:pointer;">데이터 삭제</button>` : ''}
        <div style="font-size:13px;font-weight:700;color:var(--blue-dark);${_dashEditMode?'margin-right:60px;':''}">${t}</div>
        <div style="font-size:13px;color:var(--muted);margin:4px 0 8px;">응시 ${rows.length}명</div>
        <div style="display:flex;gap:8px;">
          <span class="badge bg-green">우수 ${g}명</span>
          <span class="badge bg-blue">합격 ${b}명</span>
          <span class="badge bg-red">미달 ${r}명</span>
        </div>
      </div>
    `;
  }).join('');
}

async function deleteQuizScores(quizName) {
  const cnt = allScores.filter(s=>s.quizName===quizName).length;
  const msg = `"${quizName}" 퀴즈의 응시 데이터 ${cnt}건을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`;
  if (!confirm(msg)) return;

  // Firebase에서 삭제
  try {
    if (db) {
      const snap = await db.collection('scores').where('quizName','==',quizName).get();
      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  } catch(e) { console.error('Firebase 삭제 오류:', e); }

  // 메모리에서 제거 후 재렌더
  allScores = allScores.filter(s => s.quizName !== quizName);
  if (currentQuiz === quizName) { currentQuiz = 'all'; }
  buildQuizPills();
  applyFilters();
  renderQuizStatus();
}

// ── Tier modal ──
function openTier(tier) {
  currentTier = tier;
  currentTierTab = 'new';
  const cfg = {
    green:{ title:'우수합격 · 90점↑ · 높은 점수 순', bg:'var(--green-bg)', col:'var(--green)' },
    blue: { title:'합격 · 80~90점 · 높은 점수 순', bg:'var(--blue-light)', col:'var(--blue)' },
    red:  { title:'미달 · 80점↓ · 낮은 점수 순', bg:'var(--red-bg)', col:'var(--red)' }
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
  // type filter (no type field yet → show all in "new" tab)
  if (currentTierTab === 'old') rows = [];
  if (q) rows = rows.filter(s => (s.name||'').toLowerCase().includes(q));
  rows.sort((a,b) => currentTier==='red' ? pct(a)-pct(b) : pct(b)-pct(a));

  const colMap = {green:['var(--green-bg)','var(--green-text)'],blue:['var(--blue-light)','var(--blue-dark)'],red:['var(--red-bg)','var(--red-text)']};
  const [sbg,sfg] = colMap[currentTier];
  const body = document.getElementById('tier-body');
  if (!rows.length) {
    body.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px;">해당 데이터가 없습니다.</td></tr>`;
    return;
  }
  const errs = s => (s.wrongQuestions||[]).length || (s.answers||[]).filter(a=>!a.ok).length;
  body.innerHTML = rows.map(r => `
    <tr onclick="openWrongQ(${JSON.stringify(r.id).replace(/"/g,"'")})">
      <td style="font-weight:600;">${r.name||'-'}</td>
      <td><span class="badge bg-blue">${r.cohort||'-'}</span></td>
      <td style="color:var(--muted);font-size:12px;">${r.quizName||'-'}</td>
      <td><span style="display:inline-flex;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;background:${sbg};color:${sfg};">${pct(r)}점</span></td>
      <td style="color:var(--muted);">${errs(r)}개</td>
      <td><button class="btn btn-g btn-sm" style="font-size:11px;">틀린 문항 ›</button></td>
    </tr>
  `).join('');
}

function openWrongQ(id) {
  const s = allScores.find(x => x.id===id);
  if (!s) return;
  const wrong = (s.answers||[]).filter(a=>!a.ok);
  if (!wrong.length) { alert(s.name+'님은 모두 정답입니다!'); return; }
  document.getElementById('ans-title').textContent = s.name + '님 오답 목록';
  document.getElementById('ans-meta').textContent = s.quizName + ' · ' + (s.pct||0) + '점';
  document.getElementById('ans-body').innerHTML = wrong.map(a => `
    <div style="background:var(--gray);border-radius:8px;padding:12px 16px;margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:6px;">${a.q}</div>
      <div style="font-size:12px;color:var(--red);">선택: ${a.chosen??'-'}</div>
      <div style="font-size:12px;color:var(--green);">정답: ${a.correct??'-'}</div>
    </div>
  `).join('');
  document.getElementById('ans-ov').classList.add('open');
}

// ── Answer distribution ──
function openAnswer(idx) {
  const x = (window._top5data||[])[idx];
  if (!x) return;
  document.getElementById('ans-title').textContent = x.q;
  document.getElementById('ans-meta').textContent = '오답률 ' + x.pct + '%';
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
  }).join('') : '<div style="color:var(--muted);font-size:13px;">답변 데이터 없음</div>';
  document.getElementById('ans-ov').classList.add('open');
}

// ── QR ──
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
  navigator.clipboard.writeText(url).then(() => alert('링크가 복사되었습니다!'));
}

// ── Settings ──
function changePw() {
  const cur = document.getElementById('pw-cur').value;
  const nw = document.getElementById('pw-new').value;
  const nw2 = document.getElementById('pw-new2').value;
  const err = document.getElementById('pw-err');
  if (cur !== getPw()) { err.textContent='현재 비밀번호가 올바르지 않습니다.'; err.style.display='block'; return; }
  if (!nw) { err.textContent='새 비밀번호를 입력해주세요.'; err.style.display='block'; return; }
  if (nw !== nw2) { err.textContent='비밀번호가 일치하지 않습니다.'; err.style.display='block'; return; }
  savePwStore(nw);
  err.style.display='none';
  ['pw-cur','pw-new','pw-new2'].forEach(id => document.getElementById(id).value='');
  alert('비밀번호가 변경되었습니다.');
}
function exportCSV() {
  if (!allScores.length) { alert('내보낼 데이터가 없습니다.'); return; }
  const hdr = ['이름','기수','퀴즈명','점수(%)','득점','총문항','날짜'];
  const rows = allScores.map(s => [s.name,s.cohort,s.quizName,s.pct,s.score,s.total,s.date].join(','));
  const csv = '﻿' + [hdr.join(','), ...rows].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = '라로제_응시결과_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
}
