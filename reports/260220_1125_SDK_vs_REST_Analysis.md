# Firestore 구현 방식 비교 분석: SDK vs REST API

**작성일시:** 2026-02-20 11:30
**작성자:** Antigravity (Senior Firmware Architect)
**관련 문서:** `reports/260220_1115_WebBoardFeatureAnalysis.md`

## 1. 개요
현재 `oopsPublic` 프로젝트는 인증(Auth)에는 Firebase SDK를, 데이터베이스(Firestore)에는 REST API를 사용하는 **하이브리드 방식**을 취하고 있습니다.
향후 **게시판(Board), 검색, 삭제** 기능 구현 및 데이터 활용 확장성을 고려할 때, **Firestore SDK로의 완전한 전환**이 현재의 REST API 방식보다 얼마나 효과적인지 분석합니다.

## 2. 비교 분석 (SDK vs REST)

| 비교 항목 | Firestore SDK (제안) | REST API (현황) | 평가 |
| :--- | :--- | :--- | :--- |
| **데이터 구조** | **자동 매핑**<br>(JSON 객체 그대로 사용) | **수동 파싱 필요**<br>(`stringValue`, `integerValue` 등 타입 변환 로직 복잡) | **SDK 우수** |
| **코드 간결성** | **매우 간결**<br>`db.collection(...).add(data)` | **복잡함**<br>`fetch`, `headers(Token)`, `JSON.stringify(structuredQuery)` 등 | **SDK 우수** |
| **실시간성** | **지원 (onSnapshot)**<br>데이터 변경 시 화면 자동 갱신 가능 | **미지원**<br>새로고침 또는 폴링(Polling) 필요 | **SDK 우수** |
| **쿼리(Query)** | **직관적**<br>`.where("date", ">", ...)` | **난해함**<br>복잡한 JSON 구조의 `structuredQuery` 작성 필요 | **SDK 우수** |
| **성능/부하** | 초기 로딩 시 JS 파일 다운로드 필요 (약간의 오버헤드) | 브라우저 내장 `fetch` 사용 (가벼움) | REST 우수 |
| **오프라인** | **지원 (Persistence)**<br>인터넷 끊겨도 조회/저장 가능(캐시) | 미지원 | **SDK 우수** |

## 3. 코드 복잡도 비교

### A. 데이터 저장 (Save)

**REST API (Current):**
```javascript
// 타입별 래핑 필요
const body = {
    fields: {
        title: { stringValue: title },
        createdAt: { timestampValue: new Date().toISOString() }
    }
};
await fetch(url, { method: 'POST', body: ... });
```

**SDK (Proposed):**
```javascript
// 일반 객체 그대로 저장
await db.collection('users').doc(uid).collection('web_clipper').add({
    title: title,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
});
```

### B. 데이터 조회 (Load & Parse)

**REST API (Current):**
```javascript
// 응답 파싱 로직 별도 구현 필요 (parseFirestoreMap 함수 등)
const data = await response.json();
const items = data.map(item => parseFirestoreMap(item.document.fields));
```

**SDK (Proposed):**
```javascript
// 자동 매핑
const snapshot = await db.collection(...).get();
const items = snapshot.docs.map(doc => doc.data());
```

## 4. 게시판 및 검색 기능 구현 시 장점

1.  **데이터 타입 처리:** 게시판 구현 시 날짜, 숫자, 텍스트 등 다양한 데이터 타입을 다루게 되는데, SDK는 이를 자바스크립트 네이티브 타입으로 자동 변환해주므로 **`parseFirestoreNode` 같은 유틸리티 함수 유지보수가 불필요**해집니다.
2.  **검색 및 필터링:** 향후 "날짜 범위 검색"이나 "특정 조건 필터링"이 필요할 때 SDK의 체이닝 메소드(`.where()`, `.orderBy()`)가 훨씬 직관적이고 강력합니다.
3.  **삭제 기능:** `doc(id).delete()` 한 줄로 처리가 가능하여, REST URL을 조립하는 과정에서의 실수를 줄일 수 있습니다.

## 5. 결론 및 제안

**결론:**
게시판 기능(목록, 검색, 관리)을 구현하고 향후 기능을 확장하기에는 **Firestore SDK를 사용하는 것이 개발 생산성, 코드 유지보수성, 기능 확장성 면에서 월등히 유리**합니다.
초기 로딩 속도(SDK 스크립트 로드)가 치명적인 제약 사항이 아니라면, SDK 도입을 강력히 권장합니다.

**제안:**
수정 계획서(`WebBoardFeatureAnalysis.md`)의 구현 단계에 앞서, **Firestore SDK 도입을 통한 데이터 계층 리팩토링**을 선행하는 것을 제안합니다.

1.  CDN에 `firebase-firestore.js` 추가.
2.  `api-config.js` 및 `script.js`의 `fetch` 로직을 SDK 메소드로 대체.
3.  이후 게시판 UI 작업 진행.
