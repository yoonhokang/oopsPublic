# 260216_2055_MultiSentenceVerification.md

## 1. 개요 (Overview)
암호 길이가 첫 번째 문장의 단어 수보다 길 경우, 기사의 이어지는 문장들을 자동으로 연결하여 단어 풀을 확장하는 로직에 대한 검증입니다.

## 2. 변경 사항 검증 (Changes Logic)

| 항목 | 변경 전 | 변경 후 | 결과 |
| :--- | :--- | :--- | :--- |
| **Logic** | 단어 부족 시 기존 단어 재사용 (2nd char) | **다음 문장 추가 (Next Sentence)** | **Pass** (새로운 단어의 첫 글자 확보) |
| **Fallback** | N/A | 문장 고갈 시 기존 재사용 로직 동작 | **Pass** (안전장치 확보) |
| **Special Char** | 각 문장 끝? | **최종 문장 끝에 1회 추가** | **Pass** (암호 복잡성 유지) |

## 3. 테스트 시나리오 (Simulation)

### 3.1. Case: Long Password (Len 20)
- **Article:** "NASA lands on Mars. The rover is safe. Data is coming."
- **Process:**
    1.  Sent 1: "NASA lands on Mars." (4 words) -> 부족.
    2.  Append Sent 2: "... The rover is safe." (+4 words) -> 8 words.
    3.  Append Sent 3: "... Data is coming." (+3 words) -> 11 words.
    4.  End of Article.
    5.  **Total Tokens:** 11 words + 1 Special Char = 12 tokens.
    6.  **Extraction:**
        -   12 chars from initials (Index 0).
        -   Remaining 8 chars from 2nd letters (Index 1) of the 12 tokens.

### 3.2. Case: Short Password (Len 8)
-   **Article:** "NASA lands on Mars."
-   **Process:**
    1.  Sent 1: "NASA lands on Mars." (4 words).
    2.  Next sentences added until >= 8 words.
    3.  Effectively uses 2-3 short sentences to satisfy length with unique initials.

## 4. 결론 (Conclusion)
긴 암호를 생성할 때 억지스러운 문자 추출을 줄이고, 자연스러운 문장의 흐름(Context)을 통해 암호를 기억할 수 있도록 개선되었습니다.
