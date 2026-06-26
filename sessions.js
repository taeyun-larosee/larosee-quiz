// ── Sessions CRUD ──
// ════════════════════════════════════════
// ── SESSIONS CRUD ──
// ════════════════════════════════════════
let adminSessions = [];
let editSessId = null;      // null = new, string = edit existing
let editItemCtx = null;     // {sessId, dayIdx, itemIdx} null = new item
let editDays = [];          // temp days array while editing session

const DEFAULT_SESSIONS = [
  { id:'new-hire', name:'신규입사자 교육', status:'active', icon:'📚', order:0,
    days:[
      { name:'DAY 1', items:[
        {type:'link',name:'브랜드 교육',desc:'PPT',url:'',icon:'📋'},
        {type:'link',name:'인센티브 교육',desc:'PPT',url:'',icon:'📋'},
        {type:'link',name:'제품 교육',desc:'PDF',url:'',icon:'📄'},
        {type:'link',name:'매뉴얼 교육',desc:'PPT',url:'',icon:'📋'},
        {type:'link',name:'전산교육',desc:'PPT + 홈페이지',url:'',icon:'💻'}
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
        {type:'link',name:'이의제기 교육',desc:'PPT',url:'',icon:'📋'},
        {type:'flashcard',name:'이의제기 플래시카드 배포',desc:'QR 배포 후 핸드폰으로 연습',fcId:'',icon:'🗂'},
        {type:'quiz',name:'마무리 퀴즈 배포',desc:'QR 배포 후 응시',quizId:'',icon:'✅'},
        {type:'lecture',name:'마무리 강의',desc:'플래시카드 강의 모드',fcId:'',icon:'🎓'}
      ]}
    ]
  },
  { id:'retrain-1', name:'재교육 1차', status:'preparing', icon:'🔄', order:1, days:[] },
  { id:'retrain-2', name:'재교육 2차', status:'preparing', icon:'🔄', order:2, days:[] }
];

async function loadAdminSessions() {
  if (db) {
    try {
      const snap = await db.collection('sessions').orderBy('order').get();
      if (!snap.empty) {
        adminSessions = snap.docs.map(d => ({id:d.id, ...d.data()}));
        renderSessionsTab(); return;
      }
    } catch(e) { console.warn('Firebase sessions:', e); }
  }
  const saved = localStorage.getItem('lr_sessions');
  if (saved) { try { adminSessions = JSON.parse(saved); renderSessionsTab(); return; } catch(e){} }
  adminSessions = JSON.parse(JSON.stringify(DEFAULT_SESSIONS));
  renderSessionsTab();
}

async function saveSessionsToStore() {
  localStorage.setItem('lr_sessions', JSON.stringify(adminSessions));
  if (!db) return;
  // Save each session as a Firestore document
  const batch = db.batch();
  adminSessions.forEach((s, i) => {
    s.order = i;
    const ref = db.collection('sessions').doc(s.id);
    batch.set(ref, s);
  });
  try { await batch.commit(); } catch(e) { console.warn('Firestore save:', e); }
}

const ICON_MAP = { link:'📋', roleplay:'🎭', flashcard:'🗂', quiz:'✅', lecture:'🎓' };
const TYPE_LABEL = { link:'링크', roleplay:'롤플레이', flashcard:'FC QR', quiz:'퀴즈 QR', lecture:'강의 모드' };
const ITEM_BG = { link:'#eff6ff', roleplay:'#f0fdf4', flashcard:'#fdf4ff', quiz:'#fef2f2', lecture:'#fffbeb' };

function renderSessionsTab() {
  const wrap = document.getElementById('sessions-list');
  if (!adminSessions.length) {
    wrap.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:20px 0;">등록된 세션이 없습니다.</div>';
    return;
  }
  wrap.innerHTML = adminSessions.map((s, si) => {
    const totalItems = (s.days||[]).reduce((a,d)=>a+(d.items||[]).length, 0);
    const isOpen = si === 0;
    return `
    <div class="sc-card ${s.status!=='active'?'dim':''}" id="sc-${s.id}">
      <div class="sc-hdr" onclick="toggleSc(this)">
        <div class="sc-meta">
          <h3>${s.icon||'📚'} ${s.name}</h3>
          <p>${(s.days||[]).map(d=>d.name).join(' · ')} · 항목 ${totalItems}개</p>
          <div style="margin-top:8px;display:flex;gap:8px;">
            <span class="badge ${s.status==='active'?'bg-green':'bg-muted'}">${s.status==='active'?'진행중':'종료'}</span>
          </div>
        </div>
        <div class="sc-acts" onclick="event.stopPropagation()">
          <button class="btn btn-o btn-sm" onclick="openSessionModal('${s.id}')">수정</button>
          <button class="btn btn-g btn-sm" onclick="deleteSess('${s.id}')">삭제</button>
          <button class="btn btn-g btn-sm tog-btn">${isOpen?'▲ 접기':'▼ 열기'}</button>
        </div>
      </div>
      <div class="sc-body ${isOpen?'open':''}">
        ${renderDayTabs(s, si)}
      </div>
    </div>
    `;
  }).join('');

  // init first tab of each session
  adminSessions.forEach((s, si) => {
    const firstDay = document.querySelector(`#sc-${s.id} .dtab`);
    if (firstDay) firstDay.click();
  });
}

