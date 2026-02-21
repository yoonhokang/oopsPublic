# DOM, window, 그리고 auth.js 자동 실행 흐름

> **작성일**: 2026-02-21
> **주제**: `authContainer`를 통해 배우는 DOM·전역 객체·이벤트 체인
> **관련 파일**: `index.html`, `js/auth.js`

---

## 1. 기본 개념: DOM 요소란?

### DOM(Document Object Model)이란?

브라우저가 HTML 파일을 읽으면, 각 태그를 **JavaScript 객체**로 변환하여 트리(나무) 구조로 메모리에 저장합니다. 이 트리를 **DOM**이라 부릅니다.

```
HTML 파일 (텍스트)              →    DOM 트리 (메모리 속 객체)
                                
<html>                              document
  <body>                              └─ body
    <div id="authContainer">            └─ div#authContainer  ← DOM 요소(객체)
    </div>                              
  </body>                           
</html>                             
```

- **DOM 요소** = HTML 태그 하나하나가 메모리에 올라간 JavaScript 객체
- `document.getElementById('authContainer')` = DOM 트리에서 해당 ID를 가진 객체를 **찾아서 반환**

### 핵심 비유

```
HTML        = 설계도 (텍스트 파일)
DOM         = 설계도를 보고 실제로 지은 건물 (메모리 속 객체 트리)
DOM 요소     = 건물 안의 방 하나하나 (div, button, input 등)
getElementById = 방 번호(id)로 특정 방을 찾는 것
```

---

## 2. 기본 개념: `window`와 `document`의 관계

### `window` — 최상위 전역 객체

브라우저 환경에서 모든 것의 시작점입니다.

```
window (브라우저 전역 객체 — 모든 것의 최상위)
  ├── document         ← HTML 문서를 나타내는 DOM 트리의 루트
  │     ├── body
  │     │     ├── div#authContainer
  │     │     └── ...
  │     └── head
  ├── console          ← console.log()
  ├── location         ← 현재 URL
  ├── fetch            ← HTTP 요청 함수
  ├── crypto           ← 보안 난수
  ├── API_CONFIG       ← (우리가 등록한 커스텀 변수)
  └── Logger           ← (우리가 등록한 커스텀 변수)
```

### `window.`은 생략 가능

JavaScript에서 전역 객체의 속성은 `window.`을 생략할 수 있습니다:

```javascript
window.document.getElementById('x')   // 정식 표기
document.getElementById('x')           // 동일 — window. 생략

window.alert('hi')                     // 정식 표기
alert('hi')                            // 동일 — window. 생략

window.API_CONFIG.debugMode            // 정식 표기
API_CONFIG.debugMode                   // 동일 — window. 생략
```

### `document`가 특별한 이유

`document`는 `window`의 수많은 속성 중 하나일 뿐이지만, **HTML 문서 전체(DOM 트리)**를 대표한다는 점에서 특별합니다. 어떤 JS 파일이든 `document.getElementById()`로 DOM 요소에 자유롭게 접근할 수 있습니다.

---

## 3. 본론: IIFE가 보호하는 것과 보호하지 않는 것

### IIFE 안의 변수 vs DOM 요소

```javascript
// auth.js
(function () {
    const authContainer = document.getElementById('authContainer');
    //    ↑ 변수명              ↑ DOM 요소                    

    // 변수명 "authContainer"  → IIFE 밖에서 접근 불가 ✗
    // DOM 요소 자체            → 어디서든 접근 가능   ✓
})();
```

**비유로 설명하면:**

```
IIFE = "내 방에 포스트잇을 붙여둔 것"
       → 포스트잇 이름("authContainer")은 내 방에서만 보임
       
DOM 요소 = "공용 거실에 있는 실제 가구"
            → 누구든 거실에 가면 사용 가능
```

따라서:

```javascript
// auth.js (IIFE 안)
const authContainer = document.getElementById('authContainer');
authContainer.innerHTML = '프로필';   // ✅ 가능

// main.js (다른 IIFE 안)
const authContainer = document.getElementById('authContainer');
authContainer.textContent;            // ✅ 가능 — 같은 DOM 요소를 참조

// 만약 IIFE 없이 두 파일 모두 전역이었다면?
// → "authContainer" 변수명이 충돌! (두 번째 선언이 첫 번째를 덮어씀)
// → IIFE가 이 충돌을 방지해줌
```

