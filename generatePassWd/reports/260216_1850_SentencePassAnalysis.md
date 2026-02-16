# 260216_1850_SentencePassAnalysis.md

## 1. 개요 (Overview)
사용자 요청에 따라 `c:\work\git\oopsGit\webApp\generatePassWd\index.html`의 핵심 로직을 변경합니다.
기존 "문자 생성 -> 단어 매핑" 방식에서, "문장(단어 배열) 생성 -> 암호 추출" 방식으로 흐름을 역전시킵니다. 또한 디버깅 창을 추가하여 실행 과정을 시각화합니다.

## 2. 요구사항 (Requirements)
1.  **로직 변경 (Inversion of Control):**
    -   임의의 간단한 문장(Sentence)을 먼저 생성.
    -   그 문장으로부터 암호(Password)를 추출.
    -   추출된 암호는 기존 조건(8자리 이상, 대/소/숫자/특수문자 `!@#*` 포함)을 만족해야 함.
2.  **디버깅 UI:**
    -   현재 실행 내용(로그)을 확인할 수 있는 창 추가.
3.  **이메일 전송:**
    -   생성된 "문장"도 메일 본문에 포함.

## 3. 상세 설계 (Detailed Design)

### 3.1. 문장 생성 알고리즘 (Sentence Generation Algorithm)
비밀번호 길이(N)만큼의 "단어(Token)"를 생성하여 문장을 구성합니다. 각 토큰의 첫 글자(Initial)를 조합하여 비밀번호를 만듭니다.

-   **토큰 풀 (Token Pools):**
    -   `UpperWords`: 형용사, 고유명사 (e.g., Happy, Super, Apple) -> Initial: 대문자.
    -   `LowerWords`: 동사, 일반명사 (e.g., run, eat, sky) -> Initial: 소문자.
    -   `NumberWords`: 숫자 (e.g., One, Two, 9) -> Initial: 숫자.
    -   `SymbolWords`: 특수문자 이름 (e.g., Bang, At, Hash, Star) -> Initial: `!`, `@`, `#`, `*`.
-   **구성 전략 (Composition Strategy):**
    -   길이 N=8일 경우, 필수 요건(Upper, Lower, Digit, Special)을 위해 각 풀에서 최소 1개씩 단어를 선택 (4개).
    -   나머지 N-4개는 전체 풀에서 무작위 선택.
    -   선택된 단어들을 배열한 것이 "문장"이 됨.
    -   **문맥(Grammar):** 완벽한 자연어 문장을 만들기는 어려우므로, "기억하기 쉬운 단어의 나열"을 문장으로 정의합니다. (예: "Happy cat runs 2 fast stars !")

### 3.2. 데이터 흐름 (Data Flow)
1.  **Generate:**
    -   `TokenList = []`
    -   Select 1 from `UpperWords`, `LowerWords`, `NumberWords`, `SymbolWords`.
    -   Fill remaining `Length - 4` with random selections.
    -   Shuffle `TokenList`.
2.  **Extract:**
    -   `Password = TokenList.map(word => getInitial(word)).join('')`
    -   `Sentence = TokenList.join(' ')`
3.  **Output:**
    -   UI에 Password와 Sentence 표시.
    -   Debug Console에 생성 과정 로그 출력.

### 3.3. 디버깅 UI
-   `parsingText` 앱과 유사한 하단 콘솔 영역 추가.
-   로그 내용: "Generating tokens...", "Selected words: [Happy, cat...]", "Extracted password: Hc..."

## 4. 구현 계획 (Implementation Plan)
-   **Word List 확장:** 기존 `MNEMONIC_DICT`를 역방향으로 활용하거나, 새로운 단어 리스트 정의.
-   **UI 수정:** Mnemonic 영역을 "Source Sentence" 영역으로 변경. Debug Console 추가.
-   **Email:** Body에 `Source Sentence: ...` 추가.

## 5. 결론 (Conclusion)
"문장으로부터 암호 추출"이라는 요구사항을 "조건을 만족하는 단어들의 조합 생성 후 첫 글자 추출" 로직으로 구현하여 안전성과 기억 용이성을 동시에 확보하겠습니다.
승인 시 코드를 수정하겠습니다.
