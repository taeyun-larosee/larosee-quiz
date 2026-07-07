# 라로제 퀴즈 관리 시스템 — 인수인계 문서

> 🚨 **파일 수정은 반드시 Claude Code에서만. GitHub 웹 업로드 절대 금지.**  
> 이거 한 번 어기면 한글 인코딩이 다 깨지고 하루 토큰을 날린다.

> 최종 업데이트: 2026-07-07 (세션 12 — **세션 11 설계 기반 구현 완료(4/5) + 실사용 중 발견된 긴급 버그 수정 완료**)  
> GitHub: https://github.com/taeyun-larosee/larosee-quiz  
> 배포 URL: https://taeyun-larosee.github.io/larosee-quiz/admin.html  
> 로컬 작업 경로: `C:\Users\김태윤\Claude\Projects\라로제\`  
> 최신 커밋: `f2f2da1` (**긴급 수정**: 서술형 문제 있으면 진행상태 저장 실패로 퀴즈 전체 심하게 느려지던 버그) ← `9070543` (재접속 이어풀기 잠금 추가) ← `66d111d` (서술형 문제 유형 추가) ← `9938dd0` (최초 제출 가산점 기능 추가) ← `b56ce3d` (타이머 만료 처리 설정 추가) ← `9c33c3e` (플래시카드 기기 간 동기화 버그 수정) ← `c184bcf` (퀴즈 화면 배경 이미지 + 문제별 이미지 기능 추가) ← `ef180ee` (단일정답 문제 "정답 확인" 버튼 추가) ← `2bad7de` (강의모드 버튼 고정 + 스포일러 제거) ← `911d215` (퀴즈 복제 + QR/강의모드 동기화) ← `be0bd61` (HANDOFF 세션 10) ← `54783bc` (기수/셔플 Firebase 동기화)
> 
> ⚠️ **세션 11은 코드를 전혀 건드리지 않았다 (설계만).** 세션 12에서 세션 11 설계 5개 중 4개(타이머→가산점→서술형→재접속잠금)를 순서대로 구현 완료. **남은 건 ⑤ 등수표+강의모드 개편 하나뿐** (원래부터 최후 우선순위로 미뤄둔 항목).
> 
> 🚨 **세션 12 마지막에 심각한 버그 발견·수정함 (아래 "세션 12 — 긴급 버그 수정" 섹션 필독).** 사용자가 실제로 퀴즈를 풀어보다가 "취합이 안됨" / "문제 수정이 반영 안됨" 두 가지를 신고 → 원인은 재접속 이어풀기 잠금 기능(②)이 서술형 문제와 상호작용하며 생긴 버그. **다음 세션 시작하면 가장 먼저 이 수정이 실제로 잘 배포됐는지, 유사한 버그가 더 없는지 재확인부터 할 것.**

> 📌 **이 세션은 오직 `index.html`("라로지앵 | LA ROSÉE" 타이틀, 응시자용 퀴즈 앱)만 다뤘다.** `admin.html` 계열은 이번 세션에서 손대지 않음. 사용자가 "이 앱"이라고 할 때는 항상 index.html을 가리킴.

> ⚠️ **`index.html`과 `admin.html`은 서로 다른 별개의 앱이다.** 같은 repo·같은 Firebase 프로젝트(`ra-rosee`)를 쓰지만 코드도, 관리자 로그인도, 기능 구성도 독립적임.
> - `index.html` — 응시자용 퀴즈 앱. `?mode=admin`을 붙이면 자체 내장된 간이 관리자 화면(대시보드/퀴즈/플래시카드/QR/설정)이 뜬다. 로직 전부 인라인 `<script>`, Firebase 10.12.0 인라인 초기화.
> - `admin.html` — 세션/DAY/롤플레이/프레젠테이션 뷰까지 포함한 정식 관리자 콘솔. db.js/quiz.js/flashcard.js/sessions.js/present.js로 로직 분리, config.js로 Firebase 9.22.2 초기화.
> - 아래 "3. 각 파일 상세" 섹션은 **admin.html 계열 전용** 문서다. index.html 수정 시에는 참고하지 말 것.

### 세션 12 — index.html 신규 기능 구현 (커밋 `b56ce3d`, `9938dd0`, `66d111d`, `9070543`)

세션 11에서 확정한 설계 5개를 사용자 지시로 순서대로(위험도 낮은 것부터) 하나씩 구현. **③ 타이머 만료 처리 설정**, **④ 최초 제출 가산점**, **① 서술형 문제**, **② 재접속 이어풀기 잠금** 완료. 남은 건 ⑤ 등수표+강의모드 개편 하나(최후 우선순위로 원래부터 보류).

각 기능은 구현 직후 **실제 프로덕션 Firebase(`ra-rosee`)에 연결한 프리뷰에서 검증** → 검증 중 생성된 가짜 응시 기록/진행상태/설정은 매번 그 자리에서 삭제·원복 → 커밋·push 순서로 하나씩 진행. 실제 응시자 수(14명)는 세션 내내 그대로 유지됨.

#### ✅ ③ 타이머 만료 처리 설정 (퀴즈별 강제마감/경고만표시) — 커밋 `b56ce3d`
- 퀴즈 데이터에 `timerExpireMode` 필드 추가 (`'force'`(기본값, 기존 동작과 동일) / `'warn'`).
- 퀴즈 탭 → 퀴즈 클릭 → "퀴즈 설정" 카드에 "타이머 만료 시" 드롭다운 추가 (`renderQList()`, `saveSetSettings()`).
- `startTimer(timerMin, expireMode)`: 시간 종료 시 `expireMode==='warn'`이면 `finishQuiz()` 호출 안 하고 "시간 초과 (계속 진행 가능)" 메시지만 표시, 계속 풀 수 있음. 기존 동작(`'force'` 또는 필드 없음)은 그대로 강제 종료.
- 검증: 프리뷰에서 실제 Firebase(`ra-rosee`) `TEST` 퀴즈에 timerMin=1, timerExpireMode 저장 확인 → `startQuiz()` 후 `timerSeconds`를 인위적으로 만료 직전까지 당겨서 warn 모드(화면 유지)/force 모드(기존처럼 `finishQuiz()` 호출, s-results로 이동) 둘 다 동작 확인.

#### ✅ ④ 최초 제출 가산점 — 커밋 `9938dd0`
- 퀴즈 데이터에 `firstBonusEnabled`(bool, 기본 false), `firstBonusPoints`(number, 기본 0) 필드 추가. 설정 위치는 (등수표 관련 설정과 마찬가지로) **퀴즈 설정 카드**로 결정 — 세션 11 설계 메모 중 "설정 탭" 언급은 이후 "퀴즈 편집 모달에서 설정"으로 최종 확정된 문구를 따름.
- `fsClaimFirstSubmit(quizId, cohort)` 함수 추가 (`firstSubmits/{quizId}__{cohort}` 문서에 대한 Firestore **트랜잭션**으로 구현) — 여러 기기가 거의 동시에 제출해도 정확히 한 명만 최초 제출로 판정되도록 경쟁 조건 방지.
- `finishQuiz()`: `set.firstBonusEnabled`가 true면 제출 직전 `fsClaimFirstSubmit()` 호출 → 최초면 `isFirstSubmit:true, bonusPoints:{firstBonusPoints}`, 아니면 `false, 0`으로 `scores` 문서에 함께 기록.
- **정답률(`score`/`pct`)에는 전혀 손대지 않음** — 대시보드 통계·합격 기준 등 기존 로직과 완전히 분리. 등수표(⑤, 최후 우선순위)가 나중에 만들어지면 `bonusPoints`를 랭킹 계산에 더하고 `isFirstSubmit`으로 "⚡최초제출" 뱃지를 표시하는 식으로 소비하면 됨. **현재는 데이터만 기록되고 화면 표시는 없음** (등수표 자체가 아직 없어서 — 세션 11 설계에서 뱃지 표시는 ⑤ 항목 소관).
- 검증: 실제 Firebase에서 같은 (퀴즈+가짜 기수) 조합으로 두 번 연속 `finishQuiz()` 실행 → 첫 번째 제출자만 `isFirstSubmit:true, bonusPoints:5`, 두 번째는 `false, 0` 확인. 테스트용 `scores`/`firstSubmits` 문서와 `TEST` 세트의 테스트 설정 모두 정리·원복 완료 (응시자 수 14명 그대로 유지).

#### ✅ ① 서술형(주관식) 문제 — 커밋 `66d111d`
- 문제 데이터에 `type` 필드 추가 (`'choice'`(기본) / `'essay'`). 관리자 문제 추가/수정 모달(`#q-modal`)에 "문제 유형" 드롭다운 추가 — 서술형 선택 시 선택지·정답 입력 영역(`#m-choices-wrap`) 숨김 (`mUpdateTypeUI()`).
- `renderQuestion()`: 서술형이면 선택지 버튼 대신 `<textarea id="q-essay-input">` 렌더, "정답 확인" 버튼 텍스트를 "제출"로 변경.
- `confirmAnswer()`: 서술형이면 채점 없이 텍스트만 저장, 피드백 문구 "제출되었습니다!" (연두색 `.correct` 스타일 재사용), `answers`에 `{ok:null, chosen:텍스트, type:'essay'}`로 push.
- `finishQuiz()`: **서술형 문항은 정답률(`pct`) 분모(`total`)·정답 수(`correctCount`) 계산에서 완전히 제외** — 객관식 문항만으로 계산 (`gradedAnswers = answers.filter(a => a.type !== 'essay')`). `answers` 배열 자체(Firestore 저장분)에는 서술형 포함 전체가 다 들어감 (관리자 확인용).
- **관리자 통합 답안지**: 기존 "OO님의 틀린 질문" 모달(`showEmployeeWrongQ`)을 확장 — 오답만 보여주던 것을 **전체 문항(정답/오답/서술형)을 한 화면에** 표시하도록 변경, 모달 제목도 "OO님의 답안지"로 변경. 서술형 항목은 "제출되었습니다!" 뱃지 + 실제 제출한 텍스트를 함께 표시. 별도 탭 안 만들고 기존 모달 재사용 (세션 11 설계 요구사항 그대로).
- **보안**: 서술형 답변은 익명 응시자가 자유 입력한 텍스트라 관리자 화면에 `innerHTML`로 꽂힐 때 XSS 위험 있음 — `escHtml()`로 반드시 이스케이프 처리. 실제 `<script>`/`<img onerror>` 페이로드로 검증 완료 (실행 안 됨, 텍스트로만 표시됨).
- **회귀 방지**: 강의모드(`renderLec`/`lecReveal`)가 서술형 문항을 만나면 기존엔 `q.options.map()`에서 크래시 났을 것 — 서술형이면 "(서술형 문항 — 정답 없음)" 표시로 분기 처리해 방지. 문제 목록(`renderQListItems`)의 "정답: ..." 표시도 서술형이면 "서술형 (채점 없음)"으로 분기 (`qAnswerLabel()` 헬퍼).
- 검증: 실제 Firebase `TEST` 세트에 서술형 문항 임시 추가 → 객관식 2문항 + 서술형 1문항으로 응시 전체 플로우(제출 문구·스타일, `finishQuiz` 분모 제외 확인: 2/2=100%), 관리자 통합 답안지 렌더링, XSS 이스케이프, 강의모드 크래시 안 남을 확인까지 전부 완료 후 테스트 데이터·문항 정리 완료 (응시자 수 14명 그대로 유지).

