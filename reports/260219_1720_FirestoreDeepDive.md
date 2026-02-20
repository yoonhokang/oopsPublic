# Firestore 404 Deep Dive Analysis: Region & Mode

**Date:** 2026-02-19 17:20
**Topic:** 'Database Not Found' Persistence Analysis

## 1. 현재 상황 요약 (Situation)
- **Project ID:** `oopspublic` (확인됨)
- **Auth:** 정상 (UID 획득)
- **Database:** Firebase Console에 `default` 존재함 (확인됨)
- **Error:** REST API 호출 시 `(default)`와 `default` 모두 **404 Not Found**.

## 2. 유력한 원인 가설 (Hypothesis)

### 2.1. 가설 A: 리전(Region) 불일치 (가장 유력)
- **설명:** Firestore는 생성 시 리전을 선택합니다. (예: `us-central1`, `asia-northeast3` 등).
- **문제:** 기본 REST Endpoint (`firestore.googleapis.com`)는 주로 `nam5`, `us-central1` 등을 기본으로 처리합니다.
- **한국 사용자 특성:** 만약 DB를 **서울(asia-northeast3)** 리전에 생성했다면, 글로벌 엔드포인트가 해당 정보를 찾지 못하거나 라우팅하지 못하는 경우가 있습니다 (특히 2024년 이후 생성된 프로젝트에서 종종 발생).
- **해결책:** 리전별 엔드포인트를 명시해야 할 수 있습니다.

### 2.2. 가설 B: Datastore 모드
- **설명:** Firestore는 'Native Mode'와 'Datastore Mode' 두 가지가 있습니다.
- **문제:** 콘솔 스크린샷에 `Cloud Firestore`라고 적혀있으므로 Native Mode일 확률이 높지만, 만약 Datastore 모드라면 API 동작이 다를 수 있습니다.
- **확인:** `(default)` 접근 시 404가 뜬다는 건 Native Mode API(`documents`)를 찾지 못한다는 뜻일 수 있습니다.

## 3. 검증 계획 (Verification Plan)
`troubleshoot.html`을 업데이트하여 **다른 리전 엔드포인트**를 찔러봅니다.

**테스트할 리전:**
1.  **Global:** `firestore.googleapis.com` (현재 실패 중)
2.  **Seoul:** `asia-northeast3-firestore.googleapis.com`
3.  **Tokyo:** `asia-northeast1-firestore.googleapis.com`

만약 특정 리전 엔드포인트에서 응답이 온다면, `api-config.js`의 `endpoints.firestore` URL을 해당 리전 전용으로 교체해야 합니다.
