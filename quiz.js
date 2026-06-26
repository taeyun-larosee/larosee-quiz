// ── Quiz CRUD ──
// ── Quiz / FC lists ──
function renderQuizList(sets) {
  const data = sets || JSON.parse(localStorage.getItem('lr_sets')||'[]');
  const wrap = document.getElementById('quiz-list-wrap');
  if (!data.length) { wrap.innerHTML='<div style="color:var(--muted);font-size:13px;">등록된 퀴즈 없음</div>'; return; }
  const colors = ['#eff6ff','#f0fdf4','#fffbeb'];
  const tcols = ['var(--blue)','var(--green)','var(--amber)'];
  wrap.innerHTML = data.map((s,i) => `
    <div class="qi">
      <div class="qn" style="background:${colors[i%3]};color:${tcols[i%3]};">${i+1}</div>
      <div style="flex:1;">
        <div style="font-size:15px;font-weight:700;">${s.name||'퀴즈 '+(i+1)}</div>
        <div style="font-size:12px;color:var(--muted);">${(s.questions||[]).length}문항${s.quizCount>0?' · 출제 '+s.quizCount+'문':''}${s.timerMin>0?' · '+s.timerMin+'분 타이머':''}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span class="badge bg-green">활성</span>
        <button class="btn btn-g btn-sm" onclick="openQR('quiz-'+s.id)">QR 보기</button>
        <button class="btn btn-o btn-sm" onclick="openQuizEditor('${s.id}')">수정</button>
        <button class="btn btn-g btn-sm" onclick="deleteQuizSet('${s.id}')" style="color:var(--red);">삭제</button>
      </div>
    </div>
  `).join('');
}

// ── 퀴즈 에디터 ──
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
  document.getElementById('qe-title').textContent = set ? '퀴즈 수정' : '퀴즈 추가';
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
  if (!_qeQuestions.length) { wrap.innerHTML='<div style="color:var(--muted);font-size:13px;margin-bottom:8px;">문항 없음</div>'; return; }
  wrap.innerHTML = _qeQuestions.map((q,i) => {
    // 필드명 정규화 (question/correct 우선, q/answer 폴백)
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
        '①②③④'[j]+' 번</label>'
      ).join('');
      return `
        <div style="border:2px solid var(--blue);border-radius:10px;padding:14px;margin-bottom:8px;background:#f4faff;">
          <div style="font-size:12px;font-weight:700;color:var(--blue);margin-bottom:10px;">Q${i+1} 수정 중</div>
          <input type="text" id="qe-il-q" value="${esc(qText)}" placeholder="질문 내용"
            style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;margin-bottom:8px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
            <input type="text" id="qe-il-0" value="${esc(q.options[0])}" placeholder="① 보기" style="padding:7px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;">
            <input type="text" id="qe-il-1" value="${esc(q.options[1])}" placeholder="② 보기" style="padding:7px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;">
            <input type="text" id="qe-il-2" value="${esc(q.options[2])}" placeholder="③ 보기" style="padding:7px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;">
            <input type="text" id="qe-il-3" value="${esc(q.options[3])}" placeholder="④ 보기" style="padding:7px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;">
          </div>
          <div style="margin-bottom:10px;">
            <div style="font-size:13px;color:var(--muted);margin-bottom:6px;">정답 <span style="font-size:11px;">(복수 선택 가능)</span></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">${cbHtml}</div>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-g btn-sm" onclick="qeInlineCancel()">취소</button>
            <button class="btn btn-p btn-sm" onclick="qeInlineSave(${i})">저장</button>
          </div>
        </div>`;
    }
    const ansLabel = ansArr.map(a=>(a+1)+'번').join(', ');
    const multiTag = ansArr.length > 1 ? ' <span style="font-size:10px;background:#e8f4fb;color:var(--blue);padding:1px 5px;border-radius:4px;">복수</span>' : '';
    return `
      <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:#fff;">
        <span style="font-size:13px;font-weight:700;color:var(--blue);min-width:24px;">Q${i+1}</span>
        <span style="flex:1;font-size:13px;">${qText}</span>
        <span style="font-size:11px;color:var(--muted);">정답:${ansLabel}${multiTag}</span>
        <button class="btn btn-o btn-sm" onclick="qeInlineEdit(${i})">수정</button>
        <button class="btn btn-g btn-sm" onclick="qeDeleteQuestion(${i})" style="color:var(--red);">삭제</button>
      </div>`;
  }).join('');
}

