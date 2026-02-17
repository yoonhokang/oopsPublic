# 오류 분석 보고서: Web Page Fetch 실패 (Fetch Error Analysis)

**Date:** 2026-02-17 19:58
**Topic:** Fetch Error with `news.hada.io`
**Author:** Assistant

## 1. 문제 상황 (Issue Description)
사용자가 `https://news.hada.io/topic?id=26625` URL을 입력하고 **Capture & Open Email** 시도 시 "Error: Failed to fetch" 에러 메시지가 붉은색 박스로 표시됨.

## 2. 원인 분석 (Root Cause Analysis)

### 2.1. CORS Proxy (`api.allorigins.win`)의 한계
현재 구현된 `First Proxy`인 `api.allorigins.win`은 무료 공개 서비스로 다음과 같은 잠재적 불안정성을 가짐:
1.  **Rate Limiting:** 단시간에 많은 요청이 오거나 서버 부하가 높으면 요청을 거부할 수 있음.
2.  **Target Site Blocking:** 일부 웹사이트(`news.hada.io` 등)는 봇(Bot) 트래픽을 감지하여 특정 Proxy IP를 차단하거나 빈 응답을 줄 수 있음.
3.  **Timeout:** Proxy 서버가 대상 사이트로부터 응답을 받는 데 시간이 오래 걸리면 브라우저의 `fetch` 타임아웃이 발생할 수 있음.

### 2.2. 브라우저 보안 정책 (CSP & Mixed Content)
-   현재 `index.html`의 CSP는 `connect-src 'self' https://api.allorigins.win;` 으로 설정되어 있음.
-   만약 다른 서비스나 리다이렉트가 발생하면 브라우저가 이를 차단할 가능성이 있음.
-   **추정 원인:** `Failed to fetch` 메시지는 네트워크 오류(Network Error) 또는 CORS 위반 시 발생하는 일반적인 메시지임. 해당 URL은 한국의 기술 뉴스 애그리게이터로, 일반적인 스크래핑 방지 기술이 적용되어 있을 가능성이 높음.

### 2.3. 에러 핸들링 미흡
-   현재는 단일 Proxy (`allorigins`)만 시도하고, 실패 시 즉시 에러를 띄움.
-   Proxy 서버 자체의 장애인지, 서드파티 차단인지 구분하지 않고 포괄적인 에러 메시지를 출력함.

## 3. 해결 방안 (Proposed Solution)

### 3.1. 다중 Proxy Fallback 메커니즘 도입 (Multi-Proxy Strategy)
단일 Proxy에 의존하는 것은 가용성이 떨어지므로, 여러 공개 Proxy 서비스를 순차적으로 시도하는 **Fallback 로직**을 구현합니다.

**[Candidate Proxies]**
1.  **Primary:** `https://api.allorigins.win/get?url=` (JSON 응답)
2.  **Secondary:** `https://corsproxy.io/?` (Direct HTML 응답)
3.  **Tertiary:** `https://api.codetabs.com/v1/proxy?quest=` (Direct HTML 응답)

**[Workflow]**
-   Proxy 1 시도 -> 성공 시 HTML 반환.
-   Proxy 1 실패 -> Proxy 2 시도 -> 성공 시 HTML 반환.
-   모두 실패 시 최종 에러 메시지 출력.

### 3.2. CSP(Content Security Policy) 업데이트
-   새로운 Proxy 도메인들을 허용하도록 `<meta>` 태그 수정.
    -   `connect-src 'self' https://api.allorigins.win https://corsproxy.io https://api.codetabs.com;`

### 3.3. User-Agent 및 Error Feedback 개선
-   사용자에게 "프록시 서버가 응답하지 않거나 대상 사이트가 접근을 차단했습니다"라는 구체적인 메시지 제공.
-   필요 시 "재시도" 버튼 활성화.

## 4. 결론 및 승인 요청
가장 유력한 원인은 "단일 프록시 서버의 접근 거부"입니다.
이에 **Multi-Proxy Fallback 시스템**을 적용하여 성공률을 높이는 방향으로 수정을 제안합니다.

승인해주시면 즉시 코드를 수정하겠습니다.
