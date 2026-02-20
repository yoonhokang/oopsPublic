# Global Rule (`GEMINI.md`) 범용성 검토 및 개정 제안서

**작성일시:** 2026-02-20 11:45
**작성자:** Antigravity (Senior Firmware Architect)

## 1. 개요
사용자 요청에 따라 `c:\Users\yoonh\.gemini\GEMINI.md` 문서가 펌웨어 프로젝트 외에도(예: `oopsPublic` 웹 프로젝트) 적용 가능한지 **범용성(Universality)**을 검토합니다.
또한, 사용자가 제시한 필수 요구사항(계획/결과 보고 의무화, 언어별 일반 지침 준수)을 반영하기 위한 **개정 계획**을 수립합니다.

## 2. 현황 분석 (Gap Analysis)

| 항목 | 현재 내용 (`GEMINI.md`) | 범용성 평가 | 비고 |
| :--- | :--- | :--- | :--- |
| **Role** | "Safety-Critical 펌웨어 아키텍트" | **제한적** | 웹/앱 프로젝트에서는 "수석 소프트웨어 엔지니어" 등으로 확장이 필요함. |
| **Traceability** | "완벽한 분석과 추적 가능성" | **적합 (Universal)** | 모든 SW 분야의 핵심 가치. 그대로 유지. |
| **Safety Checklist** | "ISR", "GPIO", "Hardware Safety" | **부적합 (FW Specific)** | 웹 환경(비동기, DOM, API)에는 맞지 않는 용어 사용. |
| **Reporting** | "복잡한 로직 변경 시 보고서 작성" | **적합 (Universal)** | 단, "수정 전 계획", "수정 후 결과"로 더 명확화 필요. |
| **Process** | Search -> Plan -> Ask -> Act | **적합 (Universal)** | 일반적인 엔지니어링 절차로 타당함. |

## 3. 개정 방향 (Proposal)

### A. 역할 및 가치 확장
-   **Role:** 단순히 "펌웨어 아키텍트"로 한정하지 않고, **"프로젝트의 성격에 맞는 기술 리더(Technical Lead)"**로 동적 정의.
-   **Core Value:** Safety-Critical(기능 안전) 개념을 **"Business-Critical & Quality Assurance"**로 확장하여, 웹 프로젝트의 보안/안정성 이슈도 동일한 무게로 다룸.

### B. 분석 체크리스트 일반화 (Generalization)
기존의 2번 항목(Hardware Safety)을 **"Domain Specific Safety & Stability"**로 추상화하고, 언어/플랫폼별 하위 지침을 분기합니다.

**변경안 예시:**
> **2. Concurrency & Environment Safety:**
> -   **Common:** Race Condition (공유 자원 접근), Side Effects.
> -   **Firmware (C/C++):** ISR, 스레드, 하드웨어 타이밍, 메모리 오염.
> -   **Web (JS/TS):** 비동기 처리(Promise/Async) 순서 보장, DOM 조작 충돌, 브라우저 호환성.

### C. 언어별 일반 지침 추가 (Language Specific Guidelines)
사용자 요청에 따라 각 언어/플랫폼에서 준수해야 할 표준 가이드라인을 명시합니다.

#### 1. Web/JavaScript (`oopsPublic` 사례)
-   **Security:**
    -   **Input Validation:** 모든 사용자 입력은 신뢰하지 않으며 검증 및 살균(Sanitize) 필수.
    -   **XSS/CSP:** 스크립트 실행 권한의 엄격한 제한.
-   **Maintainability:**
    -   **Scope Isolation:** 전역 네임스페이스 오염 방지 (Module/IIFE 사용).
    -   **Async Safety:** 비동기 로직의 에러 핸들링 및 상태 관리 추적.

#### 2. Firmware/C
-   **Stability:** Watchdog, Stack Overflow 방지.
-   **Hardware:** 레지스터 접근의 원자성(Atomicity) 보장.

### D. 프로세스 강화
"수정 전 계획"과 "수정 후 결과 보고"를 명시적인 규칙으로 추가합니다.

1.  **Pre-modification:** `Task & Implementation Plan` (수정 계획서) 작성 필수.
2.  **Post-modification:** `Verification Report` (수정 결과 보고서) 작성 필수.

## 4. 수행 계획
승인 시 위 내용을 반영하여 `GEMINI.md`를 전면 개정하겠습니다.

1.  `GEMINI.md` 백업.
2.  위 **3. 개정 방향**에 따라 내용 업데이트.
3.  한국어 표현 및 마크다운 포맷 정리.
