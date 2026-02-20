# REST API 복구 및 기능 구현 계획 (Revert to REST)

**작성일시:** 2026-02-20 12:05
**작성자:** Antigravity (Senior Firmware Architect)

## 1. 배경 (Background)
-   **문제:** Firestore SDK 도입 후 `[code=not-found] The database (default) does not exist` 에러 지속.
-   **원인:** 해당 Firebase 프로젝트(`oopspublic`)가 **Datastore Mode**로 설정되어 있음.
    -   Datastore Mode는 **Client SDK(Web/Mobile) 접속을 차단**하고 오직 Server SDK/REST API만 허용함.
    -   **근거 (Official Docs):**
        1.  [Firestore Native Mode vs Datastore Mode](https://cloud.google.com/datastore/docs/firestore-or-datastore): *"Datastore mode uses Datastore client libraries... Native mode uses Firestore client libraries (including Web/Mobile SDKs)."*
        2.  [Client Library Support](https://cloud.google.com/datastore/docs/reference/libraries): Web 클라이언트용 SDK는 Native Mode에서만 지원됨.
-   **결정:** SDK 연동이 불가능하므로, **Data Layer를 다시 REST API로 복구**하되, 새로 구현한 **게시판(Board), 검색(Search), 삭제(Delete)** 기능은 유지합니다.

## 2. 변경 계획 (Migration Plan)

### A. 라이브러리 정리 (`index.html`)
-   불필요해진 `firebase-firestore-compat.js` 제거 (Auth SDK는 유지).

### B. 로직 변경 (`script.js`)

| 기능 | 기존 (SDK) | 변경 (REST API) |
| :--- | :--- | :--- |
| **목록 (Load)** | `db...onSnapshot()` (Realtime) | `fetch(runQuery)` (Polling/Manual Refresh) |
| **저장 (Save)** | `db...add()` | `fetch(commit)` (Transaction/Write) |
| **삭제 (Delete)** | `db...doc().delete()` | `fetch(commit)` (delete operation) |

### C. REST API 구현 상세

#### 1. 목록 조회 (`loadBoard`)
-   **Method:** POST `https://firestore.googleapis.com/v1/...:runQuery`
-   **Body:**
    ```json
    {
      "structuredQuery": {
        "from": [{ "collectionId": "web_clipper" }],
        "orderBy": [{ "field": { "fieldPath": "createdAt" }, "direction": "DESCENDING" }],
        "limit": 50
      }
    }
    ```
-   **Note:** `parent` 경로는 `projects/oopspublic/databases/default/documents/users/{uid}`.

#### 2. 삭제 (`deletePost`)
-   **Method:** POST `https://firestore.googleapis.com/v1/...:commit`
-   **Body:**
    ```json
    {
      "writes": [
        { "delete": "projects/oopspublic/databases/default/documents/users/{uid}/web_clipper/{docId}" }
      ]
    }
    ```

## 3. 작업 순서
1.  `script.js` 코드 전면 수정 (SDK 로직 제거 -> REST 로직 삽입).
2.  `index.html` 스크립트 태그 정리.
3.  기능 검증 (Save -> Load -> Search -> Delete).
