# 라로제 퀴즈 관리 시스템 — 인수인계 문서

> 🚨 **파일 수정은 반드시 Claude Code에서만. GitHub 웹 업로드 절대 금지.**  
> 이거 한 번 어기면 한글 인코딩이 다 깨지고 하루 토큰을 날린다.

> 최종 업데이트: 2026-06-26 (세션 8)  
> GitHub: https://github.com/taeyun-larosee/larosee-quiz  
> 배포 URL: https://taeyun-larosee.github.io/larosee-quiz/admin.html  
> 로컬 작업 경로: `C:\Users\김태윤\Claude\Projects\라로제\`  
> 최신 커밋: `f7ea81f` (HANDOFF 업데이트) ← `9a1216b` (admin.html 전면 재작성)

---

## 1. 🚨 절대 규칙 (가장 먼저 읽을 것)

```
✅ Claude Code에서 파일 수정 → temp_repo 복사 → git push  (이것만 해라)

❌ GitHub 웹에서 파일 편집
❌ GitHub에 파일 드래그앤드롭 업로드
❌ 메모장/에디터에서 저장 후 GitHub에 업로드
```

**왜 이게 중요하냐:** GitHub 웹 인터페이스로 올리면 한글 UTF-8이 mojibake로 깨진다.  
깨진 한글이 HTML `alt="..."` 같은 속성 안에 들어가면 `"` 균형이 무너져서  
그 아래 DOM 전체가 사라진다. 비밀번호 입력란이 통째로 사라진 적이 있다.

### 올바른 배포 방법 (반드시 이 방법만)

```powershell
# temp_repo 클론이 없으면 한 번만 실행
git clone https://github.com/taeyun-larosee/larosee-quiz.git "C:\Users\김태윤\Claude\Projects\라로제\temp_repo"

# 수정 후 복사 & push
Copy-Item "C:\Users\김태윤\Claude\Projects\라로제\파일명" "C:\Users\김태윤\Claude\Projects\라로제\temp_repo\파일명" -Force
Set-Location "C:\Users\김태윤\Claude\Projects\라로제\temp_repo"
git add 파일명
git commit -m "설명"
git push origin main
```

---

## 2. 프로젝트 개요

라로제 신규입사자 교육용 관리 시스템.  
**GitHub Pages** 로 정적 호스팅, **Firebase Firestore** 로 응시 결과 저장, 나머지는 **localStorage** 사용.

### 파일 구조

```
C:\Users\김태윤\Claude\Projects\라로제\
├── admin.html        ← 관리자 메인 (HTML + 인라인 CSS + 유틸 JS)  ✅ 세션 8에서 전면 재작성
├── common.css        ← 전역 CSS 변수/reset (admin.html에서 참조 안 함, 독립)
├── config.js         ← Firebase 초기화 (공개키라 괜찮음)
├── auth.js           ← 로그인/로그아웃/세션 체크 + localStorage 방어
├── db.js             ← Firebase 응시데이터 CRUD, 대시보드 렌더
├── quiz.js           ← 퀴즈 세트 CRUD
├── flashcard.js      ← 플래시카드 세트 CRUD
├── sessions.js       ← 세션/DAY/항목 CRUD, 롤플레이 에디터
├── present.js        ← 교육 진행 화면 로직 (프레젠테이션 뷰)
├── logo.png          ← 라로제 로고
├── temp_repo\        ← git push용 클론 (수정 금지, 복사만)
├── efa5e8c_admin.html   ← 한글 원본 참조용 (건드리지 말 것)
└── efa5e8c_present.html ← 한글 원본 참조용 (건드리지 말 것)
```

### 데이터 저장

| 키 / 위치 | 내용 |
|---|---|
| `localStorage: lr_pw` | 관리자 비밀번호 (기본값: `larosee1234`) |
| `localStorage: lr_sets` | 퀴즈 세트 배열 |
| `localStorage: lr_fcsets` | 플래시카드 세트 배열 |
| `localStorage: lr_sessions` | 세션 배열 |
| `localStorage: lr_item_types` | 항목 유형 배열 |
| `Firebase: scores 컬렉션` | 퀴즈 응시 결과 |
| `Firebase: sessions 컬렉션` | 세션 데이터 (localStorage와 동기) |
| `sessionStorage: admin_auth` | 로그인 상태 (`'1'` = 로그인) |

