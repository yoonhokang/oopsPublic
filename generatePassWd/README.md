# Secure Password Generator (News Based)

Google News 기사를 기반으로 강력하고 기억하기 쉬운 암호를 생성하는 웹 애플리케이션입니다.

## 주요 기능 (Features)
-   **News Based Generation:** 실시간 Google News(RSS)에서 기사를 가져와 암호 생성 소스로 사용합니다.
-   **Mnemonic Security:** 기사의 첫 문장 단어들의 **첫 글자(Initials)**를 추출하여, 문장만 기억하면 암호를 쉽게 떠올릴 수 있습니다.
-   **Automatic Expansion:** 암호 길이가 문장보다 길 경우, 자동으로 다음 문장을 연결하여 길이를 맞춥니다.
-   **Security First:**
    -   100% Client-Side 실행 (서버로 데이터 전송 안 함).
    -   `window.crypto` API를 사용한 안전한 난수 생성.
    -   특수문자 강제 포함.

## 사용 방법 (Usage)
1.  이 저장소를 클론하거나 다운로드합니다.
2.  `index.html` 파일을 웹 브라우저로 엽니다.
3.  원하는 암호 길이(기본 12자)를 입력하고 **"Generate Secure Password"** 버튼을 클릭합니다.
4.  생성된 암호와 출처 문장을 확인하고 사용합니다.

## 배포 가이드 (Deployment)
이 프로젝트는 **정적 웹 사이트(Static Web Site)**이므로, 별도의 백엔드 서버 없이 무료로 배포할 수 있습니다.

### GitHub Pages (추천)
GitHub 저장소에 코드를 업로드한 후, 무료 호스팅 기능인 **GitHub Pages**를 이용하세요.

1.  GitHub 저장소 생성 및 코드 업로드.
2.  저장소 **Settings** -> **Pages** 메뉴 이동.
3.  **Source**를 `Deploy from a branch`로 선택.
4.  **Branch**를 `main` (또는 `master`) / `/(root)`로 설정하고 Save.
5.  잠시 후 제공되는 URL(`https://<username>.github.io/<repo-name>/`)로 접속 가능.

**비용:**
-   **Public Repository:** 무료 (Free).
-   **Private Repository:** GitHub Pro/Team 계정 필요 (Free 계정은 Public만 가능).

### 기타 정적 호스팅
Vercel, Netlify, Firebase Hosting 등에서도 무료로 쉽게 배포 가능합니다.

## 라이선스 (License)
MIT License
