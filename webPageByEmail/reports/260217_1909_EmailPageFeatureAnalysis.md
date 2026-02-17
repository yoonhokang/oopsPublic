# 분석 보고서: 웹 페이지 이메일 전송 기능 구현 (Web Page Content to Email Analysis)

**Date:** 2026-02-17 19:09
**Topic:** Web Page Content to Email Feature Analysis
**Author:** Assistant

## 1. 개요 (Overview)
사용자는 웹 페이지의 URL을 입력하면, 해당 페이지의 내용을 **서식(Formatting)**을 유지한 채 로컬 PC의 이메일 클라이언트를 통해 전송하는 기능을 요청하였습니다.
본 보고서는 해당 기능 구현을 위한 기술적 제약 사항을 분석하고, 이를 우회하여 사용자 요구사항을 충족시킬 수 있는 "Clipboard & Mailto" 하이브리드 방식을 제안합니다.

## 2. 요구사항 분석 (Requirements Analysis)
1.  **Input:** URL 입력 및 전송 버튼.
2.  **Process:** 해당 URL의 웹 페이지 내용을 가져옴 (Fetch).
3.  **Output:** 로컬 이메일 클라이언트(Outlook, Mail app 등)가 열리고, 본문에 내용이 포함됨.
4.  **Constraint:** **서식 유지 필수** (이미지 캡처 방식 아님).

## 3. 심층 분석 및 제약 사항 (Deep Analysis & Constraints)

### 3.1. `mailto:` 프로토콜의 한계
-   표준 `mailto:` 링크(`mailto:?body=...`)는 **Plain Text**만 지원합니다.
-   HTML 태그(`<br>`, `<b>`, `<table>` 등)를 `body` 파라미터에 넣을 경우, 대부분의 메일 클라이언트(Outlook 포함)는 이를 렌더링하지 않고 태그 텍스트 그대로 표시합니다.
-   따라서, "브라우저에서 `mailto`를 호출하여 서식이 있는 본문을 자동 삽입"하는 것은 기술적으로 불가능합니다.

### 3.2. CORS (Cross-Origin Resource Sharing) 문제
-   클라이언트 브라우저(자바스크립트)에서 다른 도메인(예: `google.com`)의 HTML을 `fetch`하려고 하면 **CORS 보안 정책**에 의해 차단됩니다.
-   **해결 방안:** `api.allorigins.win` 또는 `cors-anywhere`와 같은 공개 프록시를 사용하거나, `generatePassWd` 프로젝트처럼 RSS 프록시 트릭을 사용해야 합니다. 본 프로젝트에서는 일반 HTML을 가져와야 하므로 `allorigins`와 같은 JSONP/Proxy 서비스를 활용할 계획입니다.

### 3.3. CSS 스타일 인라인화 (Style Inlining)
-   외부 CSS 파일이나 `<style>` 태그는 이메일 클라이언트에서 무시될 가능성이 높습니다.
-   서식을 최대한 유지하기 위해서는 가져온 HTML의 중요 스타일을 `style="..."` 속성으로 변환(Inlining)하는 작업이 필요할 수 있습니다. (구현 복잡도 증가)

## 4. 제안 솔루션: "복사 후 붙여넣기" (Copy & Paste Workflow)

기술적 제약(mailto의 HTML 미지원)을 극복하기 위해 다음과 같은 UX 흐름을 제안합니다.

**[Workflow]**
1.  사용자가 URL 입력 후 '전송' 버튼 클릭.
2.  애플리케이션이 해당 URL의 HTML을 가져와서 서식을 정리함.
3.  정리된 HTML을 **클립보드(Clipboard API)**에 `text/html` 형식으로 기록함.
    -   이때 "복사되었습니다. 메일 본문에 붙여넣기(Ctrl+V) 하세요"라는 알림 표시.
4.  로컬 이메일 클라이언트(`mailto:`)를 자동으로 실행.
    -   메일 본문에는 "[내용을 붙여넣기 해주세요]" 같은 안내 문구만 삽입.
5.  사용자가 메일 작성 창에서 `Ctrl+V`를 누르면 서식이 유지된 웹 페이지가 렌더링됨.

## 5. 데이터 흐름 및 안전성 (Data Flow & Safety)

### [Data Flow]
-   **Source:** User Input (URL) -> Proxy Server (Allow Origin) -> Fetch HTML.
-   **Mutation:** HTML Parsing -> Remove Scripts/Iframes (Security Sanitization) -> Inline basic styles.
-   **Sink:** Clipboard API (`text/html`, `text/plain`) -> `mailto:` Trigger.

### [Safety & Edge Cases]
1.  **Malicious Scripts:** 가져온 HTML에 포함된 `<script>`, `onclick` 등 실행 가능한 코드는 반드시 제거(Sanitize)하여 보안 위험을 방지해야 합니다.
2.  **Concurrency:** 비동기 Fetch 중 중복 클릭 방지 (Loading Indicator 구현).
3.  **Invalid URL:** 유효하지 않은 URL 입력 시 에러 처리.
4.  **CORS Failure:** 프록시 서버 장애 시 "직접 복사" 등 폴백 안내.

## 6. 결론 및 승인 요청
위 분석에 따라 **"HTML 클립보드 복사 후 메일 클라이언트 호출"** 방식으로 구현을 진행하고자 합니다.
이 방식은 사용자가 '붙여넣기'라는 한 번의 추가 동작을 해야 하지만, **서식 유지**라는 핵심 요구사항을 충족시킬 수 있는 유일한 웹 기반 솔루션입니다.

승인해주시면 다음 단계로 구현을 시작하겠습니다:
1.  `oopsPublic/webPageByEmail/` 폴더 생성.
2.  CORS 프록시를 이용한 HTML Fetcher 구현.
3.  Clipboard API 연동 및 `sanitizer` 적용.
