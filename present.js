// ── Present View JS (교육 진행 화면) ──

const P_DEFAULT_SESSIONS = [
  {
    id:'new-hire', name:'신규입사자 교육', status:'active', icon:'📚', order:0,
    days:[
      { name:'DAY 1', items:[
        {type:'link',name:'브랜드 교육',desc:'PPT',url:'https://laroseekr-my.sharepoint.com/personal/taeyun_kim_larosee_co_kr/_layouts/15/Doc.aspx?sourcedoc=%7B4593676f-e99d-48ea-ba15-1e4f83469b5d%7D&action=default',icon:'📋'},
        {type:'link',name:'인센티브 교육',desc:'PPT',url:'https://laroseekr-my.sharepoint.com/personal/taeyun_kim_larosee_co_kr/_layouts/15/Doc.aspx?sourcedoc=%7Bf0e7cde8-f819-4aed-83ff-51c289c1d069%7D&action=default',icon:'📋'},
        {type:'link',name:'제품 교육',desc:'PDF',url:'https://laroseekr-my.sharepoint.com/personal/taeyun_kim_larosee_co_kr/_layouts/15/Doc.aspx?sourcedoc=%7Bfa4bb4ec-ec9b-4376-9fb8-e2138eb5f016%7D&action=default',icon:'📄'},
        {type:'link',name:'매뉴얼 교육',desc:'PPT',url:'https://laroseekr-my.sharepoint.com/personal/taeyun_kim_larosee_co_kr/_layouts/15/Doc.aspx?sourcedoc=%7Bb6deec2d-0ab1-4944-b8bc-0c8fbbbd2c1d%7D&action=default',icon:'📋'},
        {type:'link',name:'전산교육',desc:'트위닛 가이드',url:'https://laroseekr-my.sharepoint.com/personal/taeyun_kim_larosee_co_kr/_layouts/15/Doc.aspx?sourcedoc=%7B711bde55-c5ec-4223-ad52-0a09e43a7a05%7D&action=default',icon:'💻'}
      ]},
      { name:'DAY 2', items:[
        {type:'roleplay',name:'롤플레이 가이드',desc:'카테고리별 핵심포인트·멘트',icon:'🎭',categories:[
          {name:'핸드빌 기본',checkpoints:['고객 동선을 막지 않음','3걸음 전 눈 맞춤 및 인사','한걸음 다가가기 · 고개 약 15도','손을 뻗어 손등 위치에 테스트 진행'],scripts:[{label:'기본 멘트',text:'안녕하세요, 촉촉한 바디로션 발라드릴게요~'},{label:'대안 멘트',text:'안녕하세요, 프랑스 바디로션 발라드릴게요~'}]},
          {name:'빠른 고객',checkpoints:[],scripts:[]},
          {name:'느린 고객',checkpoints:[],scripts:[]},
          {name:'수분스틱',checkpoints:[],scripts:[]},
          {name:'세럼',checkpoints:[],scripts:[]},
          {name:'머드스틱',checkpoints:[],scripts:[]},
          {name:'사워오일',checkpoints:[],scripts:[]}
        ]},
        {type:'link',name:'이의제기 교육',desc:'PPT',url:'https://laroseekr-my.sharepoint.com/personal/taeyun_kim_larosee_co_kr/_layouts/15/Doc.aspx?sourcedoc=%7Bc5354b74-e3d6-4425-b7d1-6bd5f23e9d1c%7D&action=default',icon:'📋'},
        {type:'flashcard',name:'이의제기 플래시카드 배포',desc:'QR 배포 후 핸드폰으로 연습',fcId:'',icon:'🗂'},
        {type:'quiz',name:'마무리 퀴즈 배포',desc:'QR 배포 후 응시',quizId:'',icon:'✅'},
        {type:'lecture',name:'마무리 강의',desc:'플래시카드 강의 모드',fcId:'',icon:'🎓'}
      ]}
    ]
  },
  {id:'retrain-1',name:'재교육 1차',status:'preparing',icon:'🔄',order:1,days:[]},
  {id:'retrain-2',name:'재교육 2차',status:'preparing',icon:'🔄',order:2,days:[]}
];

let pSessions = [];
let pCurSession = null, pCurDayIdx = 0;
let pFcCards = [], pFcIdx = 0, pFcFlipped = false;
let pExtUrl = '';
let pRpCategories = [], pRpCatIdx = 0, pRpChecked = {};

