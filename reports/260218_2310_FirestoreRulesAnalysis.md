# Firestore 읽기 권한 실패 원인 분석 보고서

**작성일시:** 2026-02-18 23:10
**작성자:** Antigravity (Assistant)
**주제:** REST API를 통한 읽기 동작 시 발생하는 403 Permission Denied 원인 분석 및 해결 방안

## 1. 개요
현재 `Save to Board` 기능(쓰기)은 정상 동작하나, `My Saved Posts` 목록 조회(읽기) 시 `403 Permission Denied` 오류가 지속 발생하고 있음. 사용자 제공 스크린샷과 로그를 기반으로 원인을 분석함.

## 2. 현상 분석
### 2.1 적용된 규칙 (스크린샷 기반)
사용자가 적용한 규칙은 다음과 같음:
```javascript
service cloud.firestore {
  match /databases/{database}/documents {
    // 규칙 1: 사용자 문서 및 하위 문서 (재귀적 와일드카드)
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 규칙 2: 웹 클리퍼 컬렉션 (최상위 레벨 정의)
    match /web_clipper/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId; // userId 변수 정의 안됨!
    }
  }
}
```

### 2.2 문제점 식별
1.  **규칙 1 (`match /users/{userId}/{document=**}`)의 한계:**
    *   이 규칙은 **단일 문서 조회(Get)**에는 효과적이나, **컬렉션 조회(List)** 시 쿼리 범위와 완벽하게 일치하지 않을 수 있음.
    *   특히 REST API의 `list` 메서드 호출 시, Firestore 보안 규칙은 "이 쿼리가 반환할 **잠재적인 모든 문서**가 사용자에게 허용되는지"를 판단함.
    *   재귀적 와일드카드(`{document=**}`)는 경로 패턴 매칭이 모호할 수 있어, 명시적인 컬렉션 접근 제어보다 우선순위가 낮거나 의도대로 동작하지 않을 위험이 있음.

2.  **규칙 2 (`match /web_clipper/{document=**}`)의 오류:**
    *   이 규칙은 `/web_clipper` 컬렉션이 **데이터베이스 최상위(Root)**에 있을 때만 매칭됨.
    *   현재 데이터 구조는 `/users/{userId}/web_clipper` 형태이므로, 이 규칙은 **절대 매칭되지 않음**.
    *   또한 `userId` 변수가 `match` 구문에서 정의되지 않았으므로, 조건문(`auth.uid == userId`)에서 `userId`를 참조할 수 없음 (문법적 오류 가능성).

## 3. 해결 방안 (명시적 계층 구조 적용)
모호함을 제거하고 확실하게 권한을 부여하기 위해 **"중첩된 계층 구조"**를 사용하여 경로를 명확히 지정해야 함.

### 3.1 제안 규칙 (수정안)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 1단계: users 컬렉션 내부 진입
    match /users/{userId} {
      // 사용자 문서 자체에 대한 권한 (필요 시)
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // 2단계: web_clipper 서브 컬렉션 명시적 지정
      match /web_clipper/{docId} {
        // 해당 서브 컬렉션 내의 모든 문서에 대한 권한
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## 4. 검증 계획
1.  위 수정안을 `firestore_setup.md`에 업데이트.
2.  사용자에게 Firebase Console에서 "규칙 덮어쓰기" 요청.
3.  웹 페이지 새로고침 및 로그 재확인.

## 5. 결론
현재 오류는 **"경로 매칭의 불일치"** 및 **"유효하지 않은 최상위 규칙"** 때문으로 판단됨. 계층 구조를 명확히 반영한 규칙으로 교체하면 해결될 것으로 확신함.