function qeOpenForm(editIdx) {
  _qeEditIdx = editIdx ?? null;
  const q = editIdx != null ? _qeQuestions[editIdx] : null;
  document.getElementById('qe-form-title').textContent = q ? '문항 수정' : '문항 추가';
  document.getElementById('qe-q-text').value = q ? (q.question || q.q || '') : '';
  const opts = q ? q.options : ['','','',''];
  [0,1,2,3].forEach(i => document.getElementById('qe-opt'+i).value = opts[i]||'');
  // 정답 체크박스 설정
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
  // _qeInlineIdx는 여기서 초기화하지 않음 (qeInlineCancel에서만 초기화)
}

function qeEditQuestion(i) { qeInlineEdit(i); }

function qeInlineEdit(i) {
  qeCloseForm(); // 하단 추가 폼 닫기 (qeInlineIdx 건드리지 않음)
  _qeInlineIdx = i; // qeCloseForm 이후에 설정
  renderQeList();
}

function qeInlineCancel() {
  _qeInlineIdx = null;
  renderQeList();
}

function qeInlineSave(i) {
  const qText = document.getElementById('qe-il-q').value.trim();
  if (!qText) { alert('질문을 입력해주세요.'); return; }
  const opts = [0,1,2,3].map(j => document.getElementById('qe-il-'+j).value.trim());
  if (opts.some(o=>!o)) { alert('보기를 모두 입력해주세요.'); return; }
  const checked = [0,1,2,3].filter(j => document.getElementById('qe-il-ans-'+j)?.checked);
  if (!checked.length) { alert('정답을 선택해주세요.'); return; }
  const correct = checked.length === 1 ? checked[0] : checked;
  _qeQuestions[i] = { id: _qeQuestions[i].id, question: qText, options: opts, correct };
  _qeInlineIdx = null;
  renderQeList();
}

function qeSaveQuestion() {
  const qText = document.getElementById('qe-q-text').value.trim();
  if (!qText) { alert('질문을 입력해주세요.'); return; }
  const opts = [0,1,2,3].map(i=>document.getElementById('qe-opt'+i).value.trim());
  if (opts.some(o=>!o)) { alert('보기를 모두 입력해주세요.'); return; }
  const checked = [0,1,2,3].filter(i => document.getElementById('qe-ans-'+i)?.checked);
  if (!checked.length) { alert('정답을 선택해주세요.'); return; }
  const correct = checked.length === 1 ? checked[0] : checked;
  const existId = _qeEditIdx != null ? _qeQuestions[_qeEditIdx].id : null;
  const item = { id: existId || 'q'+Date.now(), question: qText, options: opts, correct };
  if (_qeEditIdx != null) _qeQuestions[_qeEditIdx] = item;
  else _qeQuestions.push(item);
  qeCloseForm(); renderQeList();
}

function qeDeleteQuestion(i) {
  if (!confirm('이 문항을 삭제하시겠습니까?')) return;
  _qeQuestions.splice(i,1); renderQeList();
}

function saveQuizEditor() {
  const name = document.getElementById('qe-name').value.trim();
  if (!name) { alert('퀴즈 이름을 입력해주세요.'); return; }
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
  if (!confirm(`"${quiz.name||'이 퀴즈'}"를 삭제하시겠습니까?`)) return;

  // 관련 응시 데이터 삭제 여부 확인
  const relatedScores = allScores.filter(s=>s.quizName===quiz.name);
  let deleteScores = false;
  if (relatedScores.length > 0) {
    deleteScores = confirm(`관련 응시 데이터 ${relatedScores.length}건도 함께 삭제할까요?\n\n[확인] 함께 삭제 / [취소] 퀴즈만 삭제`);
  }

  // 퀴즈 삭제
  const newSets = sets.filter(s=>s.id!==id);
  localStorage.setItem('lr_sets', JSON.stringify(newSets));
  renderQuizList();

  // 점수 데이터도 삭제
  if (deleteScores) {
    await deleteQuizScores(quiz.name);
  } else {
    buildQuizPills();
    applyFilters();
  }
}