---

## 4. 본론: `renderAuthUI()`는 어떻게 자동 실행되는가?

### 실행 순서 전체 흐름

```
[시점 1] 브라우저가 index.html 파싱 시작
         ├─ <div id="authContainer"> → DOM 요소 생성 (빈 그릇)
         └─ <script src="auth.js">  → auth.js 로드

[시점 2] auth.js IIFE 즉시 실행
         ├─ Firebase 초기화
         └─ DOMContentLoaded 이벤트 리스너 등록 (아직 실행 안 됨)

[시점 3] HTML 파싱 완료 → DOMContentLoaded 이벤트 발생!
         └─ auth.js의 리스너 실행:
            ├─ document.getElementById('authContainer') → 있음!
            └─ registerAuthListener() 호출

[시점 4] registerAuthListener() 내부
         └─ firebase.auth().onAuthStateChanged(콜백) 등록

[시점 5] Firebase가 인증 상태 확인 완료 → 콜백 자동 호출
         └─ renderAuthUI(user) ★ 자동 실행!
            ├─ user가 있으면 → 프로필 사진 + 이름 + 로그아웃 버튼
            └─ user가 null이면 → "Sign in with Google" 버튼
```

### 코드로 추적

```javascript
// auth.js 하단 (IIFE 안)

// [시점 2] 리스너 등록
document.addEventListener('DOMContentLoaded', () => {      // ← [시점 3]에 실행됨
    if (document.getElementById('authContainer')) {         // ← DOM 요소 존재 확인
        registerAuthListener();                             // ← [시점 3]
    }
});

// registerAuthListener 함수 정의
function registerAuthListener(callback) {
    firebase.auth().onAuthStateChanged((user) => {          // ← [시점 5]에 실행됨
        renderAuthUI(user);          // ★ 자동 실행!
        if (callback) callback(user);
    });
}
```

### 핵심 포인트

| 질문 | 답변 |
|---|---|
| `index.html`이 `renderAuthUI()`를 직접 호출하나? | **아님**. `auth.js`가 스스로 이벤트 체인으로 자동 실행 |
| `index.html`의 역할은? | `<div id="authContainer">`라는 **빈 그릇**만 준비 |
| 누가 빈 그릇을 채우나? | `auth.js`의 `renderAuthUI()`가 DOM API로 채움 |
| 트리거(방아쇠)는? | `DOMContentLoaded` → `onAuthStateChanged` 이벤트 체인 |

---

## 5. 요약 정리표

| 개념 | 설명 | 코드에서 확인 |
|---|---|---|
| **DOM 요소** | HTML 태그가 메모리에 올라간 JS 객체 | `<div id="authContainer">` |
| **`document`** | DOM 트리의 루트, `window`의 속성 | `document.getElementById()` |
| **`window`** | 브라우저 최상위 전역 객체 | `window.API_CONFIG`, `window.Logger` |
| **IIFE** | 변수명 충돌 방지 (DOM 요소 자체는 보호 안 함) | `(function() { ... })()` |
| **이벤트 체인** | `DOMContentLoaded` → `onAuthStateChanged` → `renderAuthUI()` | `auth.js` 하단 |
| **인증 토큰** | Firebase SDK 내부 메모리에 보관, DOM에 저장 안 함 | `getIdToken()` |

---

## 6. 보충: 인증 토큰은 DOM에 저장되나?

**아니요, 토큰은 DOM에 저장되지 않습니다.** 토큰과 DOM은 완전히 별개의 저장 공간입니다.

### 브라우저 메모리 구조

```
window
├── document (DOM 트리)
│     ├── body
│     │     ├── div#authContainer  ← UI 요소만 보관
│     │     └── button#loginBtn
│     └── head
│
├── firebase.auth()  ← 인증 상태 (SDK 내부 메모리)
│     └── currentUser
│           ├── .uid          "abc123"
│           ├── .email        "user@gmail"
│           ├── .displayName  "홍길동"
│           └── .getIdToken() → 토큰을 즉석 반환
│
└── IndexedDB  ← 브라우저 내장 영구 저장소
      └── Firebase가 세션 정보를 여기에 보관
```

