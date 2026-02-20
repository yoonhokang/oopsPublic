# Firestore 401 Error & Troubleshooting Strategy Analysis

**Date:** 2026-02-19 16:55
**Topic:** Troubleshooting Tool 401 UNAUTHENTICATED Error Analysis

## 1. 문제 상황 (Problem)
- **현상:** 사용자가 `troubleshoot.html`을 실행했을 때, `Check Databases` 버튼 클릭 시 `401 UNAUTHENTICATED` 에러 발생.
- **에러 메시지:** `Request had invalid authentication credentials. Expected OAuth 2 access token...`
- **현재 인증 상태:** Firebase Authentication을 통해 `kangyoonho@gmail.com`으로 정상 로그인됨 (UID 확인됨).

## 2. 원인 분석 (Root Cause Analysis)
### 2.1. API 엔드포인트의 성격 차이
- **사용된 엔드포인트:** `GET https://firestore.googleapis.com/v1/projects/{projectId}/databases`
    - 이는 Google Cloud Resource Manager 레벨의 **관리자(Admin) API**입니다.
    - 이 API는 프로젝트 내의 데이터베이스 목록을 조회하므로, `Cloud Datastore Viewer` 등의 IAM 권한과 **Google OAuth 2.0 Access Token**이 필요합니다.
- **제공된 토큰:** `user.getIdToken()`
    - 이는 **Firebase ID Token (JWT)**입니다.
    - 이 토큰은 Firestore의 **데이터(Data) API** (문서 읽기/쓰기) 접근용이며, 관리자 API 호출 권한은 포함되지 않습니다.

### 2.2. 결론
- **Firebase ID Token으로는 `databases` 목록을 조회하는 관리자 API를 호출할 수 없습니다.**
- 따라서 401 에러는 토큰 타입 불일치로 인한 정상적인 동작이며, 이것이 "DB가 없다"는 것을 의미하지는 않습니다.

## 3. 해결 방안 (Correction Plan)
`troubleshoot.html`의 목적은 "DB가 존재하는지(404가 안 뜨는지)" 확인하는 것입니다. 
관리자 권한 없이도 **데이터 API**를 찔러보면 이를 확인할 수 있습니다.

### 3.1. 수정된 테스트 전략
관리자 API(`LIST Databases`) 대신, 실제 앱이 사용하는 **데이터 API**를 테스트합니다.

**Test 1: 기본 데이터베이스 루트 접근**
- **URL:** `GET https://firestore.googleapis.com/v1/projects/{projectId}/databases/(default)/documents`
- **예상 결과:**
    - **200 OK:** DB 존재함, 루트 컬렉션 목록 리턴.
    - **403 PERMISSION DENIED:** DB 존재함, 보안 규칙에 의해 막힘 (이 경우 DB는 있는 것임).
    - **404 NOT FOUND:** **DB가 실제로 없음** (우리가 찾는 범인).

**Test 2: 실제 사용 중인 `runQuery` 테스트**
- **URL:** `POST .../databases/(default)/documents:runQuery`
- **Body:** `{ structuredQuery: { from: [{ collectionId: "web_clipper" }] } }`
- **목적:** 실제 앱 동작과 동일한 호출을 수행하여 에러 재현.

## 4. 실행 계획 (Action Items)
1. `troubleshoot.html` 코드를 전면 수정하여 Data API 테스트로 변경.
2. 사용자에게 다시 테스트 요청.