function pPatchUrlsFromDefault(loaded) {
  return loaded.map(sess => {
    const def = P_DEFAULT_SESSIONS.find(d => d.id === sess.id);
    if (!def) return sess;
    return {
      ...sess,
      days: (sess.days || []).map((day, di) => {
        const defDay = (def.days || [])[di];
        if (!defDay) return day;
        return {
          ...day,
          items: (day.items || []).map((item, ii) => {
            const defItem = (defDay.items || [])[ii];
            if (!defItem) return item;
            if (item.type === 'link' && (!item.url || item.url.includes('drive.google.com') || item.url.includes('docs.google.com'))) {
              return { ...item, url: defItem.url || item.url };
            }
            return item;
          })
        };
      })
    };
  });
}

async function presentLoadSessions() {
  const pLoad = document.getElementById('p-loading');
  pLoad.style.display = 'flex';
  if (db) {
    try {
      const snap = await db.collection('sessions').orderBy('order').get();
      if (!snap.empty) {
        pSessions = pPatchUrlsFromDefault(snap.docs.map(d => ({id:d.id,...d.data()})));
        pRenderHome(); pLoad.style.display = 'none'; return;
      }
    } catch(e) { console.warn('Firebase:', e); }
  }
  const saved = localStorage.getItem('lr_sessions');
  if (saved) { try { pSessions = pPatchUrlsFromDefault(JSON.parse(saved)); pRenderHome(); pLoad.style.display = 'none'; return; } catch(e){} }
  pSessions = P_DEFAULT_SESSIONS;
  pRenderHome();
  pLoad.style.display = 'none';
}

function openPresentView() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('present-view').style.display = 'block';
  pShowScreen('p-s-home');
  document.getElementById('p-hdr-right').innerHTML = `
    <button class="p-back-btn" onclick="closePresentView()">← 관리자로 돌아가기</button>
  `;
  presentLoadSessions();
}

function closePresentView() {
  document.getElementById('present-view').style.display = 'none';
  document.getElementById('app').style.display = 'block';
}

function pRenderHome() {
  const grid = document.getElementById('p-session-grid');
  if (!pSessions.length) {
    grid.innerHTML = '<div style="color:var(--muted);font-size:15px;">등록된 세션이 없습니다.</div>';
    return;
  }
  grid.innerHTML = pSessions.map((s, i) => `
    <div class="p-session-card ${s.status!=='active'?'dim':''}" onclick="pOpenSession(${i})">
      <div class="p-sc-icon">${s.icon||'📚'}</div>
      <div class="p-sc-name">${s.name}</div>
      <div class="p-sc-meta">${s.days&&s.days.length ? s.days.map(d=>d.name).join(' · ') : '콘텐츠 없음'}</div>
      <span class="p-status-badge ${s.status==='active'?'p-badge-active':'p-badge-dim'}">
        ${s.status==='active'?'✓ 진행중':'준비 중'}
      </span>
    </div>
  `).join('');
}

function pGoHome() {
  pCurSession = null;
  pShowScreen('p-s-home');
  document.getElementById('p-hdr-right').innerHTML = `
    <button class="p-back-btn" onclick="closePresentView()">← 관리자로 돌아가기</button>
  `;
}

function pOpenSession(idx) {
  pCurSession = pSessions[idx];
  if (!pCurSession.days || !pCurSession.days.length) {
    alert('이 세션은 아직 준비 중입니다.\n관리자 페이지에서 콘텐츠를 추가해주세요.');
    return;
  }
  pCurDayIdx = 0;
  pRenderSession();
  pShowScreen('p-s-session');
  document.getElementById('p-hdr-right').innerHTML = `
    <button class="p-back-btn" onclick="pGoHome()">← 세션 목록</button>
    <span class="p-hdr-session-name">${pCurSession.name}</span>
  `;
}

function pRenderSession() {
  const dayBar = document.getElementById('p-day-bar');
  dayBar.innerHTML = pCurSession.days.map((d,i) =>
    `<div class="p-day-tab ${i===pCurDayIdx?'on':''}" onclick="presentSetDay(${i})">${d.name}</div>`
  ).join('');
  pRenderItems();
}

function presentSetDay(idx) {
  pCurDayIdx = idx;
  pRenderSession();
}

const P_TYPE_META = {
  link:      {label:'자료 열기', cls:'p-tb-link'},
  roleplay:  {label:'롤플레이',  cls:'p-tb-roleplay'},
  flashcard: {label:'QR 배포',  cls:'p-tb-flashcard'},
  quiz:      {label:'QR 배포',  cls:'p-tb-quiz'},
  lecture:   {label:'강의 모드', cls:'p-tb-lecture'}
};
const P_ICON_BG = {
  link:'#eff6ff', roleplay:'#f0fdf4', flashcard:'#fdf4ff', quiz:'#fef2f2', lecture:'#fffbeb'
};

