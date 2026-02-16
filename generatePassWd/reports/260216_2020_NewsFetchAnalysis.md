# 260216_2020_NewsFetchAnalysis.md

## 1. 개요 (Overview)
사용자 요청에 따라 내부 단어 풀 대신 **Google News**에서 실시간으로 기사를 가져와, 임의의 문장을 추출하여 암호를 생성하는 로직을 분석합니다.

## 2. 기술적 과제 (Technical Challenges)

### 2.1. CORS (Cross-Origin Resource Sharing) 정책
- 웹 브라우저(`index.html`)에서 `https://news.google.com` 또는 RSS 피드로 직접 AJAX 요청을 보내면 **CORS 보안 정책**에 의해 차단됩니다.
- **해결 방안:** 
    - 공개 RSS-to-JSON 변환 API(예: `rss2json.com`)를 프록시로 사용하여 우회합니다.
    - 이 방식은 별도의 백엔드 서버 없이 구현 가능하므로 현재 파일 구조(`index.html` 단독 실행)에 가장 적합합니다.

### 2.2. 데이터 구조 및 파싱
- **Source:** Google News RSS Feed (XML)
- **Extraction Logic:**
    1.  **N번째 기사:** RSS 피드의 `item` 목록에서 임의의 인덱스 `N` 선택.
    2.  **M번째 문장:** 해당 기사의 `description` (본문 요약) 태그 내 텍스트를 추출. HTML 태그(`<p>`, `<a>` 등)를 제거 후 `.`(마침표)를 기준으로 문장 분리. 임의의 인덱스 `M` 선택.
    3.  **특수문자 추가:** 추출된 문장의 맨 뒤에 `!`, `@`, `#`, `*` 중 하나를 랜덤하게 추가.
- **Fallback:** 기사의 요약문이 짧아 M번째 문장이 없을 경우, 첫 번째 문장이나 제목(Title)을 대체재로 사용.

## 3. 변경 시나리오 (Change Scenario)

### 3.1. UI 변경
- 기존 "암호 길이" 입력 칸은 유지하되, 문장 생성 방식이 "뉴스 기반"으로 변경됨을 알리는 UI 업데이트 필요.
- 네트워크 요청 중임을 알리는 "Loading..." 상태 표시 필요.

### 3.2. 로직 흐름
1.  사용자가 `Generate` 버튼 클릭.
2.  `fetch('https://api.rss2json.com/v1/api.json?rss_url=https://news.google.com/rss...')` 실행.
3.  응답 JSON 파싱 -> `articles` 배열 획득.
4.  `SecureRandom`으로 `N` (기사 인덱스) 결정.
5.  `articles[N].description`에서 텍스트 정제 및 문장 분리.
6.  `SecureRandom`으로 `M` (문장 인덱스) 결정 -> 문장 추출.
7.  문장 끝에 특수문자 추가.
8.  기존 `adaptive extraction` 로직을 수행하여 암호 생성.

## 4. 위험 요소 및 대응 (Risks & Mitigation)
-   **API 가용성:** `rss2json.com` 등의 무료 프록시는 요청량 제한이나 서비스 장애가 발생할 수 있음.
    -   *대응:* 요청 실패 시, 기존(내부 단어 풀) 로직으로 자동 폴백(Fallback)하도록 구현하여 가용성 확보.
-   **문장 품질:** 뉴스 제목이나 요약문은 문법적으로 불완전하거나 특수기호가 많을 수 있음.
    -   *대응:* 정규식으로 불필요한 공백, HTML 엔티티(`&nbsp;` 등) 정제 과정 포함.

## 5. 결론 (Conclusion)
외부 프록시 API를 활용하여 클라이언트 사이드에서 Google News 연동이 가능합니다. 실패 시 안전장치(Fallback)를 포함하여 구현하는 것을 권장합니다.
