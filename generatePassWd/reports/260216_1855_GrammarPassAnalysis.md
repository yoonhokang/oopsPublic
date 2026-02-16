# 260216_1855_GrammarPassAnalysis.md

## 1. 개요 (Overview)
사용자 요청에 따라 `generatePassWd/index.html`의 암호 생성 로직을 개선합니다.
무작위 단어 배열 대신, **문법적으로 자연스러운(Grammatically Correct) 문장**을 생성하고 그 첫 글자를 추출하여 암호를 만듭니다. 동시에 기존의 암호 복잡도 요건(대문자, 소문자, 숫자, 특수문자 `!@#*`)을 충족해야 합니다.

## 2. 요구사항 (Requirements)
1.  **Natural Sentence:** 주어(Subject) + 동사(Verb) + 목적어(Object) 등 "말이 되는" 구조여야 함.
2.  **Constraints Enforcement:** 문장 구성 요소 안에 Uppercase, Number, Special Character가 자연스럽게 녹아들어야 함.
3.  **Password Extraction:** 각 단어의 첫 글자 조합.

## 3. 상세 설계 (Detailed Design)

### 3.1. 문장 템플릿 (Sentence Template)
자연스러운 문장을 만들면서 필수 요소를 포함하기 위해, 품사(Part of Speech) 기반의 슬롯 채우기 방식을 사용합니다.

**기본 구조 (Base Structure):**
`[Adjective(Upper)]` + `[Noun]` + `[Verb]` + `...Objects/Modifiers...` + `[Special]`

-   **Start (Upprcase):** 문장의 시작은 대문자로 된 형용사. (예: `Happy`)
-   **Core (Lowercase):** 명사 + 동사. (예: `cat runs`)
-   **Mandatory (Number):** 목적어구에서 수량이나 숫자로 자연스럽게 삽입. (예: `2 apples`)
-   **End (Special):** 문장 끝맺음 부호로 사용. (예: `!`, `#`, `*`, `@`)

### 3.2. 길이별 동적 확장 (Dynamic Expansion)
비밀번호 길이(N, Min 8)에 맞춰 중간 요소를 확장합니다.

-   **Fix 1 (Start):** `Adjective(Upper)` (1)
-   **Fix 2 (Subject):** `Noun` (1)
-   **Fix 3 (Action):** `Verb` (1)
-   **Fix 4 (End):** `Special` (1)
-   **Remaining (N-4):**
    -   중간에 `Preposition`, `Number`, `Adjective`, `Noun` 순서로 순환하며 삽입.
    -   단, **Number**는 반드시 1회 이상 포함되어야 하므로 우선순위 삽입.

**예시 (N=8):**
1.  `Adj(Upper)`: **S**ilent
2.  `Noun`: **w**olf
3.  `Verb`: **j**umps
4.  `Prep`: **o**ver
5.  `Number`: **9**
6.  `Adj`: **r**ed
7.  `Noun`: **f**oxes
8.  `Special`: **!**

-> Sentence: **Silent wolf jumps over 9 red foxes !**
-> Password: **Swjo9rf!**

### 3.3. 품사 데이터베이스 (POS Database)
다양한 문장을 위해 각 품사별 단어 풀을 확장 정의합니다.
-   `ADJECTIVES`: big, small, red, fast, happy...
-   `NOUNS`: cat, dog, pc, code, sky, apple...
-   `VERBS`: eats, runs, sees, likes, kicks...
-   `PREPOSITIONS`: in, on, at, with, for...
-   `NUMBERS`: 1, 2, 3...
-   `SPECIALS`: !, @, #, *

## 4. 구현 계획 (Implementation Plan)
1.  **Word Pools:** JS 내 `POS_WORDS` 객체 생성.
2.  **Builder Function:**
    -   필수 4요소(UpperStart, Noun, Verb, SpecialEnd) 확보.
    -   나머지 슬롯에 `Number` 1개 필수 할당.
    -   남은 슬롯은 문맥 흐름(`Prep -> Adj -> Noun`)에 따라 채움.
3.  **Extraction:** 기존 로직 유지 (첫 글자 추출).
4.  **UI:** "Source Sentence" 표시 유지.

## 5. 결론 (Conclusion)
품사 기반 템플릿 방식을 도입하여, 암기하기 쉬운 의미론적(Semantic) 문장을 생성하면서도 강력한 보안성을 유지할 수 있습니다.
승인 시 코드를 수정하겠습니다.
