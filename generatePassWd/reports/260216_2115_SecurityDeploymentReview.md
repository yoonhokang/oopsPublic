# 260216_2115_SecurityDeploymentReview.md

## 1. 개요 (Overview)
`generatePassWd` 프로젝트의 공개 웹 서버 배포 적합성 및 보안성을 검토한 결과입니다.

## 2. 배포 적합성 검토 (Suitability for Deployment)
본 프로젝트는 **Client-Side Only (Single Page Application)** 구조로 설계되어 있어, 별도의 백엔드 서버 없이 정적 웹 서버(Static Web Server)에 즉시 배포 가능합니다.

### 2.1. 웹 서버 요구사항 (Web Server Requirements)
일반적인 웹 서버 기준을 충족하며, 다음 두 가지 설정이 권장됩니다.
1.  **HTTPS (SSL/TLS) 필수:**
    -   최신 브라우저 보안 정책상 `window.crypto` API(난수 생성) 및 `Clipboard` API(복사하기)는 **Secure Context (HTTPS)** 환경에서만 정상 동작을 보장합니다.
    -   따라서 배포 시 **HTTPS 적용**이 필수적입니다. (HTTP로 접속 시 기능이 차단될 수 있음)
2.  **MIME Type:** `.html`, `.css`, `.js` 파일에 대한 올바른 MIME 타입을 제공해야 합니다. (대부분의 웹 서버 기본 설정)

## 3. 데이터 보안 및 전송 (Data Security & Transmission)

### 3.1. 암호 생성 (Generation) - [Secure]
-   모든 암호 생성 로직은 사용자의 **웹 브라우저 내부**에서 실행됩니다.
-   생성된 암호는 서버로 전송되지 않으며, 서버 로그에도 남지 않습니다.

### 3.2. 뉴스 데이터 수신 (News Fetch) - [Secure]
-   뉴스 데이터는 `api.rss2json.com` (HTTPS) 프록시를 통해 암호화된 채널로 수신됩니다.
-   요청 시 전송되는 정보는 "RSS Feed URL" 뿐이며, 사용자의 암호나 개인정보는 포함되지 않습니다.

### 3.3. 이메일 전송 (Email Transmission) - [Conditional Secure]
-   **동작 방식:** 웹 페이지에서 `mailto:` 링크를 생성하여 **사용자의 로컬 메일 클라이언트(Outlook, Mail app 등)**를 실행합니다.
-   **전송 구간 1 (Web -> Mail Client):** PC 내부의 프로세스 간 통신(IPC)이므로 네트워크를 타지 않아 안전합니다.
-   **전송 구간 2 (Mail Client -> Mail Server):** 사용자가 설정한 메일 서비스 제공자(Gmail, Outlook 등)의 보안 설정(TLS/SSL)을 따릅니다.
    -   사용자 PC가 암호화된 연결(SMTPS/IMAPS)을 사용한다고 가정했으므로, 이 구간 역시 암호화되어 전송된다고 볼 수 있습니다.

## 4. 보안 강화를 위한 조치 (Enhancements)
웹 서버 배포 시 발생할 수 있는 잠재적 위협(XSS 등)을 차단하기 위해 **CSP (Content Security Policy)** 설정을 추가할 것을 권장합니다.
-   **조치 사항:** `index.html` 헤더에 CSP 메타 태그 추가 (외부 스크립트 실행 차단 및 허용된 API 도메인 명시).

## 5. 결론 (Conclusion)
본 프로젝트는 공개 웹 서버에 배포하기에 **적합**하며, HTTPS 환경에서 운용 시 보안 요구사항을 충분히 만족합니다. 암호는 외부로 유출되지 않으며, 이메일 전송 경로 역시 사용자의 환경에 의존하지만 기술적으로 안전한 방식을 사용하고 있습니다.
