# Final Diagnosis: API Key Restriction (403)

**Date:** 2026-02-19 18:00
**Topic:** 403 Forbidden with Valid Token & Open Rules

## 1. 진단 요약 (Executive Summary)
모든 소프트웨어적 설정은 **정상**입니다.
- **Token:** `oopspublic` 프로젝트용으로 정확히 발급됨.
- **Rules:** `allow read, write: if request.auth != null` (완벽히 개방됨).
- **Endpoint:** `Seoul` / `default` (정확한 주소 찾음).

그럼에도 `403 Permission Denied`가 발생하는 이유는 **"하드웨어(인프라) 레벨의 차단"**입니다.
가장 유력한 범인은 **Google Cloud Console의 API Key 설정**입니다.

## 2. 해결 방법 (Step-by-Step Fix)
이 문제는 코드가 아니라 **Google Cloud Console** 웹사이트에서 설정을 변경해야 해결됩니다.

### Step 1: Google Cloud Console 접속
1.  [https://console.cloud.google.com/apis/credentials?project=oopspublic](https://console.cloud.google.com/apis/credentials?project=oopspublic) 에 접속합니다.
2.  `oopspublic` 프로젝트가 선택되어 있는지 확인합니다.

### Step 2: API Key 설정 확인
1.  **"API Keys"** 목록에서 현재 사용 중인 Key(`AIzaSyBUsY...`)를 클릭합니다. (보통 식별하기 쉽게 이름이 `Browser key` 등으로 되어 있습니다).
2.  **"API restrictions" (API 제한)** 탭을 봅니다.
    - **"Don't restrict key"** (제한 없음) 상태라면: OK.
    - **"Restrict key"** (키 제한) 상태라면: 목록을 확인하세요.

### Step 3: Firestore API 추가 (중요!)
만약 **"Restrict key"**가 선택되어 있다면, 목록에 **Cloud Firestore API**가 반드시 체크되어 있어야 합니다.
1.  드롭다운 메뉴를 엽니다.
2.  검색창에 `Firestore`를 입력합니다.
3.  **Cloud Firestore API**를 체크합니다.
4.  **Save (저장)** 버튼을 누릅니다.

### Step 4: (선택) App Check 확인
만약 위 설정이 이미 정상이거나 '제한 없음'이라면, **Firebase App Check**가 켜져 있을 수 있습니다.
- [Firebase Console > App Check](https://console.firebase.google.com/project/oopspublic/appcheck) 접속.
- Firestore 항목이 "Enforced"로 되어 있다면, 등록되지 않은 앱(REST API)은 모두 차단됩니다. 이를 잠시 **"Unenforced"**로 변경해보세요.

## 3. 결론
보안 룰 내용(`match ... allow ...`)은 캡처해주신 대로 **완벽**합니다. 문제없습니다.
위의 **API Key 설정**만 확인하면 100% 해결될 것입니다.