function pRenderItems() {
  const day = pCurSession.days[pCurDayIdx];
  const wrap = document.getElementById('p-items-list');
  if (!day || !day.items || !day.items.length) {
    wrap.innerHTML = '<div style="text-align:center;padding:60px 24px;color:var(--muted);font-size:15px;">이 DAY에 등록된 항목이 없습니다.</div>';
    return;
  }
  wrap.innerHTML = day.items.map((item, i) => {
    const tm = P_TYPE_META[item.type] || {label:item.type, cls:'p-tb-link'};
    return `
      <div class="p-item-card" onclick="pOpenItem(${i})">
        <div class="p-item-icon" style="background:${P_ICON_BG[item.type]||'#f4f7fb'}">${item.icon||'📋'}</div>
        <div style="flex:1;">
          <div class="p-item-name">${item.name}</div>
          <div class="p-item-desc">${item.desc||''}</div>
        </div>
        <span class="p-type-badge ${tm.cls}">${tm.label}</span>
        <span style="color:var(--muted);font-size:20px;">›</span>
      </div>
    `;
  }).join('');
}

function pOpenItem(idx) {
  const item = pCurSession.days[pCurDayIdx].items[idx];
  document.getElementById('p-vhdr-title').textContent = item.name;
  ['p-v-link','p-v-roleplay','p-v-lecture','p-v-qr','p-v-empty'].forEach(id => {
    const el = document.getElementById(id);
    el.style.display = 'none';
  });
  document.getElementById('p-kbd-hints').innerHTML = '';

  if      (item.type === 'link')      pOpenLinkViewer(item);
  else if (item.type === 'roleplay')  pOpenRoleplay(item);
  else if (item.type === 'flashcard') presentOpenQR(item, 'flashcard');
  else if (item.type === 'quiz')      presentOpenQR(item, 'quiz');
  else if (item.type === 'lecture')   pOpenLecture(item);

  document.getElementById('p-s-viewer').classList.add('on');
}

function pCloseViewer() {
  document.getElementById('p-s-viewer').classList.remove('on');
  document.getElementById('p-v-link-frame').src = '';
}

function pOpenLinkViewer(item) {
  pExtUrl = item.url || '';
  if (!pExtUrl) { pShowEmpty('🔗','링크가 설정되지 않았습니다','관리자 페이지에서 링크를 입력해주세요.'); return; }
  window.open(pExtUrl, '_blank');
  pCloseViewer();
}
function pOpenExt() { if(pExtUrl) window.open(pExtUrl, '_blank'); }

function pOpenRoleplay(item) {
  pRpCategories = item.categories || [];
  if (!pRpCategories.length) { pShowEmpty('🎭','내용이 없습니다','관리자 페이지에서 롤플레이 내용을 추가해주세요.'); return; }
  pRpCatIdx = 0; pRpChecked = {};
  const el = document.getElementById('p-v-roleplay');
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  pRenderRP();
  pSetKbd([['←→','카테고리 이동'],['ESC','닫기']]);
}
function pRenderRP() {
  const cats = pRpCategories;
  const cat = cats[pRpCatIdx];
  document.getElementById('p-rp-tabs').innerHTML = cats.map((c,i)=>
    `<button class="p-rp-tab ${i===pRpCatIdx?'on':'off'}" onclick="pRpSetCat(${i})">${c.name}</button>`
  ).join('');
  const left = document.getElementById('p-rp-left');
  const pts = cat.checkpoints || [];
  left.innerHTML = `<div class="p-rp-panel-title">핵심 포인트</div>` +
    (pts.length ? pts.map((p,i)=>{
      const key = pRpCatIdx+'_'+i;
      const ck = pRpChecked[key];
      return `<div class="p-rp-check-item" onclick="pRpToggle(${i})">
        <div class="p-rp-chk ${ck?'checked':''}"></div>
        <span class="p-rp-check-text ${ck?'checked':''}">${p}</span>
      </div>`;
    }).join('') : '<p style="color:#999;font-size:14px;">항목 없음</p>');
  const right = document.getElementById('p-rp-right');
  const scripts = cat.scripts || [];
  right.innerHTML = `<div class="p-rp-panel-title">멘트</div>` +
    (scripts.length ? scripts.map(s=>
      `<div class="p-rp-script-block">
        <div class="p-rp-script-label">${s.label||''}</div>
        <div class="p-rp-script-text">${s.text||''}</div>
      </div>`
    ).join('') : '<p style="color:#999;font-size:14px;">멘트 없음</p>');
}
function pRpSetCat(i) { pRpCatIdx = i; pRenderRP(); }
function pRpToggle(i) {
  const key = pRpCatIdx+'_'+i;
  pRpChecked[key] = !pRpChecked[key];
  pRenderRP();
}

