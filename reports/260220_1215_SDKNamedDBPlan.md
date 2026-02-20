# SDK Named Database 연결 계획 (Connect to 'default')

**작성일시:** 2026-02-20 12:15
**작성자:** Antigravity (Senior Firmware Architect)

## 1. 배경 (Background)
-   **현황:** Firestore 모드는 **Native Mode**로 확인됨. (Datastore Mode 아님)
-   **원인:** `default`라는 이름의 **Named Database**가 존재함. 하지만 Firebase SDK는 기본적으로 시스템 기본 DB인 `(default)`에 접속하려고 시도하여 `not-found` 에러 발생.
-   **해결책:** SDK 초기화 시 명시적으로 데이터베이스 이름(`default`)을 지정하여 연결.

## 2. 변경 계획 (Migration Plan)

### A. `js/auth.js` 수정
-   기존: `window.db = firebase.firestore();` (기본 DB 연결)
-   변경: `window.db = firebase.firestore().app.firestore("default");` (Named DB 연결)
    -   *참고:* v9 compat 문법에 따라 `firebase.app().firestore("default")` 또는 해당 인스턴스 가져오는 방식 적용.

### B. 검증 (Verification)
1.  `webPageByEmail` 페이지 새로고침.
2.  `[DEBUG]` 로그에서 `Raw Count`가 0이 아닌 숫자가 나오는지 확인.
3.  성공 시 `Debug` 코드 제거 및 원래 로직 복구.

## 3. 실패 시 대안 (Fallback)
-   만약 SDK Named DB 연결이 실패하거나 불안정할 경우, 앞서 수립한 **REST API 복구 계획 (`reports/260220_1205_RESTMigrationPlan.md`)** 으로 즉시 전환.
