# 데이터베이스 접근 권한(403) 원인 분석 보고서

**작성일시:** 2026-02-19 21:35
**작성자:** Antigravity (Senior Firmware Architect)
**관련 문서:** `reports/260219_1900_SessionSummary.md`

## 1. 개요
현재 프로젝트(`oopsPublic`)에서 Firestore 데이터베이스 접근 시 **403 Permission Denied** 오류가 발생하여 데이터 읽기/쓰기가 차단된 상태입니다. 이전 세션에서 지역(Region) 설정 오류(404)는 해결되었으나, 인증 후 권한 부여 단계에서 실패하고 있습니다.

## 2. 시스템 구성 및 데이터 흐름 분석

### 2.1 아키텍처 (Hybrid Mode)
- **Frontend:** Vanilla JS (`js/`)
- **Authentication:** Firebase Auth SDK (Google Sign-In) -> ID Token 발급
- **Database:** Firestore REST API (Direct `fetch` calls)
- **Endpoint:** `asia-northeast3` (Seoul)

### 2.2 데이터 흐름 (Data Flow)
1.  **Source:** `js/auth.js`에서 `user.getIdToken()`을 통해 유효한 JWT(ID Token)을 획득.
2.  **Transmission:** `troubleshoot.html` 및 클라이언트 로직에서 HTTP Header `Authorization: Bearer {TOKEN}`으로 전송.
3.  **Sink (Server):** Firestore REST API Endpoint (`https://asia-northeast3-firestore.googleapis.com/...`)

## 3. 문제 분석 (Deep Analysis)

### 3.1 증상 기반 추적
- **Phase 1 (Infrastructure):** 성공 (200 OK)
    - 의미: API Key가 유효하며, 프로젝트 및 데이터베이스 메타데이터 접근 권한이 있음을 확인.
    - **중요:** 이는 "API Key Application Restrictions"가 `troubleshoot.html`의 실행 환경(corsproxy 등)을 차단하지 않음을 증명함.
- **Phase 2 (Data Access):** 실패 (403 Permission Denied)
    - 요청 URL: `.../databases/default/documents/users/{uid}`
    - 의미: 인증(Authentication)은 성공했으나, **인가(Authorization)** 단계에서 거부됨.

### 3.2 잠재적 원인 검토
1.  **Firestore Security Rules (가장 유력)**
    - 서버 측 규칙이 요청된 경로(`/users/{uid}`)에 대한 읽기/쓰기를 허용하지 않음.
    - 현재 규칙이 `allow read, write: if false;` (기본 잠금) 상태이거나, `request.auth.uid` 조건이 일치하지 않을 가능성.
2.  **IAM 권한 (가능성 낮음)**
    - API Key가 "Cloud Firestore API"를 호출할 수 있지만, 특정 데이터 작업에 대한 IAM 역할이 누락되었을 수 있음. (일반적으로 API Key 방식에서는 드묾)
3.  **Client Code (코드 무결성 확인)**
    - `js/api-config.js`: Endpoint URL이 `asia-northeast3`로 정확히 설정됨.
    - `troubleshoot.html`: Bearer Token을 헤더에 포함하는 로직(`headers: { 'Authorization': ... }`)이 표준을 따르고 있음.
    - **결론:** 클라이언트 코드(`src`)의 논리적 오류는 아님.

## 4. 결론 및 제안

코드 레벨의 버그보다는 **서버(Google Cloud/Firebase Console) 설정 문제**로 판단됩니다. 클라이언트 코드를 수정하는 것은 근본적인 해결책이 아니며, 잘못된 엔드포인트 우회 등을 초래할 수 있어 위험합니다.

### 4.1 권장 조치 절차
1.  **Firebase Console 확인 (사용자 수행 필요):**
    - `Allow read, write: if request.auth != null;` 형태로 규칙을 임시 변경하여 403 오류가 해결되는지 확인.
2.  **문제 해결 검증:**
    - 규칙 변경 후 `troubleshoot.html`의 Phase 2 테스트 재수행.
    - 성공 시, 보안을 강화한 규칙(경로 기반 제어)으로 다시 적용.

### 4.2 코드 수정 여부
- **현재 단계에서 코드 수정 불필요.**
- 만약 서버 설정이 변경 불가능한 제약 사항이라면, 클라이언트에서 접근 경로를 변경(예: `/public_users` 등)해야 할 수 있으나, 이는 차선책임.

---
**승인 요청:**
위 분석에 동의하신다면, 사용자가 Firebase Console 설정을 확인하는 동안 대기하거나, 추가적인 클라이언트 측 디버깅 로그를 심는 작업을 진행하겠습니다.
