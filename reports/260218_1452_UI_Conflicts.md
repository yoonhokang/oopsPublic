# 분석 보고서: UI 깨짐 및 로그인 정보 미표시 원인 분석

**작성일시:** 2026년 02월 18일 14:52
**작성자:** Antigravity (Firmware Architect)
**주제:** 공통 스타일 적용에 따른 UI 레이아웃 충돌 및 인증 UI 렌더링 실패 분석

## 1. 개요
최근 업데이트 이후 서브 페이지(`webPageByEmail`, `generatePassWd`)에서 다음과 같은 문제가 발생했습니다.
1.  **로그인 정보 미표시:** 여전히 인증 UI가 나타나지 않음.
2.  **UI 변경(Layout Shift):** 페이지의 전체적인 레이아웃과 스타일이 의도치 않게 변경됨.

## 2. 상세 분석

### 2.1 UI 스타일 충돌 (CSS Conflicts)
`css/style.css`가 서브 페이지에 적용되면서 기존 인라인 스타일과 충돌하고 있습니다.

- **`body` 스타일 충돌:**
    - **Common (`style.css`):** `display: flex; flex-direction: column; align-items: center;` (라인 24-27)
    - **Sub-pages (Inline):** `display: flex; justify-content: center; align-items: center;`
    - **영향:** Common 스타일이 로드되면서 Flex 방향이 `column`으로 변경되어, 중앙 정렬되어야 할 카드나 컨테이너가 상단부터 수직으로 배치되거나 정렬이 어긋날 수 있습니다.

- **`container` 클래스 충돌:**
    - **Common (`style.css`):** `display: grid; grid-template-columns: ...; width: 90%;` (라인 115-122) - 메인 페이지의 카드 그리드용.
    - **Sub-pages (Inline):** `width: 100%; max-width: 500px/600px; display: block;` (또는 flex)
    - **영향:** 서브 페이지의 단일 입력 폼 컨테이너가 그리드 레이아웃으로 강제 변경되어 모양이 완전히 깨집니다.

- **`header` 스타일 충돌:**
    - **Common (`style.css`):** `position: relative; ... text-align: center;`
    - **Sub-pages (Injected):** `display: flex; justify-content: space-between;`
    - **영향:** Common의 `text-align: center`와 서브 페이지의 Flex 레이아웃이 섞여 요소 배치가 꼬일 수 있습니다. 또한 Common의 `.auth-container`는 `position: absolute` (라인 52)로 되어 있어, 서브 페이지의 Flex 헤더 흐름을 무시하고 겹치거나 엉뚱한 위치에 뜰 수 있습니다.

### 2.2 로그인 정보 미표시 원인
- **Auth UI 위치 문제:** `css/style.css`에서 `.auth-container`는 `position: absolute; top: 1.5rem; right: 2rem;`으로 정의되어 있습니다.
- **서브 페이지 구조:** 서브 페이지는 `<div id="authContainer">`를 Flex Header 내부에 정적 흐름(`position: static`)으로 배치하려 했습니다.
- **결과:** CSS의 `absolute` 속성이 우선 적용되어(클래스 선택자 명시도), `authContainer`가 헤더 영역 밖으로 날아가거나, 배경색/z-index 문제로 보이지 않을 수 있습니다.
- **스크립트 문제:** `generatePassWd/index.html`의 경우, `firebase-config.js`를 로드했지만, `auth.js`가 로드되는 시점에 `firebase.auth()`가 초기화되었는지 보장하기 어렵습니다. (스크립트 로딩 순서는 맞지만 비동기성 체크 필요 없음, 동기 로드임). 하지만 가장 유력한 원인은 **CSS에 의한 숨김/위치 이탈**입니다.

## 3. 해결 방안

### 3.1 CSS 충돌 해결 (Scope 분리)
`css/style.css`의 스타일 정의가 너무 범용적(Generic)입니다. 이를 메인 페이지 전용으로 한정하거나, 서브 페이지에서 이를 무시하도록 해야 합니다.
하지만 "Common Assets"의 목적이 공유이므로, `style.css`를 수정하여 범용성을 높이는 것이 맞습니다.

**제안:**
1.  **`style.css`의 `container` 클래스 명 변경:** 메인 페이지의 그리드 컨테이너를 `.grid-container` 또는 `.card-container`로 변경하여 서브 페이지의 `.container`와 충돌 방지.
2.  **`body` 스타일 조정:** `style.css`의 `body` 스타일을 최소화하거나, 서브 페이지에서 `body` 클래스 등을 주어 오버라이드. (이미 서브 페이지에 인라인 스타일이 있어 오버라이드 되지만 `!important`가 없으면 CSS 파일 순서에 따라 달라짐. 보통 인라인 스타일이 우선순위가 높지만, `style` 태그 내부 스타일(Internal)과 외부 링크(External) 간의 순서를 확인해야 함. 서브 페이지는 Internal Style을 사용 중.)

### 3.2 Auth UI 표시 해결
1.  **`auth-container` 스타일 수정:** `position: absolute`를 제거하고 Flexbox 기반으로 변경하거나, `.auth-container`에 대한 스타일을 서브 페이지 상황에 맞게 유연하게 변경해야 합니다.
2.  **서브 페이지 헤더 스타일 인라인화:** 서브 페이지 헤더의 `authContainer`에 `style="position: static;"` 등을 명시적으로 주어 CSS 파일의 `absolute`를 무효화합니다.

## 4. 실행 계획
1.  `oopsPublic/css/style.css` 수정:
    - `.container` -> `.landing-container`로 이름 변경 (메인 페이지 `index.html`도 맞춰서 수정).
    - `body` 스타일에서 레이아웃 강제 속성 완화.
    - `.auth-container`의 `position: absolute`를 `.landing-header .auth-container`로 한정하거나, 서브 페이지용 클래스 추가.
2.  `oopsPublic/index.html` 수정:
    - class="container" -> class="landing-container".
    - header에 class="landing-header" 추가.

---
**결론:** CSS 클래스명 충돌(`container`)과 `position: absolute`로 인한 배치 문제가 주원인입니다. 공통 CSS를 리팩토링하여 충돌을 제거하겠습니다.
