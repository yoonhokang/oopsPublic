# Auth Configuration & Token Validity Analysis

**Date:** 2026-02-19 17:35
**Topic:** 403 Permission Denied with Relaxed Rules

## 1. 문제 상황 (Situation)
- **증상:** `saveToBoard` 실행 시 `403 Permission Denied` 발생.
- **특이사항:** 보안 룰을 `allow write: if request.auth != null;`로 완화했음에도 실패함.
- **의미:** 이는 **"로그인 되지 않음"** 또는 **"잘못된 프로젝트의 토큰"**으로 인식되고 있음을 의미합니다. Firestore가 보기에 `request.auth`가 `null`이거나 유효하지 않은 것입니다.

## 2. 원인 분석 (Root Cause Analysis)

### 2.1. API Key & Project Mismatch (가장 유력)
Firebase Auth가 발급한 토큰(ID Token)은 특정 **Project ID**를 타겟(`aud` claim)으로 합니다.
만약 `api-config.js`의 설정이 꼬여있다면 다음 시나리오가 가능합니다.
- **Login:** Project A의 apiKey로 로그인 -> Project A의 토큰 발급.
- **Firestore:** Project B(또는 Project A의 다른 리전)의 DB로 요청.
- **Result:** Firestore는 "이 토큰은 내 프로젝트(audience)를 위한 것이 아니다"라고 판단하여 거부 (403).

### 2.2. API Key Restrictions
구글 클라우드 콘솔(GCP Console)에서 API Key에 제한을 걸어둔 경우입니다.
- **API 제한:** 해당 API Key가 `Identity Toolkit API` (로그인)만 허용하고 `Firestore API`를 허용하지 않는다면 403이 발생할 수 있습니다.
- **Referrer 제한:** `localhost`나 배포 도메인이 허용 목록에 없을 경우.

## 3. Manual vs Implementation Comparison

### Standard Implementation
```javascript
const firebaseConfig = {
    apiKey: "AIza...",       // Browser Key (Public)
    authDomain: "proj.firebaseapp.com",
    projectId: "proj-id",    // MUST match the Firestore Project
    // ...
};
```

### Current Implementation (`js/api-config.js`)
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyBUsYDzUINP3NDVi1BW4GYYr0T_NigJDOg",
    projectId: "oopspublic", // Target Project
    // ...
};
```
- **검토:** 코드는 정상이나, **실제 이 API Key가 `oopspublic` 프로젝트의 키가 맞는지**는 코드로 확인할 수 없습니다 (콘솔 확인 필요).

## 4. 해결 전략 (Action Plan)
**"토큰 까보기 (Token Inspection)"** 가 필요합니다.
로그인한 유저의 ID Token을 디코딩하여 다음을 확인해야 합니다.
1.  **`aud` (Audience):** 이 값이 `oopspublic`과 정확히 일치하는가?
2.  **`iss` (Issuer):** `https://securetoken.google.com/oopspublic` 형식이 맞는가?

이 정보가 일치하지 않는다면, `api-config.js`의 API Key가 다른 프로젝트의 것이거나 설정 오류입니다.
