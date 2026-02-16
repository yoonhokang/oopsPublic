# 260216_1930_NaturalSentenceVerification.md

## 1. 개요 (Overview)
본 문서는 `c:\work\git\oopsGit\webApp\generatePassWd\index.html`의 자연스러운 문장 생성 및 적응형 암호 추출 로직에 대한 검증 결과입니다.

## 2. 구현 점검 (Implementation Review)

### 2.1. 요구사항 준수 여부
| 요구사항 | 구현 내용 | 결과 |
| :--- | :--- | :--- |
| **Natural Sentence** | 암호 길이와 무관하게 8개 토큰의 고정된 자연어 구조 사용 | **Pass** |
| **Adaptive Extraction** | 목표 길이가 문장 단어 수보다 클 경우, 단어의 2번째, 3번째 글자를 순차적으로 추출 | **Pass** |
| **Visual Feedback** | 추출된 모든 문자(n번째 글자 포함)를 UI에서 하이라이트 처리 | **Pass** |

### 2.2. 알고리즘 검증
- **Sentence Template:** `Adj(Upper)` + `Noun` + `Verb` + `Prep` + `Num` + `Adj` + `Noun` + `Special` (Total 8 tokens).
- **Extraction:**
    -   Loop 1 (Offset 0): 각 단어 첫 글자 추출. (Upper, Number, Special 보장)
    -   Loop 2 (Offset 1): 각 단어 두 번째 글자 추출 (길이 부족 시).
    -   ...

## 3. 테스트 케이스 (Test Cases)
- **Case 1 (Length 8):**
    -   Sentence: "Big cat runs to 9 red cars !"
    -   Password: "Bcrt9rc!" (1 char/word)
    -   Status: Valid.
- **Case 2 (Length 12):**
    -   Sentence: "Hot dog sits on 1 dry mat !"
    -   Expected Extraction:
        -   Offset 0: H,d,s,o,1,d,m,! (8 chars)
        -   Offset 1: o,o,i,n,_,r,a,_ (4 chars needed -> o,o,i,n)
    -   Password: "Hdso1dm!ooin"
    -   Status: Valid.

## 4. 결론 (Conclusion)
문장의 자연스러움을 유지하면서도 긴 암호를 생성할 수 있는 로직이 성공적으로 구현되었습니다.
배포 가능한 상태입니다.
