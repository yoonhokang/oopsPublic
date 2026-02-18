Antigravity 프로젝트의 성공적인 구현을 위해, 그동안 논의한 '사용자별 독립 게시판' 구축 절차를 정리한 계획서입니다. 이 내용을 마크다운(.md) 파일로 저장하여 개발 가이드로 활용하시기 바랍니다.

---

# [계획서] Antigravity 사용자별 독립 게시판 구축

## 1. 프로젝트 개요

본 프로젝트는 GitHub Pages의 정적 호스팅 환경에서 Firebase를 활용하여, 각 사용자가 구글 계정으로 로그인했을 때 오직 본인만이 접근할 수 있는 개인화된 데이터 저장 공간(게시판)을 구축하는 것을 목표로 합니다.

## 2. 기술 스택

| 구분 | 기술 | 역할 |
| --- | --- | --- |
| **Frontend** | HTML5, CSS3, JavaScript | UI 구현 및 클라이언트 로직 처리 |
| **Hosting** | GitHub Pages | 정적 웹 페이지 호스팅 |
| **Backend (BaaS)** | Firebase Authentication | 구글 계정 기반 사용자 인증 (UID 발급) |
| **Database** | Firebase Firestore | 사용자별 데이터 저장 (NoSQL) |
| **Security** | Firebase Security Rules | 서버 측 데이터 접근 권한 통제 |

---

## 3. 단계별 작업 절차

### 1단계: Firebase 프로젝트 기반 조성

1. **Firebase 콘솔 접속:** [Firebase Console]()에서 새 프로젝트(`Antigravity`) 생성.
2. **앱 등록:** 웹 앱(</>)을 등록하고 발급된 `firebaseConfig` 객체(API Key 등)를 확보.
3. **서비스 활성화:**
* **Authentication:** 'Google' 로그인을 사용 설정.
* **Firestore Database:** '프로덕션 모드'로 데이터베이스 생성.



### 2단계: 데이터베이스(Firestore) 구조 설계

물리적으로는 하나의 DB를 사용하지만, 사용자 UID를 최상위 경로로 사용하여 논리적으로 데이터를 격리합니다.

* **구조:** `users (Collection) / {사용자_UID} (Document) / posts (Collection) / {포스트_ID} (Document)`
* **저장 데이터:** 제목(title), 내용(content), 작성일시(timestamp) 등.

### 3단계: 서버 측 보안 규칙(Security Rules) 설정

사용자가 코드를 수정하여 타인의 UID로 접근하는 것을 방지하기 위해 Firebase 서버에 규칙을 적용합니다.

```javascript
service cloud.firestore {
  match /databases/{database}/documents {
    // users 컬렉션 하위의 {userId} 폴더에 대한 규칙
    match /users/{userId}/{anyUserFile=**} {
      // 1. 로그인 상태여야 함
      // 2. 요청한 폴더 이름(userId)과 로그인한 사람의 신분증(auth.uid)이 일치해야 함
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}

```

### 4단계: 프론트엔드(JavaScript) 개발

1. **Firebase SDK 로드:** HTML 파일에 Firebase 관련 스크립트 추가.
2. **인증 로직 구현:**
* `GoogleAuthProvider`를 이용한 로그인 기능 구현.
* 로그인 성공 시 `user.uid`를 전역 변수나 상태로 관리.


3. **데이터 입출력(CRUD) 구현:**
* **작성:** `collection(db, "users", currentUser.uid, "posts")` 경로에 문서 추가.
* **조회:** 동일한 경로에서 데이터를 불러와 화면에 렌더링.
* **참고:** 이때 토큰 전달은 SDK가 자동으로 수행함.



### 5단계: 배포 및 테스트

1. **GitHub Push:** 수정된 코드를 `master` 브랜치에 푸시.
2. **GitHub Actions 확인:** 배포 워크플로가 성공적으로 완료되었는지 확인.
3. **교차 테스트:**
* A 계정으로 로그인하여 글 작성.
* B 계정으로 로그인하여 A의 글이 보이지 않는지 확인.
* 개발자 도구에서 UID를 강제로 변경하여 호출 시 403(Permission Denied) 에러가 발생하는지 확인.



---

## 4. 보안 및 주의사항

* **API Key 노출:** GitHub에 API Key가 노출되어도 **3단계의 보안 규칙**이 적용되어 있다면 데이터는 안전함.
* **환경 변수:** 필요한 경우 GitHub Actions의 `Secrets`를 활용하여 민감한 정보를 관리할 수 있음.
* **정기 점검:** 사용자가 늘어날 경우 Firebase 사용량(무료 티어 쿼리 제한 등)을 모니터링함.

---

## 5. 향후 확장 계획

* 이미지 및 파일 업로드를 위한 **Firebase Storage** 연동.
* 실시간 업데이트를 위한 `onSnapshot` 리스너 도입.
* 개인 도메인 연결 및 SEO 최적화.

---

### 💾 다운로드 방법

위의 내용을 복사하여 메모장에 붙여넣은 후, 파일 이름을 **`Antigravity_Plan.md`**로 저장하시면 마크다운 뷰어나 에디터에서 가독성 있게 확인하실 수 있습니다.

이제 이 계획서의 **1단계(Firebase 프로젝트 생성)**를 바로 시작해 보시겠어요? 도움이 필요하시면 언제든 말씀해 주세요.