# oopsPublic 프로젝트 종합 평가 보고서

> **작성일**: 2026-02-20 17:24  
> **최종 수정**: 2026-02-20 17:33 (설계 배경 반영 업데이트)  
> **작성 목적**: 프로젝트 성격 파악, 지향 가이드라인 수립, 평가 기준 도출 및 평가 수행  
> **분석 범위**: 전체 코드베이스 (`index.html`, `js/`, `css/`, `generatePassWd/`, `webPageByEmail/`, `firestore.rules`)  
> **참고 문서**: `reports/260220_1500_CodeStudyGuide.md` (프로젝트 설계 배경 및 학습 가이드)

---

## 1. 프로젝트 성격 분석

### 1.1 프로젝트 개요

`oopsPublic`은 **개인 개발자 도구 포털(Personal Developer Toolbox Portal)** 입니다.  
단일 진입점(`index.html`)을 통해 독립적으로 동작하는 여러 웹 유틸리티 도구들을 제공하는 **순수 프론트엔드(Vanilla JS) + Firebase BaaS** 아키텍처입니다.

### 1.2 기술 스택

| 레이어 | 기술 |
|---|---|
| 프론트엔드 | Vanilla HTML5 / CSS3 / JavaScript (ES6+), IIFE 모듈 패턴 |
| 인증 | Firebase Authentication SDK v8 (Google OAuth 2.0 Popup) |
| 데이터베이스 | Google Firestore (REST API 방식) |
| 보안 정책 | Content Security Policy (CSP) Meta Tag |
| 난수 생성 | Web Crypto API (`window.crypto.getRandomValues`) |
| 외부 의존성 | Firebase SDK (CDN), rss2json API, CORS Proxy 서비스 |

### 1.3 제공 기능 (서브모듈)

#### 🔒 generatePassWd - 보안 비밀번호 생성기
- Google News RSS 피드를 기반으로 기억하기 쉬운 니모닉 비밀번호를 생성
- `window.crypto` API 기반 암호학적 난수 생성 (CSPRNG)
- 100% 클라이언트 사이드 실행 (서버 전송 없음)
- RSS 파싱 실패 시 로컬 폴백 단어 풀로 대체

#### 📋 webPageByEmail - 웹 클리퍼 & 이메일 전송
- CORS 프록시를 통해 외부 웹 페이지 HTML을 수집 및 정제
- 정제된 콘텐츠를 Clipboard API로 복사 후 이메일 클라이언트 오픈
- Firestore REST API를 통해 로컬 게시판(Board)에 클리핑 데이터 저장/조회/삭제

### 1.4 아키텍처 패턴

- **모듈 격리**: IIFE(`(function(){ "use strict"; })()`) 패턴으로 전역 스코프 오염 방지
- **하이브리드 Auth**: Firebase SDK(인증) + Firestore REST API(데이터) 조합
- **인증 가드**: `registerAuthListener` 콜백을 통해 비로그인 사용자를 루트로 리다이렉트
- **CSP**: `<meta http-equiv="Content-Security-Policy">` 태그로 허용 출처 명시

> **[설계 배경 — 중요]** Firestore의 **Datastore Mode** 설정으로 인해 Firestore 클라이언트 SDK를 직접 사용할 수 없습니다.
> 이 제약이 다음 두 가지 설계 결정의 직접적 원인입니다:
> 1. **REST API 사용**: Firestore Client SDK 대신 `fetch()`를 이용한 Firestore v1 REST API 호출
> 2. **실시간 리스너 미사용**: `onSnapshot()` 등 SDK 전용 실시간 구독 기능 사용 불가 → 수동 Refresh 버튼 방식 채택
> 
> 따라서 이 두 사항은 **설계 결함이 아닌, 환경 제약에 따른 의도된 설계**입니다. 평가 시 이 맥락을 반드시 고려해야 합니다.

---

## 2. 프로젝트 성격에 따른 개발 지향 사항

Vanilla JS + Firebase BaaS 프론트엔드 유틸리티 포털의 특성상, 다음 기준을 지향해야 합니다.

### 2.1 보안 (Security)

| 항목 | 지향 사항 |
|---|---|
| XSS 방지 | `innerHTML` 사용 시 반드시 데이터를 이스케이프 처리하거나, DOM API(`textContent`, `createElement`)를 사용 |
| CSP 강화 | `'unsafe-inline'` 제거, Nonce 또는 Hash 기반 CSP 적용 |
| 시크릿 관리 | API Key를 클라이언트 코드에 노출하는 불가피한 경우, Firebase Security Rules로 보완 |
| 인증 토큰 | ID Token은 메모리에서만 사용하고 `localStorage`/`sessionStorage`에 저장 금지 |
| 디버그 모드 | 운영 환경에서 `debugMode: false` 설정 필수 |
| CORS 프록시 | 신뢰할 수 없는 프록시 서버를 통해 수집된 HTML은 반드시 살균(Sanitize) 처리 |

