# 260216_1520_PasswordGeneratorAnalysis.md

## 1. 개요 (Overview)
본 문서는 `c:\work\git\oopsGit\webApp\index.html`에 구현될 '안전한 비밀번호 생성기 및 기억술(Mnemonic) 제안' 기능에 대한 심층 분석 보고서입니다. 본 시스템은 웹 브라우저 환경에서 동작하며, 사용자가 기억하기 쉬우면서도 강력한 비밀번호를 제공하는 것을 목적으로 합니다.

## 2. 요구사항 분석 (Requirements Analysis)
- **대상 파일:** `index.html`
- **기능 요구사항:**
    1.  **길이:** 최소 8자리.
    2.  **구성:** 숫자, 소문자, 대문자, 특수기호가 각각 최소 1개 이상 포함.
    3.  **기억술(Mnemonic):** 생성된 난수 비밀번호를 기억하기 위한 문장 또는 단어 조합 제안.

## 3. 상세 설계 및 안전성 분석 (Detailed Design & Safety Analysis)

### 3.1. 무작위성 소스 (Randomness Source) - Critical Safety
- **Risk:** `Math.random()`은 예측 가능한 의사난수 생성기(PRNG)이므로 보안에 취약함 (Not Cryptographically Secure).
- **Solution:** 브라우저 내장 API인 `window.crypto.getRandomValues()`를 사용하여 암호학적으로 안전한 난수를 생성해야 함.

### 3.2. 데이터 흐름 (Data Flow)
1.  **Source:** `window.crypto.getRandomValues(new Uint32Array(length))`
2.  **Processing (Mutation):**
    -   필수 문자군(Lower, Upper, Digit, Special)에서 각각 1개씩 무작위 추출 (4자리).
    -   나머지 자리수(N-4)는 전체 문자군에서 무작위 추출.
    -   생성된 배열을 `Fisher-Yates Shuffle` 알고리즘으로 섞음 (패턴 제거).
3.  **Sink:**
    -   비밀번호: DOM `input` 요소 또는 텍스트 노드에 출력.
    -   Mnemonic: 비밀번호의 각 문자를 매핑 테이블(Dictionary)을 통해 단어로 변환하여 자연어 문장처럼 출력.

### 3.3. 동시성 및 부작용 (Concurrency & Side Effects)
- **Concurrency:** 웹 브라우저의 단일 스레드(JS Main Thread) 환경이므로 Race Condition 없음. User Interaction(버튼 클릭)에 의해서만 트리거됨.
- **Side Effects:**
    -   DOM 조작 외 시스템 리소스(파일, 네트워크) 접근 없음.
    -   메모리 누수 가능성 낮음 (일회성 연산).

### 3.4. 예외 처리 (Edge Cases)
-   **Invalid Length:** 8 미만의 길이 입력 시 경고 출력 및 생성 차단.
-   **Character Mapping Fail:** 특수문자에 대한 Mnemonic 매핑이 없을 경우, 발음 가능한 대체어(예: '!', 'Bang') 사용.

## 4. 구현 계획 (Implementation Plan)

### 4.1. 파일 구조
-   단일 파일(`index.html`) 내에 HTML, CSS, JS를 포함하여 배포 용이성 확보 (User Request Context 고려).

### 4.2. Mnemonic 전략
-   **Mapping Table:**
    -   `a`: apple, `b`: banana, ..., `z`: zebra
    -   `A`: Ace, `B`: Best, ...
    -   `1`: One, `2`: Two, ...
    -   `!`: Exclamation, `@`: At, `#`: Hash, ...
-   **User Experience:** "A1b!" -> "Ace One banana Exclamation"과 같이 시각적으로 매칭.

## 5. 결론 및 승인 요청 (Conclusion)
위 분석을 바탕으로, `window.crypto`를 활용한 안전한 생성 로직과 직관적인 Mnemonic UI를 구현하고자 합니다.
승인 시 `index.html`을 즉시 작성하겠습니다.