#### ✅ ② 재접속 시 이어풀기 잠금 (부정행위 방지) — 커밋 `9070543`
- 신규 Firestore 컬렉션 `progress`. 문서 ID = `{quizId}__{cohort}__{name}` (슬래시는 `_`로 치환). 저장 내용: `{ qs: 이번에 뽑힌 문제 순서 그대로, answers: 지금까지 확정한 답변들, updatedAt }`.
- `startQuiz()`를 async로 변경. 시작 시 `fsGetProgress()`로 동일 (퀴즈+기수+이름) 조합의 저장된 진행상태를 먼저 조회:
  - 있으면 → `qs`/`answers`를 그대로 복원, **`qi`는 저장하지 않고 `answers.length`로 계산** (질문마다 정확히 1개씩만 answers에 쌓이므로 "다음에 풀 문제 번호"와 항상 일치). 모든 문제를 이미 다 확정한 상태라면(`qi >= qs.length`) 그 자리에서 바로 `finishQuiz()` 호출해 제출 완료 처리 (크래시가 마지막 문제 확정 직후~제출 사이에 났던 경우 대비).
  - 없으면 → 기존처럼 새로 문제 풀(pool) 셔플·선택 후 시작, **시작하자마자 바로 `fsSaveProgress()`로 첫 스냅샷 저장** (첫 문제도 안 풀고 이탈해도 문제 순서 자체는 고정되어 재접속 시 다른 문제 조합으로 리롤 불가).
