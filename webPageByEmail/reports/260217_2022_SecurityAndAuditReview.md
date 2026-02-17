# 보안 감사 및 로깅 검토 보고서 (Security & Logging Audit Report)

**Date:** 2026-02-17 20:22
**Topic:** Security Guidelines & Logging Strategy for `oopsPublic` Project
**Author:** Assistant

## 1. 개요 (Overview)
`oopsPublic` 프로젝트 내의 모든 웹 페이지(`index.html`, `generatePassWd`, `webPageByEmail`)를 대상으로 보안 지침 준수 여부를 점검하고, 문제 발생 시 효과적인 디버깅을 위한 로깅 전략을 제안합니다.

## 2. 보안 가이드라인 (Security Guidelines)
웹 페이지가 갖춰야 할 기본 보안 지침은 다음과 같습니다.

### [필수 보안 지침]
1.  **CSP (Content Security Policy) 적용:**
    -   XSS(Cross-Site Scripting) 방지를 위해 인라인 스크립트 실행을 제한하고, 허용된 도메인(`connect-src`)과의 통신만 허용해야 합니다.
    -   최소 권한 원칙(Least Privilege) 적용.
2.  **Input/Output Sanitization (입출력 검증 및 소독):**
    -   사용자 입력(URL 등)이나 외부에서 가져온 데이터(Fetch 결과)를 DOM에 삽입(`innerHTML`)할 때 악성 스크립트를 반드시 제거해야 합니다.
3.  **Safe Sinks 사용:**
    -   `innerHTML` 보다는 `innerText`, `textContent` 사용을 권장합니다. HTML 렌더링이 필수인 경우 `DOMPurify` 같은 전문 라이브러리나 강력한 커스텀 Sanitizer를 사용해야 합니다.
4.  **No Mixed Content:**
    -   모든 리소스는 HTTPS를 통해 로드되어야 합니다.

## 3. 현황 분석 및 취약점 (Current Status & Vulnerabilities)

### 3.1. `oopsPublic/index.html` (Main Landing)
-   **[보안] CSP 누락:** 현재 CSP 메타 태그가 존재하지 않습니다. 외부 스크립트 주입 공격에 취약할 수 있습니다.
-   **[로깅] 로그 부재:** 단순 내비게이션 페이지라 로깅이 없으나, 에러(404 등) 발생 시 추적이 불가능합니다.

### 3.2. `generatePassWd/index.html`
-   **[보안] CSP 설정:**
    -   `default-src 'self' 'unsafe-inline';`
    -   `unsafe-inline` 허용됨 (스타일/스크립트). 편의성을 위해 사용 중이나 보안상 취약점임.
-   **[보안] DOM 조작:**
    -   `mnemonicOutput.innerHTML` 사용. `cleanHtml` 함수가 존재하나, 기본 `div` 생성 방식이라 완벽한 XSS 방어는 아님.
-   **[로깅] 양호:**
    -   화면 하단에 `Debug Console` 영역이 있고 `log()` 함수로 타임스탬프와 함께 출력 중.

### 3.3. `webPageByEmail/index.html`
-   **[보안] CSP 설정:**
    -   `img-src *` (모든 이미지 허용) 등 다소 관대한 설정. 프록시 특성상 불가피한 면이 있음.
-   **[보안] DOM 조작:**
    -   가져온 외부 HTML을 `cleanHtml`로 소독 후 클립보드에 복사. `script`, `iframe` 등을 제거하고 있어 기본 방어는 되어 있음.
-   **[로깅] 미흡:**
    -   성공/실패 여부를 `statusArea`에만 표시하고 상세 로그는 `console.error`에만 의존. 모바일 환경 등 개발자 도구를 못 쓰는 경우 디버깅이 어려움.

## 4. 개선 제안 (Recommendations)

### 4.1. 보안 강화 (Security Hardening)
1.  **Main Page CSP 추가:** `oopsPublic/index.html`에도 기본 CSP를 추가하여 보안 수준을 맞춥니다.
2.  **Sanitization 강화:**
    -   `generatePassWd`와 `webPageByEmail`에서 사용하는 `cleanHtml` 로직을 재검토하여 `javascript:` 프로토콜이나 `on*` 이벤트 핸들러(예: `onclick`, `onerror`) 속성까지 확실히 제거하도록 강화합니다.

### 4.2. 로깅 표준화 (Logging Standardization)
`generatePassWd`의 **On-Screen Debug Console** 패턴이 디버깅에 매우 효과적이므로, 이를 다른 프로젝트에도 표준으로 적용할 것을 제안합니다.

-   **제안:** **"Global Logger Module"** (또는 공통 패턴) 도입.
    -   평소에는 숨겨져 있다가 특정 제스처(예: 제목 5회 클릭)나 URL 파라미터(`?debug=true`)로 활성화되는 디버그 콘솔 UI 추가.
    -   `console.log`를 래핑하여 화면 콘솔과 브라우저 콘솔에 동시에 출력.

## 5. 실행 계획 (Action Plan)
승인 시 다음 작업을 진행합니다.

1.  **`oopsPublic/index.html`:** CSP 태그 추가.
2.  **`webPageByEmail/index.html`:**
    -   `generatePassWd` 스타일의 `Debug Console` UI 이식.
    -   `fetchWithFallback` 과정의 상세 로그를 화면에 출력하도록 수정.
    -   `cleanHtml` 함수에 속성 기반 필터링(XSS 방지) 추가.
3.  **`generatePassWd/index.html`:**
    -   `cleanHtml` 보안 로직 동기화.

위 내용에 대해 승인을 요청드립니다.
