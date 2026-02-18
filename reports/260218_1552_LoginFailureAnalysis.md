# 분석 보고서: 로그인 실패 원인 및 해결 방안 (Localhost Server)

**Date:** 2026-02-18 15:52
**Topic:** Google Login Failure on File Protocol

## 1. 개요 (Overview)
사용자가 `index.html`을 로컬 파일 시스템(`file:///...`)에서 직접 실행하여 로그인 시도 중 오류가 발생함.
**Error Message:** `auth/operation-not-supported-in-this-environment` ("location.protocol must be http, https or chrome-extension")

## 2. 원인 분석 (Root Cause Analysis)
- **Firebase Authentication 보안 정책:**
  - Google 로그인을 포함한 대부분의 OAuth 인증 방식은 보안상의 이유로 `http` 또는 `https` 프로토콜 위에서만 동작함.
  - `file://` 프로토콜은 도메인(Origin)이 없기 때문에 리다이렉트나 팝업 인증을 처리할 수 없음.
  - 따라서 현재 환경에서는 정적 파일이라 하더라도 반드시 웹 서버를 통해 실행되어야 함.

## 3. 해결 방안 (Proposed Solution)
PC에 설치된 Python을 이용하여 간이 웹 서버를 실행하는 방법을 제안함.

### 실행 방법
1.  명령 프롬프트(cmd) 또는 터미널을 프로젝트 폴더에서 엶.
2.  다음 명령어 실행:
    ```bash
    python -m http.server 8080
    ```
3.  브라우저 주소창에 `http://localhost:8080` 입력하여 접속.

## 4. 조치 계획 (Action Plan)
1.  사용자에게 이 사실을 보고하고, 서버 실행을 위한 배치 파일(`run_server.bat`)을 생성하여 제공.
2.  사용자가 해당 파일을 더블 클릭하면 자동으로 서버가 실행되고 브라우저가 열리도록 구성.

### `run_server.bat` 내용 (Draft)
```batch
@echo off
echo Starting Local Web Server...
python -m webbrowser -t "http://localhost:8080"
python -m http.server 8080
pause
```
