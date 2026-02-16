# 260216_2050_MultiSentenceAnalysis.md

## 1. 개요 (Overview)
사용자 요청에 따라 암호 길이가 첫 번째 문장의 단어 수보다 길 경우, **다음 문장(Next Sentences)**을 자동으로 가져와 단어 풀을 확장하는 로직을 분석합니다.
기존의 '단어 내 순환 추출(2nd char)' 방식보다 '새로운 단어의 첫 글자'를 사용하는 것이 암호 기억(Mnemonic)에 더 유리합니다.

## 2. 변경 요청 사항 (Requirements)
1.  **Condition:** `Target Length` > `Word Count of First Sentence`.
2.  **Action:** 기사의 다음 문장(2nd, 3rd...)을 가져와 단어 목록에 추가.
3.  **Goal:** 가능한 한 모든 암호 글자가 **'단어의 첫 글자(Initial)'**가 되도록 함.

## 3. 상세 설계 (Detailed Design)

### 3.1. `fetchNewsSentence(targetLength)` 수정
기존에는 길이와 무관하게 무조건 첫 문장만 반환했으나, 이제 `targetLength`를 입력받아 필요한 만큼 문장을 수집합니다.

-   **Logic:**
    1.  기사 본문을 문장 단위로 분리(`sentences` 배열).
    2.  `currentTokens` = `sentences[0]`의 단어들.
    3.  `sentenceIndex` = 1.
    4.  **Loop:** `currentTokens.length < targetLength` AND `sentenceIndex < sentences.length`:
        -   `nextSentence` = `sentences[sentenceIndex]`.
        -   `nextTokens` = `nextSentence`의 단어들.
        -   `currentTokens`에 `nextTokens` 추가.
        -   `sentenceIndex++`.
    5.  마지막에 특수문자 추가.

### 3.2. Fallback
-   기사의 모든 문장을 다 합쳐도 길이가 부족한 경우?
    -   기존의 `Adaptive Cyclic Extraction` (2nd char 추출) 로직이 최후의 보루로 작동하여 길이를 맞춤.

## 4. 예시 (Example)
-   **Target:** 15 chars.
-   **Article:** "NASA lands on Mars. The rover is safe. Data is coming."
-   **Process:**
    1.  Sent 1: "NASA lands on Mars." (4 words) -> 부족 (4 < 15).
    2.  Add Sent 2: "... The rover is safe." (+4 words = 8) -> 부족.
    3.  Add Sent 3: "... Data is coming." (+3 words = 11) -> 부족.
    4.  No more sentences.
    5.  Extraction: 11 chars from initials + 4 chars from cyclic extraction (2nd chars).

## 5. 결론 (Conclusion)
이 방식은 긴 암호를 생성할 때도 문장의 흐름(Context)을 유지하면서 암호의 가독성과 기억 용이성을 극대화합니다.
