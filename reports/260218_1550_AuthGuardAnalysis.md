# 분석 보고서: 메인 페이지 접근 제어 (Auth Guard)

**Date:** 2026-02-18 15:50
**Topic:** Landing Page Navigation Guard for Unauthenticated Users

## 1. 개요 (Overview)
사용자는 메인 페이지(`oopsPublic/index.html`)에서 서브 페이지(`generatePassWd`, `webPageByEmail`)로 이동할 때, 로그인이 되어 있지 않은 경우 이동을 차단하고 경고 팝업을 띄우기를 요청함.

## 2. 현상 및 요구사항 분석 (Analysis)
### 현상 (Current Behavior)
- `index.html`의 카드 뷰는 `<a href="...">` 태그로 구현되어 있음.
- 클릭 시 브라우저 기본 동작으로 즉시 해당 URL로 이동함.
- `firebase.auth().currentUser` 상태와 무관하게 접근 가능함.

### 요구사항 (Requirements)
- **전제 조건:** 사용자가 로그인하지 않음 (`firebase.auth().currentUser == null`).
- **트리거:** 서비스 카드를 클릭하여 이동 시도.
- **동작:**
  1. 이동을 차단 (`preventDefault`).
  2. "로그인이 필요합니다" 팝업 표시 (`alert`).
- **예외:** 로그인 상태라면 정상 이동.

## 3. 데이터 흐름 및 안전성 (Data Flow & Safety)
### Data Flow
1. **Source:** `firebase.auth().currentUser` (Firebase SDK 상태).
2. **Event:** 사용자 클릭 (`click` event on `.card`).
3. **Logic:**
   - IF `currentUser` exists -> `return` (Allow navigation).
   - ELSE -> `event.preventDefault()`, `alert()`.
4. **Sink:** 브라우저 네비게이션 동작 제어.

### Concurrency & Edge Cases
- **Initialization Delay:** 페이지 로드 직후 Firebase 초기화 전에는 `currentUser`가 `null`일 수 있음. 이 경우 사용자가 클릭하면 "로그인이 필요합니다"가 뜰 수 있음. 이는 보안상 안전한 방향이므로 허용 가능 (Fail-Safe).
- **Race Condition:** 없음. UI 스레드 내에서 동기적으로 확인.

## 4. 구현 계획 (Implementation Plan)
### 대상 파일: `c:\work\git\oopsPublic\index.html`
- `<script>` 섹션에 이벤트 리스너 추가.
- `document.querySelectorAll('.card')`를 사용하여 모든 네비게이션 카드 선택.
- 각 카드에 `click` 이벤트 리스너 등록.

### 코드 예시 (Draft)
```javascript
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            const user = firebase.auth().currentUser;
            if (!user) {
                e.preventDefault(); // 이동 막기
                alert("로그인이 필요한 서비스입니다.\n우측 상단의 버튼을 눌러 로그인해주세요.");
            }
        });
    });
});
```

## 5. 검증 계획 (Verification Plan)
1. **로그아웃 상태:** `index.html` 접속 -> 카드 클릭 -> 경고창 뜨는지 확인.
2. **로그인 상태:** 구글 로그인 -> 카드 클릭 -> 정상 이동 확인.