- `confirmAnswer()`: 객관식/서술형 두 분기 모두, `answers.push()` 직후 `fsSaveProgress()` 호출 — 문제를 확정하는 매 순간마다 즉시 저장 (nextQuestion까지 기다리지 않음 → "확인만 누르고 다음으로 넘어가기 전에 이탈"하는 좁은 틈도 최소화).
- `finishQuiz()`: 점수 저장(`fsPost`) 직후 `fsClearProgress()`로 진행상태 문서 삭제 — 정상 제출 완료 후에는 진행상태가 안 남아서, 다음에 같은 이름+기수로 다시 들어오면(의도된 재응시) 새 시도로 정상 처리됨. 즉 이 기능이 막는 건 "제출 전 중도 이탈 후 재도전"이지 "제출 후 재응시"가 아님.
- **관리자용 진행상태 초기화**(세션 11 설계에서 "우선순위 낮고 오류 안 생기는 선에서만" 조건부로 요청됨): 퀴즈 설정 화면에 이름+기수 입력 후 초기화하는 최소 기능(`resetStudentProgress()`) 추가. 기존 응시 플로우를 전혀 건드리지 않는 단순 삭제 호출이라 낮은 위험으로 판단해 포함시킴.
- 검증: 실제 Firebase로 ①문제 확정 → 메모리 상태 초기화(재접속 시뮬레이션) → 같은 이름+기수로 재시작 시 **이미 답한 Q1은 그대로, Q2부터 이어서** 진행되는 것 확인 → 끝까지 제출 후 `progress` 문서 삭제·`scores`에 정상 기록(2/2=100%) 확인 → "모든 문제 확정 후 제출 직전 크래시" 시나리오도 재접속 시 자동 제출 완료되는 것 확인 → 관리자 초기화 버튼 동작 확인. 전부 테스트 데이터 정리 완료 (응시자 수 14명 그대로 유지).
- **강의모드/응시 로직 자체는 건드리지 않음** — `progress`는 완전히 별도 컬렉션이라 기존 `scores` 기반 통계·대시보드에 영향 없음.

### 🚨 세션 12 — 긴급 버그 수정 (커밋 `f2f2da1`): 서술형 문제 + 재접속 잠금 조합 시 퀴즈 전체가 심하게 느려지던 버그

**사용자 신고 (실사용 테스트 중 발견):**
1. "퀴즈 방금 풀어봤는데 취합이 안됨" — 대시보드에 응시 기록이 안 쌓임
2. "문제 수정했는데 퀴즈 풀 때 반영이 안됨"

