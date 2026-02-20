# Firestore 404 Resolution Report

**Date:** 2026-02-19 17:00
**Topic:** 'Database Not Found' Diagnosis & '(default)' Name Confirmation

## 1. 진단 결과 (Diagnosis)
- **증상:** `checkDatabases()` 실행 시 Test 2 (Direct POST)와 Test 3 (Proxy GET) 모두 **404 Not Found** 응답을 반환했습니다.
- **에러 메시지 상세:**
  > `"message": "The database (default) does not exist for project oopspublic. Please visit https://console.cloud.google.com/datastore/setup?project=oopspublic to add it."`
- **결론:** **Firestore 데이터베이스가 실제로 생성되지 않은 상태**입니다. 네트워크 문제나 권한 문제가 아닙니다.

## 2. 'default' vs '(default)' 이름 논란 (Name Clarification)
사용자 질문: *"이름이 'default'와 '(default)' 차이 때문인가?"*

- **답변:** **아닙니다. `(default)`가 정확한 기술적 명칭(Internal ID)입니다.**
    - Google Cloud Firestore에서 기본 데이터베이스의 리소스 ID는 항상 `(default)`입니다 (괄호 포함).
    - REST API 경로에서도 `/databases/(default)/documents`라고 명시하는 것이 표준입니다.
    - 에러 메시지에서도 명확히 `database (default) does not exist`라고 칭하고 있으므로, 이름 불일치가 아니라 **대상 리소스 부재**가 원인입니다.

## 3. 해결 방법 (Resolution)
데이터베이스 인스턴스를 새로 생성해야 합니다.

1.  **Firebase Console 접속:** [https://console.firebase.google.com/project/oopspublic/firestore](https://console.firebase.google.com/project/oopspublic/firestore)
2.  **데이터베이스 만들기 (Create Database) 버튼 클릭.**
3.  **설정:**
    - **모드:** 프로덕션 모드 (Production Mode) 권장.
    - **위치 (Location):** `nam5 (us-central)` 또는 사용자와 가까운 지역 선택.
4.  **완료 후:** 약 1~2분 뒤 `troubleshoot.html`에서 다시 테스트하면 `SUCCESS`가 뜰 것입니다.
