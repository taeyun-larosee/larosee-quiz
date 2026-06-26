# 라로제 퀴즈 관리 시스템 — 인수인계 문서

> 최종 업데이트: 2026-06-26  
> GitHub: https://github.com/taeyun-larosee/larosee-quiz  
> 배포 URL: https://taeyun-larosee.github.io/larosee-quiz/admin.html  
> 로컬 작업 경로: `C:\Users\김태윤\Claude\Projects\라로제\`

---

## 1. 프로젝트 개요

라로제 신규입사자 교육용 관리 시스템.  
**GitHub Pages** 로 정적 호스팅, **Firebase Firestore** 로 응시 결과 저장, 나머지는 **localStorage** 사용.

### 파일 구조

```
admin.html       ← 관리자 메인 (HTML + 인라인 CSS + 일부 JS)
present.html     ← 없음 (admin.html에 통합됨)
common.css       ← 전역 CSS 변수, reset
config.js        ← Firebase 설정 (공개키라 괜찮음)
auth.js          ← 로그인/로그아웃/세션 체크
db.js            ← Firebase 응시데이터 CRUD, 대시보드 렌더
quiz.js          ← 퀴즈 세트 CRUD
flashcard.js     ← 플래시카드 세트 CRUD
sessions.js      ← 세션/DAY/항목 CRUD, 롤플레이 에디터
present.js       ← 교육 진행 화면 (프레젠테이션 뷰)
logo.png         ← 로고 이미지
```

### 데이터 저장

| 키 | 내용 |
|---|---|
| `lr_pw` | 관리자 비밀번호 (기본값: `larosee1234`) |
| `lr_sets` | 퀴즈 세트 배열 |
| `lr_fcsets` | 플래시카드 세트 배열 |
| `lr_sessions` | 세션 배열 |
| `lr_item_types` | 항목 유형 배열 |
| Firebase `scores` 컬렉션 | 응시 결과 |

---

## 2. 세션 히스토리 (무슨 작업이 있었나)

### 세션 1 — 초기 구축
- `admin.html` 단일 파일로 전체 시스템 구현 (JS 모두 인라인)
- Firebase 응시 결과 저장 연동

### 세션 2 — JS 분리 + present.html 통합
- `admin.html`의 인라인 JS를 `auth.js`, `db.js`, `quiz.js`, `flashcard.js`, `sessions.js`, `present.js` 로 분리
- `present.html` 제거 → `admin.html` 내 `#present-view` div로 통합
- **GitHub 웹 인터페이스 drag-and-drop 업로드** → **한글 UTF-8 인코딩 깨짐 발생** ← 이게 모든 문제의 시작

### 세션 3~4 — 일부 복구 시도

### 세션 5 (이전 채팅) — 한글 전수 복원
- `efa5e8c` 커밋 원본(`efa5e8c_admin.html`)을 기준으로 한글 복원
- `db.js`, `quiz.js`, `flashcard.js`, `sessions.js` 전면 재작성
- git push 완료 (커밋 `3d80739`)

### 세션 6 (이번 채팅) — admin.html 복원 + 로그인 수정
- `admin.html` 자체도 한글이 깨져 있었음을 발견 (로그인 화면 버튼이 깨짐)
- C# 인라인 코드로 admin.html 한글 전수 치환
- `auth.js`에 localStorage 비밀번호 깨짐 방어 로직 추가
- **최종 push 완료**: 커밋 `3f0f2be`

---

## 3. 현재 상태 (2026-06-26 기준)

### ✅ 완료된 것

| 파일 | 상태 |
|---|---|
| `auth.js` | ✅ 정상 + localStorage 깨진 비번 자동 초기화 추가 |
| `db.js` | ✅ 한글 전수 복원 완료 |
| `quiz.js` | ✅ 한글 전수 복원 완료 |
| `flashcard.js` | ✅ 한글 전수 복원 완료 |
| `sessions.js` | ✅ 한글 전수 복원 완료 |
| `present.js` | ✅ 원래부터 정상 |
| `admin.html` | ✅ 한글 전수 복원 완료 |
| `common.css` | ✅ 한글 없음, 이상 없음 |
| `config.js` | ✅ 한글 없음, 이상 없음 |

### ⚠️ 확인 필요

1. **사이트 동작 검증**: https://taeyun-larosee.github.io/larosee-quiz/admin.html 에서 Ctrl+Shift+R 후
   - 로그인 버튼 `로그인` 표시 확인
   - `larosee1234` 로 로그인 확인
   - 대시보드 / 세션 / 퀴즈 / 플래시카드 / 설정 탭 텍스트 확인

2. **롤플레이 카테고리 내용 입력**: 현재 `핸드빌 기본` 카테고리만 내용 있음.  
   나머지 `빠른 고객`, `느린 고객`, `수분스틱`, `세럼`, `머드스틱`, `사워오일` 은 관리자 에디터에서 직접 입력 필요.

---

## 4. ⚠️ 절대 하지 말아야 할 것

### GitHub 웹 업로드 금지

**원인**: GitHub 웹 인터페이스로 파일을 drag-and-drop 하면 한글 UTF-8이 깨짐.

```
❌ GitHub.com → repository → "Add file" → 드래그앤드롭
❌ GitHub.com → 파일 클릭 → 편집 (한글 포함 파일은)
```

### 올바른 배포 방법 (반드시 이 방법만 사용)

