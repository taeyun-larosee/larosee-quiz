// ── Quiz CRUD ──
// ?? Quiz / FC lists ??
function renderQuizList(sets) {
  const data = sets || JSON.parse(localStorage.getItem('lr_sets')||'[]');
  const wrap = document.getElementById('quiz-list-wrap');
  if (!data.length) { wrap.innerHTML='<div style="color:var(--muted);font-size:13px;">?깅줉???댁쫰 ?놁쓬</div>'; return; }
  const colors = ['#eff6ff','#f0fdf4','#fffbeb'];
  const tcols = ['var(--blue)','var(--green)','var(--amber)'];
  wrap.innerHTML = data.map((s,i) => `
    <div class="qi">
      <div class="qn" style="background:${colors[i%3]};color:${tcols[i%3]};">${i+1}</div>
      <div style="flex:1;">
        <div style="font-size:15px;font-weight:700;">${s.name||'?댁쫰 '+(i+1)}</div>
        <div style="font-size:12px;color:var(--muted);">${(s.questions||[]).length}臾명빆${s.quizCount>0?' 쨌 異쒖젣 '+s.quizCount+'臾?:''}${s.timerMin>0?' 쨌 '+s.timerMin+'遺???대㉧':''}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span class="badge bg-green">?쒖꽦</span>
        <button class="btn btn-g btn-sm" onclick="openQR('quiz-'+s.id)">QR 蹂닿린</button>
        <button class="btn btn-o btn-sm" onclick="openQuizEditor('${s.id}')">?섏젙</button>
        <button class="btn btn-g btn-sm" onclick="deleteQuizSet('${s.id}')" style="color:var(--red);">??젣</button>
      </div>
    </div>
  `).join('');
}

// ?? ?댁쫰 ?먮뵒????
let _qeId = null, _qeQuestions = [], _qeEditIdx = null, _qeInlineIdx = null;

function openQuizEditor(id) {
  const sets = JSON.parse(localStorage.getItem('lr_sets')||'[]');
  const set = id ? sets.find(s=>s.id===id) : null;
  _qeId = id;
  _qeQuestions = set ? JSON.parse(JSON.stringify(set.questions||[])).map(q => ({
    ...q,
    question: q.question || q.q || '',
    correct: q.correct ?? q.answer
  })) : [];
  _qeEditIdx = null;
  document.getElementById('qe-title').textContent = set ? '?댁쫰 ?섏젙' : '?댁쫰 異붽?';
  document.getElementById('qe-name').value = set ? set.name : '';
  document.getElementById('qe-quiz-cnt').value = set ? (set.quizCount || 0) : 0;
  document.getElementById('qe-timer').value = set ? (set.timerMin || 0) : 0;
  document.getElementById('qe-pass-s').value = set ? (set.passS || 90) : 90;
  document.getElementById('qe-pass-p').value = set ? (set.passP || 80) : 80;
  qeCloseForm();
  renderQeList();
  document.getElementById('quiz-editor-ov').classList.add('open');
}