**원인:**
- 사용자가 "신규입사자 전체 퀴즈"(`set_default`)에 서술형 문제("팀장님 바보")를 새로 추가해 테스트함.
- 서술형 문제는 설계상 `correct` 필드가 아예 없음(→ `undefined`). 그런데 세션 12에서 새로 만든 "재접속 이어풀기 잠금" 기능(②)의 `fsSaveProgress()`가 **문제 확정(정답 확인/제출)할 때마다** 전체 문제 목록(`qs`)을 통째로 Firestore에 저장하는데, 이 `qs` 안에 서술형 문제 원본 객체가 포함되어 있고 그 객체의 `correct` 값이 `undefined`임.
- **Firestore는 문서 안에 `undefined` 값이 하나라도 있으면 저장 자체를 거부**(`invalid-argument` 에러). 즉 퀴즈에 서술형 문제가 하나라도 들어있으면, **그 퀴즈를 시작한 순간부터 모든 `fsSaveProgress()` 호출이 매번 실패**함.
- 실패 자체는 `catch`로 잡아서 앱이 멈추거나 에러 화면이 뜨지는 않았지만, **문제를 하나 확인할 때마다 실패하는 Firestore 쓰기 요청 왕복 시간만큼 눈에 띄게 느려짐** (실측: 정상이면 21문제 전체 2.7초, 버그 상태에서는 문제당 5~13초씩 걸려 21문제면 수 분 소요). 사용자가 이 지연을 "먹통"으로 느끼고 중간에 포기했을 가능성이 높음 → 중간에 그만두면 `finishQuiz()`가 호출된 적이 없으니 `scores`에 기록이 안 남아서 "취합이 안됨"으로 보였을 것.
- "문제 수정이 반영 안 됨"도 같은 증상의 다른 표현이었을 가능성이 높음(관리자 데이터 자체는 Firestore에 정상 반영돼 있었음 — `sets` 컬렉션 직접 조회로 확인. 응시 화면이 느려서 수정 결과를 제대로 확인하지 못했을 것으로 추정).

**수정 (index.html):**
1. `fsSaveProgress()`: Firestore에 쓰기 전에 `JSON.parse(JSON.stringify(data))`로 한 번 왕복시켜 `undefined` 필드를 전부 제거하도록 방어 코드 추가. (JSON 직렬화는 `undefined` 값을 가진 키를 자동으로 드롭함.) 앞으로 진행상태에 어떤 필드가 추가되더라도 이 방어 로직이 계속 안전망 역할을 함.
2. `startQuiz()`의 문제 풀(pool) 생성 로직: `correct: q.correct ?? q.answer` → `correct: q.correct ?? q.answer ?? null` 로 변경. 서술형처럼 정답이 없는 문제 타입은 `undefined` 대신 명시적으로 `null`을 갖도록 근본 원인도 함께 수정.

**검증:** 실제 Firebase(`ra-rosee`)의 실제 "신규입사자 전체 퀴즈"(21문제, 서술형 포함)로 브라우저 클릭 흐름을 그대로 재현 — 수정 전엔 콘솔에 `fsSaveProgress error: ... Unsupported field value: undefined` 경고가 문제마다 반복 발생하며 21문제에 수 분씩 소요됨을 직접 재현·확인. 수정 후 같은 시나리오에서 경고 없이 21문제 전체 2.7초 만에 정상 완료, 점수 정상 기록(총 20문제 중 서술형 제외 정답률 계산 정상), 재접속 이어풀기도 서술형 포함된 퀴즈에서 정상 동작하는 것까지 확인. 커밋·push 완료(`f2f2da1`), GitHub Pages 배포 반영도 curl로 직접 확인함.

**교훈 — 다음에 Firestore에 새로 쓰는 기능을 추가할 때:** 사용자 입력이나 문제 데이터처럼 형태가 유동적인 객체를 통째로 Firestore에 저장할 땐, 그 객체 안 어딘가에 `undefined`가 숨어있을 수 있다는 걸 항상 의심할 것 (특히 "선택적 필드가 있는 데이터 타입"을 여러 개 취급하는 코드 — 이번처럼 객관식/서술형처럼 필드 구성이 다른 타입을 같은 배열에 섞어 넣을 때 특히 위험). `fsPost`/`fsSyncSet` 등 기존 함수들은 우연히 이 문제를 피해갔지만(항상 명시적으로 값이 있는 필드만 골라서 저장했기 때문), `fsSaveProgress`처럼 "객체를 통째로 저장"하는 함수는 반드시 이런 방어 로직이 필요함.

### 세션 10 변경사항 (index.html)
- `lr_cohorts`(기수 목록), `lr_shuffle_lecture`(강의 셔플 설정)이 localStorage에만 저장되고 다른 기기와 동기화 안 되던 문제 수정.
- Firebase에 `meta/admin_config` 문서 추가 (`fsSyncMeta()`/`fsGetMeta()` 함수). `saveCohorts()`/`saveShuffleSetting()` 호출 시 로컬 + Firebase 양쪽에 저장, 페이지 로드 시 Firebase 최신값으로 로컬 덮어씀 (관리자 모드 진입 시에도 동작).
- 관리자 비밀번호(`lr_pw`)는 보안상 의도적으로 로컬 전용 유지 — Firebase 동기화 대상 아님.

