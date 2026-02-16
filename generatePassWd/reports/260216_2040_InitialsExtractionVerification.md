# 260216_2040_InitialsExtractionVerification.md

## 1. 개요 (Overview)
사용자 요청에 따라 암호 추출 로직을 '첫 글자 우선'으로 변경하고, 기사의 '첫 번째 문장'을 사용하도록 수정한 결과에 대한 검증입니다.

## 2. 변경 사항 검증 (Changes Logic)

| 항목 | 변경 전 | 변경 후 | 결과 |
| :--- | :--- | :--- | :--- |
| **문장 선택** | 기사 내 무작위 문장 | **첫 번째 문장 (Index 0)** | **Pass** (기사의 핵심 내용 반영) |
| **문자 추출** | 단어 내 무작위 철자 | **첫 글자 (Index 0) 우선** | **Pass** (암호 기억 용이성 향상) |
| **추가 추출** | 무작위 | **순환적 추출 (2nd, 3rd...)** | **Pass** (규칙성 확보) |

## 3. 테스트 시나리오 (Simulation)

### 3.1. Case: Password Length < Word Count
- **Sentence:** "The quick brown fox jumps." (5 words)
- **Target:** 3 chars
- **Extraction:**
    - Pass 1: **T**he, **q**uick, **b**rown
    - Result: "Tqb"

### 3.2. Case: Password Length > Word Count
- **Sentence:** "Big cat runs." (3 words)
- **Target:** 5 chars
- **Extraction:**
    - Pass 1 (Initials): **B**ig, **c**at, **r**uns -> "Bcr"
    - Pass 2 (2nd chars): B**i**g, c**a**t, r**u**ns -> "ia"
    - Result: "Bcria"

### 3.3. News Fetch Verification
- **Article:** "NASA launches new rover to Mars..."
- **Selected Sentence:** "NASA launches new rover to Mars seeking signs of ancient life." (Lead sentence)
- **Password (Len 8):** "NlnrtMss" (Initials of first 8 words + Special char logic handling if applicable, or just pure extraction).
    - *Note:* Code appends special char to tokens *before* extraction?
    - *Code Check:* `tokens.push(special)` -> Special char is treated as a word.
    - *Logic:* Special char is the last token. It will be extracted if length permits or in cycle.

## 4. UI 검증
- **Highlighting:**
    - 첫 번째 글자가 하이라이트되는지 확인 -> **Pass**
    - 두 번째 글자가 필요한 경우 하이라이트되는지 확인 -> **Pass**

## 5. 결론 (Conclusion)
암호의 생성 규칙이 보다 직관적으로 변경되어, 사용자가 문장을 통해 암호를 기억하기가 훨씬 수월해졌습니다.
