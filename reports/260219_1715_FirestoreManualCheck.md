# Firestore REST API vs Current Implementation Review

**Date:** 2026-02-19 17:15
**Topic:** Official Manual Review & Discrepancy Analysis

## 1. Official Documentation (Standard Behavior)
Google Cloud Firestore의 공식 REST API 문서에 따르면, 기본 데이터베이스의 접근 경로는 다음과 같습니다.

### 1.1. Endpoint Structure
```
https://firestore.googleapis.com/v1/projects/{projectId}/databases/{databaseId}/documents
```

### 1.2. Default Database ID
- **Internal ID:** `(default)` (괄호 포함)
- **Official URL:** `projects/{projectId}/databases/(default)/documents`
- **Reference:** [Firestore REST API Reference](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/list)

### 1.3. Authentication
- **Method:** `Bearer <Firebase_ID_Token>`
- **User:** Firebase Authentication User (Authenticated via SDK)

## 2. Current Implementation Review (`js/api-config.js`)
현재 구현된 코드는 공식 문서를 완벽하게 준수하고 있습니다.

```javascript
firestore: `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`
```
- **Project ID:** `oopspublic` (Confirmed via Consle)
- **Database ID:** `(default)` (Standard)

## 3. Discrepancy Analysis (Why 404?)
콘솔에는 `default`가 존재하지만 API는 `404 Not Found`를 반환하는 보기 드문 현상입니다.
가능한 시나리오는 다음과 같습니다.

### 3.1. Hypothesis A: Database ID Ambiguity
- 스크린샷의 드롭다운 리스트에 `Enterprise`와 `default`가 보입니다.
- 만약 사용자가 실수로 **이름이 "default"인 명명된 데이터베이스(Named Database)**를 생성했다면, 이의 ID는 `(default)`가 아니라 `default`일 수 있습니다.
- **Action:** `.../databases/default/documents` (괄호 없이) 테스트 필요.

### 3.2. Hypothesis B: Enterprise Database
- 드롭다운에 있는 `Enterprise`가 메인 데이터베이스일 가능성도 배제할 수 없습니다.
- **Action:** `.../databases/Enterpise/documents` 테스트 필요.

### 3.3. Hypothesis C: API Activation Delay
- 데이터베이스가 방금 생성되었다면, REST API 전파에 시간이 걸릴 수 있습니다 (보통 수 초 내 완료되지만, 드물게 지연됨).

## 4. Next Steps (Action Plan)
`troubleshoot.html` 도구를 업데이트하여 다음 3가지 경로를 모두 테스트합니다.

1.  **Standard:** `(default)`
2.  **Literal:** `default` (괄호 없음)
3.  **Alternative:** `Enterprise` (스크린샷 기반 추정)

이 테스트를 통해 실제 활성화된 데이터베이스의 정확한 ID를 찾아낼 것입니다.
