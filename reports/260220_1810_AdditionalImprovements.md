# oopsPublic 추가 개선점 분석 보고서

> **작성일**: 2026-02-20 18:10  
> **분석 기준**: 이전 개선(`260220_1736`) 적용 완료 후 코드 상태  
> **분석 범위**: 전체 코드베이스 심층 재검토

---

## 발견된 추가 개선점 (11건)

---

### 🔴 Critical (2건)

---

#### 1. [SEC-01] auth.js `renderAuthUI()` — user.photoURL / user.displayName XSS 벡터

**파일**: `js/auth.js` L90-93

```javascript
authContainer.innerHTML = `
    <img src="${user.photoURL}" ...>
    <span>${user.displayName}</span>
`;
```

**위험성**: Firebase Auth의 `user.photoURL`과 `user.displayName`은 **사용자가 자유롭게 수정** 가능한 값입니다.  
공격자가 displayName을 `<img src=x onerror="alert(1)">`로 설정하면 모든 페이지에서 XSS가 발생합니다.

**개선 방안**: `textContent`로 삽입하거나, HTML 이스케이프 함수 적용

```javascript
const nameEl = document.createElement('span');
nameEl.textContent = user.displayName; // 안전
```

---

#### 2. [SEC-02] firebaseConfig 중복 선언 — 2개 파일에서 서로 다른 설정값

**파일**: `js/api-config.js` L13-19 vs `js/firebase-config.js` L9-17

| 속성 | api-config.js | firebase-config.js |
|---|---|---|
| `storageBucket` | `oopspublic.appspot.com` | `oopspublic.firebasestorage.app` |
| `messagingSenderId` | `367280733677` | `285342720346` |
| `appId` | `1:367280733677:...` | `1:285342720346:...` |
| `measurementId` | (없음) | `G-H029GDC8SK` |

**위험성**: 어떤 파일이 먼저 로드되느냐에 따라 **다른 Firebase 프로젝트**에 연결될 수 있습니다.  
실제 index.html은 `api-config.js`만 로드하고, `firebase-config.js`는 사용처가 없어 보이지만, 혼란의 원인이 됩니다.

**개선 방안**: 하나로 통합하거나, 사용하지 않는 파일 삭제

---

### 🟡 High (4건)

---

#### 3. [SEC-03] CSP `'unsafe-inline'`이 여전히 모든 HTML에 남아있음

**파일**: `index.html` L12-13, `webPageByEmail/index.html` L17-18, `generatePassWd/index.html`

`script-src`와 `default-src` 모두에 `'unsafe-inline'`이 포함되어 있습니다.

```
script-src 'self' 'unsafe-inline' https://*.gstatic.com ...
```

`main.js`로 인라인 스크립트를 분리했지만, CSP 헤더에서 `unsafe-inline`을 **제거하지 않았으므로** 실질적인 보안 향상이 없습니다.

**개선 방안**: `'unsafe-inline'` 제거 후 기능 동작 검증. Firebase SDK 호환성 때문에 불가능한 경우, nonce 기반 CSP 적용 검토

---

#### 4. [STAB-01] webPageByEmail/script.js — DOM 요소 참조 타이밍 문제

**파일**: `webPageByEmail/script.js` L32-36

```javascript
// IIFE 최상위에서 직접 참조 (DOMContentLoaded 밖)
const statusArea = document.getElementById('statusArea');
const sendBtn = document.getElementById('sendBtn');
const saveBtn = document.getElementById('saveBtn');
```

L579-584의 `DOMContentLoaded`에서도 같은 버튼을 다시 참조합니다.

**문제**: `<script>`가 `<head>`에서 로드되면 DOM이 아직 없어 `null`이 됩니다.  
현재는 `<body>` 끝에서 로드하므로 우연히 동작하지만, 스크립트 로드 위치가 바뀌면 즉시 깨집니다.

**개선 방안**: 모든 DOM 참조를 `DOMContentLoaded` 내부로 이동

---

#### 5. [MAINT-01] `log()` 함수 중복 정의

**파일**: `webPageByEmail/script.js` L58-74 vs `generatePassWd/script.js` L54-65

동일한 역할의 `log()` 함수가 **두 파일에서 각각 구현**되어 있습니다.

**개선 방안**: `js/logger.js` 공통 유틸리티로 분리하거나, `debug-monitor.js`의 `window.Logger`를 직접 사용

---

#### 6. [STAB-02] generatePassWd secureRandom() — 모듈러 바이어스

**파일**: `generatePassWd/script.js` L43-47

```javascript
function secureRandom(max) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] % max;  // 모듈러 바이어스 발생
}
```