function renderDayTabs(s, si) {
  if (!s.days || !s.days.length) {
    return `<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px;">
      등록된 항목이 없습니다.
      <button class="btn btn-p btn-sm" style="margin-left:8px;" onclick="openSessionModal('${s.id}')">DAY 추가</button>
    </div>`;
  }
  const tabs = s.days.map((d,di) =>
    `<div class="dtab ${di===0?'on':''}" onclick="setDayAdmin(this, '${s.id}', ${di})">${d.name}</div>`
  ).join('');
  const dayContents = s.days.map((d, di) =>
    `<div class="day-content" id="day-${s.id}-${di}" style="${di===0?'':'display:none'}">
      ${(d.items||[]).map((item, ii) => renderItemRow(s.id, di, ii, item)).join('')}
      <div style="padding:12px 20px;">
        <button class="btn btn-g btn-sm" onclick="openItemModal('${s.id}',${di})">＋ 항목 추가</button>
      </div>
    </div>`
  ).join('');
  return `<div class="day-tabs">${tabs}</div>${dayContents}`;
}

function renderItemRow(sessId, dayIdx, itemIdx, item) {
  return `
    <div class="ci" draggable="true"
      data-sess="${sessId}" data-day="${dayIdx}" data-idx="${itemIdx}"
      ondragstart="onItemDragStart(event)"
      ondragover="onItemDragOver(event)"
      ondrop="onItemDrop(event)"
      ondragend="onItemDragEnd(event)">
      <div class="ci-drag" title="드래그하여 순서 변경">⠿</div>
      <div class="ci-icon" style="background:${ITEM_BG[item.type]||'#f4f7fb'}">${item.icon||ICON_MAP[item.type]||'📋'}</div>
      <div class="ci-info">
        <div class="ci-name">${item.name}</div>
        <div class="ci-desc">${TYPE_LABEL[item.type]||item.type}${item.desc?' · '+item.desc:''}</div>
      </div>
      <div class="ci-btns">
        ${(item.type==='flashcard'||item.type==='quiz')?
          `<button class="btn btn-sm" style="background:var(--blue-light);color:var(--blue);border:2px solid var(--blue);border-radius:8px;"
            onclick="openQR('${item.type}-${item.fcId||item.quizId||''}')">QR 보기</button>` : ''}
        <button class="btn btn-o btn-sm" onclick="openItemModal('${sessId}',${dayIdx},${itemIdx})">수정</button>
        <button class="btn btn-g btn-sm" onclick="deleteItem('${sessId}',${dayIdx},${itemIdx})">삭제</button>
      </div>
    </div>
  `;
}

let _dragSrc = null;
function onItemDragStart(e) {
  _dragSrc = e.currentTarget;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => { if (_dragSrc) _dragSrc.style.opacity = '0.4'; }, 0);
}
function onItemDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}
function onItemDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (!_dragSrc || _dragSrc === e.currentTarget) return;
  const fromIdx = parseInt(_dragSrc.dataset.idx);
  const toIdx   = parseInt(e.currentTarget.dataset.idx);
  const sessId  = _dragSrc.dataset.sess;
  const dayIdx  = parseInt(_dragSrc.dataset.day);
  // only reorder within same day
  if (e.currentTarget.dataset.sess !== sessId || parseInt(e.currentTarget.dataset.day) !== dayIdx) return;
  const sess = adminSessions.find(s=>s.id===sessId);
  if (!sess) return;
  const items = sess.days[dayIdx].items;
  const [moved] = items.splice(fromIdx, 1);
  items.splice(toIdx, 0, moved);
  saveSessionsToStore();
  renderSessionsTab();
}
function onItemDragEnd(e) {
  if (_dragSrc) _dragSrc.style.opacity = '';
  document.querySelectorAll('.ci.drag-over').forEach(el=>el.classList.remove('drag-over'));
  _dragSrc = null;
}

