# 분석 보고서: 로컬호스트 로그인 네트워크 오류

**Date:** 2026-02-18 15:56
**Topic:** Firebase Auth Network Error on Localhost

## 1. 개요 (Overview)
사용자가 `run_server.bat`를 통해 `http://localhost:8080`에서 구글 로그인을 시도했으나, "Network Error"가 발생함.
**Error Message:** "Login failed: A network error (such as timeout, interrupted connection or unreachable host) has occurred."

## 2. 원인 분석 (Root Cause Analysis)
이 오류는 Firebase Authentication에서 흔히 발생하는 문제로, 주로 다음 두 가지 원인 중 하나입니다.

1.  **Authorized Domains 미등록 (가장 유력):**
    - Firebase 프로젝트 설정에서 `localhost`가 승인된 도메인 목록에 빠져 있을 가능성이 높음.
    - 기본적으로 생성 시 `localhost`가 포함되지만, 실수로 삭제되었거나 설정이 꼬인 경우 발생함.

2.  **프로젝트 ID 불일치:**
    - `firebase-config.js`의 설정값과 실제 Firebase 콘솔의 프로젝트가 일치하지 않는 경우.

## 3. 해결 방안 (Proposed Solution)
사용자가 직접 Firebase 콘솔에 접속하여 `localhost`를 승인된 도메인으로 추가해야 함.

### 조치 단계
1.  **Firebase Console 접속:** `https://console.firebase.google.com/`
2.  **프로젝트 선택:** `oopspublic` 선택.
3.  **Authentication 메뉴 이동:** 좌측 메뉴에서 Build > Authentication 클릭.
4.  **Settings 탭 이동:** 상단 탭 중 Settings(설정) 클릭.
5.  **Authorized Domains 확인:**
    - `localhost`가 목록에 있는지 확인.
    - 없다면 **Add Domain** 버튼 클릭 -> `localhost` 입력 -> 추가.

## 4. 추가 조치 (Alternative)
만약 콘솔 접근 권한이 없다면, 로컬 테스트용으로 `127.0.0.1`을 사용하는 방법도 시도해볼 수 있으나, 보통 `localhost`와 동일하게 등록이 필요함.

## 5. 결론
사용자에게 Firebase 콘솔 설정을 확인하도록 안내가 필요함.