### 2.2 코드 품질 및 유지보수 (Maintainability)

| 항목 | 지향 사항 |
|---|---|
| Strict Mode | 모든 JS 파일에 `"use strict";` 선언 |
| 전역 노출 최소화 | `window.XXX` 전역 노출은 공개 API에만 한정 |
| 비동기 안전성 | `async/await` + `try/catch` 패턴으로 에러 핸들링 일관화 |
| 설정 중앙화 | URL, API 키, 엔드포인트는 `api-config.js`에 집중 관리 |
| 버전 관리 | CSS/JS 파일에 캐시 버스팅 쿼리 파라미터(`?v=YYMMDD`) 적용 |

### 2.3 성능 및 사용성 (Performance & UX)

| 항목 | 지향 사항 |
|---|---|
| 로딩 순서 | 의존 스크립트 로드 순서 보장 (`api-config → debug-monitor → auth → app`) |
| 에러 복구 | API 실패 시 폴백(Fallback) 로직 제공 (현재 generatePassWd에 구현됨) |
| 로딩 상태 | 비동기 작업 중 UI 비활성화 및 스피너 표시 |
| 반응형 | `@media` 쿼리를 통한 모바일 지원 |

### 2.4 Firebase 보안 규칙 (Firestore Rules)

| 항목 | 지향 사항 |
|---|---|
| Default Deny | 모든 경로 기본 차단 후 필요한 경로만 허용 |
| 소유자 격리 | `request.auth.uid == userId` 검증으로 본인 데이터만 접근 |
| 입력 값 검증 | `request.resource.data`를 이용한 필드 타입/길이 제한 규칙 추가 필요 |
| 규칙 테스트 | Firebase Emulator Suite를 통한 규칙 단위 테스트 권장 |

---

## 3. 평가 기준

위 지향 사항을 바탕으로 5개 영역, 총 100점 만점의 평가 기준을 수립합니다.

| ID | 평가 영역 | 배점 | 세부 항목 |
|---|---|---|---|
| **SEC** | 보안 | 30점 | XSS 방지(10), CSP 강도(5), 시크릿 관리(5), debugMode 운영 통제(5), 인증 처리(5) |
| **MAINT** | 유지보수성 | 25점 | "use strict"(5), 전역 최소화(5), 비동기 패턴(5), 설정 중앙화(5), 버전 관리(5) |
| **ARCH** | 아키텍처 | 20점 | 모듈 격리(5), 인증 가드(5), CSP 적용(5), 공유 컴포넌트 재사용(5) |
| **DB** | 데이터 안전성 | 15점 | Firestore 규칙 Default Deny(5), 소유자 격리(5), 입력값 검증 규칙(5) |
| **UX** | 사용성 및 안정성 | 10점 | 에러 폴백(3), 로딩 상태(3), 반응형 지원(4) |

---

## 4. 프로젝트 평가

### 4.1 종합 점수

> **[업데이트 노트]** `260220_1500_CodeStudyGuide.md` 참고 결과, Firestore Datastore Mode 제약에 따른 설계 결정이 반영되어 일부 항목의 점수가 조정되었습니다.

| 영역 | 배점 | 이전 점수 | 최종 점수 | 비율 | 조정 사유 |
|---|---|---|---|---|---|
| 보안 (SEC) | 30 | 14 | 14 | 47% | 동일 |
| 유지보수성 (MAINT) | 25 | 20 | 20 | 80% | 동일 |
| 아키텍처 (ARCH) | 20 | 17 | 20 | 100% | SDK 구버전 감점 철회 (Datastore Mode 제약) |
| 데이터 안전성 (DB) | 15 | 10 | 10 | 67% | 동일 |
| 사용성 및 안정성 (UX) | 10 | 8 | 9 | 90% | 폴링 방식 감점 철회 (실시간 SDK 사용 불가 제약) |
| **총점** | **100** | **69** | **73** | **73%** | |

### 4.2 영역별 상세 평가

---

#### ✅ SEC - 보안 (14/30점)

**잘된 점 (획득 점수)**
- ✅ **CSP 정책 적용** (부분): 각 HTML 파일에 `Content-Security-Policy` meta 태그 존재 (+2)
- ✅ **인증 처리**: Firebase SDK 기반 Google OAuth, ID Token을 Bearer로 REST API 전달 (+5)
- ✅ **암호화 난수**: `window.crypto.getRandomValues()` 사용으로 CSPRNG 구현 (+4)
- ✅ **이벤트 핸들러**: `onclick` 인라인 이벤트 대신 `addEventListener` 사용 (+3)

