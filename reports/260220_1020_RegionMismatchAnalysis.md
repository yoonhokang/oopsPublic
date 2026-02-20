# 데이터베이스 리전 불일치 분석 보고서 (Critical)

**작성일시:** 2026-02-20 10:20
**작성자:** Antigravity (Senior Firmware Architect)
**관련 문서:** `reports/260219_2135_DatabaseAccessAnalysis.md`

## 1. 개요
사용자가 제공한 Firebase Console 스크린샷 캡처를 분석한 결과, **코드 상의 설정과 실제 데이터베이스의 리전(Location)이 불일치**하는 치명적인 문제가 발견되었습니다. 이것이 지금까지의 접속 오류(403/404)의 근본 원인(Root Cause)으로 판단됩니다.

## 2. 증거 기반 분석 (Evidence)

### 2.1 실제 설정 (스크린샷 판독)
- **Database Name:** `default`
- **Location:** **`nam5`** (United States Multi-region)
    - `nam5`는 북미(North America) 멀티 리전으로, `us-central1` 등을 포함하는 복합 리전입니다.
- **Edition:** Enterprise
- **Mode:** Native

### 2.2 코드 상의 설정 (`js/api-config.js`)
```javascript
// 현재 코드 (Line 28)
firestore: `https://asia-northeast3-firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/default/documents`
```
- **현재 설정:** `asia-northeast3` (Seoul) 엔드포인트를 강제 지정하고 있음.

## 3. 문제점 (Impact)

1.  **경로 불일치 (Routing Error):**
    - 클라이언트는 "서울 서버(`asia-northeast3`)"에 가서 "내 데이터 내놔"라고 요청하고 있습니다.
    - 하지만 실제 데이터는 "미국 서버(`nam5`)"에 있습니다.
    - Google Cloud의 글로벌 라우팅이 일부 처리해주려 시도할 수 있으나, 명시적으로 지역 엔드포인트를 지정(`asia-northeast3-...`)한 경우, 해당 리전에 DB가 없으면 **404 Not Found** 또는 **403 Permission Denied**(잘못된 리전에서의 접근 차단)가 발생합니다.

2.  **이전 분석의 오류 수정:**
    - 이전 보고서(`260219_2135_...`)에서 "보안 규칙(Security Rules)"을 의심했으나, 이는 리전이 올바르다는 잘못된 전제 하의 분석이었습니다.
    - 가장 시급한 문제는 **물리적 주소(Endpoint) 수정**입니다.

## 4. 해결 방안 (Action Plan)

### 4.1 코드 수정 제안
`js/api-config.js`의 엔드포인트를 `nam5` (Global) 대응 주소로 변경해야 합니다.

**변경 전:**
```javascript
firestore: `https://asia-northeast3-firestore.googleapis.com/...`
```

**변경 후:**
```javascript
// nam5 (United States)는 글로벌 엔드포인트를 사용합니다.
firestore: `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/default/documents`
```

---
**승인 요청:**
위 분석에 따라 `js/api-config.js` 파일을 즉시 수정하고, `troubleshoot.html`을 통해 재검증해도 되겠습니까?
(추가적으로, 저는 AI 모델 업그레이드 권한이 없으므로 현재 버전에서 최선을 다해 지원하겠습니다.)
