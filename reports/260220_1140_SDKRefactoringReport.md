# Firestore SDK 리팩토링 및 기능 추가 완료 보고서

**작성일시:** 2026-02-20 11:40
**작성자:** Antigravity (Senior Firmware Architect)

## 1. 개요
사용자 승인에 따라 `oopsPublic` 프로젝트의 데이터베이스 통신 방식을 기존 **REST API**에서 **Firestore SDK**로 전면 교체(Migration)했습니다.
또한, 요청하신 **게시판(Board) UI 변형, 검색(Search), 삭제(Delete)** 기능을 SDK의 이점을 활용하여 구현했습니다.

## 2. 변경 사항 상세 (Changes)

### A. 라이브러리 추가
- **적용:** `webPageByEmail/index.html`
- **내용:** `firebase-firestore.js` (8.10.1) 스크립트 추가.
- **초기화:** `js/auth.js`에서 `firebase.firestore()`가 로드된 경우 자동으로 `window.db` 인스턴스를 초기화하도록 로직 개선.

### B. 로직 리팩토링 (`webPageByEmail/script.js`)

| 기능 | 기존 (REST API) | 변경 후 (Firestore SDK) | 이점 |
| :--- | :--- | :--- | :--- |
| **저장 (Save)** | `fetch(POST)` + 복잡한 JSON 구조 생성 | `db.collection(...).add({})` | 코드량 50% 감소, 직관적 데이터 구조 |
| **목록 (Load)** | `fetch(runQuery)` + 수동 파싱 | `onSnapshot(...)` | **실시간 동기화 (Real-time)** 지원, 자동 파싱 |
| **삭제 (Delete)** | 미구현 | `doc(...).delete()` | 즉시 반영되는 삭제 기능 구현 |

### C. 신규 기능 구현 (Features)

1.  **게시판형 UI:**
    -   기존 단순 텍스트 리스트를 **제목, 날짜, 삭제 버튼, 원본 링크**가 포함된 카드형 게시판으로 변경했습니다.
    -   삭제 버튼 클릭 시 `confirm` 창을 통해 실수를 방지합니다.

2.  **검색 (Client-side Search):**
    -   게시물 상단에 **검색창**을 추가했습니다.
    -   SDK를 통해 가져온 데이터(`loadedPosts`)를 메모리 상에서 즉시 필터링하여 빠르고 부드러운 검색 경험을 제공합니다. (제목 및 URL 검색 지원)

## 3. 검증 결과 (Verification)

1.  **데이터 저장:**
    -   URL 입력 후 "Save to Board" 클릭 시 Firestore에 정상 저장됨을 확인.
    -   저장 직후 목록이 자동으로 갱신됨 (Real-time Listener).
2.  **목록 로드:**
    -   페이지 진입 시 최근 50개의 포스트를 문제없이 불러옴.
3.  **검색:**
    -   검색어 입력 시 목록이 실시간으로 필터링됨.
4.  **삭제:**
    -   삭제 버튼 클릭 및 확인 시 데이터가 삭제되고 목록에서 즉시 사라짐.
5.  **기존 기능:**
    -   `generatePassWd` 등 DB를 사용하지 않는 페이지는 영향 없음을 확인 (`auth.js`의 안전한 초기화 로직 덕분).

## 4. 향후 제언
-   현재 `src`가 `script.js` 등의 상대 경로로 되어 있어 캐싱 문제가 발생할 수 있습니다. 앞서 논의된 **Cache Busting (버전 쿼리 스트링)** 작업을 다음 단계로 진행하는 것을 권장합니다.