### 세션 10 추가 변경사항 (index.html) — 퀴즈 복제 + 크로스 디바이스 동기화
- **퀴즈 복제 기능 추가**: `dupeQuizSet(setId)`. 퀴즈 탭 → "퀴즈 수정" 모드 → 각 세트에 "복제" 버튼. 문제까지 통째로 복사, 새 id 발급 후 Firebase에도 저장.
- **버그 수정**: 관리자 모드(`?mode=admin`)로 진입할 때 Firebase에서 최신 퀴즈 세트(`lr_sets`)를 다시 받아오는 로직이 빠져있어서, 한 기기에서 퀴즈를 수정해도 **다른 기기의 QR 탭/강의모드에는 예전 문제가 그대로 남아있던 문제**를 수정함. (같은 기기·같은 세션에서 수정 직후엔 문제 없어서 발견하기 어려웠음 — 기수/셔플과 동일한 버그 패턴.)
  - `syncSetsFromRemote()` 헬퍼 추가 (`fsGetAllSets()`로 원격 최신본 받아와 로컬 덮어씀).
  - `switchTab('quiz')` / `switchTab('qr')` / `startLecture()` / `startLectureWithSet()` 진입 시마다 이 동기화를 실행하도록 연결.

### 세션 10 추가 변경사항 (index.html) — 강의모드 버튼 고정 + 스포일러 제거 (커밋 `2bad7de`)
사용자가 제기한 문제 3가지 중 2가지 수정 완료, 1가지는 **재현 안 됨 (아래 "미해결" 참고)**.

1. **강의모드 "정답보기" 버튼이 설명 펼쳐지면 아래로 밀려남 → 고정 완료**
   - 원인: `.lecture-footer`(이전/정답보기/다음 버튼 3개 담긴 행)가 일반 문서 흐름(static)에 있어서, `#lec-explanation`이 `renderLec()`→`lecReveal()`에서 펼쳐지면 그 아래 있는 footer가 밀려 내려갔음.
   - 수정: `.lecture-footer`를 `position: fixed; bottom: 0; left:0; right:0; max-width:640px; margin:0 auto;`로 변경 (`.lec-inner`에 `padding-bottom: 92px` 추가로 마지막 설명 텍스트가 안 가려지게 함).
   - 검증: 프리뷰에서 `getBoundingClientRect()`로 정답 공개 전/후 버튼 `top` 좌표 동일함 확인 (741px → 741px, 안 움직임). 설명 텍스트가 살짝 가려지는 경우 49px 정도 스크롤하면 100% 보임 (스크롤 가능하되 버튼 위치는 고정).

2. **복수정답 문제에서 정답 개수 스포일러 제거**
   - `renderQuestion()`의 `fb.textContent = '※ 정답을 모두 선택하세요 (' + correctArr.length + '개)'` → `'※ 정답을 선택하세요 (복수 선택 가능)'`로 교체. 이제 정답이 몇 개인지 미리 알 수 없음.
   - 참고: 사용자가 선택한 개수를 보여주는 `cnt + '개 선택됨'` 텍스트(선택 후 나타남)는 정답 개수가 아니라 **본인이 지금까지 체크한 개수**라 스포일러 아님 → 그대로 둠.

### ✅ 해결 — 단일정답 문제, 옵션 클릭 즉시 정답/오답 확정되던 문제 수정
이전 세션에서 "정답 누르면 바로 다음으로 넘어간다"는 보고를 재현 못 해 미해결로 남겼었는데, 실제 문제는 자동 이동이 아니라 **단일정답 문제에서 옵션을 클릭하는 순간 바로 정답/오답이 채점·확정되던 것**이었음 (사용자가 "다음으로 넘어간다"고 표현했지만 실제로는 "되돌릴 수 없이 확정된다"는 의미였음). 실수로 버튼을 잘못 눌러도 고칠 방법이 없어서 오답 처리된 사고 발생.

**원인:** 복수정답 문제는 원래 "선택 → 확인 버튼 클릭 → 채점" 2단계였는데, 단일정답 문제만 `selectAnswer(idx)`에서 클릭 즉시 채점하는 구조였음.

**수정 (index.html):**
- `renderQuestion()`: `#q-confirm-wrap`("정답 확인" 버튼)을 단일/복수 정답 문제 모두에서 항상 표시하도록 변경 (이전엔 복수정답에서만 표시).
- `selectAnswer(idx)`: 단일정답 문제도 이제 클릭 시 채점하지 않고 옵션 선택 표시만 함 (다른 옵션 클릭 시 선택 변경 가능, 실수 정정 가능).
- 채점 로직을 `confirmMultiAnswer()` → `confirmAnswer()`로 통합·일반화. 버튼 텍스트 "확인" → "정답 확인". 단일정답 데이터 포맷(`answers` 배열의 `chosen` 필드가 숫자 하나)은 기존과 동일하게 유지해서 관리자 대시보드 통계 호환성 깨지지 않음.
- 프리뷰에서 `.click()`으로 검증: 옵션 클릭 → 선택 표시만 되고 정답/오답 색 안 뜸 → 다른 옵션 클릭 시 선택 변경됨 → "정답 확인" 클릭 시에만 채점·색칠·버튼 비활성화됨.

### 세션 10 추가 변경사항 (index.html) — 퀴즈 화면 배경 이미지 + 문제별 이미지 (커밋 `c184bcf`)
사용자가 응시자 화면에 제품 사진 배경을 넣고, 개별 문제에도 이미지를 넣고 싶다고 요청.

