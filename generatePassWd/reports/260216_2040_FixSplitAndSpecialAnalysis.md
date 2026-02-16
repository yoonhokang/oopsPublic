# 260216_2040_FixSplitAndSpecialAnalysis.md

## 1. 개요 (Overview)
사용자 피드백으로 접수된 두 가지 문제를 해결합니다.
1.  **Sentence Splitting:** "U.S."와 같은 약어가 마침표(`u.`)로 인식되어 문장이 잘리는 현상.
2.  **Missing Special Char:** 생성된 암호에 특수문자가 포함되지 않는 현상.

## 2. 원인 분석 (Root Cause)

### 2.1. Sentence Splitting
-   **Current:** `split(/[.!?]+/)` 정규식을 사용. 마침표가 들어간 약어("U.S.", "Dr.", "Jan.")를 문장의 끝으로 오인하여 절단함.
-   **Solution:** 최신 브라우저가 지원하는 **`Intl.Segmenter`** API를 사용하여 언어학적으로 정확한 문장 분리를 수행합니다.

### 2.2. Missing Special Char
-   **Current:** 단어의 이니셜을 순차적으로 추출(`collectedCount < targetLength`). 만약 암호 길이가 단어 수보다 짧으면, 마지막 토큰(특수문자)에 도달하기 전에 추출이 종료됨.
-   **Solution:** 암호의 마지막 글자는 **무조건 마지막 토큰(특수문자)**을 사용하도록 강제합니다.
    -   `Password` = `(TargetLength - 1 extracted form words)` + `(Special Char)`

## 3. 상세 설계 (Detailed Design)

### 3.1. `fetchNewsSentence` (Splitting)
```javascript
// Old
let sentences = cleanTextVal.split(/[.!?]+/) ...

// New
const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
let sentences = Array.from(segmenter.segment(cleanTextVal)).map(s => s.segment.trim());
```

### 3.2. `extractPasswordCharacters` (Special Char)
-   입력된 `sentenceTokens`의 마지막 요소는 항상 `fetchNewsSentence`에서 추가한 `Special` 토큰임.
-   로직:
    1.  `EffectiveTarget` = `targetLength - 1`.
    2.  `sentenceTokens`의 **마지막 토큰(특수문자)를 제외한** 나머지 단어들에서 `EffectiveTarget` 개의 문자 추출.
    3.  마지막 토큰(특수문자)을 추출하여 Password 끝에 추가.
    4.  `highlightedIndices`에도 해당 특수문자 위치 추가.

## 4. 기대 효과 (Expected Impact)
-   "U.S.", "Mr. Smith" 등이 포함된 문장도 온전하게 추출됨.
-   생성된 모든 암호는 반드시 문장의 끝에 있는 특수문자를 포함하게 되어 보안성(Complexity) 요건을 항상 충족함.