`Uint32Array`의 최대값 `4,294,967,295`가 `max`의 배수가 아니면 일부 값이 더 자주 선택됩니다.  
비밀번호 생성기에서는 **균등 분포**가 중요합니다.

**개선 방안**: Rejection Sampling 사용

```javascript
function secureRandom(max) {
    const array = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / max) * max;
    do {
        window.crypto.getRandomValues(array);
    } while (array[0] >= limit);
    return array[0] % max;
}
```

---

### 🟢 Medium (5건)

---

#### 7. [UX-01] showConfirmModal — CSS 스타일 미정의

**파일**: `webPageByEmail/script.js` L135

```javascript
overlay.className = 'modal-overlay';
```

`modal-overlay`, `modal-content`, `modal-actions`, `secondary-btn`, `primary-btn` 클래스가 CSS에 **정의되어 있지 않습니다**.

**개선 방안**: `webPageByEmail/style.css` 또는 공통 `css/style.css`에 모달 스타일 추가

---

#### 8. [UX-02] main.js — 카드 Auth Guard `alert()` 잔존

**파일**: `js/main.js` L30

```javascript
alert("Login Required.\nPlease sign in with Google to access tools.");
```

webPageByEmail에서는 커스텀 모달로 대체했으나, 루트 페이지에서는 `alert()`가 그대로 남아있습니다.

**개선 방안**: 인라인 토스트 메시지 또는 카드 안에 로그인 유도 UI 표시

---

#### 9. [UX-03] webPageByEmail/index.html — input type 불일치

**파일**: `webPageByEmail/index.html` L76

```html
<input type="text" id="urlInput" ...>
```

CSS는 `input[type="url"]`에만 스타일링을 적용하고 있습니다 (`style.css` L63).

**개선 방안**: `type="url"`로 변경 → CSS 스타일 적용 + 브라우저 기본 URL 유효성 검증 활용

---

#### 10. [PERF-01] sanitizeHtml — 불필요한 호출 타이밍

**파일**: `webPageByEmail/script.js` L469

```javascript
contentDiv.innerHTML = sanitizeHtml(post.content);
```

아코디언이 접혀 있는 상태에서도 **모든 게시물의 content를 즉시 파싱**합니다.  
50개 게시물을 로드하면 DOMParser가 50번 동기 실행됩니다.

**개선 방안**: Lazy Sanitize — 아코디언 펼침(toggleBtn click) 시점에 최초 1회만 실행

---

#### 11. [MAINT-02] auth.js `window.loginWithGoogle` — 아직 전역 노출

**파일**: `js/auth.js` L132-136

```javascript
window.loginWithGoogle = loginWithGoogle;
window.logout = logout;
window.getAuthIdToken = getAuthIdToken;
window.registerAuthListener = registerAuthListener;
```

`loginWithGoogle`과 `logout`은 **auth.js 내부에서만 사용** (L98, L108에서 addEventListener로 연결).  
외부에서 호출하는 곳이 없으므로 전역 노출 불필요합니다.

`getAuthIdToken`과 `registerAuthListener`는 다른 모듈에서 사용하므로 유지가 필요합니다.

**개선 방안**: `window.loginWithGoogle`, `window.logout` 제거 (이미 내부에서 addEventListener로 연결됨)

---

## 요약 매트릭스

| # | 우선순위 | 카테고리 | 개선 항목 | 난이도 |
|---|---|---|---|---|
| 1 | 🔴 | 보안 | auth.js photoURL/displayName XSS | 쉬움 |
| 2 | 🔴 | 보안 | firebaseConfig 중복/불일치 정리 | 쉬움 |
| 3 | 🟡 | 보안 | CSP unsafe-inline 제거 시도 | 중간 |
| 4 | 🟡 | 안정성 | DOM 참조를 DOMContentLoaded 내부로 이동 | 중간 |
| 5 | 🟡 | 유지보수 | log() 함수 중복 → 공통 모듈화 | 중간 |
| 6 | 🟡 | 안정성 | secureRandom() 모듈러 바이어스 수정 | 쉬움 |
| 7 | 🟢 | UX | 모달 CSS 스타일 추가 | 쉬움 |
| 8 | 🟢 | UX | main.js alert() → 토스트 메시지 | 쉬움 |
| 9 | 🟢 | UX | input type="text" → type="url" | 쉬움 |
| 10 | 🟢 | 성능 | sanitizeHtml Lazy 로딩 | 중간 |
| 11 | 🟢 | 유지보수 | auth.js 불필요한 전역 노출 제거 | 쉬움 |
