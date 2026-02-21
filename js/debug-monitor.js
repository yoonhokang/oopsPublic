/**
 * ============================================================
 * 디버그 모니터 & 중앙 로거 (debug-monitor.js)
 * ============================================================
 *
 * 【이 파일의 역할】
 * 프로젝트 전체에서 사용되는 중앙 로깅(Logging) 시스템입니다.
 * - 모든 파일에서 window.Logger.info("메시지") 형태로 로그를 기록
 * - 디버그 모드(debugMode: true)일 때 화면 하단에 실시간 로그 패널 표시
 * - CSP 위반, 런타임 에러, Promise 거부 등 자동 캡처
 *
 * 【debugMode 전환】
 * api-config.js의 API_CONFIG.debugMode를 true/false로 변경하면
 * 화면 내 디버그 패널의 표시 여부가 결정됩니다.
 * 배포 환경에서는 반드시 false로 설정하세요.
 *
 * 【사용 방법】
 * window.Logger.info("정보 메시지");
 * window.Logger.success("성공 메시지");
 * window.Logger.warn("경고 메시지");
 * window.Logger.error("에러 메시지");
 *
 * 【의존성】
 * - api-config.js (API_CONFIG.debugMode 참조)
 *   → 반드시 api-config.js가 먼저 로드되어야 합니다.
 */

(function () {
    // ─── 디버그 모드 확인 ────────────────────────────────
    // api-config.js에서 설정한 debugMode 값을 가져옴
    const isDebug = (window.API_CONFIG && window.API_CONFIG.debugMode) || false;

    // ─── 디버그 패널 생성 (debugMode가 true일 때만) ──────
    let debugPanel = null;   // 화면 하단 디버그 패널 DOM 요소
    let logContent = null;   // 패널 내부의 로그 텍스트 영역

    if (isDebug) {
        // 디버그 패널을 JavaScript로 동적 생성
        debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 200px;
            background: rgba(0, 0, 0, 0.9);
            color: #0f0;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            overflow-y: auto;
            z-index: 9999;
            border-top: 2px solid #444;
            display: none; /* 초기에는 숨김, 에러 발생 시 자동 표시 */
        `;

        // 닫기 버튼
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '로그 닫기';
        closeBtn.style.cssText = `
            position: absolute;
            top: 5px;
            right: 10px;
            background: #333;
            color: white;
            border: 1px solid #666;
            cursor: pointer;
            padding: 2px 5px;
        `;
        closeBtn.onclick = () => debugPanel.style.display = 'none';
        debugPanel.appendChild(closeBtn);

        // 로그 내용이 출력될 <pre> 요소
        logContent = document.createElement('pre');
        logContent.style.margin = '20px 0 0 0';
        logContent.style.whiteSpace = 'pre-wrap';
        debugPanel.appendChild(logContent);

        // HTML 최상위 요소에 패널 추가
        document.documentElement.appendChild(debugPanel);
    }

    // ─── Logger 유틸리티 객체 ────────────────────────────
    // 프로젝트 전체에서 사용하는 통합 로깅 인터페이스
    const Logger = {
        /**
         * 로그를 기록합니다.
         * @param {string} type - 로그 유형 ('INFO', 'SUCCESS', 'WARN', 'ERROR', 'CSP')
         * @param {string} message - 로그 메시지
         */
        log: (type, message) => {
            // 1. 항상 브라우저 개발자 도구 콘솔에 출력
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[${type}] ${message}`);

            // 2. 디버그 모드가 켜져 있으면 화면 패널에도 출력
            if (isDebug && debugPanel && logContent) {
                // 에러나 CSP 위반은 자동으로 패널 표시
                if (type === 'ERROR' || type === 'CSP') {
                    debugPanel.style.display = 'block';
                }
                // 로그 유형에 따른 아이콘
                const icon = type === 'CSP' ? '🛡️' : type === 'ERROR' ? '❌' : type === 'SUCCESS' ? '✅' : 'ℹ️';
                logContent.textContent += `[${timestamp}] ${icon} [${type}] ${message}\n`;
                debugPanel.scrollTop = debugPanel.scrollHeight; // 자동 스크롤
            }
        },
        // 편의 함수: 타입별 로그 기록
        info: (msg) => Logger.log('INFO', msg),
        success: (msg) => Logger.log('SUCCESS', msg),
        warn: (msg) => Logger.log('WARN', msg),
        error: (msg) => Logger.log('ERROR', msg)
    };

    // 전역에서 접근 가능하도록 window에 등록
    window.Logger = Logger;

    // ─── 자동 에러 캡처 ──────────────────────────────────

    // 1. CSP(Content Security Policy) 위반 감지
    // 허용되지 않은 리소스를 로드하려고 하면 이 이벤트가 발생합니다.
    document.addEventListener('securitypolicyviolation', (e) => {
        Logger.log('CSP', `차단됨: '${e.blockedURI}'\n   위반 규칙: '${e.violatedDirective}'\n   출처: ${e.sourceFile}:${e.lineNumber}`);
    });

    // 2. 런타임 JavaScript 에러 감지
    window.addEventListener('error', (e) => {
        Logger.error(`런타임 에러: ${e.message} (${e.filename}:${e.lineno})`);
    });

    // 3. 처리되지 않은 Promise 거부 감지
    // async/await에서 catch 없이 에러가 발생하면 이 이벤트가 발생합니다.
    window.addEventListener('unhandledrejection', (e) => {
        const reason = e.reason ? (e.reason.message || e.reason) : '알 수 없음';
        Logger.error(`Promise 거부: ${reason}`);
    });

    // 초기화 완료 로그
    if (isDebug) {
        Logger.info("디버그 모니터 활성화됨: " + window.location.pathname);
    } else {
        console.log("Logger 초기화 완료 (디버그 모드: OFF)");
    }
})();