function setDayAdmin(el, sessId, dayIdx) {
  el.closest('.sc-body').querySelectorAll('.dtab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');
  el.closest('.sc-body').querySelectorAll('.day-content').forEach(c=>c.style.display='none');
  const target = document.getElementById(`day-${sessId}-${dayIdx}`);
  if (target) target.style.display = 'block';
}

// ── Session Modal ──
function openSessionModal(sessId) {
  editSessId = sessId || null;
  let sess = sessId ? adminSessions.find(s=>s.id===sessId) : null;
  editDays = sess ? JSON.parse(JSON.stringify(sess.days||[])) : [{name:'DAY 1', items:[]}];

  document.getElementById('sess-modal-title').textContent = sessId ? '세션 수정' : '세션 추가';
  document.getElementById('sess-name').value  = sess ? sess.name  : '';
  document.getElementById('sess-icon').value  = sess ? (sess.icon||'📚') : '📚';
  document.getElementById('sess-status').value = sess ? (sess.status||'preparing') : 'preparing';
  renderEditDays();
  document.getElementById('sess-ov').classList.add('open');
}

function renderEditDays() {
  const wrap = document.getElementById('sess-days-list');
  wrap.innerHTML = editDays.map((d, di) => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <input type="text" value="${d.name}" onchange="editDays[${di}].name=this.value"
        style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;">
      <button class="btn btn-g btn-sm" onclick="removeDay(${di})" ${editDays.length<=1?'disabled':''}>✕</button>
    </div>
  `).join('');
}

function addDay() {
  editDays.push({name:'DAY '+(editDays.length+1), items:[]});
  renderEditDays();
}

function removeDay(di) {
  if (editDays.length <= 1) return;
  editDays.splice(di, 1);
  renderEditDays();
}

async function saveSession() {
  const name = document.getElementById('sess-name').value.trim();
  if (!name) { alert('세션 이름을 입력해주세요.'); return; }
  const icon   = document.getElementById('sess-icon').value.trim() || '📚';
  const status = document.getElementById('sess-status').value;

  if (editSessId) {
    const s = adminSessions.find(s=>s.id===editSessId);
    if (s) {
      s.name = name; s.icon = icon; s.status = status;
      // merge days (preserve existing items)
      editDays.forEach((d, di) => {
        if (!s.days[di]) s.days[di] = { name:d.name, items:[] };
        else s.days[di].name = d.name;
      });
      s.days = s.days.slice(0, editDays.length);
    }
  } else {
    const id = 'sess-' + Date.now();
    adminSessions.push({ id, name, icon, status, order:adminSessions.length,
      days: editDays.map(d=>({...d, items:[]})) });
  }

  await saveSessionsToStore();
  closeOvD('sess-ov');
  renderSessionsTab();
}

async function deleteSess(sessId) {
  if (!confirm('이 세션을 삭제하시겠습니까? 포함된 항목도 모두 삭제됩니다.')) return;
  adminSessions = adminSessions.filter(s=>s.id!==sessId);
  if (db) { try { await db.collection('sessions').doc(sessId).delete(); } catch(e){} }
  await saveSessionsToStore();
  renderSessionsTab();
}

// ── Item Modal ──
function openItemModal(sessId, dayIdx, itemIdx) {
  editItemCtx = { sessId, dayIdx, itemIdx: itemIdx ?? null };
  const s = adminSessions.find(s=>s.id===sessId);
  const item = (itemIdx != null) ? s.days[dayIdx].items[itemIdx] : null;

  document.getElementById('item-modal-title').textContent = item ? '항목 수정' : '항목 추가';
  document.getElementById('item-name').value  = item ? item.name  : '';
  document.getElementById('item-desc').value  = item ? (item.desc||'') : '';
  document.getElementById('item-type').value  = item ? item.type  : 'link';
  document.getElementById('item-url').value   = item ? (item.url||'')  : '';
  // 롤플레이 카테고리 로드
  window._rpEditorCats = item && item.type==='roleplay' ? JSON.parse(JSON.stringify(item.categories||[])) : [];
  updateRpSummary();

  // populate FC and quiz selects
  const fcSets = JSON.parse(localStorage.getItem('lr_fcsets')||'[]');
  const fcSel  = document.getElementById('item-fcid');
  fcSel.innerHTML = '<option value="">-- 세트 선택 --</option>' +
    fcSets.map(f=>`<option value="${f.id}" ${item&&item.fcId===f.id?'selected':''}>${f.name}</option>`).join('');

  const qzSets = JSON.parse(localStorage.getItem('lr_sets')||'[]');
  const qzSel  = document.getElementById('item-quizid');
  qzSel.innerHTML = '<option value="">-- 퀴즈 선택 --</option>' +
    qzSets.map(q=>`<option value="${q.id}" ${item&&item.quizId===q.id?'selected':''}>${q.name}</option>`).join('');

  updateItemFields();
  document.getElementById('item-ov').classList.add('open');
}

function updateItemFields() {
  const type = document.getElementById('item-type').value;
  document.getElementById('item-f-link').style.display    = type==='link'     ? 'block' : 'none';
  document.getElementById('item-f-roleplay').style.display= type==='roleplay' ? 'block' : 'none';
  document.getElementById('item-f-fc').style.display      = (type==='flashcard'||type==='lecture') ? 'block' : 'none';
  document.getElementById('item-f-quiz').style.display    = type==='quiz'     ? 'block' : 'none';
}

async function saveItem() {
  const name = document.getElementById('item-name').value.trim();
  if (!name) { alert('항목 이름을 입력해주세요.'); return; }
  const type = document.getElementById('item-type').value;
  const desc = document.getElementById('item-desc').value.trim();

  const item = { type, name, desc, icon: ICON_MAP[type]||'📋' };
  if (type==='link')      item.url        = document.getElementById('item-url').value.trim();
  if (type==='roleplay')  item.categories = JSON.parse(JSON.stringify(window._rpEditorCats||[]));
  if (type==='flashcard'||type==='lecture') item.fcId = document.getElementById('item-fcid').value;
  if (type==='quiz')      item.quizId  = document.getElementById('item-quizid').value;

  const {sessId, dayIdx, itemIdx} = editItemCtx;
  const s = adminSessions.find(s=>s.id===sessId);
  if (!s) return;
  if (!s.days[dayIdx].items) s.days[dayIdx].items = [];

  if (itemIdx != null) s.days[dayIdx].items[itemIdx] = item;
  else s.days[dayIdx].items.push(item);

  await saveSessionsToStore();
  closeOvD('item-ov');
  renderSessionsTab();
}

// ── Roleplay Editor ──
let _rpCatIdx = 0;

function updateRpSummary() {
  const cats = window._rpEditorCats || [];
  document.getElementById('rp-edit-summary').textContent = `카테고리 ${cats.length}개`;
}

function openRpEditor() {
  _rpCatIdx = 0;
  renderRpeCatList();
  renderRpePanel();
  document.getElementById('rp-ov').classList.add('open');
}

function saveRpEditor() {
  updateRpSummary();
  closeOvD('rp-ov');
}

function renderRpeCatList() {
  const cats = window._rpEditorCats || [];
  const list = document.getElementById('rpe-cat-list');
  list.innerHTML = cats.map((c, i) => `
    <div style="display:flex;align-items:center;gap:6px;padding:8px 10px;border-radius:8px;margin-bottom:4px;cursor:pointer;
      background:${i===_rpCatIdx?'#e8f4fb':'#fff'};border:1px solid ${i===_rpCatIdx?'#0E94CD':'var(--border)'};"
      onclick="rpeSelectCat(${i})">
      <span style="flex:1;font-size:13px;font-weight:${i===_rpCatIdx?'600':'400'};color:${i===_rpCatIdx?'#0a78a8':'var(--text)'};">${c.name}</span>
      <button onclick="event.stopPropagation();rpeDeleteCat(${i})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;padding:0 2px;">✕</button>
    </div>
  `).join('');
}

function renderRpePanel() {
  const cats = window._rpEditorCats || [];
  const panel = document.getElementById('rpe-panel');
  if (!cats.length) { panel.innerHTML = '<p style="color:var(--muted);font-size:14px;">좌측에서 카테고리를 추가하세요.</p>'; return; }
  const cat = cats[_rpCatIdx];
  if (!cat) return;

  const pts = cat.checkpoints || [];
  const scripts = cat.scripts || [];

  panel.innerHTML = `
    <div style="margin-bottom:20px;">
      <label style="font-size:11px;font-weight:700;color:var(--muted);display:block;margin-bottom:6px;">카테고리 이름</label>
      <input type="text" value="${cat.name}" oninput="rpeCatName(this.value)"
        style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div>
        <div style="font-size:12px;font-weight:700;color:#0E94CD;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e8f4fb;">핵심 포인트</div>
        ${pts.map((p,i) => `
          <div style="display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:0.5px solid var(--border);">
            <span style="flex:1;font-size:13px;">${p}</span>
            <button onclick="rpePtEdit(${i})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px;">✏️</button>
            <button onclick="rpePtDelete(${i})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px;">✕</button>
          </div>`).join('')}
        <button class="btn btn-g btn-sm" style="margin-top:8px;width:100%;" onclick="rpePtAdd()">＋ 포인트 추가</button>
      </div>
      <div>
        <div style="font-size:12px;font-weight:700;color:#0E94CD;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e8f4fb;">멘트</div>
        ${scripts.map((s,i) => `
          <div style="margin-bottom:10px;padding:10px;background:#f9fbfd;border-radius:8px;border:1px solid var(--border);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <span style="font-size:11px;font-weight:700;color:var(--muted);">${s.label||'멘트'}</span>
              <div style="display:flex;gap:4px;">
                <button onclick="rpeScriptEdit(${i})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px;">✏️</button>
                <button onclick="rpeScriptDelete(${i})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px;">✕</button>
              </div>
            </div>
            <div style="font-size:13px;color:var(--text);font-style:italic;">"${s.text||''}"</div>
          </div>`).join('')}
        <button class="btn btn-g btn-sm" style="width:100%;" onclick="rpeScriptAdd()">＋ 멘트 추가</button>
      </div>
    </div>
  `;
}

function rpeSelectCat(i) { _rpCatIdx = i; renderRpeCatList(); renderRpePanel(); }

function rpeAddCat() {
  const name = prompt('카테고리 이름을 입력하세요:');
  if (!name) return;
  window._rpEditorCats.push({ name, checkpoints:[], scripts:[] });
  _rpCatIdx = window._rpEditorCats.length - 1;
  renderRpeCatList(); renderRpePanel();
}

function rpeDeleteCat(i) {
  if (!confirm('이 카테고리를 삭제하시겠습니까?')) return;
  window._rpEditorCats.splice(i, 1);
  _rpCatIdx = Math.min(_rpCatIdx, window._rpEditorCats.length - 1);
  renderRpeCatList(); renderRpePanel();
}

function rpeCatName(val) {
  window._rpEditorCats[_rpCatIdx].name = val;
  renderRpeCatList();
}

function rpePtAdd() {
  const val = prompt('핵심 포인트를 입력하세요:');
  if (!val) return;
  window._rpEditorCats[_rpCatIdx].checkpoints.push(val);
  renderRpePanel();
}
function rpePtEdit(i) {
  const cur = window._rpEditorCats[_rpCatIdx].checkpoints[i];
  const val = prompt('수정:', cur);
  if (val === null) return;
  window._rpEditorCats[_rpCatIdx].checkpoints[i] = val;
  renderRpePanel();
}
function rpePtDelete(i) {
  window._rpEditorCats[_rpCatIdx].checkpoints.splice(i, 1);
  renderRpePanel();
}

function rpeScriptAdd() {
  const label = prompt('멘트 라벨 (예: 기본 멘트, 대안 멘트):') || '멘트';
  const text  = prompt('멘트 내용:');
  if (!text) return;
  window._rpEditorCats[_rpCatIdx].scripts.push({ label, text });
  renderRpePanel();
}
function rpeScriptEdit(i) {
  const s = window._rpEditorCats[_rpCatIdx].scripts[i];
  const label = prompt('라벨:', s.label) ?? s.label;
  const text  = prompt('멘트 내용:', s.text);
  if (text === null) return;
  window._rpEditorCats[_rpCatIdx].scripts[i] = { label, text };
  renderRpePanel();
}
function rpeScriptDelete(i) {
  window._rpEditorCats[_rpCatIdx].scripts.splice(i, 1);
  renderRpePanel();
}

async function deleteItem(sessId, dayIdx, itemIdx) {
  if (!confirm('이 항목을 삭제하시겠습니까?')) return;
  const s = adminSessions.find(s=>s.id===sessId);
  if (s) s.days[dayIdx].items.splice(itemIdx, 1);
  await saveSessionsToStore();
  renderSessionsTab();
}
