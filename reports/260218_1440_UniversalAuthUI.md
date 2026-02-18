# 분석 보고서: 페이지 간 로그인 정보 식별 불가 문제

**작성일시:** 2026년 02월 18일 14:40
**작성자:** Antigravity (Firmware Architect)
**주제:** 서브 페이지 내 로그인 상태 및 계정 정보 표시 누락 분석 및 해결 방안

## 1. 개요
현재 메인 페이지(`oopsPublic/index.html`)에서만 로그인 상태 및 사용자 프로필이 표시되고 있습니다. `Password Generator` 및 `Web Page to Email` 등 서브 툴 페이지에서는 "Home"으로 돌아가는 링크 외에 현재 로그인된 계정을 확인할 수 있는 UI가 존재하지 않습니다.
사용자는 모든 페이지에서 로그인 여부와 계정 이름을 확인하고자 합니다.

## 2. 상세 분석

### 2.1 현재 상태
- **Main Page:** `<header>` 내부에 `<div id="authContainer">`가 존재하여, `auth.js`의 `renderAuthUI` 함수가 여기에 프로필을 렌더링합니다.
- **Sub Pages (`webPageByEmail`, `generatePassWd`):**
    - 단순히 `<a href="../index.html" class="back-btn">&larr; Home</a>` 버튼만 존재합니다.
    - `auth.js`는 `<head>`에서 로드되고 있지만, `renderAuthUI`가 타겟팅할 `#authContainer` 요소가 DOM에 없습니다.

### 2.2 요구 사항
- 모든 서브 페이지 상단에도 로그인 상태(로그인 버튼 또는 프로필)가 표시되어야 합니다.
- 디자인 일관성을 위해 메인 페이지와 유사한 헤더 스타일 또는 우측 상단 배치가 필요합니다.

## 3. 해결 방안 (Proposed Solution)

### 3.1 서브 페이지 HTML 수정
각 서브 페이지(`webPageByEmail/index.html`, `generatePassWd/index.html`)의 `<body>` 상단에 메인 페이지와 유사한 헤더 구조를 추가하거나, 최소한 `authContainer`를 포함하는 UI 요소를 배치합니다.

**변경 제안:**
기존 `back-btn`과 함께 우측 상단에 `authContainer`를 배치하는 구조로 변경합니다.

```html
<!-- 변경 전 -->
<a href="../index.html" class="back-btn">&larr; Home</a>

<!-- 변경 후 -->
<header style="display: flex; justify-content: space-between; padding: 1.5rem; align-items: center;">
    <a href="../index.html" class="back-btn" style="position: static;">&larr; Home</a>
    <div id="authContainer" class="auth-container">
        <!-- Injected by auth.js -->
    </div>
</header>
```
*스타일 조정 필요: `back-btn`의 `position: absolute` 속성을 제거하거나 조정하여 레이아웃이 겹치지 않게 해야 합니다.*

### 3.2 스크립트 실행 보장
이미 `js/firebase-config.js`와 `js/auth.js`가 로드되고 있고, 이전 수정에서 `renderAuthUI` 내부에서 요소를 찾도록 변경했으므로, HTML에 `id="authContainer"` 요소만 추가되면 자동으로 동작할 것입니다.

단, 각 페이지의 하단 스크립트 영역에서 `auth.onAuthStateChanged` 콜백 내에 `renderAuthUI(user)` 호출을 추가해야 합니다.
- `webPageByEmail`: 이미 `auth.onAuthStateChanged`가 존재함. 여기에 `renderAuthUI(user)` 추가.
- `generatePassWd`: `auth.onAuthStateChanged` 로직이 없음 (필요 시 추가해야 함). 현재는 Firebase Auth 로직 자체가 `script` 태그 내에 명시적으로 보이지 않음 (헤더에서 라이브러리만 로드).
    - `generatePassWd`에도 Firebase 초기화 및 Auth 리스너 코드를 추가해야 합니다.

## 4. 검증 계획
1.  `webPageByEmail/index.html` 수정: 헤더 추가 및 Auth 리스너에 렌더링 호출 추가.
2.  `generatePassWd/index.html` 수정: 헤더 추가 및 Firebase 초기화/Auth 리스너 스크립트 추가.
3.  각 페이지 접속 시 우측 상단에 로그인 정보 표시 확인.

---
**결론:** 위 분석에 따라 서브 페이지들의 HTML 구조를 수정하고 인증 UI 렌더링 로직을 연결할 것을 승인 요청드립니다.
