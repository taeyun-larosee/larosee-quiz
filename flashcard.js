// ── Flashcard CRUD ──
function renderFCList() {
  const data = JSON.parse(localStorage.getItem('lr_fcsets')||'[]');
  const wrap = document.getElementById('fc-list-wrap');
  if (!data.length) { wrap.innerHTML='<div style="color:var(--muted);font-size:13px;">?깅줉???뚮옒?쒖뭅???놁쓬</div>'; return; }
  wrap.innerHTML = data.map((s,i) => `
    <div class="qi">
      <div class="qn" style="background:#fdf4ff;color:#9333ea;font-size:20px;">?뾺</div>
      <div style="flex:1;">
        <div style="font-size:15px;font-weight:700;">${s.name||'?명듃 '+(i+1)}</div>
        <div style="font-size:12px;color:var(--muted);">${(s.cards||[]).length}??/div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span class="badge bg-green">?쒖꽦</span>
        <button class="btn btn-g btn-sm" onclick="openQR('fc-'+s.id)">QR 蹂닿린</button>
        <button class="btn btn-o btn-sm" onclick="openFcEditor('${s.id}')">?섏젙</button>
        <button class="btn btn-g btn-sm" onclick="deleteFcSet('${s.id}')" style="color:var(--red);">??젣</button>
      </div>
    </div>
  `).join('');
}

// ?? ?뚮옒?쒖뭅???먮뵒????
let _fceId = null, _fceCards = [], _fceEditIdx = null;

function openFcEditor(id) {
  const sets = JSON.parse(localStorage.getItem('lr_fcsets')||'[]');
  const set = id ? sets.find(s=>s.id===id) : null;
  _fceId = id;
  _fceCards = set ? JSON.parse(JSON.stringify(set.cards||[])) : [];
  _fceEditIdx = null;
  document.getElementById('fce-title').textContent = set ? '?뚮옒?쒖뭅???섏젙' : '?뚮옒?쒖뭅??異붽?';
  document.getElementById('fce-name').value = set ? set.name : '';
  fceCloseForm();
  renderFceList();
  document.getElementById('fc-editor-ov').classList.add('open');
}

function renderFceList() {
  const wrap = document.getElementById('fce-card-list');
  if (!_fceCards.length) { wrap.innerHTML='<div style="color:var(--muted);font-size:13px;margin-bottom:8px;">移대뱶 ?놁쓬</div>'; return; }
  wrap.innerHTML = _fceCards.map((c,i)=>`
    <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:#fff;">
      <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <span style="font-size:13px;color:var(--text);">?? ${c.front||c.q||''}</span>
        <span style="font-size:13px;color:var(--muted);">?? ${c.back||c.a||''}</span>
      </div>
      <button class="btn btn-o btn-sm" onclick="fceEditCard(${i})">?섏젙</button>
      <button class="btn btn-g btn-sm" onclick="fceDeleteCard(${i})" style="color:var(--red);">??젣</button>
    </div>
  `).join('');
}

function fceOpenForm(editIdx) {
  _fceEditIdx = editIdx ?? null;
  const c = editIdx != null ? _fceCards[editIdx] : null;
  document.getElementById('fce-form-title').textContent = c ? '移대뱶 ?섏젙' : '移대뱶 異붽?';
  document.getElementById('fce-front').value = c ? (c.front||c.q||'') : '';
  document.getElementById('fce-back').value  = c ? (c.back||c.a||'') : '';
  document.getElementById('fce-add-form').style.display = 'block';
  document.getElementById('fce-add-btn').style.display = 'none';
}

function fceCloseForm() {
  document.getElementById('fce-add-form').style.display = 'none';
  document.getElementById('fce-add-btn').style.display = 'inline-flex';
  _fceEditIdx = null;
}

function fceEditCard(i) { fceOpenForm(i); }

function fceSaveCard() {
  const front = document.getElementById('fce-front').value.trim();
  const back  = document.getElementById('fce-back').value.trim();
  if (!front||!back) { alert('?욌㈃怨??룸㈃??紐⑤몢 ?낅젰?댁＜?몄슂.'); return; }
  const card = { id:'c'+(Date.now()), front, back };
  if (_fceEditIdx != null) _fceCards[_fceEditIdx] = card;
  else _fceCards.push(card);
  fceCloseForm(); renderFceList();
}

function fceDeleteCard(i) {
  if (!confirm('??移대뱶瑜???젣?섏떆寃좎뒿?덇퉴?')) return;
  _fceCards.splice(i,1); renderFceList();
}

function saveFcEditor() {
  const name = document.getElementById('fce-name').value.trim();
  if (!name) { alert('?명듃 ?대쫫???낅젰?댁＜?몄슂.'); return; }
  const sets = JSON.parse(localStorage.getItem('lr_fcsets')||'[]');
  if (_fceId) {
    const idx = sets.findIndex(s=>s.id===_fceId);
    if (idx>=0) sets[idx] = { ...sets[idx], name, cards:_fceCards };
  } else {
    sets.push({ id:'fc_'+Date.now(), name, cards:_fceCards });
  }
  localStorage.setItem('lr_fcsets', JSON.stringify(sets));
  closeOvD('fc-editor-ov');
  renderFCList();
}

function deleteFcSet(id) {
  if (!confirm('???뚮옒?쒖뭅???명듃瑜???젣?섏떆寃좎뒿?덇퉴?')) return;
  const sets = JSON.parse(localStorage.getItem('lr_fcsets')||'[]').filter(s=>s.id!==id);
  localStorage.setItem('lr_fcsets', JSON.stringify(sets));
  renderFCList();
}