**문제점 (감점 요인)**
- ❌ **XSS 취약점 (고위험)**: `webPageByEmail/script.js` L370에서 `${post.content}` 를 `li.innerHTML`에 직접 삽입.  
  → Firestore에 저장된 `content` 필드에 악성 스크립트가 들어있을 경우, **저장형 XSS(Stored XSS)** 가 발동됩니다. (-10)
- ❌ **debugMode 운영 노출**: `api-config.js` L31에 `debugMode: true` 하드코딩.  
  → 운영 환경에서 내부 로그와 에러 정보가 화면에 노출됩니다. (-3)
- ❌ **CSP `unsafe-inline`**: `script-src` 에 `'unsafe-inline'` 허용으로 인해 CSP 우회 공격 위험 존재 (-3)

---

#### ✅ MAINT - 유지보수성 (20/25점)

**잘된 점**
- ✅ **"use strict"**: `auth.js`, `generatePassWd/script.js`, `webPageByEmail/script.js` 전체 적용 (+5)
- ✅ **설정 중앙화**: API 키, 엔드포인트가 `api-config.js` 한 곳에 집중 (`window.API_CONFIG`) (+5)
- ✅ **비동기 패턴**: `async/await + try/catch` 패턴 일관 적용 (+5)
- ✅ **버전 관리**: `?v=260220_1330` 쿼리 파라미터로 캐시 버스팅 처리 (+5)

**문제점**
- ⚠️ **전역 노출 과다**: `window.generatePassword`, `window.copyToClipboard`, `window.saveToBoard` 등 내부 함수까지 전역 노출  
  → `onclick="generatePassword()"` 방식의 HTML 인라인 이벤트를 제거하면 전역 노출 불필요 (-5)

---

#### ✅ ARCH - 아키텍처 (20/20점)

**잘된 점**
- ✅ **IIFE 모듈 패턴**: 각 스크립트가 IIFE로 격리되어 전역 스코프 오염 방지 (+5)
- ✅ **인증 가드**: `registerAuthListener` 콜백으로 모든 서브페이지 진입 차단 구현 (+5)
- ✅ **공유 컴포넌트**: `auth.js`, `debug-monitor.js`, `api-config.js` 를 공통 레이어로 재사용 (+5)
- ✅ **CSP 적용**: 각 페이지에 개별 CSP 정책 존재 (+3)
- ✅ **환경 제약 대응**: Firestore Datastore Mode 제약 하에서 SDK Auth + REST DB 하이브리드 방식을 설계한 합리적 판단 (+2)

**[설계 배경 반영 — 이전 평가 수정]**
- ~~⚠️ Firebase SDK 구버전 감점~~ → **철회**: Firestore Datastore Mode 환경에서는 Firebase Auth SDK v8 사용이 불가피합니다. v9 Modular SDK로 전환하더라도 Firestore 클라이언트 SDK를 사용할 수 없는 근본 제약은 동일합니다. 감점 사유 없음.

---

#### ✅ DB - 데이터 안전성 (10/15점)

**잘된 점**
- ✅ **Default Deny**: `firestore.rules` L6-8, 루트 레벨 `allow read, write: if false;` 기본 차단 (+5)
- ✅ **소유자 격리**: `request.auth.uid == userId` 조건으로 본인 데이터만 접근 허용 (+5)

**문제점**
- ❌ **입력값 검증 규칙 부재**: `saveToBoard`에서 클라이언트가 임의의 필드 및 크기의 데이터를 Firestore에 저장 가능.  
  Firestore Rules에 `request.resource.data.keys().hasOnly(['appId', 'title', 'url', 'content', 'createdAt'])` 등의 검증 규칙 미정의 (-5)

---

#### ✅ UX - 사용성 및 안정성 (9/10점)

**잘된 점**
- ✅ **에러 폴백**: `generatePassWd`에서 RSS API 실패 시 `FALLBACK_WORDS` 풀로 자동 대체 (+3)
- ✅ **로딩 상태**: `setLoading(true/false)` 함수로 버튼 비활성화 및 스피너 표시 (+3)
- ✅ **반응형**: `@media (max-width: 600px)` 쿼리로 모바일 헤더 레이아웃 조정 (+3)
- ✅ **수동 새로고침 UX 보완**: Datastore Mode 제약으로 실시간 구독 불가 환경에서 'Refresh 버튼'을 직관적으로 제공하여 사용자가 명시적으로 데이터를 갱신할 수 있도록 설계 (+0, 감점 철회)

