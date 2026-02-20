# Web Page Clipper 게시판 기능 확장 분석 보고서

**작성일시:** 2026-02-20 11:15
**작성자:** Antigravity (Senior Firmware Architect)

## 1. 개요
사용자로부터 `webPageByEmail` 도구의 저장 기능을 **게시판(Board) 형태**로 확장하고, **검색** 및 **삭제** 기능을 추가해달라는 요청을 받았습니다. 이에 대한 현황 분석 및 구현 계획을 수립합니다.

## 2. 요구사항 분석

### A. 게시판 형태 변형 (UI)
- **현황:** 단순 `<ul>` 리스트 형태로 제목과 날짜만 표시됨.
- **요구사항:** "게시판 형태"로의 변형. 일반적으로 **번호, 제목, 원본 URL, 작성일, 관리(삭제)** 컬럼을 가진 테이블 또는 카드 그리드 형태가 적합함.
- **제안:** 모바일 반응성을 고려하여 **Card List** 형태를 기본으로 하되, 데스크탑에서는 **Table** 느낌을 주는 구조화된 레이아웃 적용.

### B. 데이터 저장 (Content Storage)
- **현황:** 이미 `title`, `url`, `content`(본문 HTML), `createdAt` 필드를 Firestore에 저장하고 있음.
- **확인:** 요구하신 "제목은 Target URL 제목", "내용에 Target URL과 본문 내용 기록"은 **이미 구현되어 있음**을 확인했습니다.
- **추가 제안:** 저장된 본문 내용(`content`)을 사용자가 확인할 수 있도록 **"미리보기(Preview)"** 기능을 추가하여 데이터 활용도를 높일 것을 제안합니다.

### C. 검색 기능 (Search)
- **제약:** Firestore REST API (`runQuery`)는 단순 키워드 검색(In-fix search, like `%keyword%`)을 네이티브로 지원하지 않음.
- **해결 방안:** 데이터 양이 많지 않으므로(최근 20~50개), **클라이언트 사이드 필터링** 방식을 적용합니다. 데이터를 한 번에 로드한 후 자바스크립트 메모리 상에서 제목/URL을 필터링하여 UX 반응 속도를 높입니다.

### D. 삭제 기능 (Delete)
- **요구사항:** 게시글 삭제 기능.
- **구현:** Firestore REST API의 `DELETE` 메서드를 사용.
- **안전 장치:** 실수로 인한 삭제를 방지하기 위해 `confirm()` 대화상자로 사용자 확인 절차를 추가합니다.

## 3. 구현 상세 계획 (Implementation Plan)

### 3.1. UI 변경 (`webPageByEmail/index.html`)
 기존의 단순 리스트(`postList`) 영역을 다음 구조로 개편합니다.
```html
<div class="board-controls">
    <input type="text" id="searchInput" placeholder="Search saved posts...">
</div>
<div class="board-container">
    <table id="postTable">
        <thead>
            <tr>
                <th>Title</th>
                <th>Source</th>
                <th>Date</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody id="postTableBody">
            <!-- JS Rendered Items -->
        </tbody>
    </table>
</div>
```

### 3.2. 로직 변경 (`webPageByEmail/script.js`)
1.  **State 관리:** 로드된 포스트 데이터를 저장할 전역 변수 `let loadedPosts = [];` 추가.
2.  **Delete 함수:** `async function deletePost(docId)` 구현.
    -   Endpoint: `https://firestore.googleapis.com/v1/projects/.../databases/(default)/documents/users/{uid}/web_clipper/{docId}`
    -   Method: `DELETE`
3.  **Render 함수:** `function renderBoard(posts)` 구현.
    -   검색어 입력 시 `loadedPosts`를 필터링하여 이 함수를 재호출.
4.  **Load 함수 수정:** `loadPosts()`에서 데이터를 가져온 후 `loadedPosts` 변수에 저장하고 `renderBoard()` 호출.

## 4. 예상 위험 및 대응 (Risk Handling)
-   **Concurrency:** 삭제 버튼 연타 시 중복 요청 발생 가능 -> 버튼 비활성화(Loading State) 처리.
-   **Data Consistency:** 삭제 후 목록 자동 새로고침 수행.

## 5. 승인 요청
위 분석 내용대로 구현을 진행해도 되겠습니까? 특히 **검색 기능을 클라이언트 사이드 필터링으로 구현**하는 방향에 동의하시는지 확인 부탁드립니다.