### 토큰 저장 위치

| 저장소 | 내용 | 특징 |
|---|---|---|
| **Firebase SDK 내부 메모리** | 현재 사용자 객체 + 토큰 | JS 변수로만 존재, 탭 닫으면 사라짐 |
| **IndexedDB** | Firebase 세션 정보 | 브라우저 내장 DB, 탭을 닫아도 유지 |
| **DOM** | ❌ 토큰 저장 안 함 | UI 요소만 보관 |

### 이 프로젝트의 토큰 흐름

```javascript
// auth.js에서
async function getAuthIdToken() {
    const user = firebase.auth().currentUser;  // SDK 내부 메모리에서 사용자 가져옴
    const token = await user.getIdToken();      // SDK가 토큰을 "즉석 생성/갱신"하여 반환
    return token;
}

// webPageByEmail/script.js에서
const token = await window.getAuthIdToken();
fetch(url, {
    headers: { "Authorization": `Bearer ${token}` }  // 토큰을 HTTP 헤더에 첨부
});
// → 토큰은 변수(메모리)에만 잠깐 존재하고, DOM에는 절대 삽입하지 않음
```

### 왜 DOM에 토큰을 넣으면 안 되나?

DOM에 넣으면 **개발자 도구(F12)로 누구든 볼 수 있고**, XSS 공격 시 한 줄로 탈취됩니다:

```html
<!-- ❌ 절대 하면 안 되는 예시 -->
<input type="hidden" id="token" value="eyJhbGci...매우긴토큰">
<!-- → XSS로 document.getElementById('token').value 한 줄이면 탈취 -->
```

이 프로젝트에서는 토큰을 **JS 변수로만 잠깐 보유**하고, `fetch()` 호출이 끝나면 가비지 컬렉션으로 자동 삭제됩니다.

---

## 7. 보충: 토큰 라이프사이클 — "사본을 지운다"는 의미

### 정확한 흐름

"IndexedDB에서 꺼내서 복사하고, 사용 후 지운다"는 **방향은 맞지만**, 정확히는 조금 다릅니다:

```
IndexedDB에 저장된 것              Firebase SDK가 생성하는 것
─────────────────                 ─────────────────────
Refresh Token (갱신 토큰)    →     ID Token (인증 토큰)
"장기 출입증 발급권"               "1시간짜리 임시 출입증"
```

**단계별 흐름:**

```
[1] 최초 로그인 시
    └─ Google 로그인 성공
       └─ Firebase SDK가 "Refresh Token"을 발급받아 IndexedDB에 저장
          (이것은 "장기 출입증 발급권" — 수개월 유효)

[2] getIdToken() 호출 시 (매번)
    └─ Firebase SDK가 IndexedDB의 Refresh Token을 사용하여
       Google 서버에 "새 ID Token 발급 요청"
       └─ Google 서버가 "1시간짜리 임시 출입증(ID Token)"을 반환
          └─ SDK가 이 토큰을 메모리(JS 변수)에 보관

[3] fetch() 호출 시
    └─ const token = await getAuthIdToken();  ← 변수에 토큰 저장
       fetch(url, { headers: { Authorization: `Bearer ${token}` } });
       └─ HTTP 요청 완료

[4] 함수 실행 종료
    └─ 변수 token이 스코프(유효 범위)를 벗어남
       └─ JavaScript 엔진의 가비지 컬렉터가 메모리에서 자동 회수
```

### "사본을 지운다"는 표현의 정확한 의미

| 표현 | 정확한 의미 |
|---|---|
| "IndexedDB에서 꺼낸다" | ✗ 직접 꺼내는 것이 아님. Refresh Token으로 **새 ID Token을 발급**받음 |
| "복사해서 사용한다" | △ 복사보다는 **새로 생성**이 정확 (매번 다른 토큰) |
| "사용 후 지운다" | △ 명시적으로 지우는 것이 아님. 변수가 스코프를 벗어나면 **가비지 컬렉터가 자동 회수** |

