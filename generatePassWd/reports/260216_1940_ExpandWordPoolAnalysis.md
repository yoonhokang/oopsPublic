# 260216_1940_ExpandWordPoolAnalysis.md

## 1. 개요 (Overview)
사용자 요청에 따라 암호 생성 시 사용되는 단어의 선택 폭을 넓히기 위해 **단어 풀(Word Pools)을 대폭 확장**합니다.
현재 각 품사별 30개 내외의 단어를 약 100개 이상으로 늘려, 생성되는 문장의 다양성(Entropy)과 재미 요소를 강화합니다.

## 2. 확장 계획 (Expansion Plan)

### 2.1. 품사별 카테고리 (Categories per POS)
단순 나열이 아닌, 다양한 맥락이 형성되도록 여러 카테고리의 단어를 혼합합니다.

#### **ADJECTIVES (형용사)**
-   **Size/Shape:** Tiny, Giant, Round, Flat, Broad, Deep...
-   **Color/Light:** Azure, Crimson, Golden, Dim, Shiny, Vantablack...
-   **Emotion/State:** Brave, Calm, Eager, Fierce, Jolly, Kind...
-   **Texture/Touch:** Rough, Silky, Sticky, Fuzzy, Sharp...
-   **Speed/Time:** Rapid, Swift, Ancient, Modern, Brief...

#### **NOUNS (명사)**
-   **Animals:** Panda, Tiger, Eagle, Shark, Whale, Beetle...
-   **Nature:** River, Mountain, Forest, Galaxy, Nebula, Storm...
-   **Technology:** Robot, Drone, Laser, Pixel, Cyber, Server...
-   **Household:** Sofa, Lamp, Mirror, Clock, Piano, Spoon...
-   **Abstract:** Logic, Magic, Power, Glory, Truth, Chaos...

#### **VERBS (동사)**
-   **Movement:** Jump, Fly, Swim, Dance, Climb, Crawl...
-   **Perception:** Watch, Hear, Smell, Sense, Scans...
-   **Cognitive:** Think, Learn, Solve, Dream, Guess...
-   **Interaction:** Build, Break, Fix, paint, Cook...

### 2.2. 데이터 구조 (Data Structure)
기존 `const ADJECTIVES = [...]` 구조를 유지하되, 배열의 내용을 대폭 추가합니다.
-   **Expected Volume:**
    -   Adjectives: ~100 words
    -   Nouns: ~100 words
    -   Verbs: ~100 words
    -   Adverbs: ~50 words

## 3. 기대 효과 (Expected Impact)
-   **Variety:** "Big cat runs..." 같은 단순 패턴에서 "Golden Phoenix dances..." 같은 풍부한 문장 생성 가능.
-   **Security:** 단어 조합의 경우의 수가 기하급수적으로 증가하여 Rainbow Table 공격 등에 대한 내성 강화(비록 암호는 첫 글자 따기지만, 문장의 유추 난이도 상승).

## 4. 구현 (Implementation)
`c:\work\git\oopsGit\webApp\generatePassWd\index.html` 파일 내 Javascript 배열 상수 정의부를 수정합니다.

## 5. 결론 (Conclusion)
단어 풀 확장은 로직 변경 없이 사용자 경험을 향상시키는 효과적인 방법입니다.
승인 시 즉시 적용하겠습니다.