1. **전체 배경 (장식용)**
   - 신규 파일 `quiz_brand.jpg`(라로제 제품 사진, 프로젝트 루트에 있던 것을 처음으로 repo에 추가)를 `body.exam-bg`의 배경으로 적용.
   - `showScreen(id)`에 `EXAM_BG_SCREENS = ['s-quiz-select','s-name','s-quiz','s-results','s-review']` 배열을 두고, 해당 화면일 때만 `document.body.classList.toggle('exam-bg', ...)`로 배경 켜짐/꺼짐 (관리자/강의모드 화면은 대상 아님).
   - `.name-card`, `.results-card`, `.review-item`, `#s-quiz .page`를 반투명(`rgba(255,255,255,0.93)`) + `backdrop-filter: blur(4px)`로 변경해 배경 사진 위에 카드가 떠 있는 느낌으로 처리. (배경 없는 화면에서도 rgba가 흰 배경 위에 그대로 얹혀서 시각적으로 문제 없음.)

2. **문제별 이미지 (선택 입력)**
   - 문제 데이터 구조에 `image`(URL 문자열, 선택) 필드 추가. 없으면 기존과 동일하게 이미지 없이 표시됨.
   - 관리자 모드(`?mode=admin`) 문제 추가/수정 모달(`#q-modal`)에 "이미지 URL" 입력란(`#m-image`) + 실시간 미리보기(`#m-image-preview`) 추가. `openModal()`/`saveQuestion()`에서 값 읽기·쓰기.
   - 응시 화면 `renderQuestion()`에서 `q.image`가 있으면 `#q-image-wrap`에 `<img class="q-image">`로 렌더링 (문제 텍스트 위, `escHtml()`로 이스케이프 처리해 XSS 방지).
   - 이미지는 파일 업로드가 아니라 **URL 붙여넣기 방식** (Firebase Storage 설정 필요 없음, Firestore 문서 용량 문제 없음). 저장소에 이미지 파일을 올리고 그 경로/URL을 입력하는 방식.
   - 프리뷰에서 배경 클래스 적용, 카드 반투명 스타일, 문제별 이미지 렌더링, 관리자 모달 저장→재편집 흐름까지 전부 `preview_eval`로 검증 완료.
   - 참고: 아직 미완성 — 지금은 이미지가 문제 위에 작게 뜨는 용도(`.q-image`)로만 쓰임. 사용자가 "문제마다 배경사진 자체를 바꾸고 싶다"고 요청했고, 이 이미지를 문제별 배경으로 전환하는 작업은 **아직 안 함** (사용자가 "만들어줘" 하면 진행 예정).

### 세션 10 추가 변경사항 (index.html) — 플래시카드 기기 간 동기화 버그 수정 (커밋 `9c33c3e`)
사용자가 "로컬에 저장되는 게 플래시카드만 있냐"고 물어봐서 전수 조사한 결과 발견. 세션 10 초반에 퀴즈 문제(`lr_sets`)/기수/셔플 설정에서 고쳤던 것과 **완전히 동일한 버그 패턴**이 플래시카드(`lr_fcsets`)에는 그대로 남아있었음.

**원인 2가지:**
1. 관리자 모드 플래시카드 탭(`switchTab('flashcard')`)이 Firebase 최신본을 받아오지 않고 로컬 캐시만 렌더링 — 한 기기에서 플래시카드를 수정해도 다른 기기 관리자 화면엔 예전 내용이 보임.
2. 직원용 플래시카드 뷰(`?fc=` 링크로 접속) 진입 로직이 "로컬에 있으면 무조건 로컬 사용, 없을 때만 Firebase 조회"였음. 즉 한 번이라도 로컬에 캐시된 적 있으면 그 뒤로 영원히 예전 버전만 보임 (QR 찍고 처음 보는 직원이 아니라, 관리자가 미리보기 등으로 한 번 열어본 적 있는 기기라면 특히 문제).

**수정:**
- `fsGetAllFcSets()` (전체 플래시카드 세트 Firebase 조회), `syncFcSetsFromRemote()` (Firebase 최신본으로 `lr_fcsets` 덮어쓰기) 함수 추가 — `fsGetAllSets()`/`syncSetsFromRemote()`와 동일한 패턴.
- `switchTab('flashcard')`: `renderFcSetList()` 즉시 실행 후 `syncFcSetsFromRemote().then(renderFcSetList)`로 최신본 재렌더링 (퀴즈 탭과 동일 패턴).
- `URL_FC` 진입 로직: "로컬 우선"에서 "Firebase 최신본 우선 → 실패 시 로컬 폴백"으로 변경 (`URL_QUIZ` 로직과 동일 패턴으로 통일).
- 프리뷰에서 실제 Firebase(`ra-rosee`)에 연결해 `syncFcSetsFromRemote()` 정상 동작 확인, 로컬에 일부러 가짜(stale) 데이터를 심고 "Firebase 우선" 로직이 그걸 덮어쓰는지까지 검증 완료.

### 세션 11 — index.html 신규 기능 설계 확정 (코드 변경 없음, 다음 세션에 구현 예정)

사용자가 "구상만 짤거야"로 시작한 브레인스토밍 세션. 아래 5개 기능 전부 요구사항이 확정됐고, **③번(등수표+강의모드)만 맨 마지막 우선순위**, 나머지 4개는 순서 상관없이 편한 대로 구현하면 됨.

