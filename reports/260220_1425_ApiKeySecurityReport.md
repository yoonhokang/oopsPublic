# Google Cloud API Key 노출 경고 대응 보고서

**수신:** User
**일시:** 2026-02-20
**주제:** GitHub에 노출된 Firebase API Key (`AIza...`) 보안 조치 가이드

---

## 1. 상황 분석 (Situation Analysis)

Google Cloud Platform(GCP)으로부터 `js/api-config.js` 파일에 포함된 API 키가 GitHub 퍼블릭 리포지토리에 노출되었다는 경고 메일을 받으셨습니다.

### 팩트 체크 (Fact Check)
*   **노출된 키:** Firebase API Key (`apiKey`)
*   **프로젝트 성격:** 클라이언트 사이드 웹 애플리케이션 (HTML/JS)
*   **핵심:** Firebase와 같은 BaaS(Backend-as-a-Service) 구조에서 **API 키는 클라이언트(브라우저)에 노출되는 것이 정상**이며, 필연적입니다. 브라우저가 Firebase 랑 통신하려면 이 키가 필요하기 때문입니다.

따라서, 이 키를 "숨기는 것"은 불가능하며, **"제한(Restrict)하는 것"**이 올바른 조치입니다.

---

## 2. 권장 조치 사항 (Action Items)

Google의 경고 메일에서도 언급되었듯, *"If this key is intended to be public"* (키가 공개될 수밖에 없는 경우)에 해당하는 조치를 취해야 합니다.

### 단계 1: Google Cloud Console 접속
1.  [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials) 페이지로 이동합니다.
2.  경고 메일에 명시된 프로젝트(`oopsPublic`)를 선택합니다.
3.  노출된 API Key (`AIza...`)를 찾아 클릭하여 **수정(Edit)** 화면으로 들어갑니다.

### 단계 2: 애플리케이션 제한 설정 (Application Restrictions)
이 키가 **특정 웹사이트에서만** 사용되도록 제한해야 합니다.

*   **Set an application restriction:** `Web sites` (웹사이트) 선택.
*   **Website restrictions:**
    *   **ADD:** `https://oopspublic.firebaseapp.com/*` (Firebase 호스팅 도메인)
    *   **ADD:** `https://oopspublic.web.app/*` (또 다른 Firebase 도메인)
    *   **ADD:** `http://localhost:*` (로컬 개발용, 필요시)
    *   **ADD:** `https://yoonhokang.github.io/*` (GitHub Pages를 사용 중이라면)

> **중요:** 위 도메인 목록에 *실제로 서비스를 운영하는 도메인*만 등록되어 있어야 합니다. 해커가 이 키를 훔쳐가도, 등록되지 않은 도메인에서는 요청이 차단됩니다.

### 단계 3: API 제한 설정 (API Restrictions)
이 키로 **사용 가능한 API**만 딱 지정해야 합니다.

*   **API restrictions:** `Restrict key` (키 제한) 선택.
*   **Select APIs:** 다음 API들만 체크합니다 (현재 프로젝트 사용 기준).
    *   **Firebase Authentication API** (로그인용)
    *   **Identity Toolkit API** (로그인용)
    *   **Cloud Firestore API** (데이터베이스용)
    *   **Token Service API** (필요시)

> **확인:** 만약 `Maps API`나 결제 관련 API 등 사용하지 않는 API가 체크되어 있다면 **반드시 해제**하세요.

---

## 3. 요약 및 결론

1.  **당황할 필요 없음:** 웹앱 특성상 키 노출은 흔한 일이며, Google도 이를 인지하고 "경고"를 보내는 것입니다.
2.  **키 재생성 불필요:** 이미 해킹 피해가 발생한 게 아니라면, **제한(Restriction)** 설정만으로 충분히 안전해집니다. (키를 바꾸면 코드도 수정하고 재배포해야 해서 번거롭습니다.)
3.  **조치 완료:** 위 2번 항목(도메인 제한, API 제한)을 설정하고 저장하면 더 이상 조치할 것은 없습니다.

이 설정이 완료되었는지 확인해 주시기 바랍니다.
