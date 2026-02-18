# 보안 검사 (Security Check)

## 1. 개요 (Overview)
프로젝트 내에 모든 웹 페이지를 대상으로 보안 지침 준수 여부를 점검하기 위한 지침들을 확인합니다.

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

