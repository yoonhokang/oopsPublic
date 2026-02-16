# 260216_2035_InitialsExtractionAnalysis.md

## 1. 개요 (Overview)
사용자 피드백에 따라 암호 추출 로직과 문장 선택 로직을 개선합니다.
무작위 철자 추출은 기억하기 어렵다는 점을 반영하여 **'첫 글자 우선 추출(Initials)'** 방식으로 변경하고, 기사의 **'첫 번째 문장'**을 고정적으로 사용하여 대표성을 높입니다.

## 2. 변경 요청 사항 (Requirements)
1.  **Extraction Logic:** 단어 내 무작위 위치가 아닌, **첫 철자(First Initial)**를 우선 사용.
    -   *Reasoning:* 문장을 기억하면 암호를 즉시 떠올릴 수 있어야 함 (Mnemonic 효과 극대화).
2.  **Sentence Selection:** 기사 내 무작위 문장이 아닌, **첫 번째 문장(Lead Sentence)** 사용.
    -   *Reasoning:* 기사의 핵심 내용은 주로 첫 문장에 담겨 있음.

## 3. 상세 설계 (Detailed Design)

### 3.1. Password Extraction Algorithm (Revised)
기존의 `Random Extraction`을 **`Adaptive Cyclic Extraction`**으로 롤백/수정합니다.

1.  문장의 모든 단어에 대해 **첫 번째 철자(Index 0)**를 순서대로 추출.
2.  암호 길이(`TargetLength`)가 충족되면 종료.
3.  길이가 부족하면, 다시 첫 단어부터 **두 번째 철자(Index 1)**를 추출. (순환)
4.  이 과정을 길이 충족 시까지 반복.

**Example:**
- Sentence: "Big cat runs." (3 words)
- Target: 5 chars
- Extraction:
  - Pass 1 (Idx 0): **B**ig, **c**at, **r**uns -> "Bcr"
  - Pass 2 (Idx 1): B**i**g, c**a**t, r**u**ns -> "ia"
  - Result: "Bcria"

### 3.2. News Fetching Logic
- **Article:** N번째 기사 (Random 0...Size-1) 유지 (다양성 확보).
- **Sentence:** M번째 문장 -> **0번째 문장(Index 0)** 고정.

## 4. 기대 효과 (Expected Impact)
- **Usability:** 사용자가 문장만 외우면 암호를 쉽게 복원할 수 있음.
- **Content Quality:** 뉴스 기사의 첫 문장을 사용하여 문법적 완성도가 높고 내용 파악이 쉬움.

## 5. 위험 요소 및 대응 (Risks)
- **Short Sentences:** 첫 문장이 매우 짧을 경우(예: "Breaking News."), 두 번째/세 번째 철자까지 많이 사용되어 암호의 직관성이 다소 떨어질 수 있음.
    - *Mitigation:* 내부적으로 너무 짧은 문장은 필터링하거나, Adaptive Extraction 로직이 이를 자연스럽게 커버함.