### 가비지 컬렉션이란?

JavaScript 엔진이 **더 이상 참조되지 않는 메모리**를 자동으로 해제하는 기능입니다:

```javascript
async function saveToBoard() {
    const token = await getAuthIdToken();  // ← token 변수 생성 (메모리 할당)
    await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
    // ... 함수 로직 ...
}  // ← 함수 종료 → token 변수가 더 이상 참조 안 됨
   //   → 가비지 컬렉터가 나중에 자동으로 메모리 회수
```

**핵심**: "지운다"기보다는 "아무도 쓰지 않으니 자동으로 치워진다"가 더 정확합니다.

---

## 8. 보충: IndexedDB의 보안 기능

### IndexedDB는 별도 보안 기능을 제공하는가?

**네, 제공합니다.** 다만 "암호화"가 아니라 **"접근 제한"** 방식입니다.

### 보안 계층 구조

```
┌──────────────────────────────────────────────────┐
│  보안 계층 1: 동일 출처 정책 (Same-Origin Policy) │  ← 브라우저 제공
│  ──────────────────────────────────────────────── │
│  "같은 도메인의 코드만 해당 IndexedDB에 접근 가능" │
│                                                    │
│  예시:                                             │
│  oopspublic.firebaseapp.com의 IndexedDB는         │
│  → oopspublic.firebaseapp.com의 JS만 접근 가능 ✓  │
│  → evil-site.com의 JS는 접근 불가 ✗               │
│  → 다른 탭의 naver.com도 접근 불가 ✗              │
├──────────────────────────────────────────────────┤
│  보안 계층 2: 샌드박스 격리 (Sandbox)              │  ← 브라우저 제공
│  ──────────────────────────────────────────────── │
│  각 출처(origin)의 데이터가 물리적으로 분리 저장   │
│  한 사이트의 IndexedDB가 다른 사이트의 것을        │
│  읽거나 덮어쓸 수 없음                             │
├──────────────────────────────────────────────────┤
│  보안 계층 3: 디스크 암호화 (선택적)               │  ← OS 제공
│  ──────────────────────────────────────────────── │
│  Windows BitLocker, macOS FileVault 등이          │
│  활성화되어 있으면 디스크 전체가 암호화됨          │
│  → IndexedDB 파일도 자동으로 보호                 │
└──────────────────────────────────────────────────┘
```

### 브라우저 vs OS — 누가 뭘 담당하나?

| 보안 기능 | 제공 주체 | 설명 |
|---|---|---|
| **동일 출처 정책** | 🌐 브라우저 | 다른 도메인의 JS가 접근하는 것을 차단 |
| **샌드박스 격리** | 🌐 브라우저 | 출처별로 저장 공간을 분리 |
| **디스크 암호화** | 💻 OS | BitLocker(Windows), FileVault(macOS) 등 |
| **사용자 계정 격리** | 💻 OS | 다른 OS 사용자가 내 프로필 폴더에 접근 불가 |

### IndexedDB가 보호하지 못하는 것

```
⚠️ 같은 출처(same-origin)의 XSS 공격

악성 코드가 oopspublic.firebaseapp.com "안에서" 실행되면,
동일 출처 정책이 "같은 사이트니까 OK" 판단 → IndexedDB 접근 허용!

이것이 바로 CSP(Content Security Policy)와 sanitizeHtml()이
중요한 이유입니다:
→ 애초에 악성 코드가 같은 출처에서 실행되지 못하도록 차단!
```

### 정리

| 질문 | 답변 |
|---|---|
| IndexedDB 자체에 암호화 기능이 있나? | **없음** — 데이터는 평문으로 저장됨 |
| 그럼 어떻게 보호되나? | 브라우저의 **동일 출처 정책 + 샌드박스**로 접근 자체를 차단 |
| 디스크 암호화는? | **OS 차원**의 기능 (BitLocker/FileVault) — 브라우저와 무관 |
| 가장 큰 위협은? | 같은 출처에서 실행되는 XSS → CSP와 sanitizeHtml()로 방어 |

---

*문서 끝*
