# 260216_1915_NaturalSentenceAnalysis.md

## 1. 개요 (Overview)
사용자 요청에 따라 `c:\work\git\oopsGit\webApp\generatePassWd\index.html`의 암호 생성 로직을 재설계합니다.
기존에는 암호 길이에 맞춰 문장 길이를 강제로 늘렸으나, 이제는 **"자연스러운 문장(Natural Sentence)"을 먼저 생성**하고, 그 안에서 **필요한 길이만큼 암호를 추출(Adaptive Extraction)**하는 방식으로 변경합니다.

## 2. 요구사항 (Requirements)
1.  **Natural Sentence Priority:** 암호 길이와 무관하게 문법적으로 완전하고 자연스러운 문장을 생성해야 함.
2.  **Adaptive Extraction:** 생성된 문장에서 목표 길이(N)만큼의 문자를 추출해야 함.
3.  **Constraints Satisfied:** 추출된 암호는 여전히 대/소문자, 숫자, 특수문자(`!@#*`) 조건을 만족해야 함.

## 3. 상세 설계 (Detailed Design)

### 3.1. 자연스러운 문장 템플릿 (Natural Sentence Templates)
암호 길이에 얽매이지 않는 고정된 구조(6~8 단어)를 기본으로 사용합니다.

-   **Template A:** `[Adj(Upper)]` + `[Noun]` + `[Verb]` + `[Prep]` + `[Number]` + `[Adj]` + `[Noun]` + `[Special]`
    -   예: "Silent wolf jumps over 9 red foxes !" (8 words)
-   **Template B:** `[Number]` + `[Adj(Upper)]` + `[Noun]` + `[Verb]` + `[Adverb]` + `[Prep]` + `[Noun]` + `[Special]`
    -   예: "9 Big bears run quickly in woods !" (8 words)

### 3.2. 적응형 추출 알고리즘 (Adaptive Extraction Algorithm)
문장의 단어 수(W)와 목표 암호 길이(N)가 다를 때를 대비한 추출 로직입니다.

1.  **기본 전략:** 각 단어의 **첫 글자(Initial)**를 우선 추출합니다.
2.  **길이 부족 시 (N > W):** 단어의 **두 번째, 세 번째 글자**를 순차적으로 사용하여 부족한 길이를 채웁니다. (Round-Robin)
    -   예: Sentence = "Big Cat" (2 words), Target = 4.
    -   Pass 1 (Idx 0): **B**ig, **C**at -> `BC`
    -   Pass 2 (Idx 1): B**i**g, C**a**t -> `ia`
    -   Result: `BCia`
3.  **길이 초과 시 (N < W):** 앞에서부터 N개만 취하되, **필수 제약조건(숫자, 특수문자)**이 포함되었는지 검증해야 합니다.
    -   하지만 현재 최소 길이(Min Len)가 8이고, 템플릿도 약 8단어이므로 대부분 1:1 매칭되거나 약간 부족한 수준입니다.
    -   따라서 **모든 단어를 활용하여 순환 추출**하는 방식이 가장 적합합니다.

### 3.3. 제약조건 보장 (Constraints Assurance)
-   템플릿에 `Upper`, `Number`, `Special` 요소가 반드시 포함되어 있습니다.
-   추출 로직이 "모든 단어"를 훑으면서 추출하므로, 문장에 포함된 제약 요소(숫자, 특수문자 등)가 암호에 자연스럽게 포함됩니다.
    -   `9` -> 첫 글자 `9`.
    -   `!` -> 첫 글자 `!`.

## 4. 구현 계획 (Implementation Plan)
1.  **확장된 템플릿 로직:** `generateNaturalSentence()` 함수 구현.
2.  **추출 로직 변경:** `extractPassword(sentenceTokens, length)` 함수 구현.
    -   이중 루프 사용: `for (charIdx) { for (word) { ... } }`
3.  **UI 업데이트:** 추출된 문자가 무엇인지 시각적으로 하이라이트(Highlight) 처리 개선.
    -   예: <span class="highlight">S</span>ilent <span class="highlight">w</span>olf ...

## 5. 결론 (Conclusion)
문장의 자연스러움을 최우선으로 하고, 부족한 길이는 단어 내 추가 글자 추출로 해결하여 보안성과 기억 용이성을 모두 만족하겠습니다.
승인 시 코드를 수정하겠습니다.