---

## 3. 각 파일 상세 (현재 상태)

### admin.html — ✅ 세션 8에서 전면 재작성 완료

**구조 요약:**
- `<head>`: CDN (Firebase 9.22.2, Chart.js 4.4.1, QRCode.js 1.0.0) + 외부 JS 7개 + 인라인 CSS 전체
- `<body>`: #loading → #login-screen → #app(header+sidebar+main탭) → 모달들 → #present-view
- `<script>`: 유틸 함수만 (Firebase/CRUD 없음, 그건 외부 JS에 있음)

**head의 script 순서 (중요, 바꾸지 말 것):**
```html
<script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script src="config.js"></script>        ← Firebase 설정 (defer 없음, 먼저 실행)
<script src="db.js" defer></script>
<script src="quiz.js" defer></script>
<script src="flashcard.js" defer></script>
<script src="sessions.js" defer></script>
<script src="auth.js" defer></script>
<script src="present.js" defer></script>
```

**인라인 `<script>` 블록 (body 맨 끝)에 있는 함수들:**
- `DEFAULT_ITEM_TYPES` — 기본 항목 유형 배열 (5종: link/roleplay/flashcard/quiz/lecture)
- `getItemTypes()` / `saveItemTypes(types)` — localStorage `lr_item_types` 읽기/쓰기
- `toggleTypePanel()` / `renderTypeList()` — 설정 탭 유형 관리 UI
- `moveTypeUp(i)` / `moveTypeDown(i)` / `renameItemType(id,newName)` / `toggleTypeActive(id,active)` / `addItemType()` / `deleteItemType(id)` — 유형 CRUD
- `gotoTab(id)` — 사이드바 탭 전환 (`.tab`, `.ni` 클래스 토글)
- `closeOv(id, e)` / `closeOvD(id)` — 오버레이 모달 닫기
- `toggleSc(hdr)` / `setDay(el)` — 세션 아코디언/DAY탭
- `DOMContentLoaded`: 800ms 딜레이 후 `isLoggedIn()` → `showApp()` 또는 로그인 화면 표시

**주요 DOM ID 목록:**
```
#loading, #login-screen, #login-pw, #login-err
#app, #hdr, #sb, #main
#tab-dashboard, #tab-sessions, #tab-quiz, #tab-flashcard, #tab-settings
#cpills, #st-tot, #st-avg, #st-time, #st-g, #st-b, #st-r
#cohortChart, #top5-list, #quiz-status
#sessions-list, #quiz-list-wrap, #fc-list-wrap
#type-panel, #type-list-wrap
#cohort-detail-ov, #tier-ov, #ans-ov, #sess-ov, #item-ov
#quiz-editor-ov, #fc-editor-ov, #rp-ov, #qr-ov
#present-view, #p-s-home, #p-s-session, #p-s-viewer
#p-session-grid, #p-day-bar, #p-items-list, #p-vhdr-title
#p-v-link, #p-v-roleplay, #p-v-lecture, #p-v-qr, #p-v-empty
#p-fc-inner, #p-fc-front-text, #p-fc-back-text, #p-fc-counter
#p-qr-canvas, #p-qr-url, #p-rp-tabs, #p-rp-left, #p-rp-right
```

---

### config.js — ✅ 정상

Firebase 프로젝트 `ra-rosee` 연결 설정. 공개키라 커밋해도 됨.

```javascript
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCT3COLehsX7eHbrrKTem4ZZvPWSKAgjh8',
  authDomain: 'ra-rosee.firebaseapp.com',
  projectId: 'ra-rosee',
  storageBucket: 'ra-rosee.firebasestorage.app',
  messagingSenderId: '121644280571',
  appId: '1:121644280571:web:0535234c31d382c35c5e5e'
};
```

---

### auth.js — ✅ 정상 (localStorage 방어 로직 포함)

**핵심 함수:**
- `getPw()` — `localStorage['lr_pw']` 또는 기본값 `'larosee1234'`
- `isLoggedIn()` — `sessionStorage['admin_auth'] === '1'`
- `doLogin()` — 비밀번호 검증 → `sessionStorage` 세팅 → `showApp()`
- `doLogout()` — `sessionStorage` 삭제 → `location.reload()`
- `showApp()` — `#login-screen` 숨김, `#app` 표시, `loadAllData()` + `initChart([],[])` 호출

