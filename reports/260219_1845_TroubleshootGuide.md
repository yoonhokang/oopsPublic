# Troubleshoot Tool Interpretation Guide

**Date:** 2026-02-19 18:45
**Tool:** `troubleshoot.html`

이 가이드는 `Start Full Matrix Scan` 실행 후 출력되는 로그를 해석하는 방법을 설명합니다.

## 1. 핵심 해석 요령 (Quick Guide)

| Phase | 항목 | 상태(Status) | 의미 및 조치 |
| :--- | :--- | :--- | :--- |
| **Token** | `aud (Project ID)` | <span style="color:green">Matches</span> | **정상.** 토큰이 현재 프로젝트(`oopspublic`)용이 맞습니다. |
| **Phase 1** | `Metadata Access` | <span style="color:red">401</span> | **무시 가능.** (ID Token 사용 시 정상) |
| **Phase 1** | `Metadata Access` | <span style="color:red">403</span> | **위험.** API Key가 막혀있을 수 있음. (단, Phase 2가 성공하면 무시 가능) |
| **Phase 1** | `Metadata Access` | <span style="color:green">200</span> | **최고.** API Key가 완벽하게 열려있음. |
| **Phase 2** | `Authenticated Access` | <span style="color:green">200</span> | **성공(Victory)!** 데이터 읽기가 가능합니다. (가장 중요) |
| **Phase 2** | `Authenticated Access` | <span style="color:red">403</span> | **실패.** API Key 또는 보안 규칙(Rules) 문제. |
| **Phase 3** | `Write Doc` | <span style="color:green">SUCCESS</span> | **성공.** 쓰기 권한까지 완벽함. 앱이 정상 작동할 것임. |

---

## 2. 상세 시나리오 분석

### Scenario A: 완벽한 성공 (Ideal)
*   Phase 1: 200 OK
*   Phase 2: 200 OK
*   Phase 3: SUCCESS
*   **해석:** API Key, 보안 규칙, 네트워크 모두 정상입니다. 앱에서 "Save to Board"가 즉시 작동할 것입니다.

### Scenario B: ID Token 제한적 성공 (Common)
*   Phase 1: **401 Unauthorized** (Note: 401 is normal...)
*   Phase 2: **200 OK Success**
*   Phase 3: **SUCCESS**
*   **해석:** **성공입니다!**
    *   Phase 1(Metadata)은 관리자 권한이 필요해서 401이 뜰 수 있지만, 실제 데이터 접근(Phase 2/3)이 성공했으므로 앱 사용에는 문제없습니다.

### Scenario C: 여전히 403 (Blocked)
*   Phase 1: 403 or 401
*   Phase 2: **403 Forbidden**
*   **해석:** 여전히 막혀있습니다.
    1.  **GCP Console > API Key > Application restrictions**가 **None**인지 다시 확인하세요.
    2.  혹시 `corsproxy.io`가 차단되었을 수 있으니, "Application restrictions"를 **None**으로 두는 것이 테스트에 필수적입니다.

## 3. 결론
**Phase 2와 Phase 3에서 `SUCCESS`가 뜨면, Phase 1의 결과와 상관없이 해결된 것입니다.**
바로 앱을 실행해보세요!
