// ── Sessions CRUD ──
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
// ?? SESSIONS CRUD ??
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
let adminSessions = [];
let editSessId = null;      // null = new, string = edit existing
let editItemCtx = null;     // {sessId, dayIdx, itemIdx} null = new item
let editDays = [];          // temp days array while editing session

const DEFAULT_SESSIONS = [
  { id:'new-hire', name:'?좉퇋?낆궗??援먯쑁', status:'active', icon:'?뱴', order:0,
    days:[
      { name:'DAY 1', items:[
        {type:'link',name:'釉뚮옖??援먯쑁',desc:'PPT',url:'',icon:'?뱥'},
        {type:'link',name:'?몄꽱?곕툕 援먯쑁',desc:'PPT',url:'',icon:'?뱥'},
        {type:'link',name:'?쒗뭹 援먯쑁',desc:'PDF',url:'',icon:'?뱞'},
        {type:'link',name:'留ㅻ돱??援먯쑁',desc:'PPT',url:'',icon:'?뱥'},
        {type:'link',name:'?꾩궛援먯쑁',desc:'PPT + ?덊럹?댁?',url:'',icon:'?뮲'}
      ]},
      { name:'DAY 2', items:[
        {type:'roleplay',name:'롤플레이 시나리오',desc:'롤플레이 실습',icon:'🎭',categories:[
          {name:'일반 고객',checkpoints:['고객 인사하기','3초 안에 반응하기','시선 맞추기','상품 소개하기'],scripts:[{label:'일반 스크립트',text:'안녕하세요! 라로제 방문을 환영합니다~'},{label:'응대 스크립트',text:'안녕하세요! 무엇을 찾으시나요~'}]},
          {name:'鍮좊Ⅸ 怨좉컼',checkpoints:[],scripts:[]},
          {name:'?먮┛ 怨좉컼',checkpoints:[],scripts:[]},
          {name:'?섎텇?ㅽ떛',checkpoints:[],scripts:[]},
          {name:'?몃읆',checkpoints:[],scripts:[]},
          {name:'癒몃뱶?ㅽ떛',checkpoints:[],scripts:[]},
          {name:'?ъ썙?ㅼ씪',checkpoints:[],scripts:[]}
        ]},
        {type:'link',name:'?댁쓽?쒓린 援먯쑁',desc:'PPT',url:'',icon:'?뱥'},
        {type:'flashcard',name:'?댁쓽?쒓린 ?뚮옒?쒖뭅??諛고룷',desc:'QR 諛고룷 ???몃뱶?곗쑝濡??곗뒿',fcId:'',icon:'?뾺'},
        {type:'quiz',name:'留덈Т由??댁쫰 諛고룷',desc:'QR 諛고룷 ???묒떆',quizId:'',icon:'✅'},
        {type:'lecture',name:'留덈Т由?媛뺤쓽',desc:'?뚮옒?쒖뭅??媛뺤쓽 紐⑤뱶',fcId:'',icon:'?럳'}
      ]}
    ]
  },
  { id:'retrain-1', name:'재훈련 1차', status:'preparing', icon:'📋', order:1, days:[] },
  { id:'retrain-2', name:'재훈련 2차', status:'preparing', icon:'📋', order:2, days:[] }
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

const ICON_MAP = { link:'?뱥', roleplay:'?렚', flashcard:'?뾺', quiz:'✅', lecture:'?럳' };
const TYPE_LABEL = { link:'留곹겕', roleplay:'濡ㅽ뵆?덉씠', flashcard:'FC QR', quiz:'?댁쫰 QR', lecture:'媛뺤쓽 紐⑤뱶' };
const ITEM_BG = { link:'#eff6ff', roleplay:'#f0fdf4', flashcard:'#fdf4ff', quiz:'#fef2f2', lecture:'#fffbeb' };

function renderSessionsTab() {
  const wrap = document.getElementById('sessions-list');
  if (!adminSessions.length) {
    wrap.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:20px 0;">?깅줉???몄뀡???놁뒿?덈떎.</div>';
    return;
  }
  wrap.innerHTML = adminSessions.map((s, si) => {
    const totalItems = (s.days||[]).reduce((a,d)=>a+(d.items||[]).length, 0);
    const isOpen = si === 0;
    return `
    <div class="sc-card ${s.status!=='active'?'dim':''}" id="sc-${s.id}">
      <div class="sc-hdr" onclick="toggleSc(this)">
        <div class="sc-meta">
          <h3>${s.icon||'?뱴'} ${s.name}</h3>
          <p>${(s.days||[]).map(d=>d.name).join(' 쨌 ')} 쨌 ??ぉ ${totalItems}媛?/p>
          <div style="margin-top:8px;display:flex;gap:8px;">
            <span class="badge ${s.status==='active'?'bg-green':'bg-muted'}">${s.status==='active'?'吏꾪뻾以?:'以鍮?以?}</span>
          </div>
        </div>
        <div class="sc-acts" onclick="event.stopPropagation()">
          <button class="btn btn-o btn-sm" onclick="openSessionModal('${s.id}')">?섏젙</button>
          <button class="btn btn-g btn-sm" onclick="deleteSess('${s.id}')">??젣</button>
          <button class="btn btn-g btn-sm tog-btn">${isOpen?'???묎린':'???닿린'}</button>
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
      ?깅줉????ぉ???놁뒿?덈떎.
      <button class="btn btn-p btn-sm" style="margin-left:8px;" onclick="openSessionModal('${s.id}')">DAY 異붽?</button>
    </div>`;
  }
  const tabs = s.days.map((d,di) =>
    `<div class="dtab ${di===0?'on':''}" onclick="setDayAdmin(this, '${s.id}', ${di})">${d.name}</div>`
  ).join('');
  const dayContents = s.days.map((d, di) =>
    `<div class="day-content" id="day-${s.id}-${di}" style="${di===0?'':'display:none'}">
      ${(d.items||[]).map((item, ii) => renderItemRow(s.id, di, ii, item)).join('')}
      <div style="padding:12px 20px;">
        <button class="btn btn-g btn-sm" onclick="openItemModal('${s.id}',${di})">竊???ぉ 異붽?</button>
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
      <div class="ci-drag" title="?쒕옒洹명븯???쒖꽌 蹂寃?>??/div>
      <div class="ci-icon" style="background:${ITEM_BG[item.type]||'#f4f7fb'}">${item.icon||ICON_MAP[item.type]||'?뱥'}</div>
      <div class="ci-info">
        <div class="ci-name">${item.name}</div>
        <div class="ci-desc">${TYPE_LABEL[item.type]||item.type}${item.desc?' 쨌 '+item.desc:''}</div>
      </div>
      <div class="ci-btns">
        ${(item.type==='flashcard'||item.type==='quiz')?
          `<button class="btn btn-sm" style="background:var(--blue-light);color:var(--blue);border:2px solid var(--blue);border-radius:8px;"
            onclick="openQR('${item.type}-${item.fcId||item.quizId||''}')">QR 蹂닿린</button>` : ''}
        <button class="btn btn-o btn-sm" onclick="openItemModal('${sessId}',${dayIdx},${itemIdx})">?섏젙</button>
        <button class="btn btn-g btn-sm" onclick="deleteItem('${sessId}',${dayIdx},${itemIdx})">??젣</button>
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

// ?? Session Modal ??
function openSessionModal(sessId) {
  editSessId = sessId || null;
  let sess = sessId ? adminSessions.find(s=>s.id===sessId) : null;
  editDays = sess ? JSON.parse(JSON.stringify(sess.days||[])) : [{name:'DAY 1', items:[]}];

  document.getElementById('sess-modal-title').textContent = sessId ? '?몄뀡 ?섏젙' : '?몄뀡 異붽?';
  document.getElementById('sess-name').value  = sess ? sess.name  : '';
  document.getElementById('sess-icon').value  = sess ? (sess.icon||'?뱴') : '?뱴';
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
      <button class="btn btn-g btn-sm" onclick="removeDay(${di})" ${editDays.length<=1?'disabled':''}>??/button>
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
  if (!name) { alert('?몄뀡 ?대쫫???낅젰?댁＜?몄슂.'); return; }
  const icon   = document.getElementById('sess-icon').value.trim() || '?뱴';
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
  if (!confirm('???몄뀡????젣?섏떆寃좎뒿?덇퉴? ?ы븿????ぉ??紐⑤몢 ??젣?⑸땲??')) return;
  adminSessions = adminSessions.filter(s=>s.id!==sessId);
  if (db) { try { await db.collection('sessions').doc(sessId).delete(); } catch(e){} }
  await saveSessionsToStore();
  renderSessionsTab();
}

// ?? Item Modal ??
function openItemModal(sessId, dayIdx, itemIdx) {
  editItemCtx = { sessId, dayIdx, itemIdx: itemIdx ?? null };
  const s = adminSessions.find(s=>s.id===sessId);
  const item = (itemIdx != null) ? s.days[dayIdx].items[itemIdx] : null;

  document.getElementById('item-modal-title').textContent = item ? '??ぉ ?섏젙' : '??ぉ 異붽?';
  document.getElementById('item-name').value  = item ? item.name  : '';
  document.getElementById('item-desc').value  = item ? (item.desc||'') : '';
  document.getElementById('item-type').value  = item ? item.type  : 'link';
  document.getElementById('item-url').value   = item ? (item.url||'')  : '';
  // 濡ㅽ뵆?덉씠 移댄뀒怨좊━ 濡쒕뱶
  window._rpEditorCats = item && item.type==='roleplay' ? JSON.parse(JSON.stringify(item.categories||[])) : [];
  updateRpSummary();

  // populate FC and quiz selects
  const fcSets = JSON.parse(localStorage.getItem('lr_fcsets')||'[]');
  const fcSel  = document.getElementById('item-fcid');
  fcSel.innerHTML = '<option value="">-- ?명듃 ?좏깮 --</option>' +
    fcSets.map(f=>`<option value="${f.id}" ${item&&item.fcId===f.id?'selected':''}>${f.name}</option>`).join('');

  const qzSets = JSON.parse(localStorage.getItem('lr_sets')||'[]');
  const qzSel  = document.getElementById('item-quizid');
  qzSel.innerHTML = '<option value="">-- ?댁쫰 ?좏깮 --</option>' +
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
  if (!name) { alert('??ぉ ?대쫫???낅젰?댁＜?몄슂.'); return; }
  const type = document.getElementById('item-type').value;
  const desc = document.getElementById('item-desc').value.trim();

  const item = { type, name, desc, icon: ICON_MAP[type]||'?뱥' };
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

// ?? Roleplay Editor ??
let _rpCatIdx = 0;

function updateRpSummary() {
  const cats = window._rpEditorCats || [];
  document.getElementById('rp-edit-summary').textContent = `移댄뀒怨좊━ ${cats.length}媛?;
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
      <button onclick="event.stopPropagation();rpeDeleteCat(${i})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;padding:0 2px;">??/button>
    </div>
  `).join('');
}

function renderRpePanel() {
  const cats = window._rpEditorCats || [];
  const panel = document.getElementById('rpe-panel');
  if (!cats.length) { panel.innerHTML = '<p style="color:var(--muted);font-size:14px;">醫뚯륫?먯꽌 移댄뀒怨좊━瑜?異붽??섏꽭??</p>'; return; }
  const cat = cats[_rpCatIdx];
  if (!cat) return;

  const pts = cat.checkpoints || [];
  const scripts = cat.scripts || [];

  panel.innerHTML = `
    <div style="margin-bottom:20px;">
      <label style="font-size:11px;font-weight:700;color:var(--muted);display:block;margin-bottom:6px;">移댄뀒怨좊━ ?대쫫</label>
      <input type="text" value="${cat.name}" oninput="rpeCatName(this.value)"
        style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div>
        <div style="font-size:12px;font-weight:700;color:#0E94CD;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e8f4fb;">?듭떖 ?ъ씤??/div>
        ${pts.map((p,i) => `
          <div style="display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:0.5px solid var(--border);">
            <span style="flex:1;font-size:13px;">${p}</span>
            <button onclick="rpePtEdit(${i})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px;">?륅툘</button>
            <button onclick="rpePtDelete(${i})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px;">??/button>
          </div>`).join('')}
        <button class="btn btn-g btn-sm" style="margin-top:8px;width:100%;" onclick="rpePtAdd()">竊??ъ씤??異붽?</button>
      </div>
      <div>
        <div style="font-size:12px;font-weight:700;color:#0E94CD;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e8f4fb;">硫섑듃</div>
        ${scripts.map((s,i) => `
          <div style="margin-bottom:10px;padding:10px;background:#f9fbfd;border-radius:8px;border:1px solid var(--border);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <span style="font-size:11px;font-weight:700;color:var(--muted);">${s.label||'硫섑듃'}</span>
              <div style="display:flex;gap:4px;">
                <button onclick="rpeScriptEdit(${i})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px;">?륅툘</button>
                <button onclick="rpeScriptDelete(${i})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px;">??/button>
              </div>
            </div>
            <div style="font-size:13px;color:var(--text);font-style:italic;">"${s.text||''}"</div>
          </div>`).join('')}
        <button class="btn btn-g btn-sm" style="width:100%;" onclick="rpeScriptAdd()">竊?硫섑듃 異붽?</button>
      </div>
    </div>
  `;
}

function rpeSelectCat(i) { _rpCatIdx = i; renderRpeCatList(); renderRpePanel(); }

function rpeAddCat() {
  const name = prompt('移댄뀒怨좊━ ?대쫫???낅젰?섏꽭??');
  if (!name) return;
  window._rpEditorCats.push({ name, checkpoints:[], scripts:[] });
  _rpCatIdx = window._rpEditorCats.length - 1;
  renderRpeCatList(); renderRpePanel();
}

function rpeDeleteCat(i) {
  if (!confirm('??移댄뀒怨좊━瑜???젣?섏떆寃좎뒿?덇퉴?')) return;
  window._rpEditorCats.splice(i, 1);
  _rpCatIdx = Math.min(_rpCatIdx, window._rpEditorCats.length - 1);
  renderRpeCatList(); renderRpePanel();
}

function rpeCatName(val) {
  window._rpEditorCats[_rpCatIdx].name = val;
  renderRpeCatList();
}

function rpePtAdd() {
  const val = prompt('?듭떖 ?ъ씤?몃? ?낅젰?섏꽭??');
  if (!val) return;
  window._rpEditorCats[_rpCatIdx].checkpoints.push(val);
  renderRpePanel();
}
function rpePtEdit(i) {
  const cur = window._rpEditorCats[_rpCatIdx].checkpoints[i];
  const val = prompt('?섏젙:', cur);
  if (val === null) return;
  window._rpEditorCats[_rpCatIdx].checkpoints[i] = val;
  renderRpePanel();
}
function rpePtDelete(i) {
  window._rpEditorCats[_rpCatIdx].checkpoints.splice(i, 1);
  renderRpePanel();
}

function rpeScriptAdd() {
  const label = prompt('硫섑듃 ?쇰꺼 (?? 湲곕낯 硫섑듃, ???硫섑듃):') || '硫섑듃';
  const text  = prompt('硫섑듃 ?댁슜:');
  if (!text) return;
  window._rpEditorCats[_rpCatIdx].scripts.push({ label, text });
  renderRpePanel();
}
function rpeScriptEdit(i) {
  const s = window._rpEditorCats[_rpCatIdx].scripts[i];
  const label = prompt('?쇰꺼:', s.label) ?? s.label;
  const text  = prompt('硫섑듃 ?댁슜:', s.text);
  if (text === null) return;
  window._rpEditorCats[_rpCatIdx].scripts[i] = { label, text };
  renderRpePanel();
}
function rpeScriptDelete(i) {
  window._rpEditorCats[_rpCatIdx].scripts.splice(i, 1);
  renderRpePanel();
}

async function deleteItem(sessId, dayIdx, itemIdx) {
  if (!confirm('????ぉ????젣?섏떆寃좎뒿?덇퉴?')) return;
  const s = adminSessions.find(s=>s.id===sessId);
  if (s) s.days[dayIdx].items.splice(itemIdx, 1);
  await saveSessionsToStore();
  renderSessionsTab();
}
