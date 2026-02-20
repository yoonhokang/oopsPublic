/**
 * Debug Monitor
 * Captures CSP violations and Network Errors, displaying them in an on-screen console.
 */

/**
 * Debug Monitor & Logger
 * Centralized logging utility that respects API_CONFIG.debugMode.
 * 
 * Features:
 * - On-screen debug panel (visible only in debugMode)
 * - Captures CSP violations, Network Errors, and App Logs
 * - Exposes window.Logger for app-wide use
 */

(function () {
    const isDebug = (window.API_CONFIG && window.API_CONFIG.debugMode) || false;

    // Create Debug Panel (Only if debugMode is true)
    let debugPanel = null;
    let logContent = null;

    if (isDebug) {
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
            display: none; /* Hidden initially, toggled by events or manual show */
        `;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Hide Log';
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

        logContent = document.createElement('pre');
        logContent.style.margin = '20px 0 0 0';
        logContent.style.whiteSpace = 'pre-wrap';
        debugPanel.appendChild(logContent);

        document.documentElement.appendChild(debugPanel);
    }

    // Logger Utility
    const Logger = {
        log: (type, message) => {
            // Always log to browser console
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[${type}] ${message}`);

            // Log to panel only if debugMode is on
            if (isDebug && debugPanel && logContent) {
                if (type === 'ERROR' || type === 'CSP') {
                    debugPanel.style.display = 'block'; // Auto-show on error
                }
                const icon = type === 'CSP' ? '🛡️' : type === 'ERROR' ? '❌' : type === 'SUCCESS' ? '✅' : 'ℹ️';
                logContent.textContent += `[${timestamp}] ${icon} [${type}] ${message}\n`;
                debugPanel.scrollTop = debugPanel.scrollHeight;
            }
        },
        info: (msg) => Logger.log('INFO', msg),
        success: (msg) => Logger.log('SUCCESS', msg),
        warn: (msg) => Logger.log('WARN', msg),
        error: (msg) => Logger.log('ERROR', msg)
    };

    window.Logger = Logger;

    // 1. Listen for CSP Violations
    document.addEventListener('securitypolicyviolation', (e) => {
        Logger.log('CSP', `Blocked '${e.blockedURI}'\n   Directive: '${e.violatedDirective}'\n   Source: ${e.sourceFile}:${e.lineNumber}`);
    });

    // 2. Listen for Global Errors
    window.addEventListener('error', (e) => {
        Logger.error(`Runtime: ${e.message} at ${e.filename}:${e.lineno}`);
    });

    // 3. Listen for Unhandled Promise Rejections
    window.addEventListener('unhandledrejection', (e) => {
        const reason = e.reason ? (e.reason.message || e.reason) : 'Unknown';
        Logger.error(`Promise Rejection: ${reason}`);
    });

    if (isDebug) {
        Logger.info("Debug Monitor Active on " + window.location.pathname);
    } else {
        console.log("Logger initialized (Debug Mode: OFF)");
    }
})();
