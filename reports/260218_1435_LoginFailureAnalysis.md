# 분석 보고서: 구글 로그인 기능 오작동 원인 분석

**작성일시:** 2026년 02월 18일 14:35
**작성자:** Antigravity (Firmware Architect)
**주제:** 구글 로그인 UI 렌더링 실패 및 기능 오작동 원인 심층 분석

## 1. 개요
사용자로부터 구글 로그인 기능이 동작하지 않는다는 리포트를 접수하였습니다. 코드 리뷰 및 실행 흐름 분석 결과, 자바스크립트 실행 시점과 DOM 로딩 시점 간의 불일치로 인한 **DOM 참조 실패(Null Reference)**가 주원인으로 식별되었습니다.

## 2. 상세 분석

### 2.1 현상
- 페이지 로드 시 로그인 버튼 또는 사용자 프로필이 헤더에 표시되지 않음.
- 콘솔에 별도 에러가 출력되지 않을 수 있음 (Silent Failure).

### 2.2 원인 (Root Cause)
1.  **스크립트 로딩 위치:** `index.html`의 `<head>` 태그 내에서 `js/auth.js`를 로드하고 있습니다.
2.  **즉시 실행 코드 (Immediate Execution):** `js/auth.js` 파일의 8번 라인에서 `document.getElementById('authContainer')`를 즉시 호출하여 변수에 할당합니다.
    ```javascript
    // js/auth.js line 8
    const authContainer = document.getElementById('authContainer');
    ```
3.  **DOM 미완성:** 스크립트가 실행되는 시점(Head Parsing)에는 `<body>` 내부의 `#authContainer` 요소가 아직 생성되지 않은 상태입니다. 따라서 `authContainer` 변수에는 `null`이 할당됩니다.
4.  **렌더링 차단:** `renderAuthUI` 함수 내부에서 `if (!authContainer) return;` 조건문에 의해 UI 갱신 로직이 수행되지 않고 조기 종료됩니다.

### 2.3 영향 범위 (Impact Analysis)
- **Data Flow:** `authContainer` 변수가 `null`로 초기화됨 -> `renderAuthUI` 함수 기능 상실 -> 로그인/로그아웃 버튼 렌더링 불가.
- **Side Effects:** 로그인 버튼이 없으므로 사용자는 로그인 트리거 자체를 할 수 없음.

## 3. 해결 방안 (Proposed Solution)

### 3.1 `js/auth.js` 수정 (권장)
전역 변수로 DOM 요소를 캐싱하는 대신, 함수 호출 시점에 요소를 조회하거나, `DOMContentLoaded` 이벤트를 활용해야 합니다.
`renderAuthUI` 함수가 호출될 때는 이미 Firebase 초기화 및 Auth 체크가 끝난 시점이므로 DOM이 준비되었을 가능성이 높습니다. 따라서 함수 내부에서 요소를 조회하도록 변경합니다.

**수정 전:**
```javascript
const authContainer = document.getElementById('authContainer');

function renderAuthUI(user) {
    if (!authContainer) return;
    // ...
}
```

**수정 후:**
```javascript
// 전역 변수 제거

function renderAuthUI(user) {
    const authContainer = document.getElementById('authContainer'); // 호출 시점에 조회
    if (!authContainer) return;
    // ...
}
```

## 4. 검증 계획
1.  `js/auth.js` 수정 적용.
2.  `index.html` 새로고침 후 헤더 영역에 "Login with Google" 버튼이 나타나는지 확인.
3.  버튼 클릭 및 로그인 프로세스 정상 동작 확인.

---
**결론:** 위 분석에 따라 `js/auth.js`의 DOM 참조 로직을 수정할 것을 승인 요청드립니다.