**방어 로직 (IIFE):** localStorage에 저장된 비번이 ASCII 범위 밖이면(깨진 경우) 자동 삭제.

---

### db.js — ✅ 정상

Firebase Firestore `scores` 컬렉션 CRUD + 대시보드 렌더.

**핵심 함수:**
- `loadAllData()` — Firebase에서 scores 로드, 대시보드 전체 렌더
- `initChart(labels, data)` — Chart.js 기수별 평균 점수 차트 초기화
- `openTier(color)` — green/blue/red 티어 모달 열기
- `setTierTab(tab)` / `renderTierTable()` — 신규입사자/기존직원 탭 전환
- `openCohortDetail(cohort)` — 기수 상세 모달
- `setQuizPill(el, id)` — 퀴즈 필터 변경
- `openAnsModal(qIdx)` — 문항별 답변 분포 모달
- `exportCSV()` — 응시 결과 CSV 다운로드
- `toggleDashEdit()` — 대시보드 수정 모드

**Firebase 구조:**
```
scores/{docId}: {
  name: string,       // 응시자 이름
  score: number,      // 점수 (0~100)
  quizId: string,     // 퀴즈 세트 ID
  cohort: string,     // 기수 (예: '2024-1')
  sessionId: string,  // 세션 ID
  elapsed: number,    // 응시 시간 (초)
  answers: object,    // 문항별 선택 답
  timestamp: Timestamp
}
```

---

### quiz.js — ✅ 정상

퀴즈 세트 localStorage CRUD.

**핵심 함수:**
- `loadQuizSets()` / `saveQuizSets(sets)` — `lr_sets` 읽기/쓰기
- `renderQuizList()` — `#quiz-list-wrap` 렌더
- `openQuizEditor(id)` — 퀴즈 에디터 모달 열기 (null = 신규)
- `saveQuizEditor()` — 에디터 저장
- `qeOpenForm()` / `qeCloseForm()` / `qeSaveQuestion()` — 문항 추가 폼
- `deleteQuiz(id)` / `dupeQuiz(id)` — 삭제/복제
- `openQR(quizId)` — QR 모달 (`#qr-ov`)

**데이터 구조 (`lr_sets` 배열의 각 원소):**
```javascript
{
  id: string,          // 고유 ID (Date.now())
  name: string,        // 퀴즈 세트 이름
  quizCount: number,   // 출제 수 (0 = 전체)
  timer: number,       // 타이머 (분, 0 = 미사용)
  passScore: number,   // 합격 기준 (기본 80)
  superPassScore: number, // 우수합격 기준 (기본 90)
  questions: [{
    id: string,
    text: string,          // 질문
    options: [string, string, string, string],  // 4지선다
    answers: number[]      // 정답 인덱스 배열 (복수 가능)
  }]
}
```

---

### flashcard.js — ✅ 정상

플래시카드 세트 localStorage CRUD.

**핵심 함수:**
- `loadFcSets()` / `saveFcSets(sets)` — `lr_fcsets` 읽기/쓰기
- `renderFcList()` — `#fc-list-wrap` 렌더
- `openFcEditor(id)` — 에디터 모달 열기 (null = 신규)
- `saveFcEditor()` — 저장
- `fceOpenForm()` / `fceCloseForm()` / `fceSaveCard()` — 카드 추가 폼
- `deleteFcSet(id)` / `dupeFcSet(id)` — 삭제/복제

**데이터 구조 (`lr_fcsets` 배열의 각 원소):**
```javascript
{
  id: string,
  name: string,
  cards: [{
    id: string,
    front: string,   // 앞면 (질문)
    back: string     // 뒷면 (정답)
  }]
}
```

---

### sessions.js — ✅ 정상

세션/DAY/항목 CRUD + 롤플레이 에디터.