function renderQeList() {
  const wrap = document.getElementById('qe-question-list');
  if (!_qeQuestions.length) { wrap.innerHTML='<div style="color:var(--muted);font-size:13px;margin-bottom:8px;">臾명빆 ?놁쓬</div>'; return; }
  wrap.innerHTML = _qeQuestions.map((q,i) => {
    // ?꾨뱶紐??뺢퇋??(question/correct ?곗꽑, q/answer ?대갚)
    const qText = q.question || q.q || '';
    const ansArr = Array.isArray(q.correct) ? q.correct.map(Number)
      : q.correct != null ? [Number(q.correct)]
      : Array.isArray(q.answer) ? q.answer.map(Number)
      : q.answer != null ? [Number(q.answer)] : [0];
    if (_qeInlineIdx === i) {
      const esc = s => (s||'').replace(/"/g,'&quot;').replace(/</g,'&lt;');
      const cbHtml = [0,1,2,3].map(j =>
        '<label style="display:flex;align-items:center;gap:5px;font-size:13px;padding:6px 8px;border:1px solid #e2eaf4;border-radius:7px;cursor:pointer;background:#fff;">' +
        '<input type="checkbox" id="qe-il-ans-'+j+'" '+(ansArr.includes(j)?'checked':'')+' style="width:14px;height:14px;accent-color:#0E94CD;"> ' +
        '?졻몼?™몿'[j]+' 踰?/label>'
      ).join('');
      return `
        <div style="border:2px solid var(--blue);border-radius:10px;padding:14px;margin-bottom:8px;background:#f4faff;">
          <div style="font-size:12px;font-weight:700;color:var(--blue);margin-bottom:10px;">Q${i+1} ?섏젙 以?/div>
          <input type="text" id="qe-il-q" value="${esc(qText)}" placeholder="吏덈Ц ?댁슜"
            style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;margin-bottom:8px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
            <input type="text" id="qe-il-0" value="${esc(q.options[0])}" placeholder="??蹂닿린" style="padding:7px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;">
            <input type="text" id="qe-il-1" value="${esc(q.options[1])}" placeholder="??蹂닿린" style="padding:7px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;">
            <input type="text" id="qe-il-2" value="${esc(q.options[2])}" placeholder="??蹂닿린" style="padding:7px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;">
            <input type="text" id="qe-il-3" value="${esc(q.options[3])}" placeholder="??蹂닿린" style="padding:7px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;">
          </div>
          <div style="margin-bottom:10px;">
            <div style="font-size:13px;color:var(--muted);margin-bottom:6px;">?뺣떟 <span style="font-size:11px;">(蹂듭닔 ?좏깮 媛??</span></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">${cbHtml}</div>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-g btn-sm" onclick="qeInlineCancel()">痍⑥냼</button>
            <button class="btn btn-p btn-sm" onclick="qeInlineSave(${i})">???/button>
          </div>
        </div>`;
    }
    const ansLabel = ansArr.map(a=>(a+1)+'踰?).join(', ');
    const multiTag = ansArr.length > 1 ? ' <span style="font-size:10px;background:#e8f4fb;color:var(--blue);padding:1px 5px;border-radius:4px;">蹂듭닔</span>' : '';
    return `
      <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:#fff;">
        <span style="font-size:13px;font-weight:700;color:var(--blue);min-width:24px;">Q${i+1}</span>
        <span style="flex:1;font-size:13px;">${qText}</span>
        <span style="font-size:11px;color:var(--muted);">?뺣떟:${ansLabel}${multiTag}</span>
        <button class="btn btn-o btn-sm" onclick="qeInlineEdit(${i})">?섏젙</button>
        <button class="btn btn-g btn-sm" onclick="qeDeleteQuestion(${i})" style="color:var(--red);">??젣</button>
      </div>`;
  }).join('');
}

function qeOpenForm(editIdx) {
  _qeEditIdx = editIdx ?? null;
  const q = editIdx != null ? _qeQuestions[editIdx] : null;
  document.getElementById('qe-form-title').textContent = q ? '臾명빆 ?섏젙' : '臾명빆 異붽?';
  document.getElementById('qe-q-text').value = q ? (q.question || q.q || '') : '';
  const opts = q ? q.options : ['','','',''];
  [0,1,2,3].forEach(i => document.getElementById('qe-opt'+i).value = opts[i]||'');
  // ?뺣떟 泥댄겕諛뺤뒪 ?ㅼ젙
  const ansArr = q ? (Array.isArray(q.correct) ? q.correct.map(Number)
    : q.correct != null ? [Number(q.correct)]
    : Array.isArray(q.answer) ? q.answer.map(Number)
    : q.answer != null ? [Number(q.answer)] : [0]) : [];
  [0,1,2,3].forEach(i => { const cb = document.getElementById('qe-ans-'+i); if(cb) cb.checked = ansArr.includes(i); });
  document.getElementById('qe-add-form').style.display = 'block';
  document.getElementById('qe-add-btn').style.display = 'none';
}

function qeCloseForm() {
  document.getElementById('qe-add-form').style.display = 'none';
  document.getElementById('qe-add-btn').style.display = 'inline-flex';
  _qeEditIdx = null;
  // _qeInlineIdx???ш린??珥덇린?뷀븯吏 ?딆쓬 (qeInlineCancel?먯꽌留?珥덇린??
}

function qeEditQuestion(i) { qeInlineEdit(i); }

function qeInlineEdit(i) {
  qeCloseForm(); // ?섎떒 異붽? ???リ린 (qeInlineIdx 嫄대뱶由ъ? ?딆쓬)
  _qeInlineIdx = i; // qeCloseForm ?댄썑???ㅼ젙
  renderQeList();
}

function qeInlineCancel() {
  _qeInlineIdx = null;
  renderQeList();
}

function qeInlineSave(i) {
  const qText = document.getElementById('qe-il-q').value.trim();
  if (!qText) { alert('吏덈Ц???낅젰?댁＜?몄슂.'); return; }
  const opts = [0,1,2,3].map(j => document.getElementById('qe-il-'+j).value.trim());
  if (opts.some(o=>!o)) { alert('蹂닿린瑜?紐⑤몢 ?낅젰?댁＜?몄슂.'); return; }
  const checked = [0,1,2,3].filter(j => document.getElementById('qe-il-ans-'+j)?.checked);
  if (!checked.length) { alert('?뺣떟???좏깮?댁＜?몄슂.'); return; }
  const correct = checked.length === 1 ? checked[0] : checked;
  _qeQuestions[i] = { id: _qeQuestions[i].id, question: qText, options: opts, correct };
  _qeInlineIdx = null;
  renderQeList();
}

function qeSaveQuestion() {
  const qText = document.getElementById('qe-q-text').value.trim();
  if (!qText) { alert('吏덈Ц???낅젰?댁＜?몄슂.'); return; }
  const opts = [0,1,2,3].map(i=>document.getElementById('qe-opt'+i).value.trim());
  if (opts.some(o=>!o)) { alert('蹂닿린瑜?紐⑤몢 ?낅젰?댁＜?몄슂.'); return; }
  const checked = [0,1,2,3].filter(i => document.getElementById('qe-ans-'+i)?.checked);
  if (!checked.length) { alert('?뺣떟???좏깮?댁＜?몄슂.'); return; }
  const correct = checked.length === 1 ? checked[0] : checked;
  const existId = _qeEditIdx != null ? _qeQuestions[_qeEditIdx].id : null;
  const item = { id: existId || 'q'+Date.now(), question: qText, options: opts, correct };
  if (_qeEditIdx != null) _qeQuestions[_qeEditIdx] = item;
  else _qeQuestions.push(item);
  qeCloseForm(); renderQeList();
}

function qeDeleteQuestion(i) {
  if (!confirm('??臾명빆????젣?섏떆寃좎뒿?덇퉴?')) return;
  _qeQuestions.splice(i,1); renderQeList();
}

function saveQuizEditor() {
  const name = document.getElementById('qe-name').value.trim();
  if (!name) { alert('?댁쫰 ?대쫫???낅젰?댁＜?몄슂.'); return; }
  const quizCount = parseInt(document.getElementById('qe-quiz-cnt').value) || 0;
  const timerMin = parseInt(document.getElementById('qe-timer').value) || 0;
  const passS = parseInt(document.getElementById('qe-pass-s').value) || 90;
  const passP = parseInt(document.getElementById('qe-pass-p').value) || 80;
  const sets = JSON.parse(localStorage.getItem('lr_sets')||'[]');
  if (_qeId) {
    const idx = sets.findIndex(s=>s.id===_qeId);
    if (idx>=0) sets[idx] = { ...sets[idx], name, questions:_qeQuestions, quizCount, timerMin, passS, passP };
  } else {
    sets.push({ id:'quiz_'+Date.now(), name, questions:_qeQuestions, quizCount, timerMin, passS, passP });
  }
  localStorage.setItem('lr_sets', JSON.stringify(sets));
  closeOvD('quiz-editor-ov');
  renderQuizList();
}

async function deleteQuizSet(id) {
  const sets = JSON.parse(localStorage.getItem('lr_sets')||'[]');
  const quiz = sets.find(s=>s.id===id);
  if (!quiz) return;
  if (!confirm(`"${quiz.name||'???댁쫰'}"瑜???젣?섏떆寃좎뒿?덇퉴?`)) return;

  // 愿???묒떆 ?곗씠????젣 ?щ? ?뺤씤
  const relatedScores = allScores.filter(s=>s.quizName===quiz.name);
  let deleteScores = false;
  if (relatedScores.length > 0) {
    deleteScores = confirm(`愿???묒떆 ?곗씠??${relatedScores.length}嫄대룄 ?④퍡 ??젣?좉퉴??\n\n[?뺤씤] ?④퍡 ??젣 / [痍⑥냼] ?댁쫰留???젣`);
  }

  // ?댁쫰 ??젣
  const newSets = sets.filter(s=>s.id!==id);
  localStorage.setItem('lr_sets', JSON.stringify(newSets));
  renderQuizList();

  // ?먯닔 ?곗씠?곕룄 ??젣
  if (deleteScores) {
    await deleteQuizScores(quiz.name);
  } else {
    buildQuizPills();
    applyFilters();
  }
}