```powershell
# 1. temp_repo 클론이 없으면 한 번만 실행
git clone https://github.com/taeyun-larosee/larosee-quiz.git "C:\Users\김태윤\Claude\Projects\라로제\temp_repo"

# 2. 수정한 파일을 temp_repo에 복사
Copy-Item "C:\Users\김태윤\Claude\Projects\라로제\admin.html" "C:\Users\김태윤\Claude\Projects\라로제\temp_repo\admin.html"
# (필요한 파일 모두 복사)

# 3. push
Set-Location "C:\Users\김태윤\Claude\Projects\라로제\temp_repo"
git add .
git commit -m "설명"
git push origin main
```

---

## 5. 한글 깨짐 수리 방법 (재발 시)

### 원인 판별
- 깨진 패턴: `濡`, `鍮`, `嫄`, `媛`, `?섏` 등 한중일 문자 + `?` 조합
- 정상 한글이 UTF-8로 한 번 더 인코딩되어 발생하는 mojibake

### 수리 절차

1. **원본 참조 파일 확인**
   ```
   C:\Users\김태윤\Claude\Projects\라로제\efa5e8c_admin.html
   ```
   이 파일이 원본 한글이 모두 올바른 참조본 (git show efa5e8c:admin.html 로 추출).

2. **C# 인라인으로 치환** (PowerShell 한글 문자열 처리가 불안정하므로)
   ```powershell
   Add-Type -TypeDefinition @"
   using System; using System.IO; using System.Text;
   public class Fixer {
     public static void Fix(string path) {
       string c = File.ReadAllText(path, Encoding.UTF8);
       c = c.Replace("깨진문자열", "올바른한글");
       File.WriteAllText(path, c, Encoding.UTF8);
     }
   }
   "@
   [Fixer]::Fix("경로\파일.js")
   ```

3. **Node.js 스크립트로 치환** (대량 치환 시)
   ```javascript
   const fs = require('fs');
   let c = fs.readFileSync('파일.js', 'utf8');
   c = c.split('깨진문자').join('올바른한글');
   fs.writeFileSync('파일.js', c, 'utf8');
   ```
   > ⚠️ PowerShell here-string(`@'...'@`)에 한글을 직접 쓰면 인코딩 문제 발생.  
   > 반드시 `[System.IO.File]::WriteAllText(path, content, UTF8)` 또는 node 스크립트 파일로 분리 작성.

---

## 6. 로그인 문제 해결법

### 증상
- 비밀번호 입력 후 클릭해도 로그인이 안 됨
- 에러 메시지가 표시됨

### 원인 & 해결

**A. localStorage에 깨진 비밀번호가 저장된 경우**  
현재 `auth.js`에 자동 방어 로직 추가됨 (ASCII 범위 벗어나면 자동 삭제).  
그래도 안 되면 브라우저 개발자도구 콘솔에서:
```javascript
localStorage.removeItem('lr_pw');
location.reload();
```

**B. sessionStorage 세션이 꼬인 경우**
```javascript
sessionStorage.clear();
location.reload();
```

**C. 기본 비밀번호**
```
larosee1234
```

---

## 7. 다음 세션에서 할 작업

### 즉시 할 것
1. 사이트 접속 후 로그인 확인 (Ctrl+Shift+R 강력 새로고침)
2. 탭별 한글 텍스트 전체 육안 확인
3. 퀴즈 추가/수정 동작 테스트
4. 세션 추가/항목 추가 동작 테스트

### 예정된 기능 개발 (Supabase 마이그레이션)

Firebase → Supabase 마이그레이션 계획:

| localStorage 키 | Supabase 테이블 |
|---|---|
| `lr_sets` | `training_quiz_sets` |
| `lr_fcsets` | `training_fc_sets` |
| `lr_sessions` | `training_sessions` |
| `lr_item_types` | `training_item_types` |
| Firebase `scores` | `training_quiz_results` |

**⚠️ Supabase 규칙:**
- 모든 테이블명은 `training_` 접두사 필수
- `SERVICE_ROLE_KEY` 는 절대 클라이언트 코드에 노출 금지
- 클라이언트에는 `anon` 키만 사용 + RLS 설정

---

## 8. 개발 환경 & 참조

### 로컬 경로
```
C:\Users\김태윤\Claude\Projects\라로제\         ← 작업 파일
C:\Users\김태윤\Claude\Projects\라로제\temp_repo\ ← git push용 클론
C:\Users\김태윤\Claude\Projects\라로제\efa5e8c_admin.html ← 한글 원본 참조
```

### GitHub
- Repo: https://github.com/taeyun-larosee/larosee-quiz
- Pages: https://taeyun-larosee.github.io/larosee-quiz/

### Firebase
- 프로젝트: `ra-rosee`
- 사용 컬렉션: `scores` 만
- 설정: `config.js` 참조

### 최근 커밋 히스토리
| 커밋 | 내용 |
|---|---|
| `3f0f2be` | admin.html 로그인 에러 복원 + auth.js localStorage 방어 |
| `85d55e2` | admin.html 한글 전수 복원 |
| `3d80739` | db.js, quiz.js, flashcard.js, sessions.js 한글 전수 복원 |
| `efa5e8c` | 분리 작업 이전 원본 (한글 정상 상태 참조용) |

---

## 9. 다음 Claude에게 — 시작 방법

이 문서를 읽고 나서:

1. **사이트 상태 먼저 확인**: https://taeyun-larosee.github.io/larosee-quiz/admin.html 접속 → 로그인 → 각 탭 확인
2. **문제 있으면**: 위 "한글 깨짐 수리 방법" 또는 "로그인 문제 해결법" 참조
3. **새 기능 개발 시**: 반드시 로컬 수정 → `temp_repo` 복사 → git push (웹 업로드 절대 금지)
4. **작업 완료 후**: 이 HANDOFF.md 업데이트 후 push

---

*이 문서는 `C:\Users\김태윤\Claude\Projects\라로제\HANDOFF.md` 에 저장됨*