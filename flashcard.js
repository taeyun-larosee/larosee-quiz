// ── Flashcard CRUD ──
function renderFCList() {
  const data = JSON.parse(localStorage.getItem('lr_fcsets')||'[]');
  const wrap = document.getElementById('fc-list-wrap');
  if (!data.length) { wrap.innerHTML='<div style="color:var(--muted);font-size:13px;">등록된 플래시카드 없음</div>'; return; }
  wrap.innerHTML = data.map((s,i) => `
    <div class="qi">
      <div class="qn" style="background:#fdf4ff;color:#9333ea;font-size:20px;">🗂</div>
      <div style="flex:1;">
        <div style="font-size:15px;font-weight:700;">${s.name||'세트 '+(i+1)}</div>
        <div style="font-size:12px;color:var(--muted);">${(s.cards||[]).length}장</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span class="badge bg-green">활성</span>
        <button class="btn btn-g btn-sm" onclick="openQR('fc-'+s.id)">QR 보기</button>
        <button class="btn btn-o btn-sm" onclick="openFcEditor('${s.id}')">수정</button>
        <button class="btn btn-g btn-sm" onclick="deleteFcSet('${s.id}')" style="color:var(--red);">삭제</button>
      </div>
    </div>
  `).join('');
}

// ── 플래시카드 에디터 ──
let _fceId = null, _fceCards = [], _fceEditIdx = null;

function openFcEditor(id) {
  const sets = JSON.parse(localStorage.getItem('lr_fcsets')||'[]');
  const set = id ? sets.find(s=>s.id===id) : null;
  _fceId = id;
  _fceCards = set ? JSON.parse(JSON.stringify(set.cards||[])) : [];
  _fceEditIdx = null;
  document.getElementById('fce-title').textContent = set ? '플래시카드 수정' : '플래시카드 추가';
  document.getElementById('fce-name').value = set ? set.name : '';
  fceCloseForm();
  renderFceList();
  document.getElementById('fc-editor-ov').classList.add('open');
}

function renderFceList() {
  const wrap = document.getElementById('fce-card-list');
  if (!_fceCards.length) { wrap.innerHTML='<div style="color:var(--muted);font-size:13px;margin-bottom:8px;">카드 없음</div>'; return; }
  wrap.innerHTML = _fceCards.map((c,i)=>`
    <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:#fff;">
      <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <span style="font-size:13px;color:var(--text);">앞: ${c.front||c.q||''}</span>
        <span style="font-size:13px;color:var(--muted);">뒤: ${c.back||c.a||''}</span>
      </div>
      <button class="btn btn-o btn-sm" onclick="fceEditCard(${i})">수정</button>
      <button class="btn btn-g btn-sm" onclick="fceDeleteCard(${i})" style="color:var(--red);">삭제</button>
    </div>
  `).join('');
}

function fceOpenForm(editIdx) {
  _fceEditIdx = editIdx ?? null;
  const c = editIdx != null ? _fceCards[editIdx] : null;
  document.getElementById('fce-form-title').textContent = c ? '카드 수정' : '카드 추가';
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
  if (!front||!back) { alert('앞면과 뒷면을 모두 입력해주세요.'); return; }
  const card = { id:'c'+(Date.now()), front, back };
  if (_fceEditIdx != null) _fceCards[_fceEditIdx] = card;
  else _fceCards.push(card);
  fceCloseForm(); renderFceList();
}

function fceDeleteCard(i) {
  if (!confirm('이 카드를 삭제하시겠습니까?')) return;
  _fceCards.splice(i,1); renderFceList();
}

function saveFcEditor() {
  const name = document.getElementById('fce-name').value.trim();
  if (!name) { alert('세트 이름을 입력해주세요.'); return; }
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
  if (!confirm('이 플래시카드 세트를 삭제하시겠습니까?')) return;
  const sets = JSON.parse(localStorage.getItem('lr_fcsets')||'[]').filter(s=>s.id!==id);
  localStorage.setItem('lr_fcsets', JSON.stringify(sets));
  renderFCList();
}
