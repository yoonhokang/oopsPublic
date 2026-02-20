# Final Test Plan: Firestore Access Verification

**Date:** 2026-02-19 18:40
**Topic:** API Key Unblocking Confirmation

## 1. 전제 조건 (Prerequisites)
- [x] GCP Console에서 API Key 설정을 "API restrictions: None" (또는 "Restrict -> Firestore")으로 변경했습니다.
- [x] "Save" 버튼을 누른 지 1분 이상 지났습니다. (반영 시간 필요)

## 2. 테스트 시나리오 (Test Cases)

`troubleshoot.html` 도구를 열고 **"Start Full Matrix Scan"** 버튼을 눌러보세요.

### Case 1: 완전한 성공 (Best Scenario)
*   **Token Inspection:** `Token matches Project ID. Good.` (초록색)
*   **Phase 1 (Infrastructure):** `Metadata Access: SUCCESS (HTTP 200)`
    *   이것이 성공하면 API Key 문제는 해결된 것입니다.
*   **Phase 2 (Data Access):** `Authenticated Access: SUCCESS (HTTP 200)`
*   **Phase 3 (Write Test):** `Write Doc (POST): SUCCESS`

**→ Action:** 바로 앱(`webPageByEmail/index.html`)으로 돌아가서 "Save to Board"를 시도하세요. 성공할 것입니다.

### Case 2: 부분 실패 (Still 403)
*   **Phase 1 (Metadata):** 여전히 `FAILED (403 or 401)`
    *   **진단:** "API restrictions: Don't restrict key" 설정이 제대로 먹히지 않는 상태입니다.
    *   **Action:** 거꾸로 **"Restrict key"**를 선택하고, **"Cloud Firestore API"**를 명시적으로 체크해서 저장해보세요. (가끔 명시적 허용이 더 확실할 때가 있습니다.)

### Case 3: 앱 실행 (Final Goal)
`troubleshoot.html`에서 성공했다면, 실제 앱을 테스트합니다.
1.  앱 새로고침.
2.  로그인.
3.  URL 입력 후 "Save to Board" 클릭.
4.  Console 로그에 `Saved 1 posts` 또는 `Success`가 뜨면 모든 미션 완료입니다.