function pOpenLecture(item) {
  const sets = JSON.parse(localStorage.getItem('lr_fcsets')||'[]');
  const set = sets.find(s=>s.id===item.fcId) || sets[0];
  if (!set || !(set.cards||[]).length) {
    pShowEmpty('🎓','플래시카드가 없습니다','관리자 페이지에서 플래시카드 세트를 먼저 만들어주세요.');
    return;
  }
  pFcCards = set.cards;
  pFcIdx = 0; pFcFlipped = false;
  const el = document.getElementById('p-v-lecture');
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  pRenderFC();
  pSetKbd([['Space','뒤집기'],['←','이전'],['→','다음'],['ESC','닫기']]);
}
function pRenderFC() {
  const c = pFcCards[pFcIdx];
  document.getElementById('p-fc-front-text').textContent = c.front || c.q || '';
  document.getElementById('p-fc-back-text').textContent  = c.back  || c.a || '';
  document.getElementById('p-fc-counter').textContent = (pFcIdx+1)+' / '+pFcCards.length;
  document.getElementById('p-fc-inner').classList.remove('flipped');
  pFcFlipped = false;
  document.getElementById('p-fc-prev').disabled = pFcIdx === 0;
  document.getElementById('p-fc-next').disabled = pFcIdx === pFcCards.length-1;
}
function pFlipFC() {
  pFcFlipped = !pFcFlipped;
  document.getElementById('p-fc-inner').classList.toggle('flipped', pFcFlipped);
}
function pFcNav(d) { pFcIdx = Math.max(0, Math.min(pFcCards.length-1, pFcIdx+d)); pRenderFC(); }

function presentOpenQR(item, type) {
  const base = 'https://taeyun-larosee.github.io/larosee-quiz/';
  let url = base;
  if (type==='flashcard') url += '?fc=' + (item.fcId || 'larosee');
  else if (type==='quiz') url += '?quiz=' + (item.quizId || 'larosee');

  document.getElementById('p-qr-title').textContent = item.name;
  document.getElementById('p-qr-url').textContent = url;

  const canvas = document.getElementById('p-qr-canvas');
  canvas.innerHTML = '';
  new QRCode(canvas, { text:url, width:260, height:260, correctLevel:QRCode.CorrectLevel.H });

  const el = document.getElementById('p-v-qr');
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  pSetKbd([['ESC','닫기']]);
}

function pShowEmpty(icon, h, p) {
  document.getElementById('p-empty-icon').textContent = icon;
  document.getElementById('p-empty-h').textContent = h;
  document.getElementById('p-empty-p').textContent = p;
  const el = document.getElementById('p-v-empty');
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
}

function pSetKbd(hints) {
  document.getElementById('p-kbd-hints').innerHTML = hints.map(([k,l]) =>
    `<span class="p-kbd"><span class="p-key">${k}</span> ${l}</span>`
  ).join('');
}

function pShowScreen(id) {
  document.querySelectorAll('.p-screen').forEach(s=>s.classList.remove('on'));
  document.getElementById(id).classList.add('on');
}

document.addEventListener('keydown', e => {
  const viewer = document.getElementById('p-s-viewer');
  if (!viewer || !viewer.classList.contains('on')) return;
  if (e.key==='Escape') { pCloseViewer(); return; }

  const rpOn = document.getElementById('p-v-roleplay').style.display !== 'none';
  const fcOn = document.getElementById('p-v-lecture').style.display  !== 'none';

  if (rpOn) {
    if (e.key==='ArrowLeft')  pRpSetCat(Math.max(0, pRpCatIdx-1));
    if (e.key==='ArrowRight') pRpSetCat(Math.min(pRpCategories.length-1, pRpCatIdx+1));
  }
  if (fcOn) {
    if (e.key===' ') { e.preventDefault(); pFlipFC(); }
    if (e.key==='ArrowLeft')  pFcNav(-1);
    if (e.key==='ArrowRight') pFcNav(1);
  }
});
