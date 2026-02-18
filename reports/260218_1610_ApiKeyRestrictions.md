# 분석 보고서: Google Cloud API Key 제한 설정 확인

**Date:** 2026-02-18 16:10
**Topic:** Network Error on Localhost (API Key Restrictions)

## 1. 개요 (Overview)
Firebase 콘솔에서 `localhost`를 승인된 도메인으로 추가했음에도 불구하고 "Network Error"가 지속됨.
이는 **Google Cloud Console**의 **API Key 제한(Restrictions)** 때문일 가능성이 매우 높음.

## 2. 원인 분석 (Root Cause)
- **Firebase Authorized Domains:** "OAUTH 리다이렉트"를 허용할 도메인을 관리함.
- **Google Cloud API Key Restrictions:** 해당 "API Key 문자열" 자체를 사용할 수 있는 웹 사이트(Referrer)를 제한함.
- **증상:** Firebase 설정이 완벽해도, API Key 자체가 `localhost`에서의 호출을 차단하면 "Network Error" 또는 "403 Forbidden"이 발생함.

## 3. 해결 방안 (Solution)
Google Cloud Console에서 API Key 설정을 확인하고 `localhost`를 추가해야 함.

### 단계별 가이드
1.  **Google Cloud Console 접속:** `https://console.cloud.google.com/apis/credentials`
    - Firebase 프로젝트(`oopspublic`)가 선택되어 있는지 확인.
2.  **API Key 선택:**
    - 목록에서 `Browser key` (또는 `Auto created by Firebase` 등 사용 중인 키)를 클릭.
    - 파일(`js/firebase-config.js`)에 있는 키 `AIzaSy...`와 일치하는지 확인.
3.  **Application restrictions (애플리케이션 제한) 확인:**
    - **None (제한 없음):** 문제 없음. (다른 원인일 가능성)
    - **HTTP referrers (Web sites):** **여기가 문제일 가능성 99%.**
4.  **localhost 추가:**
    - `Website restrictions` 목록에 다음 두 항목을 추가:
        - `http://localhost:8080/*`
        - `http://127.0.0.1:8080/*`
5.  **Save (저장)** 후 5분 대기.

## 4. 추가 팁
- 브라우저의 "캐시 비우기 및 강력 새로고침" (Ctrl + Shift + R) 시도.
- 시크릿 모드에서 실행 시도 (확장 프로그램 간섭 배제).