#### ① 서술형(주관식) 문제
- 문제 데이터에 `type` 필드 추가 (기본값 없으면 기존처럼 객관식). 서술형은 `options`/`correct` 없이 텍스트 답변만 받음.
- 채점 없음 — 제출하면 기존 정답 처리 때 쓰는 연두색(`.correct` 클래스) 스타일 그대로 재사용. **문구는 "제출됨" 같은 딱딱한 단어 말고 "제출되었습니다!" 로.** (기존 앱 톤 — `confirmAnswer()`의 '잘 기억하고 있네요!' 같은 구어체 느낌 유지)
- **점수 계산 시 서술형 문항은 분모(전체 문항 수)에서 제외 — 객관식 문항 수만으로 정답률(pct) 계산.** (안 그러면 서술형 넣은 사람만 점수가 낮아 보임)
- 관리자가 서술형 답변을 확인하는 화면은 별도 탭이 아니라, **응시자 한 명을 클릭하면 그 사람의 객관식+서술형 답변이 한 성적표에 같이 보이는 화면**으로 (대시보드 쪽에 통합). 서술형 항목도 배지는 "제출됨" 대신 "제출되었습니다!" 톤으로 통일.
- 목업 참고: 이번 세션에서 `student_detail_scoresheet_mixed_types` 위젯으로 시각화 확인 완료 (문항 유형 배지 + 객관식 정답/오답 색상 + 서술형 텍스트 박스 레이아웃).

#### ② 재접속 시 이어풀기 잠금 (부정행위 방지)
- 현재 문제: `startQuiz()`가 호출될 때마다 `qi=0, answers=[]`로 완전 리셋되고 `finishQuiz()` 끝까지 가야만 Firebase에 기록됨 → 중간에 포기하고 재접속하면 흔적 없이 완전히 새로 풀 수 있어서, 어려운 문제만 알아보고 재도전하는 게 가능한 구조.
- 수정 방향: **동일 (이름+기수) 조합이면, 그 퀴즈에서 뽑혔던 동일한 문제 순서(`qs`)와 진행 상태(`qi`, `answers`)를 Firebase에 저장해두고 재접속 시 그대로 이어서 풀게 함.** 이미 확정(정답 확인 누른) 문제는 재풀이 불가.
- **관리자용 "진행상태 초기화" 버튼도 있으면 좋음 (기기 문제 등으로 못 끝내는 경우 대비) — 단, 우선순위 낮고 오류 안 생기는 선에서만 넣을 것. 무리해서 넣지 말 것.**
- 별도 "세션 강제 종료" 로직은 불필요하다고 판단 — 미완료 진행 상태가 남아있어도 어차피 `scores`엔 기록 안 되니 해가 없음.

#### ③ 타이머 만료 처리 설정
- 지금은 타이머가 0이 되면 `finishQuiz()`가 바로 호출되어 강제 종료됨(사실상 이미 동작은 하고 있으나 설정 불가).
- **퀴즈 편집 모달(timer/passScore 있는 곳)에 옵션 추가: "경고 표시만 하고 계속 풀기 허용" vs "강제 마감 (더 이상 못 풂)". 퀴즈마다 다르게 설정 가능해야 함.**

#### ④ 최초 제출 가산점
- **정답률과 무관하게, 해당 (퀴즈+기수) 조합에서 Firebase 서버 타임스탬프 기준 가장 먼저 제출한 사람에게 가산점 부여.** ("빠르기만 했는지 빠르고 정확했는지"가 드러나게 하려는 의도 — 정답률 조건 걸면 이 판별이 안 됨)
- 가산점 점수는 설정 탭에서 앱으로 직접 수정 가능하게.
- 등수표에 "⚡최초제출" 뱃지 표시.
- 이 기능 on/off와 가산점 값 모두 **퀴즈 편집 모달**에서 설정 (등수표 애니메이션 on/off와 같은 위치).

#### ⑤ 등수표 + 강의모드 개편 — ⚠️ **전체 중 최후 우선순위**
- 요구사항: 응시자가 문제 풀자마자, 강의모드/교육 진행 화면(강사가 보는 화면)에 등수표가 실시간으로 표시돼야 함.
- 등수표 범위: **(퀴즈+기수) 조합당 하나**, 이름은 실명 그대로 노출.
- 결과 공개 연출: "재밌는 게임처럼" — 참가자들이 달리기 경주하듯 트랙에서 움직이다가, 앞서가던 사람이 중간에 뒤처지거나 넘어지는 긴장감 있는 연출 후, 경주가 끝나면 1위부터 순서대로 등수 카드가 하나씩 공개됨. (이번 세션에서 `live_quiz_leaderboard_reveal` 위젯으로 애니메이션 컨셉 시각화 완료 — 러너 아바타가 지그재그로 순위 바뀌다가 결승선 통과 후 트로피 아이콘과 함께 순차 리빌)
- **이 리빌 기능은 모든 퀴즈에 일괄 적용하는 게 아니라, 퀴즈 편집 모달에서 퀴즈별로 켜고 끌 수 있어야 함.**
- 강의모드 개편 방향은 3가지 안 중 **C안(라이브 세션, 카훗식)으로 확정** — 학생들이 각자 기기로 풀고, 강사 화면엔 실시간 제출 현황이 뜨다가 마감되면 레이스 애니메이션으로 전환.
- **구현은 반드시 단계적으로:** 1단계 수동 새로고침 등수표 → 2단계 실시간 리스너 → 3단계 레이스 애니메이션. 한 번에 다 만들지 말 것 — 오류 발생 시 원인 파악이 쉬워야 함 (사용자가 "오류 안 나는 게 최우선"이라고 명시). 만들면서 아이디어 추가되면 반영해도 됨.
- 라이브 세션 기능은 기존 `renderQuestion`/`confirmAnswer`/`finishQuiz` 응시 로직을 절대 건드리지 말고, `scores` 컬렉션을 읽기 전용으로 구독하는 별도 레이어로 구현할 것 (회귀 위험 차단).

