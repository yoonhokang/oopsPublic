# 260216_1840_PassGenUpdateAnalysis.md

## 1. 개요 (Overview)
사용자 요청에 따라 `c:\work\git\oopsGit\webApp\generatePassWd\index.html`의 기능을 수정 및 확장하기 위한 분석 보고서입니다.
특수문자 제한, 기본 길이 변경, 그리고 생성된 비밀번호의 이메일 전송 기능을 추가합니다.

## 2. 요구사항 (Requirements)
1.  **특수문자 제한:** `!`, `@`, `#`, `*` 4종류만 사용.
2.  **기본 길이:** 12 -> 8로 변경.
3.  **이메일 송신:**
    -   입력: 비밀번호 사용처 (예: "Google", "Company Portal").
    -   동작: 생성된 비밀번호와 사용처 정보를 포함하여 메일 작성 창(Outlook 등 기본 클라이언트) 호출.

## 3. 상세 설계 (Detailed Design)

### 3.1. 로직 변경 (Logic Changes)
-   **Character Set:**
    -   Existing: `!@#$%^&*()_+-=[]{}|;:,.<>?`
    -   New: `!@#*`
-   **Default Value:** HTML `input` value and JS initial variable set to 8.

### 3.2. 이메일 기능 (Email Feature)
-   **Data Flow:**
    1.  User inputs "Usage" (e.g., "Naver").
    2.  User clicks "Generate".
    3.  User clicks "Send via Email".
    4.  App constructs `mailto:` URL.
        -   Subject: `[Password] ${Usage}`
        -   Body:
            ```text
            Service: ${Usage}
            Password: ${Password}
            Mnemonic: ${MnemonicString}
            ```
    5.  `window.location.href = mailtoLink` triggers the mail client.

### 3.3. 안전성 및 예외 처리 (Safety & Edge Cases)
-   **URL Length:** `mailto` 링크는 브라우저/OS에 따라 길이 제한이 있을 수 있으나, 비밀번호와 Mnemonic 정도의 길이는 문제없음.
-   **Encoding:** URL Parameter(`subject`, `body`)는 반드시 `encodeURIComponent` 처리하여 특수문자 깨짐 방지.
-   **UX:** 사용처(Usage)가 입력되지 않은 경우, "Service Name" 등으로 기본값 처리하거나 입력을 유도.

## 4. 구현 계획 (Implementation Plan)
-   **HTML:**
    -   `<input id="usage">` 추가.
    -   `<button onclick="sendEmail()">` 추가.
    -   `input type="number"`의 `value="8"`, `min="8"`.
-   **JS:**
    -   `CHARS.special` 상수 수정.
    -   `sendEmail()` 함수 구현.

## 5. 결론 (Conclusion)
요구사항을 반영하여 사용자 편의성을 높이고 표준 이메일 클라이언트 연동을 구현하겠습니다.
승인 시 코드를 수정하겠습니다.
