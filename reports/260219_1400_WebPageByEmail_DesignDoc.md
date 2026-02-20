# [Web Page by Email] 상세 설계 및 구현 문서

## 1. 개요 (Overview)
`webPageByEmail`은 사용자가 입력한 웹 페이지(URL)의 내용을 가져와서(Scraping), 이메일 본문에 붙여넣기 좋은 형태로 변환(Cleaning)하거나, 개인 "보드"에 저장(Archiving)하는 웹 애플리케이션입니다.

### 핵심 기능
1.  **웹 페이지 캡처**: URL을 입력받아 해당 페이지의 HTML을 가져옵니다.
2.  **이메일 전송 준비**: 가져온 HTML을 분석하여 이메일 클라이언트가 보안 문제 없이 렌더링할 수 있도록 정제한 후 클립보드에 복사합니다.
3.  **저장소(Board) 기능**: 캡처한 내용을 Firestore 데이터베이스에 영구 저장하고, 저장된 목록을 조회합니다.

---

## 2. 아키텍처 (Architecture)

이 앱은 **Serverless Architecture**로 구성되어 있으며, 클라이언트(브라우저)에서 대부분의 로직을 처리합니다.

### 2.1 기술 스택
*   **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
*   **Backend (BaaS)**: Google Firebase (Authentication, Firestore)
*   **External APIs**:
    *   **CORS Proxies**: 브라우저의 *Same-Origin Policy* 제약을 우회하기 위해 `corsproxy.io`, `allorigins.win`, `codetabs.com` 등의 공용 프록시 서버를 사용합니다.

### 2.2 데이터 흐름
1.  **User Input** -> **Fetch Logic**: 사용자가 URL 입력 -> 프록시 서버들을 통해 요청 전송.
2.  **External Web** -> **Proxy** -> **Client**: 대상 웹 페이지의 HTML 원문이 프록시를 거쳐 클라이언트로 반환됨.
3.  **Client Processing**:
    *   `cleanHtml()`: 스크립트 제거, 상대 경로를 절대 경로로 변환.
    *   `copyToClipboard()`: 정제된 HTML을 클립보드에 복사.
    *   `saveToBoard()`: 정제된 내용을 Firestore에 JSON 형태로 저장.
4.  **Firestore** <-> **Client**: 저장된 "My Saved Posts" 목록을 실시간/비동기로 조회.

---

## 3. 주요 모듈 및 로직 상세

### 3.1 파일 구조 (Modularization)
리팩토링을 통해 다음 3개 파일로 분리되었습니다.
*   **index.html**: 화면의 뼈대(Structure)와 외부 리소스 로딩 담당.
*   **style.css**: 디자인(Look & Feel) 담당. Tailwind 같은 프레임워크 없이 순수 CSS 사용.
*   **script.js**: 모든 비즈니스 로직(이벤트 처리, 데이터 통신) 담당.

### 3.2 핵심 함수 (Key Functions)

#### A. `fetchWithFallback(targetUrl)` - 다중 프록시 전략
브라우저에서 직접 외부 사이트(`naver.com` 등)를 `fetch`하면 CORS 에러가 발생합니다. 이를 해결하기 위해 여러 프록시 서비스를 순차적으로 시도합니다.
1.  `CorsProxy.io`: 가장 빠르고 원본 HTML을 그대로 반환.
2.  `AllOrigins`: JSON 형태로 래핑해서 반환 (파싱 필요).
3.  `CodeTabs`: 예비용.
*   **설계 의도**: 무료 프록시 서비스의 불안정성을 고려하여, 하나의 서비스가 죽어도 앱이 동작하도록 **Failover** 메커니즘을 구현했습니다.

#### B. `cleanHtml(htmlString, baseUrl)` - 보안 및 호환성 처리
가져온 HTML을 그대로 이메일에 넣으면 깨지거나 보안 경고가 뜹니다.
1.  **DOMParser**: 문자열 형태의 HTML을 실제 DOM 객체로 변환하여 조작.
2.  **Resource URL Fix**: `src="/img/logo.png"` 같은 상대 경로를 `src="https://naver.com/img/logo.png"`와 같이 **절대 경로**로 변환합니다. (이메일에서는 상대 경로 해석 불가)
3.  **Sanitization (보안)**: `<script>`, `<iframe>`, `onclick` 이벤트 핸들러 등을 모두 제거하여 XSS(교차 사이트 스크립팅) 공격을 방지합니다.

#### C. `accessFirestore()` - 데이터 저장 및 조회
*   **저장 (`saveToBoard`)**:
    *   네트워크 연결 상태를 먼저 확인(Ping)하고, SDK 연결이 불안정하면 **REST API**로 자동 전환하여 저장합니다.
*   **조회 (`loadPosts`)**:
    *   최근 네트워크 보안 정책 등으로 `GET` 요청이 차단되는 경우를 대비해, Firestore의 `runQuery` (POST 방식) 엔드포인트를 사용하여 데이터를 안전하게 불러옵니다.

---

## 4. 보안 고려사항 (Security)

1.  **Content Security Policy (CSP)**: `meta` 태그를 통해 허용된 도메인(Firebase, Proxy 등) 외의 리소스 로딩을 차단합니다.
2.  **Auth Guard**: `auth.onAuthStateChanged`를 통해 로그인하지 않은 사용자는 메인 페이지로 강제 리다이렉트(`window.location.replace`) 시킵니다.
3.  **XSS 방어**: 외부 HTML을 가져올 때 `cleanHtml` 함수가 악성 스크립트를 능동적으로 제거합니다.

---

이 문서는 `webPageByEmail` 프로젝트의 현재 구현 상태(v1.0.28 기준)를 기반으로 작성되었습니다.
CSS와 JS가 분리되어 있어, 디자인 수정 시 `style.css`만, 로직 수정 시 `script.js`만 수정하면 되므로 유지보수성이 높습니다.
