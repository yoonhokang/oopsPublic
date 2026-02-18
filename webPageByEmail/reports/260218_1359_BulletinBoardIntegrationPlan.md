# [분석 보고서] Web Page to Email - 게시판(DB) 기능 추가 분석 및 계획 (개정판)

**문서 번호:** 260218_1359_BulletinBoardIntegrationPlan_v2.md
**작성 일시:** 2026-02-18 14:10 (수정)
**작성자:** Antigravity (Firmware Architect Agent)

---

## 1. 개요 (Overview)
본 문서는 'Web Page to Email' 도구 및 전체 `oopsPublic` 웹사이트에 **"중앙 집중식 사용자 인증 및 게시판 저장 기능"**을 추가하기 위한 수정된 분석 및 구현 계획입니다.
로그인 진입점을 최상위 페이지로 일원화하고, 각 하위 애플리케이션(페이지)이 인증된 상태에서 독립적으로 데이터베이스를 활용할 수 있도록 설계합니다.

## 2. 변경된 요구사항 분석 (Requirement Changes)
1.  **Centralized Login (중앙 로그인):** Google 로그인은 오직 최상위 페이지(`oopsPublic/index.html`)에서만 수행.
2.  **Access Control (접근 제어):** 하위 페이지(`webPageByEmail` 등) 진입 시 로그인 여부를 검사하고, 미로그인 시 강제로 최상위 페이지로 리다이렉트.
3.  **Data Isolation (데이터 격리):** DB 저장 시 어떤 페이지(앱)에서 생성된 데이터인지 구분 가능해야 함. (장기적 확장을 고려)

## 3. 시스템 아키텍처 설계 (System Architecture)

### 3.1 인증 흐름 (Authentication Flow)
*   **Root Page (`/index.html`):**
    *   Firebase Auth 초기화 및 `Google Sign-In` 버튼 배치.
    *   로그인 성공 시: 사용자 세션 유지 (Firebase SDK 기본 동작).
    *   로그아웃 버튼 제공.
*   **Sub Pages (`/webPageByEmail/index.html` 등):**
    *   페이지 로드 즉시 `onAuthStateChanged` 확인.
    *   **로그인 됨:** 정상 기능 수행.
    *   **로그인 안됨:** `window.location.href = "../index.html"` 로 강제 이동.

### 3.2 데이터베이스 구조 (Firestore Schema)
다양한 앱이 공존할 수 있도록 **User Root** 하위에 **App 별 Sub-collection**을 두는 구조를 채택합니다.

*   **Path:** `users/{uid}/{appId}/{docId}`
    *   `users`: 최상위 컬렉션.
    *   `{uid}`: 사용자 고유 ID.
    *   `{appId}`: 각 앱의 식별자 (예: `web_clipper`, `todo_list`, `news_scrab` 등).
    
*   **Web Page to Email 앱의 경우:**
    *   **Collection:** `users/{uid}/web_clipper` (확정)
    *   **Document:**
        ```javascript
        {
            appId: "web_clipper", // 명시적 구분자 (필수 아님, 컬렉션으로 구분되나 검색 용이성을 위해 추가 권장)
            title: "Web Page Title",
            url: "https://example.com/...",
            content: "<html>...</html>",
            createdAt: serverTimestamp()
        }
        ```

### 3.3 보안 규칙 (Security Rules) Update
앱별 격리를 위해 규칙을 조금 더 유연하게 가져갑니다.

```javascript
match /users/{userId}/{document=**} {
  // 사용자는 자신의 하위 모든 컬렉션/문서에 접근 가능
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## 4. 단계별 구현 계획 (Implementation Steps)

### [STEP 1] Root Page (`oopsPublic/index.html`) 구현
1.  **Firebase SDK 추가:** Module 방식이 아닌 CDN 호환 방식(Compat) 사용 권장 (기존 코드 스타일 유지).
2.  **UI 수정:** Header 영역에 ‘Login with Google’ 버튼 및 프로필 영역 추가.
3.  **Logic:** 로그인/로그아웃 처리.

### [STEP 2] Sub Page (`webPageByEmail/index.html`) 구현
1.  **Auth Guard:** 스크립트 최상단에 인증 체크 로직 추가.
    ```javascript
    auth.onAuthStateChanged(user => {
        if (!user) window.location.replace("../index.html");
        else initApp(user); // 로그인 된 경우에만 앱 초기화
    });
    ```
2.  **UI 변경:** 로그인 관련 UI 제거 (상위 페이지 위임), **[Save to Archive]** 버튼 추가.
3.  **DB Logic:** `savePost` 함수 구현 시 컬렉션 경로를 `users/${uid}/web_clipper` 로 지정.

### [STEP 3] 공통 스크립트 모듈화 (선택 사항)
*   여러 페이지에서 Firebase 설정과 Auth 로직이 중복되므로, `js/firebase-init.js` 와 같은 공통 파일을 만들어 import 하는 방식을 고려할 수 있습니다.
*   (이번 단계에서는 파일 분리 없이 각 파일에 삽입하되, 추후 리팩토링 대상으로 둡니다.)

---

## 5. 승인 요청 (Approval Request)

수정된 계획은 **"입구 컷(Root Login)"** 정책을 통해 하위 페이지들의 인증 구현 부담을 줄이고 보안을 강화합니다. 또한 DB 구조를 **앱 단위 컬렉션**으로 분리하여 확장성을 확보했습니다.

**확인사항:**
1.  `web_clipper`라는 앱 ID(컬렉션 명)를 사용하는 것에 동의하십니까?
2.  미로그인 시 '경고 메시지' 없이 즉시 리다이렉트해도 괜찮으신가요? (UX 측면)

승인해주시면 Root Page부터 수정을 시작하겠습니다.