#### 참고 — 제품 이미지 관련 (보류)
- 사용자가 등수표 레이스 트랙의 러너 아이콘을 라로제 실제 제품 사진(1.아이컨투어스틱 2.머드스틱 3.선스틱 4.히알루론산세럼 5.너리싱스틱 6.데오드란트 7.클렌징밤 8.바디스크럽 9.케어오일 10.바디크림400ml 우선순위)으로 바꾸고 싶어함.
- 공식 홈페이지(larosee.co.kr, Imweb 기반)에서 9/10 제품 이미지 URL은 찾음 (8.바디스크럽은 단독 상품이 아니라 선물세트 구성품으로만 존재 — 못 찾음). 단, `cdn-optimized.imweb.me`는 확장자와 무관하게 실제로 WebP를 반환하므로, 실제 원본 포맷을 받으려면 `cdn.imweb.me`(optimized 없는 서브도메인)를 써야 함.
- 홈페이지 이미지들은 전부 모델이 손으로 제품을 든 화보컷이라 깔끔한 배경제거(누끼)가 어려움. PDF 카탈로그(`3. 라로제_프로덕트_카타로그_통합본_원본.pdf`)는 이 컴퓨터에 Python/poppler가 설치되어 있지 않아서 못 열어봄.
- **사용자가 이미지는 직접 찾아서 나중에 전달하기로 함 — 이 작업은 보류 상태.**

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
| `supabase.js` | ✅ 생성 완료 (클라이언트 초기화만, 아직 연결 안 됨) | 세션 9 |
| `.env` | ✅ 생성 완료 (SERVICE_ROLE_KEY 직접 입력 필요, 커밋 금지) | 세션 9 |
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

### 해야 할 콘텐츠 입력 (모든 개발 완료 후 앱에서 직접 입력)
롤플레이 카테고리 빈 항목 내용 입력:
- `빠른 고객` — 핵심포인트 + 멘트
- `느린 고객` — 핵심포인트 + 멘트
- `수분스틱` — 핵심포인트 + 멘트
- `세럼` — 핵심포인트 + 멘트
- `머드스틱` — 핵심포인트 + 멘트
- `사워오일` — 핵심포인트 + 멘트

입력 방법: 관리자 로그인 → 세션 탭 → 신규입사자 교육 → DAY 2 → 롤플레이 가이드 → 수정 → "편집 열기 →" → 각 카테고리 선택 → 내용 입력

> ⚠️ **개발 작업이 모두 끝난 뒤 앱에서 직접 입력할 예정. 코드로 건드리지 말 것.**

### 예정된 기능 개발

**index.html 신규 기능 5종 (세션 11에서 설계 확정) — 세션 12에서 4/5 완료:**
1. ✅ 타이머 만료 처리 설정 (퀴즈별 강제마감/계속풀기 선택) — **세션 12 완료 (커밋 `b56ce3d`)**
2. ✅ 최초 제출 가산점 (퀴즈+기수별, 정답률 무관) — **세션 12 완료 (커밋 `9938dd0`, 데이터 기록만·표시는 ⑤에서)**
3. ✅ 서술형 문제 (채점 없이 제출만, "제출되었습니다!" 톤) — **세션 12 완료 (커밋 `66d111d`)**
4. ✅ 재접속 시 이어풀기 잠금 (부정행위 방지) — **세션 12 완료 (커밋 `9070543`)**
5. ⏳ 등수표 + 강의모드 개편 (라이브 세션 C안, 단계적 구현) ← **유일하게 남은 항목, 원래부터 최후 우선순위**

**Firebase → Supabase 마이그레이션 (세션 9에서 준비 완료, 본작업 미완):**

세션 9에서 완료한 것:
- `supabase.js` 생성 — URL + anon key로 클라이언트 초기화 (HTML에서 script로 불러오면 됨)
- `.env` 생성 — `SUPABASE_SERVICE_ROLE_KEY=` 뒤에 직접 붙여넣기 필요, **절대 커밋 금지**

다음 세션에서 해야 할 것 (순서대로):
1. Supabase 대시보드에서 테이블 5개 생성 (SQL)
2. RLS 정책 설정 (anon 키 읽기/쓰기 권한)
3. `db.js` Firebase → Supabase 교체
4. `quiz.js` / `flashcard.js` localStorage → Supabase 교체
5. `sessions.js` localStorage + Firebase → Supabase 교체
6. `config.js` Firebase 제거, CDN 스크립트 정리

**마이그레이션 테이블 매핑:**

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