**핵심 함수:**
- `loadAdminSessions()` — Firebase sessions 컬렉션 또는 localStorage `lr_sessions` 로드
- `saveSessionsToStore()` — localStorage + Firebase batch 저장
- `renderSessionsTab()` — `#sessions-list` 렌더
- `openSessionModal(id)` — 세션 추가/수정 모달 (`#sess-ov`)
- `addDay()` / `removeDay(i)` — DAY 추가/삭제
- `saveSession()` — 세션 저장
- `deleteSession(id)` — 삭제
- `openItemModal(sessId, dayIdx, itemIdx)` — 항목 추가/수정 (`#item-ov`)
- `updateItemFields()` — 항목 유형 변경 시 필드 전환
- `saveItem()` — 항목 저장
- `deleteItem(sessId, dayIdx, itemIdx)` — 항목 삭제
- `openRpEditor()` — 롤플레이 에디터 모달 (`#rp-ov`)
- `rpeAddCat()` / `rpeSelectCat(i)` / `rpeRenderPanel(i)` — 카테고리 관리
- `saveRpEditor()` — 롤플레이 데이터 저장
- `changePw()` — 비밀번호 변경 (설정 탭)

**DEFAULT_SESSIONS 구조 (코드에 하드코딩, localStorage 없을 때 초기값):**
```
신규입사자 교육 (active)
  DAY 1: 브랜드 교육, 인센티브 교육, 제품 교육, 매뉴얼 교육, 전산교육 (모두 link 타입)
  DAY 2: 롤플레이 가이드(roleplay), 이의제기 교육(link), 이의제기 플래시카드 배포(flashcard),
         마무리 퀴즈 배포(quiz), 마무리 강의(lecture)
재교육 1차 (preparing, days 없음)
재교육 2차 (preparing, days 없음)
```

**롤플레이 카테고리 현황:**
- `핸드빌 기본` ← 핵심포인트 4개, 멘트 2개 입력됨
- `빠른 고객`, `느린 고객`, `수분스틱`, `세럼`, `머드스틱`, `사워오일` ← **내용 비어있음 (입력 필요)**

---

### present.js — ✅ 정상

교육 진행 화면 전체 로직. `#present-view` div를 제어.

**핵심 함수:**
- `openPresentView()` — admin #app 숨기고 #present-view 표시, 세션 로드
- `closePresentView()` — #present-view 숨기고 #app 복귀
- `presentLoadSessions()` — Firebase → localStorage → DEFAULT 순으로 세션 로드
- `pRenderHome()` — 세션 그리드 렌더 (`#p-session-grid`)
- `pOpenSession(idx)` — 세션 선택 → DAY 탭 + 항목 목록 표시
- `pOpenItem(idx)` — 항목 클릭 → 뷰어 열기
- `pOpenLinkViewer(item)` — 링크: 새 탭으로 열기
- `pOpenRoleplay(item)` — 롤플레이: 카테고리 탭 + 체크리스트 + 멘트
- `pOpenLecture(item)` — 강의 모드: 플래시카드 뷰어
- `presentOpenQR(item, type)` — QR 코드 생성 (flashcard/quiz)
- `pFlipFC()` / `pFcNav(d)` — 플래시카드 뒤집기/이동
- 키보드: ESC(닫기), ←→(슬라이드/카테고리), Space(플래시카드 뒤집기)

**P_DEFAULT_SESSIONS:** present.js 자체에도 하드코딩된 기본 세션이 있음.  
SharePoint URL들이 여기에 있음 (sessions.js의 DEFAULT_SESSIONS에는 URL이 비어있고, present.js에서 패치함).

---

## 4. 현재 모든 파일 상태 요약

| 파일 | 상태 | 마지막 수정 |
|---|---|---|
| `admin.html` | ✅ 전면 재작성 완료, 한글 정상 | 세션 8 (커밋 9a1216b) |
| `config.js` | ✅ 정상, 수정 없음 | 세션 1 |
| `auth.js` | ✅ 정상 + localStorage 방어 | 세션 6 |
| `db.js` | ✅ 한글 전수 복원 완료 | 세션 5 |
| `quiz.js` | ✅ 한글 전수 복원 완료 | 세션 5 |
| `flashcard.js` | ✅ 한글 전수 복원 완료 | 세션 5 |
| `sessions.js` | ✅ 한글 전수 복원 완료 | 세션 5 |
| `present.js` | ✅ 원래부터 정상 | 세션 2 |
| `common.css` | ✅ 한글 없음, 이상 없음 | 세션 1 |

