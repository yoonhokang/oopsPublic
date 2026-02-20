# 프로젝트 코드 분석 및 학습 가이드 (Code Study Guide)

**대상 프로젝트:** oopsPublic
**작성일:** 2026-02-20

이 문서는 `oopsPublic` 프로젝트의 구조와 핵심 구현 내용을 학습하기 위해 작성되었습니다. 이 코드를 통해 배울 수 있는 주요 개념과 로직을 정리했습니다.

---

## 1. 프로젝트 개요 (Overview)

이 프로젝트는 **Serverless Architecture**를 기반으로 한 **Static Web Application**입니다.
별도의 백엔드 서버(Node.js, Python 등)를 직접 구축하지 않고, **Firebase**와 **REST API**를 활용하여 인증과 데이터베이스 기능을 구현했습니다.

*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
*   **Auth:** Firebase Authentication (SDK 방식)
*   **Database:** Firestore (REST API 방식)
*   **Hosting:** GitHub Pages (또는 Firebase Hosting)

---

## 2. 폴더 구조 및 핵심 파일 (File Structure)

```
oopsPublic/
├── index.html              # 메인 랜딩 페이지 (카드 UI, 로그인 상태 체크)
├── css/
│   └── style.css           # 공통 스타일 (다크 모드, 카드 디자인, 버튼 등)
├── js/
│   ├── api-config.js       # [핵심] API 키, Endpoints 중앙 설정 파일
│   ├── auth.js             # [핵심] Firebase 로그인/로그아웃, 토큰 관리
│   └── debug-monitor.js    # CSP 위반 등을 감지하는 디버깅 유틸리티
├── webPageByEmail/         # [기능 1] 웹 클리퍼 & 보드
│   ├── index.html
│   ├── style.css
│   └── script.js           # [핵심] HTML 파싱, 데이터 정제, REST API 호출
└── generatePassWd/         # [기능 2] 비밀번호 생성기
    ├── index.html
    ├── style.css
    └── script.js           # [핵심] 뉴스 기사 페치, 비밀번호 생성 알고리즘
```

---

## 3. 핵심 모듈별 상세 분석 (Deep Dive)

### A. 하이브리드 인증 시스템 (`js/auth.js`)
이 프로젝트는 독특하게 **SDK 인증**과 **REST DB**를 혼용합니다.

*   **왜?** Firestore가 'Datastore Mode'로 설정되어 있어 클라이언트 SDK를 직접 쓸 수 없기 때문입니다.
*   **자세히 볼 부분:**
    *   `loginWithGoogle()`: Firebase SDK(`firebase.auth()`)를 통한 팝업 로그인.
    *   `getAuthIdToken()`: 로그인된 사용자의 **ID Token**을 가져오는 비동기 함수. 이 토큰은 REST API 요청 시 `Authorization: Bearer <token>` 헤더에 실려 보냅니다.
    *   **학습 포인트:** OAuth 2.0 흐름, JWT(JSON Web Token) 활용법.

### B. 설정의 중앙화 (`js/api-config.js`)
*   **내용:** Firebase Config 객체와 커스텀 `API_CONFIG` 객체를 정의.
*   **자세히 볼 부분:**
    *   `API_CONFIG.endpoints`: Firestore v1 REST API의 URL 구조.
    *   `API_CONFIG.endpoints.rssProxy`: CORS 문제를 해결하기 위한 프록시 서버 URL.
*   **학습 포인트:** 하드코딩을 피하고 설정을 분리하여 관리하는 방법.

### C. 웹 클리퍼 로직 (`webPageByEmail/script.js`)
가장 복잡하고 배울 것이 많은 파일입니다.

*   **1. 데이터 가져오기 (Fetch & Proxy):**
    *   `fetchWithFallback()`: CORS 에러를 피하기 위해 여러 프록시(AllOrigins, CorsProxy 등)를 순차적으로 시도하는 **Failover 패턴**.
*   **2. 데이터 정제 (HTML Cleaning):**
    *   `cleanHtml()`: `DOMParser`를 사용하여 문자열을 실제 DOM으로 변환한 뒤, 불필요한 태그(script, style) 제거, 이미지 경로 절대 경로화, 인라인 스타일 제거 등을 수행.
*   **3. REST API 연동:**
    *   `loadBoardREST()`: Firestore의 `runQuery` 메서드를 사용하여 데이터를 필터링/정렬하여 조회.
    *   `saveToBoard()`: `fetch(url, { method: 'POST' ... })`를 통해 JSON 데이터를 저장.
*   **UI 인터랙션:**
    *   아코디언 UI 구현 (한 번에 하나만 펼치기), 이벤트 위임(Event Delegation) 패턴 사용.

### D. 비밀번호 생성 알고리즘 (`generatePassWd/script.js`)
*   **로직:**
    1.  구글 뉴스 RSS를 가져와서 무작위 기사를 선택.
    2.  기사 본문을 문장 단위로 분리 (`Intl.Segmenter`).
    3.  각 단어의 첫 글자(이니셜) 등을 조합하여 비밀번호 생성.
*   **보안:**
    *   `window.crypto.getRandomValues()`: 암호학적으로 안전한 난수 생성기 사용 (`Math.random()` 사용 지양).

---

## 4. 주요 코딩 패턴 (Design Patterns)

이 프로젝트 전반에 적용된 좋은 습관들입니다.

1.  **IIFE (즉시 실행 함수 표현식):**
    *   `(function() { ... })();` 형태로 코드를 감싸 전역 변수 오염을 방지했습니다.
2.  **Strict Mode:**
    *   `"use strict";`를 선언하여 실수를 예방하고 더 안전한 JS 코드를 작성했습니다.
3.  **Async/Await:**
    *   비동기 작업(네트워크 요청)을 동기 코드처럼 읽기 쉽게 작성했습니다.
4.  **CSP (Content Security Policy):**
    *   HTML 헤더(`<meta>`)에 엄격한 보안 정책을 적용하여 XSS 공격 등을 방어했습니다.

---

## 5. 학습 제안 (How to Study)

1.  `js/api-config.js`를 열어 Firestore Endpoint가 어떻게 구성되는지 확인하세요.
2.  `webPageByEmail/script.js`의 `cleanHtml` 함수에 중단점(Debugger)을 걸고, 실제 웹페이지가 어떻게 정제되는지 단계별로 확인해 보세요.
3.  `js/auth.js`에서 로그인 후 `token`이 어떻게 생성되고 반환되는지 콘솔에 찍어보세요.

이 가이드가 프로젝트 이해에 도움이 되기를 바랍니다.
