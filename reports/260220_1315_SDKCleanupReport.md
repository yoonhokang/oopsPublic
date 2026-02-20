# Firestore SDK 코드 제거 보고서 (Cleanup Report)

**작성일시:** 2026-02-20 13:15
**작성자:** Antigravity (Senior Firmware Architect)

## 1. 개요 (Overview)
-   **목적:** Google Cloud **Datastore Mode** 제약 사항 준수를 위해, 프로젝트 내 모든 **Firestore Client SDK** 관련 코드 제거.
-   **범위:** 공통 스크립트(`js/`), 각 도구별 페이지(`webPageByEmail/`, `generatePassWd/`, `index.html`).

## 2. 변경 상세 (Changes Detail)

### A. 공통 모듈 (`js/`)
1.  **`js/auth.js`**:
    -   **제거:** `window.db = firebase.firestore()` 및 Named Database(`default`) 연결 시도 로직 전면 삭제.
    -   **현상:** 이제 `auth.js`는 오직 **Firebase Auth** (로그인/토큰 관리) 역할만 수행합니다.

2.  **`js/firebase-config.js`** (Legacy):
    -   **제거:** `const db = firebase.firestore()` 초기화 코드 삭제.
    -   **참고:** 해당 파일은 현재 메인 페이지들에서 사용되지 않는 것으로 파악되나, 잠재적 오류 방지를 위해 수정함.

### B. 각 페이지 (`HTML`)
1.  **`webPageByEmail/index.html`**:
    -   `firebase-firestore-compat.js` 스크립트 태그 삭제 완료 (이전 단계).
2.  **`index.html` (Main)**, **`generatePassWd/index.html`**, **`troubleshoot.html`**:
    -   검토 결과, Firestore SDK(`firebase-firestore.js`)를 로드하지 않고 있음을 확인.
    -   Auth SDK(`firebase-auth.js`)만 로드하여 정상적인 하이브리드(Auth SDK + REST DB) 모드로 동작 중.

## 3. 결론 (Conclusion)
-   프로젝트 전체에서 **Firestore Client SDK** 의존성이 완전히 제거되었습니다.
-   모든 데이터베이스 통신은 `fetch()`를 통한 **REST API**로만 이루어집니다.
-   UI 테스트를 진행할 준비가 완료되었습니다.