**[설계 배경 반영 — 이전 평가 수정]**
- ~~⚠️ 폴링(Polling) 방식 감점~~ → **철회**: `webPageByEmail`의 수동 Refresh 방식은 Firestore Datastore Mode로 인해 `onSnapshot()` 등 SDK 실시간 리스너를 사용할 수 없는 **환경 제약**에 따른 불가피한 설계입니다. 감점 사유 없음.

**잔존 개선 과제**
- ⚠️ **`alert()` 남용**: 클립보드 복사, 삭제 확인, 로그인 요구 등 여러 곳에서 `alert()`/`confirm()` 사용.  
  → 브라우저 네이티브 다이얼로그는 UX를 차단하며, 사용자 정의 모달로 대체 권장 (-1)

---

### 4.3 우선순위별 개선 권고사항

#### 🔴 즉시 조치 (Critical)

1. **[XSS] `post.content` innerHTML 삽입 제거**  
   - 위치: `webPageByEmail/script.js` L370  
   - 조치: `DOMPurify` 라이브러리 도입 후 `DOMPurify.sanitize(post.content)` 적용, 또는 `textContent` 사용  
   ```javascript
   // Before (위험)
   ${post.content}  // li.innerHTML 내 직접 삽입
   
   // After (안전)
   contentDiv.innerHTML = DOMPurify.sanitize(post.content);
   ```

2. **[DEBUG] `debugMode: false` 운영 적용**  
   - 위치: `js/api-config.js` L31  
   - 조치: 환경 변수로 분리하거나, 배포 시 `false`로 설정하는 절차 수립

#### 🟡 단기 개선 (High)

3. **[DB] Firestore Rules 입력값 검증 추가**  
   ```javascript
   // firestore.rules에 추가
   allow write: if request.auth != null 
     && request.auth.uid == userId
     && request.resource.data.keys().hasOnly(['appId', 'title', 'url', 'content', 'createdAt'])
     && request.resource.data.content is string
     && request.resource.data.content.size() < 500000; // 500KB 제한
   ```

4. **[CSP] `unsafe-inline` 제거**  
   - `<script>` 블록을 외부 JS 파일로 분리 후 Nonce 기반 CSP 적용

#### 🟢 장기 개선 (Medium)

5. **[UX] `alert()`/`confirm()` → 사용자 정의 모달 대체**  
   - 이미 공통 CSS에 `.modal-overlay`, `.modal-content` 스타일이 준비되어 있음

6. **[MAINT] 전역 window 노출 최소화**  
   - `onclick` 인라인 이벤트를 `addEventListener`로 전환하여 `window.XXX` 전역 함수 노출 제거

> **[제거된 권고사항]**  
> ~~Firebase SDK v9+ Modular 전환~~ → Firestore Datastore Mode 제약으로 인해 SDK 전환의 실익이 제한적이며 기존 Auth SDK v8 유지가 합리적임. 권고사항에서 제외.

---

### 4.4 종합 의견

`oopsPublic`은 **개인 개발자가 실용성을 목적으로** 만든 도구 포털로, 코드 품질과 유지보수성 측면에서 상당히 수준 높은 구조를 보여줍니다. IIFE 모듈 패턴, Strict Mode 적용, 중앙화된 설정 관리, 비동기 패턴의 일관된 사용은 긍정적입니다.

특히 **Firestore Datastore Mode라는 환경 제약** 하에서 Firestore Client SDK 대신 REST API를 직접 사용하는 하이브리드 아키텍처를 선택한 것은 올바른 판단입니다. 이 제약은 실시간 리스너 미사용, Firebase SDK 버전 선택 등 여러 설계 결정의 직접적 원인이며, 이를 결함으로 평가하는 것은 부적절합니다.

그러나 **보안 영역에서 치명적인 XSS 취약점**이 발견되었으며, 이는 개인 도구라 할지라도 반드시 즉시 해결해야 합니다. Firestore에 저장된 콘텐츠를 그대로 `innerHTML`에 삽입하는 패턴은 저장형 XSS의 교과서적 사례입니다.

**전체 등급: B- (73점 / 100점)** *(이전 평가: C+ / 69점)*  
> 환경 제약을 고려한 올바른 아키텍처 설계를 인정하나, 보안 취약점(XSS) 해소가 선행되어야 고품질 프로젝트로 분류 가능합니다.

---

## 5. 평가 참고 자료

| 문서 | 경로 | 역할 |
|---|---|---|
| 코드 학습 가이드 | `reports/260220_1500_CodeStudyGuide.md` | 프로젝트 설계 배경, 핵심 모듈 설명 |
| 본 평가 보고서 | `reports/260220_1724_ProjectEvaluation.md` | 종합 평가 (최종 수정: 260220_1733) |