**주요 커밋 히스토리:**

| 커밋 | 내용 |
|---|---|
| `f7ea81f` | HANDOFF.md 세션 8 완료 기록 |
| `9a1216b` | admin.html 전면 재작성 — 한글 완전 복원 |
| `3f0f2be` | admin.html 한글 복원 + auth.js localStorage 방어 |
| `85d55e2` | admin.html 한글 전수 복원 |
| `3d80739` | db.js, quiz.js, flashcard.js, sessions.js 한글 전수 복원 |
| `efa5e8c` | 분리 작업 이전 원본 (한글 정상 상태 참조용) |

---

## 5. 다음 세션에서 할 작업

### 즉시 확인
1. https://taeyun-larosee.github.io/larosee-quiz/admin.html → Ctrl+Shift+R 강력 새로고침
2. 로그인 (`larosee1234`) → 각 탭/버튼 동작 확인
3. 교육 진행 버튼 → present-view 동작 확인

### 해야 할 콘텐츠 입력 (관리자 에디터에서 직접)
롤플레이 카테고리 빈 항목 내용 입력:
- `빠른 고객` — 핵심포인트 + 멘트
- `느린 고객` — 핵심포인트 + 멘트
- `수분스틱` — 핵심포인트 + 멘트
- `세럼` — 핵심포인트 + 멘트
- `머드스틱` — 핵심포인트 + 멘트
- `사워오일` — 핵심포인트 + 멘트

입력 방법: 관리자 로그인 → 세션 탭 → 신규입사자 교육 → DAY 2 → 롤플레이 가이드 → 수정 → "편집 열기 →" → 각 카테고리 선택 → 내용 입력

### 예정된 기능 개발

**Firebase → Supabase 마이그레이션:**

| localStorage 키 | Supabase 테이블 |
|---|---|
| `lr_sets` | `training_quiz_sets` |
| `lr_fcsets` | `training_fc_sets` |
| `lr_sessions` | `training_sessions` |
| `lr_item_types` | `training_item_types` |
| Firebase `scores` | `training_quiz_results` |

**Supabase 규칙:**
- 모든 테이블명은 `training_` 접두사 필수
- `SERVICE_ROLE_KEY`는 절대 클라이언트 코드에 노출 금지
- 클라이언트에는 `anon` 키만 사용 + RLS 설정

---

## 6. 로그인 안 될 때 해결법

```javascript
// 브라우저 개발자도구 콘솔에서 실행
localStorage.removeItem('lr_pw');  // 비번 초기화 (기본값 larosee1234로 복귀)
sessionStorage.clear();             // 세션 초기화
location.reload();
```

기본 비밀번호: `larosee1234`

---

## 7. 한글 깨짐 수리 방법 (재발 시)

### 원인 판별
- 깨진 패턴: `濡`, `鍮`, `嫄`, `?섏`, `?쇰줈??` 등 한중일 문자 + `?` 조합
- 정상 한글이 UTF-8로 한 번 더 인코딩되어 발생하는 mojibake

### 참조 파일
```
C:\Users\김태윤\Claude\Projects\라로제\efa5e8c_admin.html   ← admin.html 원본 한글 참조
C:\Users\김태윤\Claude\Projects\라로제\efa5e8c_present.html ← present-view 원본 한글 참조
```

### 수리 절차 (파일이 또 깨지면)
1. 위 참조 파일을 Read하여 올바른 한글 확인
2. Claude Code Write 도구로 파일 전체 재작성 (부분 치환 금지 — 토큰만 낭비함)
3. temp_repo에 복사 → git push

---

## 8. 새 채팅에서 시작하는 방법

1. 이 HANDOFF.md 읽기
2. 사이트 상태 확인: https://taeyun-larosee.github.io/larosee-quiz/admin.html
3. 문제 있으면 섹션 6 또는 7 참조
4. 새 기능 개발 시: 로컬 수정 → temp_repo 복사 → git push (웹 업로드 절대 금지)
5. 작업 완료 후 이 HANDOFF.md 업데이트 → push

---

*저장 위치: `C:\Users\김태윤\Claude\Projects\라로제\HANDOFF.md`*
