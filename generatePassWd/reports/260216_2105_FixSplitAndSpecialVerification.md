# 260216_2105_FixSplitAndSpecialVerification.md

## 1. 개요 (Overview)
문장 분리 오류("U.S." 등)와 특수문자 누락 문제를 해결하기 위한 코드 수정에 대한 검증 보고서입니다.

## 2. 변경 사항 검증 (Changes Logic)

| 항목 | 변경 전 | 변경 후 | 결과 |
| :--- | :--- | :--- | :--- |
| **Sentence Splitting** | `split(/[.!?]+/)` (Regex) | **`Intl.Segmenter`** (API) | **Pass** (약어, 소수점 등 처리 강화) |
| **Special Char** | 순차 추출 시 생략 가능성 있음 | **마지막 글자로 강제 할당** | **Pass** (무조건 포함 보장) |

## 3. 테스트 시나리오 (Simulation)

### 3.1. Case: Abbreviation ("U.S.") in Text
- **Original Text:** "The U.S. economy is growing."
- **Expected Parse:** Single sentence including "U.S.".
- **Split Result (Old):** ["The U", "S", " economy..."] (Broken)
- **Split Result (New):** ["The U.S. economy is growing."] (Correct)

### 3.2. Case: Special Character Enforcement
- **Sentence:** "Word1 Word2 Word3 !" (Tokens: Word1, Word2, Word3, !)
- **Target Length:** 8
- **Process:**
    1. Extract 7 chars from "Word1 Word2 Word3".
    2. Extract 1 char from "!" (The special token).
    3. Password ends with "!".
- **Highlighting:** The "!" in the sentence display is highlighted.

## 4. 결론 (Conclusion)
브라우저 표준 API인 `Intl.Segmenter`를 사용하여 영문 문장 분리의 정확도를 획기적으로 높였으며, 암호 후반부에 특수문자를 강제 할당함으로써 보안 요구사항을 충족시켰습니다.
